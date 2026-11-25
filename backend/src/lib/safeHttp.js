/**
 * Outbound HTTP to addresses that tenants type in (journey webhooks).
 *
 * A tenant-supplied URL must never reach this server's own network: the
 * metadata service, the database, localhost admin ports. So:
 *   - https only, no user:password@, standard ports only;
 *   - every address the host resolves to must be public, and the check runs
 *     inside the socket's own DNS lookup — the address that's checked is the
 *     address that's connected to, so DNS rebinding can't swap it afterwards;
 *   - redirects are not followed; bodies are capped; requests time out.
 */
import dns from "dns";
import https from "https";
import net from "net";

const err = (message, extra = {}) => Object.assign(new Error(message), extra);
const ALLOWED_PORTS = new Set(["", "443", "8443"]);
const MAX_RESPONSE = 64 * 1024;

const v4 = (ip) => ip.split(".").map(Number);

/** Is this IP address on the public internet? */
export function isPublicAddress(ip) {
  let addr = String(ip ?? "").toLowerCase();
  if (addr.startsWith("::ffff:") && net.isIPv4(addr.slice(7))) addr = addr.slice(7); // v4-mapped v6
  if (net.isIPv4(addr)) {
    const [a, b] = v4(addr);
    if (a === 0 || a === 10 || a === 127) return false;
    if (a === 100 && b >= 64 && b <= 127) return false; // CGNAT
    if (a === 169 && b === 254) return false;           // link-local, cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
    if (a === 192 && b === 0) return false;             // 192.0.0.0/24, 192.0.2.0/24
    if (a === 198 && (b === 18 || b === 19)) return false;
    if (a >= 224) return false;                          // multicast, reserved, broadcast
    return true;
  }
  if (net.isIPv6(addr)) {
    if (addr === "::" || addr === "::1") return false;
    if (/^f[cd]/.test(addr)) return false;               // unique local
    if (/^fe[89ab]/.test(addr)) return false;            // link-local
    if (addr.startsWith("ff")) return false;             // multicast
    if (addr.startsWith("2001:db8")) return false;       // documentation
    if (addr.startsWith("64:ff9b")) return false;        // NAT64 can reach v4 private space
    return true;
  }
  return false;
}

/** Validate the shape of a tenant-supplied webhook URL. Throws a 400 with a reason. */
export function checkWebhookUrl(raw) {
  let u;
  try { u = new URL(String(raw ?? "").trim()); } catch { throw err("Enter a full https:// URL", { status: 400 }); }
  if (u.protocol !== "https:") throw err("Webhooks must use https://", { status: 400 });
  if (u.username || u.password) throw err("Put credentials in a header or the URL path, not before the host", { status: 400 });
  if (!ALLOWED_PORTS.has(u.port)) throw err("Webhooks may use port 443 or 8443 only", { status: 400 });
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (net.isIP(host) && !isPublicAddress(host)) throw err("That address is on a private network", { status: 400 });
  if (/^(localhost|.*\.local|.*\.internal|.*\.localhost)$/i.test(host)) throw err("That host is on a private network", { status: 400 });
  return u;
}

/** A dns.lookup that refuses non-public answers. */
export function guardedLookup(hostname, options, callback) {
  if (typeof options === "function") { callback = options; options = {}; }
  dns.lookup(hostname, { all: true, family: options?.family ?? 0 }, (e, addrs) => {
    if (e) return callback(e);
    const bad = addrs.find((a) => !isPublicAddress(a.address));
    if (bad || !addrs.length) return callback(err(`${hostname} resolves to a private address`, { code: "EPRIVATE" }));
    if (options?.all) return callback(null, addrs);
    callback(null, addrs[0].address, addrs[0].family);
  });
}

/**
 * POST JSON. Resolves { status, body } for any HTTP answer; rejects with
 * `transient: true` for network trouble, timeouts and 5xx/429 (worth retrying).
 */
export function postJson(raw, payload, { headers = {}, timeoutMs = 10_000 } = {}) {
  const u = checkWebhookUrl(raw);
  const body = Buffer.from(JSON.stringify(payload));
  return new Promise((resolve, reject) => {
    const req = https.request(u, {
      method: "POST", lookup: guardedLookup, timeout: timeoutMs,
      headers: { "Content-Type": "application/json", "Content-Length": body.length, "User-Agent": "ExecUI-Webhooks/1", ...headers },
    }, (res) => {
      let size = 0; const chunks = [];
      res.on("data", (c) => { size += c.length; if (size <= MAX_RESPONSE) chunks.push(c); else res.destroy(); });
      res.on("end", () => {
        const status = res.statusCode ?? 0;
        const text = Buffer.concat(chunks).toString("utf8");
        if (status >= 500 || status === 429) return reject(err(`The webhook answered ${status}`, { transient: true, status }));
        resolve({ status, body: text.slice(0, 2000) });
      });
      res.on("error", (e) => reject(err(e.message, { transient: true })));
    });
    req.on("timeout", () => req.destroy(err("The webhook timed out", { transient: true })));
    req.on("error", (e) => reject(e.code === "EPRIVATE" ? err(e.message, { transient: false }) : Object.assign(e, { transient: e.transient ?? true })));
    req.end(body);
  });
}
