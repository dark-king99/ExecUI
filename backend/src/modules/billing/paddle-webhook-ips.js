import { isIPv4 } from "node:net";
import { log } from "../../lib/logger.js";

const PADDLE_IPS_URL = "https://api.paddle.com/ips";
const CACHE_TTL_MS = 5 * 60_000;
const FETCH_TIMEOUT_MS = 3_000;

let cachedAddresses = null;
let cacheExpiresAt = 0;
let pendingFetch = null;

function normalizeAddress(value) {
  if (typeof value !== "string") return null;
  const address = value.startsWith("::ffff:") ? value.slice(7) : value;
  return isIPv4(address) ? address : null;
}

export function parsePaddleIpv4Cidrs(payload) {
  const cidrs = payload?.data?.ipv4_cidrs;
  if (!Array.isArray(cidrs)) throw new Error("Paddle IP list did not contain data.ipv4_cidrs");

  const addresses = cidrs.flatMap((cidr) => {
    if (typeof cidr !== "string" || !cidr.endsWith("/32")) return [];
    const address = normalizeAddress(cidr.slice(0, -3));
    return address ? [address] : [];
  });
  if (!addresses.length) throw new Error("Paddle IP list contained no valid IPv4 /32 addresses");
  return new Set(addresses);
}

async function fetchPaddleAddresses(fetchImpl = fetch) {
  const response = await fetchImpl(PADDLE_IPS_URL, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Paddle IP list returned HTTP ${response.status}`);

  return parsePaddleIpv4Cidrs(await response.json());
}

async function getPaddleAddresses() {
  if (cachedAddresses && Date.now() < cacheExpiresAt) return cachedAddresses;
  if (!pendingFetch) {
    pendingFetch = fetchPaddleAddresses()
      .then((addresses) => {
        cachedAddresses = addresses;
        cacheExpiresAt = Date.now() + CACHE_TTL_MS;
        return addresses;
      })
      .catch((error) => {
        log.warn("paddle_webhook_ip_refresh_failed", { error: error.message });
        throw error;
      })
      .finally(() => { pendingFetch = null; });
  }
  return pendingFetch;
}

export async function isPaddleWebhookIpAllowed(address) {
  const normalized = normalizeAddress(address);
  if (!normalized) return false;
  const addresses = await getPaddleAddresses();
  return addresses.has(normalized);
}

export async function paddleWebhookIpAllowlist(req, res, next) {
  if (process.env.PADDLE_ENV?.trim().toLowerCase() !== "production") return next();

  try {
    if (await isPaddleWebhookIpAllowed(req.ip)) return next();
    log.warn("paddle_webhook_ip_rejected", { ip: normalizeAddress(req.ip) ?? "invalid" });
    return res.status(403).json({ message: "Webhook source IP is not authorized." });
  } catch {
    return res.status(503).json({ message: "Paddle webhook IP allowlist is temporarily unavailable." });
  }
}
