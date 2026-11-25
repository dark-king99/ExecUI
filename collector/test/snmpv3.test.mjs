/**
 * SNMPv3: key derivation against the RFC 3414 test vectors, then a full
 * conversation (engine discovery, signed and encrypted requests) with a fake
 * v3 device that refuses anything it can't authenticate.
 */
import test from "node:test";
import assert from "node:assert/strict";
import dgram from "node:dgram";
import crypto from "node:crypto";
import { T, encodePdu, compareOid } from "../src/snmp.js";
import { passwordToKey, localizeKey, encodeV3, decodeV3, AUTH, SessionV3 } from "../src/snmpv3.js";
import { OID, identify, cpu, openSession } from "../src/poll.js";

test("password-to-key matches RFC 3414 appendix A.3", () => {
  const engineId = Buffer.from("000000000000000000000002", "hex");
  assert.equal(passwordToKey("maplesyrup", "md5").toString("hex"), "9faf3283884e92834ebc9847d8edd963");
  assert.equal(localizeKey(passwordToKey("maplesyrup", "md5"), engineId, "md5").toString("hex"), "526f5eed9fcce26f8964c2930787d82b");
  assert.equal(passwordToKey("maplesyrup", "sha1").toString("hex"), "9fb5cc0381497b3793528939ff788d5d79145211");
  assert.equal(localizeKey(passwordToKey("maplesyrup", "sha1"), engineId, "sha1").toString("hex"), "6695febc9288e36282235fc7151f128497b38f3f");
  assert.throws(() => passwordToKey("short", "sha1"), /at least 8/);
});

// ── A fake SNMPv3 device ─────────────────────────────────────────────────────
class FakeV3Agent {
  constructor(mib, users) {
    this.engineId = Buffer.from("80001f888012345678", "hex");
    this.boots = 3;
    this.started = Date.now();
    this.users = Object.fromEntries(Object.entries(users).map(([name, u]) => [name, {
      ...u,
      authKey: u.authPassword ? localizeKey(passwordToKey(u.authPassword, AUTH[u.auth].hash), this.engineId, AUTH[u.auth].hash) : null,
      privKey: u.privPassword ? localizeKey(passwordToKey(u.privPassword, AUTH[u.auth].hash), this.engineId, AUTH[u.auth].hash) : null,
    }]));
    this.map = new Map(Object.entries(mib));
    this.oids = [...this.map.keys()].sort(compareOid);
    this.rejected = 0;
    this.socket = dgram.createSocket("udp4");
    this.socket.on("message", (buf, r) => this.handle(buf, r));
  }
  time() { return Math.floor((Date.now() - this.started) / 1000) + 1000; }
  handle(buf, rinfo) {
    const peek = decodeV3(buf);
    const send = (out) => this.socket.send(out, rinfo.port, rinfo.address);
    if (!peek.engineId.length) {
      // Discovery: answer with a Report carrying our engine id, boots and time.
      const pdu = encodePdu({ pduType: T.REPORT, requestId: 0, varbinds: [{ oid: "1.3.6.1.6.3.15.1.1.4.0", value: { type: T.COUNTER32, value: 1 } }] });
      return send(encodeV3({ msgId: peek.msgId, flags: 0, engineId: this.engineId, boots: this.boots, time: this.time(), user: "", pdu }));
    }
    const u = this.users[peek.user];
    const req = u ? decodeV3(buf, { auth: u.auth, authKey: u.authKey, privKey: u.privKey }) : null;
    if (!req || !req.authOk || !req.pdu) { this.rejected += 1; return; } // unknown user, wrong password, or tampered
    const vbs = [];
    if (req.pdu.pduType === T.GET) {
      for (const { oid } of req.pdu.varbinds) vbs.push({ oid, value: this.map.get(oid) ?? { type: T.NO_SUCH_OBJECT } });
    } else {
      let cursor = req.pdu.varbinds[0].oid;
      for (let i = 0; i < (req.pdu.pduType === T.GET_BULK ? req.pdu.b : 1); i++) {
        const next = this.oids.find((o) => compareOid(o, cursor) > 0);
        if (!next) { vbs.push({ oid: cursor, value: { type: T.END_OF_MIB_VIEW } }); break; }
        vbs.push({ oid: next, value: this.map.get(next) });
        cursor = next;
      }
    }
    const pdu = encodePdu({ pduType: T.RESPONSE, requestId: req.pdu.requestId, varbinds: vbs });
    send(encodeV3({
      msgId: req.msgId, flags: req.flags & 3, engineId: this.engineId, boots: this.boots, time: this.time(), user: peek.user,
      auth: u.auth, authKey: u.authKey, privKey: u.privKey, salt: crypto.randomBytes(8), pdu,
    }));
  }
  listen() { return new Promise((r) => this.socket.bind(0, "127.0.0.1", () => r(this.socket.address().port))); }
  close() { this.socket.close(); }
}

const MIB = {
  [OID.sysDescr]: { type: T.OCTET_STRING, value: "Cisco IOS Software, C9300" },
  [OID.sysObjectID]: { type: T.OID, value: "1.3.6.1.4.1.9.1.2494" },
  [OID.sysUpTime]: { type: T.TIMETICKS, value: 720000 },
  [OID.sysName]: { type: T.OCTET_STRING, value: "core-sw" },
  [OID.sysServices]: { type: T.INTEGER, value: 6 },
  [`${OID.hrProcessorLoad}.1`]: { type: T.INTEGER, value: 12 },
  [`${OID.hrProcessorLoad}.2`]: { type: T.INTEGER, value: 18 },
};

test("SNMPv3 against a device that checks every message", async (t) => {
  const agent = new FakeV3Agent(MIB, {
    monitor: { auth: "sha256", authPassword: "auth-pass-123", privPassword: "priv-pass-456" },
    signer: { auth: "md5", authPassword: "only-signs-1" },
  });
  const port = await agent.listen();
  t.after(() => agent.close());
  const open = (o) => openSession("127.0.0.1", { version: "v3", port, timeoutMs: 400, ...o });

  await t.test("authPriv with SHA-256 + AES: identify and walk", async () => {
    const s = open({ user: "monitor", level: "authPriv", authProtocol: "sha256", authPassword: "auth-pass-123", privProtocol: "aes", privPassword: "priv-pass-456" });
    try {
      assert.ok(s instanceof SessionV3);
      const sys = await identify(s);
      assert.equal(sys.sysName, "core-sw");
      assert.equal(await cpu(s), 15);
    } finally { s.close(); }
  });

  await t.test("authNoPriv with MD5", async () => {
    const s = open({ user: "signer", level: "authNoPriv", authProtocol: "md5", authPassword: "only-signs-1" });
    try { assert.equal((await identify(s)).sysName, "core-sw"); } finally { s.close(); }
  });

  await t.test("a wrong password gets no data", async () => {
    const before = agent.rejected;
    const s = open({ user: "monitor", level: "authPriv", authProtocol: "sha256", authPassword: "wrong-password", privProtocol: "aes", privPassword: "priv-pass-456" });
    try { assert.equal(await identify(s), null); } finally { s.close(); }
    assert.ok(agent.rejected > before, "the device refused it");
  });

  await t.test("a response that fails its signature is ignored", async () => {
    // Sign with one key, verify with another: decodeV3 must say authOk=false.
    const engineId = Buffer.from("80001f8880aa", "hex");
    const key = localizeKey(passwordToKey("auth-pass-123", "sha1"), engineId, "sha1");
    const other = localizeKey(passwordToKey("auth-pass-999", "sha1"), engineId, "sha1");
    const pdu = encodePdu({ pduType: T.RESPONSE, requestId: 1, varbinds: [] });
    const msg = encodeV3({ msgId: 9, flags: 1, engineId, boots: 1, time: 1, user: "u", auth: "sha", authKey: key, pdu });
    assert.equal(decodeV3(msg, { auth: "sha", authKey: key }).authOk, true);
    assert.equal(decodeV3(msg, { auth: "sha", authKey: other }).authOk, false);
    const tampered = Buffer.from(msg); tampered[tampered.length - 1] ^= 1;
    assert.equal(decodeV3(tampered, { auth: "sha", authKey: key }).authOk, false);
  });
});
