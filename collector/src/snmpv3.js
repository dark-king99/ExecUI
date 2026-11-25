/**
 * SNMPv3 with the User-based Security Model (RFC 3414, 3826, 7860).
 *
 *   security levels   noAuthNoPriv, authNoPriv, authPriv
 *   authentication    MD5, SHA (SHA-1), SHA-224, SHA-256, SHA-384, SHA-512
 *   privacy           AES-128 (CFB, RFC 3826)
 *
 * DES privacy is deliberately absent: it's broken, and modern OpenSSL builds
 * (Node 17+) don't ship it. Devices that only offer DES should be moved to AES.
 *
 * Flow: the first request "discovers" the device's engine (an unauthenticated
 * probe that the agent answers with a Report carrying its engine id, boots and
 * time); keys are then localised to that engine and every request is signed
 * (and encrypted, for authPriv). Responses are checked the same way — one with
 * a bad signature is dropped as if it never arrived.
 */
import crypto from "node:crypto";
import { T, tlv, encInt, read, decInt, encodePdu, decodePduAt, Session } from "./snmp.js";

export const AUTH = {
  md5: { hash: "md5", macLen: 12 },
  sha: { hash: "sha1", macLen: 12 },
  sha224: { hash: "sha224", macLen: 16 },
  sha256: { hash: "sha256", macLen: 24 },
  sha384: { hash: "sha384", macLen: 32 },
  sha512: { hash: "sha512", macLen: 48 },
};
export const PRIV = { aes: { cipher: "aes-128-cfb", keyLen: 16 } };

const FLAG_AUTH = 1, FLAG_PRIV = 2, FLAG_REPORTABLE = 4;
const USM = 3;
const MAX_SIZE = 65507;

/** RFC 3414 A.2: password → key, by hashing 1 MB of the repeated password. */
export function passwordToKey(password, hash) {
  const pw = Buffer.from(String(password));
  if (pw.length < 8) throw new Error("SNMPv3 passwords must be at least 8 characters");
  const h = crypto.createHash(hash);
  const chunk = Buffer.alloc(64);
  let index = 0;
  for (let count = 0; count < 1048576; count += 64) {
    for (let i = 0; i < 64; i++) chunk[i] = pw[index++ % pw.length];
    h.update(chunk);
  }
  return h.digest();
}

/** RFC 3414 A.2: localise a key to one engine: H(Ku || engineID || Ku). */
export function localizeKey(key, engineId, hash) {
  return crypto.createHash(hash).update(Buffer.concat([key, engineId, key])).digest();
}

const octets = (b) => tlv(T.OCTET_STRING, Buffer.from(b));
const u32 = (n) => { const b = Buffer.alloc(4); b.writeUInt32BE(n >>> 0); return b; };

function securityParams({ engineId, boots, time, user, authParams, privParams }) {
  return tlv(T.SEQUENCE, Buffer.concat([
    octets(engineId), encInt(boots), encInt(time), octets(Buffer.from(user)), octets(authParams), octets(privParams),
  ]));
}

/** Build a v3 message. Returns the bytes, signed if `authKey` is given. */
export function encodeV3({ msgId, flags, engineId, boots, time, user, auth, authKey, privKey, salt, contextEngineId, pdu }) {
  const scoped = tlv(T.SEQUENCE, Buffer.concat([octets(contextEngineId ?? engineId), octets(Buffer.alloc(0)), pdu]));
  let msgData = scoped;
  let privParams = Buffer.alloc(0);
  if (flags & FLAG_PRIV) {
    privParams = salt;
    const iv = Buffer.concat([u32(boots), u32(time), salt]);
    const c = crypto.createCipheriv(PRIV.aes.cipher, privKey.subarray(0, 16), iv);
    msgData = octets(Buffer.concat([c.update(scoped), c.final()]));
  }
  const macLen = flags & FLAG_AUTH ? AUTH[auth].macLen : 0;
  const build = (authParams) => tlv(T.SEQUENCE, Buffer.concat([
    encInt(3),
    tlv(T.SEQUENCE, Buffer.concat([encInt(msgId), encInt(MAX_SIZE), octets(Buffer.from([flags])), encInt(USM)])),
    octets(securityParams({ engineId, boots, time, user, authParams, privParams })),
    msgData,
  ]));
  if (!(flags & FLAG_AUTH)) return build(Buffer.alloc(0));
  const blank = build(Buffer.alloc(macLen));
  const mac = crypto.createHmac(AUTH[auth].hash, authKey).update(blank).digest().subarray(0, macLen);
  // Put the MAC where the zeros were (found by walking the structure, not by
  // searching for zeros): same length, so no other offset moves.
  mac.copy(blank, layout(blank).authP.start);
  return blank;
}

/** Positions of every field in a v3 message. */
function layout(buf) {
  const msg = read(buf, 0);
  const ver = read(buf, msg.start);
  const global = read(buf, ver.end);
  const id = read(buf, global.start);
  const size = read(buf, id.end);
  const flagsTlv = read(buf, size.end);
  const secOuter = read(buf, global.end);
  const sec = read(buf, secOuter.start);
  const eng = read(buf, sec.start);
  const boots = read(buf, eng.end);
  const time = read(buf, boots.end);
  const user = read(buf, time.end);
  const authP = read(buf, user.end);
  const privP = read(buf, authP.end);
  const data = read(buf, secOuter.end);
  return { ver, id, flagsTlv, eng, boots, time, user, authP, privP, data };
}

/**
 * Parse a v3 message. With `keys`, verifies the signature and decrypts.
 * Returns { msgId, flags, engineId, boots, time, user, authOk, pdu } — pdu is
 * null when it couldn't be decrypted.
 */
export function decodeV3(buf, keys = null) {
  const { ver, id, flagsTlv, eng, boots, time, user, authP, privP, data } = layout(buf);
  if (decInt(buf.subarray(ver.start, ver.end), true) !== 3) throw new Error("not SNMPv3");
  const flags = buf[flagsTlv.start];

  const out = {
    msgId: decInt(buf.subarray(id.start, id.end), true),
    flags,
    engineId: Buffer.from(buf.subarray(eng.start, eng.end)),
    boots: decInt(buf.subarray(boots.start, boots.end), false),
    time: decInt(buf.subarray(time.start, time.end), false),
    user: buf.subarray(user.start, user.end).toString(),
    authOk: !(flags & FLAG_AUTH),
    pdu: null,
  };

  if (flags & FLAG_AUTH) {
    if (!keys?.authKey) return out;
    const mac = Buffer.from(buf.subarray(authP.start, authP.end));
    const zeroed = Buffer.from(buf);
    zeroed.fill(0, authP.start, authP.end);
    const expect = crypto.createHmac(AUTH[keys.auth].hash, keys.authKey).update(zeroed).digest().subarray(0, mac.length);
    out.authOk = mac.length === AUTH[keys.auth].macLen && crypto.timingSafeEqual(mac, expect);
    if (!out.authOk) return out;
  }

  if (flags & FLAG_PRIV) {
    if (!keys?.privKey) return out;
    const iv = Buffer.concat([u32(out.boots), u32(out.time), buf.subarray(privP.start, privP.end)]);
    const d = crypto.createDecipheriv(PRIV.aes.cipher, keys.privKey.subarray(0, 16), iv);
    const scoped = Buffer.concat([d.update(buf.subarray(data.start, data.end)), d.final()]);
    const seq = read(scoped, 0);
    const ctxEng = read(scoped, seq.start);
    const ctxName = read(scoped, ctxEng.end);
    out.pdu = decodePduAt(scoped, ctxName.end);
    return out;
  }
  const ctxEng = read(buf, data.start);
  const ctxName = read(buf, ctxEng.end);
  out.pdu = decodePduAt(buf, ctxName.end);
  return out;
}

/**
 * A Session that speaks SNMPv3. Same `get` / `walk` interface as v1/v2c.
 * Options: user, level ("noAuthNoPriv" | "authNoPriv" | "authPriv"),
 * authProtocol, authPassword, privProtocol ("aes"), privPassword.
 */
export class SessionV3 extends Session {
  constructor(host, { user, level = "authPriv", authProtocol = "sha", authPassword, privProtocol = "aes", privPassword, port = 161, timeoutMs = 1500, retries = 1 } = {}) {
    super(host, { port, timeoutMs, retries, version: "v2c" });
    if (!user) throw new Error("SNMPv3 needs a user name");
    if (level !== "noAuthNoPriv" && !AUTH[authProtocol]) throw new Error(`Unsupported SNMPv3 auth protocol ${authProtocol}`);
    if (level === "authPriv" && !PRIV[privProtocol]) throw new Error(`Unsupported SNMPv3 privacy protocol ${privProtocol} (AES only)`);
    Object.assign(this, { user, level, authProtocol, privProtocol });
    this.flags = (level === "noAuthNoPriv" ? 0 : FLAG_AUTH) | (level === "authPriv" ? FLAG_PRIV : 0);
    // Keys are derived once per password (the expensive step) and localised per engine.
    this.ku = level === "noAuthNoPriv" ? null : {
      auth: passwordToKey(authPassword, AUTH[authProtocol].hash),
      priv: level === "authPriv" ? passwordToKey(privPassword, AUTH[authProtocol].hash) : null,
    };
    this.engine = null;
    this.socket.removeAllListeners("message");
    this.socket.on("message", (buf) => this.onMessage(buf));
  }

  onMessage(buf) {
    let msg;
    try { msg = decodeV3(buf, this.keys); } catch { return; }
    const p = this.pending.get(msg.msgId);
    if (!p) return;
    if (p.discovery) {
      this.pending.delete(msg.msgId);
      clearTimeout(p.timer);
      return p.resolve(msg);
    }
    if (!msg.authOk || !msg.pdu) return; // unsigned or tampered: ignore, let it time out
    this.pending.delete(msg.msgId);
    clearTimeout(p.timer);
    if (msg.pdu.pduType === T.REPORT) {
      // usmStatsNotInTimeWindows → our clock drifted; resync once and retry.
      const oid = msg.pdu.varbinds[0]?.oid ?? "";
      if (oid.startsWith("1.3.6.1.6.3.15.1.1.2") && !p.resynced) {
        this.engine = { ...this.engine, boots: msg.boots, time: msg.time, at: Date.now() };
        return this.send(p.pduType, p.varbinds, p.a, p.b, true).then(p.resolve, p.reject);
      }
      return p.reject(Object.assign(new Error(`SNMPv3 report ${oid}`), { code: "ESNMPV3" }));
    }
    // Same handling as v1/v2c: noSuchName means "nothing there", not an error.
    if (msg.pdu.a !== 0 && p.pduType !== T.GET_BULK) {
      return msg.pdu.a === 2 ? p.resolve([]) : p.reject(Object.assign(new Error(`SNMP error ${msg.pdu.a}`), { code: "ESNMP" }));
    }
    p.resolve(msg.pdu.varbinds);
  }

  get keys() {
    if (!this.engine || !this.ku) return null;
    return { auth: this.authProtocol, authKey: this.engine.authKey, privKey: this.engine.privKey };
  }

  transmit(packet, msgId, extra) {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const send = () => {
        attempts += 1;
        this.socket.send(packet, this.port, this.host, () => {});
        const timer = setTimeout(() => {
          if (!this.pending.has(msgId)) return;
          if (attempts <= this.retries) return send();
          this.pending.delete(msgId);
          reject(Object.assign(new Error("SNMP timeout"), { code: "ETIMEDOUT" }));
        }, this.timeoutMs);
        this.pending.set(msgId, { resolve, reject, timer, ...extra });
      };
      send();
    });
  }

  async discover() {
    const msgId = crypto.randomInt(1, 0x7fffffff);
    const pdu = encodePdu({ pduType: T.GET, requestId: crypto.randomInt(1, 0x7fffffff), varbinds: [] });
    const packet = encodeV3({ msgId, flags: FLAG_REPORTABLE, engineId: Buffer.alloc(0), boots: 0, time: 0, user: "", pdu });
    const r = await this.transmit(packet, msgId, { discovery: true });
    if (!r.engineId.length) throw new Error("SNMPv3 engine discovery failed");
    const hash = this.ku ? AUTH[this.authProtocol].hash : null;
    this.engine = {
      id: r.engineId, boots: r.boots, time: r.time, at: Date.now(),
      authKey: this.ku ? localizeKey(this.ku.auth, r.engineId, hash) : null,
      privKey: this.ku?.priv ? localizeKey(this.ku.priv, r.engineId, hash) : null,
    };
  }

  async send(pduType, varbinds, a = 0, b = 0, resynced = false) {
    if (!this.engine) await this.discover();
    const e = this.engine;
    const time = e.time + Math.floor((Date.now() - e.at) / 1000);
    const msgId = crypto.randomInt(1, 0x7fffffff);
    const pdu = encodePdu({ pduType, requestId: crypto.randomInt(1, 0x7fffffff), a, b, varbinds });
    const packet = encodeV3({
      msgId, flags: this.flags | FLAG_REPORTABLE, engineId: e.id, boots: e.boots, time, user: this.user,
      auth: this.authProtocol, authKey: e.authKey, privKey: e.privKey, salt: crypto.randomBytes(8), pdu,
    });
    return this.transmit(packet, msgId, { pduType, varbinds, a, b, resynced });
  }

  request(pduType, varbinds, a = 0, b = 0) {
    return this.send(pduType, varbinds, a, b);
  }
}
