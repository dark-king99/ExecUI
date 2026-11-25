/**
 * A small SNMP v1/v2c client — BER encoding, GET, GETNEXT, GETBULK and walks.
 *
 * Written here rather than pulled from npm so the collector has no
 * dependencies to audit or update on a customer's machine. It covers what the
 * collector needs (reading); it never sends SET.
 */
import dgram from "node:dgram";
import crypto from "node:crypto";

export const T = {
  REPORT: 0xa8,
  INTEGER: 0x02, OCTET_STRING: 0x04, NULL: 0x05, OID: 0x06, SEQUENCE: 0x30,
  IP_ADDRESS: 0x40, COUNTER32: 0x41, GAUGE32: 0x42, TIMETICKS: 0x43, OPAQUE: 0x44, COUNTER64: 0x46,
  NO_SUCH_OBJECT: 0x80, NO_SUCH_INSTANCE: 0x81, END_OF_MIB_VIEW: 0x82,
  GET: 0xa0, GET_NEXT: 0xa1, RESPONSE: 0xa2, GET_BULK: 0xa5,
};
const EXCEPTIONS = new Set([T.NO_SUCH_OBJECT, T.NO_SUCH_INSTANCE, T.END_OF_MIB_VIEW]);

// ── BER encoding ─────────────────────────────────────────────────────────────
function encLength(n) {
  if (n < 0x80) return Buffer.from([n]);
  const bytes = [];
  while (n > 0) { bytes.unshift(n & 0xff); n >>= 8; }
  return Buffer.from([0x80 | bytes.length, ...bytes]);
}
export const tlv = (type, body) => Buffer.concat([Buffer.from([type]), encLength(body.length), body]);

export function encInt(n, type = T.INTEGER) {
  let v = BigInt(n);
  const bytes = [];
  if (type === T.INTEGER) {
    do { bytes.unshift(Number(v & 0xffn)); v >>= 8n; }
    while (!((v === 0n && !(bytes[0] & 0x80)) || (v === -1n && (bytes[0] & 0x80))));
  } else {
    do { bytes.unshift(Number(v & 0xffn)); v >>= 8n; } while (v > 0n);
    if (bytes[0] & 0x80) bytes.unshift(0); // unsigned types stay positive
  }
  return tlv(type, Buffer.from(bytes));
}

export function encOid(oid) {
  const arcs = String(oid).replace(/^\./, "").split(".").map(Number);
  if (arcs.length < 2 || arcs.some((a) => !Number.isInteger(a) || a < 0)) throw new Error(`bad OID ${oid}`);
  const out = [40 * arcs[0] + arcs[1]];
  for (const arc of arcs.slice(2)) {
    const stack = [arc & 0x7f];
    let a = Math.floor(arc / 128);
    while (a > 0) { stack.unshift((a & 0x7f) | 0x80); a = Math.floor(a / 128); }
    out.push(...stack);
  }
  return tlv(T.OID, Buffer.from(out));
}

/** Encode a value from `{ type, value }` (used by the test agent for responses). */
export function encValue({ type, value }) {
  switch (type) {
    case T.INTEGER: return encInt(value);
    case T.OCTET_STRING: return tlv(T.OCTET_STRING, Buffer.isBuffer(value) ? value : Buffer.from(String(value)));
    case T.OID: return encOid(value);
    case T.IP_ADDRESS: return tlv(T.IP_ADDRESS, Buffer.from(String(value).split(".").map(Number)));
    case T.COUNTER32: case T.GAUGE32: case T.TIMETICKS: case T.COUNTER64: return encInt(value, type);
    case T.NULL: case T.NO_SUCH_OBJECT: case T.NO_SUCH_INSTANCE: case T.END_OF_MIB_VIEW: return tlv(type, Buffer.alloc(0));
    default: throw new Error(`can't encode type ${type}`);
  }
}

/** The PDU alone — shared by v1/v2c messages and v3 scoped PDUs. */
export function encodePdu({ pduType, requestId, a = 0, b = 0, varbinds }) {
  const vbs = tlv(T.SEQUENCE, Buffer.concat(varbinds.map((vb) =>
    tlv(T.SEQUENCE, Buffer.concat([encOid(vb.oid), vb.value ? encValue(vb.value) : tlv(T.NULL, Buffer.alloc(0))])))));
  return tlv(pduType, Buffer.concat([encInt(requestId), encInt(a), encInt(b), vbs]));
}

export function encodeMessage({ version = 1, community = "public", pduType, requestId, a = 0, b = 0, varbinds }) {
  const pdu = encodePdu({ pduType, requestId, a, b, varbinds });
  return tlv(T.SEQUENCE, Buffer.concat([encInt(version), tlv(T.OCTET_STRING, Buffer.from(community)), pdu]));
}

// ── BER decoding ─────────────────────────────────────────────────────────────
export function read(buf, pos) {
  const type = buf[pos];
  let len = buf[pos + 1];
  let start = pos + 2;
  if (len & 0x80) {
    const n = len & 0x7f;
    if (n > 4) throw new Error("length too long");
    len = 0;
    for (let i = 0; i < n; i++) len = len * 256 + buf[start + i];
    start += n;
  }
  if (start + len > buf.length) throw new Error("truncated");
  return { type, start, end: start + len };
}

export function decOid(b) {
  const arcs = [Math.floor(b[0] / 40), b[0] % 40];
  let v = 0;
  for (let i = 1; i < b.length; i++) {
    v = v * 128 + (b[i] & 0x7f);
    if (!(b[i] & 0x80)) { arcs.push(v); v = 0; }
  }
  return arcs.join(".");
}

export function decInt(b, signed) {
  let v = 0n;
  for (const byte of b) v = (v << 8n) | BigInt(byte);
  if (signed && b.length && (b[0] & 0x80)) v -= 1n << BigInt(b.length * 8);
  return Number(v);
}

export function decValue(type, b) {
  switch (type) {
    case T.INTEGER: return decInt(b, true);
    case T.OCTET_STRING: case T.OPAQUE: return Buffer.from(b);
    case T.OID: return decOid(b);
    case T.IP_ADDRESS: return [...b].join(".");
    case T.COUNTER32: case T.GAUGE32: case T.TIMETICKS: case T.COUNTER64: return decInt(b, false);
    default: return null;
  }
}

/** Decode the PDU that starts at `pos`. */
export function decodePduAt(buf, pos) {
  const pdu = read(buf, pos);
  const rid = read(buf, pdu.start);
  const f1 = read(buf, rid.end);
  const f2 = read(buf, f1.end);
  const list = read(buf, f2.end);
  const varbinds = [];
  for (let p = list.start; p < list.end;) {
    const vb = read(buf, p);
    const o = read(buf, vb.start);
    const v = read(buf, o.end);
    const raw = buf.subarray(v.start, v.end);
    varbinds.push({ oid: decOid(buf.subarray(o.start, o.end)), type: v.type, value: decValue(v.type, raw) });
    p = vb.end;
  }
  return {
    pduType: pdu.type,
    requestId: decInt(buf.subarray(rid.start, rid.end), true),
    a: decInt(buf.subarray(f1.start, f1.end), true), // error-status / non-repeaters
    b: decInt(buf.subarray(f2.start, f2.end), true), // error-index / max-repetitions
    varbinds,
  };
}

export function decodeMessage(buf) {
  const msg = read(buf, 0);
  if (msg.type !== T.SEQUENCE) throw new Error("not an SNMP message");
  const ver = read(buf, msg.start);
  const version = decInt(buf.subarray(ver.start, ver.end), true);
  if (version === 3) throw Object.assign(new Error("SNMPv3 message"), { code: "EV3" });
  const com = read(buf, ver.end);
  return { version, community: buf.subarray(com.start, com.end).toString(), ...decodePduAt(buf, com.end) };
}

// ── OIDs ─────────────────────────────────────────────────────────────────────
/** Is `oid` inside the subtree rooted at `root`? */
export const under = (oid, root) => oid === root || oid.startsWith(`${root}.`);

/** Numeric OID ordering (string order is wrong: 1.10 < 1.9). */
export function compareOid(x, y) {
  const a = x.split(".").map(Number), b = y.split(".").map(Number);
  for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] !== b[i]) return a[i] - b[i];
  return a.length - b.length;
}

// ── Session ──────────────────────────────────────────────────────────────────
/**
 * One SNMP target. `version`: "v1" | "v2c". Requests time out quietly
 * (rejecting with code "ETIMEDOUT") — most hosts on a LAN don't speak SNMP.
 */
export class Session {
  constructor(host, { community = "public", version = "v2c", port = 161, timeoutMs = 1500, retries = 1 } = {}) {
    Object.assign(this, { host, community, port, timeoutMs, retries });
    this.version = version === "v1" ? 0 : 1;
    this.socket = dgram.createSocket("udp4");
    this.pending = new Map();
    this.socket.on("message", (buf) => {
      let msg;
      try { msg = decodeMessage(buf); } catch { return; }
      const p = this.pending.get(msg.requestId);
      if (!p) return;
      this.pending.delete(msg.requestId);
      clearTimeout(p.timer);
      if (msg.a !== 0 && msg.pduType === T.RESPONSE && p.pduType !== T.GET_BULK) {
        // noSuchName (2) on v1 means "nothing there"; treat as empty.
        return msg.a === 2 ? p.resolve([]) : p.reject(Object.assign(new Error(`SNMP error ${msg.a}`), { code: "ESNMP" }));
      }
      p.resolve(msg.varbinds);
    });
    this.socket.on("error", () => {});
    this.socket.unref?.();
  }

  request(pduType, varbinds, a = 0, b = 0) {
    const requestId = crypto.randomInt(1, 0x7fffffff);
    const packet = encodeMessage({ version: this.version, community: this.community, pduType, requestId, a, b, varbinds });
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const send = () => {
        attempts += 1;
        this.socket.send(packet, this.port, this.host, () => {});
        const timer = setTimeout(() => {
          if (!this.pending.has(requestId)) return;
          if (attempts <= this.retries) return send();
          this.pending.delete(requestId);
          reject(Object.assign(new Error("SNMP timeout"), { code: "ETIMEDOUT" }));
        }, this.timeoutMs);
        this.pending.set(requestId, { resolve, reject, timer, pduType });
      };
      send();
    });
  }

  /** GET several OIDs at once → { oid: value } (missing ones omitted). */
  async get(oids) {
    const vbs = await this.request(T.GET, oids.map((oid) => ({ oid })));
    return Object.fromEntries(vbs.filter((v) => !EXCEPTIONS.has(v.type) && v.type !== T.NULL).map((v) => [v.oid, v.value]));
  }

  /** Every OID under `root` → [{ oid, type, value }]. Bounded by `max`. */
  async walk(root, { max = 2000 } = {}) {
    const out = [];
    let cursor = root;
    while (out.length < max) {
      const vbs = this.version === 0
        ? await this.request(T.GET_NEXT, [{ oid: cursor }])
        : await this.request(T.GET_BULK, [{ oid: cursor }], 0, 25);
      let done = !vbs.length;
      for (const vb of vbs) {
        if (EXCEPTIONS.has(vb.type) || !under(vb.oid, root) || compareOid(vb.oid, cursor) <= 0) { done = true; break; }
        out.push(vb);
        cursor = vb.oid;
      }
      if (done) break;
    }
    return out;
  }

  close() {
    for (const p of this.pending.values()) clearTimeout(p.timer);
    this.pending.clear();
    try { this.socket.close(); } catch { /* already closed */ }
  }
}

/** Printable text from an OCTET STRING, or null. */
export function text(v) {
  if (!Buffer.isBuffer(v)) return v == null ? null : String(v);
  const s = v.toString("utf8").replace(/\0+$/, "");
  return /^[\x09\x0a\x0d\x20-\x7e -￿]*$/.test(s) ? s.trim() : null;
}

/** "aa:bb:cc:dd:ee:ff" from a 6-byte OCTET STRING, or null. */
export const mac = (v) => (Buffer.isBuffer(v) && v.length === 6 ? [...v].map((x) => x.toString(16).padStart(2, "0")).join(":") : null);
