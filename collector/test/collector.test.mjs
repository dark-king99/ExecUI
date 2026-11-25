/**
 * The collector against a fake SNMP device.
 *
 * `FakeAgent` is a real UDP SNMP responder (built on the same BER codec, and
 * checked independently by the round-trip tests) serving a small MIB: a
 * MikroTik-like router with two CPUs, memory, two interfaces whose counters
 * advance between polls, one LLDP neighbour and one CDP neighbour.
 */
import test from "node:test";
import assert from "node:assert/strict";
import dgram from "node:dgram";
import { T, encodeMessage, decodeMessage, encOid, Session, compareOid } from "../src/snmp.js";
import { expandCidr } from "../src/net.js";
import { OID, identify, cpu, memory, interfaceCounters, rates, neighbours, openSession } from "../src/poll.js";
import { Agent } from "../src/agent.js";

// ── A fake SNMP device ───────────────────────────────────────────────────────
class FakeAgent {
  constructor(mib, { community = "public" } = {}) {
    this.community = community;
    this.set(mib);
    this.socket = dgram.createSocket("udp4");
    this.socket.on("message", (buf, rinfo) => {
      const req = decodeMessage(buf);
      if (req.community !== this.community) return; // wrong community: silence, like a real device
      let vbs = [];
      if (req.pduType === T.GET) {
        vbs = req.varbinds.map(({ oid }) => ({ oid, value: this.map.get(oid) ?? { type: T.NO_SUCH_OBJECT } }));
      } else {
        const reps = req.pduType === T.GET_BULK ? req.b : 1;
        let cursor = req.varbinds[0].oid;
        for (let i = 0; i < reps; i++) {
          const next = this.oids.find((o) => compareOid(o, cursor) > 0);
          if (!next) { vbs.push({ oid: cursor, value: { type: T.END_OF_MIB_VIEW } }); break; }
          vbs.push({ oid: next, value: this.map.get(next) });
          cursor = next;
        }
      }
      const out = encodeMessage({ version: req.version, community: req.community, pduType: T.RESPONSE, requestId: req.requestId, varbinds: vbs });
      this.socket.send(out, rinfo.port, rinfo.address);
    });
  }
  set(mib) {
    this.map = new Map(Object.entries(mib));
    this.oids = [...this.map.keys()].sort(compareOid);
  }
  listen() { return new Promise((r) => this.socket.bind(0, "127.0.0.1", () => r(this.socket.address().port))); }
  close() { this.socket.close(); }
}

const S = (v) => ({ type: T.OCTET_STRING, value: v });
const I = (v) => ({ type: T.INTEGER, value: v });
const C64 = (v) => ({ type: T.COUNTER64, value: v });

function routerMib({ octetsIn = 1_000_000, octetsOut = 2_000_000 } = {}) {
  return {
    [OID.sysDescr]: S("RouterOS RB4011iGS+"),
    [OID.sysObjectID]: { type: T.OID, value: "1.3.6.1.4.1.14988.1" },
    [OID.sysUpTime]: { type: T.TIMETICKS, value: 360000 },
    [OID.sysName]: S("core-rtr"),
    [OID.sysServices]: I(78),
    [`${OID.hrProcessorLoad}.1`]: I(20),
    [`${OID.hrProcessorLoad}.2`]: I(40),
    [OID.ucdMemTotal]: I(1000),
    [OID.ucdMemAvail]: I(250),
    [`${OID.ifName}.1`]: S("ether1"), [`${OID.ifName}.2`]: S("ether2"), [`${OID.ifName}.9`]: S("lo"),
    [`${OID.ifOperStatus}.1`]: I(1), [`${OID.ifOperStatus}.2`]: I(1), [`${OID.ifOperStatus}.9`]: I(1),
    [`${OID.ifHCIn}.1`]: C64(octetsIn), [`${OID.ifHCIn}.2`]: C64(0), [`${OID.ifHCIn}.9`]: C64(5),
    [`${OID.ifHCOut}.1`]: C64(octetsOut), [`${OID.ifHCOut}.2`]: C64(0), [`${OID.ifHCOut}.9`]: C64(5),
    // LLDP neighbour on local port 1: switch "access-sw1", port "Gi0/24", mgmt 192.168.1.2
    [`${OID.lldpLocPortDesc}.1`]: S("ether1"),
    [`${OID.lldpRemChassisIdSubtype}.0.1.1`]: I(4),
    [`${OID.lldpRemChassisId}.0.1.1`]: S(Buffer.from([0x00, 0x1a, 0x2b, 0x3c, 0x4d, 0x5e])),
    [`${OID.lldpRemPortId}.0.1.1`]: S("Gi0/24"),
    [`${OID.lldpRemSysName}.0.1.1`]: S("access-sw1"),
    [`${OID.lldpRemSysDesc}.0.1.1`]: S("Cisco IOS Software, C2960"),
    [`${OID.lldpRemManAddrIfSubtype}.0.1.1.1.4.192.168.1.2`]: I(2),
    // CDP neighbour on ifIndex 2: phone
    [`${OID.cdpCacheDeviceId}.2.1`]: S("SEP001122334455"),
    [`${OID.cdpCacheDevicePort}.2.1`]: S("Port 1"),
    [`${OID.cdpCacheAddress}.2.1`]: S(Buffer.from([192, 168, 1, 50])),
    [`${OID.cdpCachePlatform}.2.1`]: S("Cisco IP Phone 7841"),
  };
}

// ── Codec ────────────────────────────────────────────────────────────────────
test("BER round-trips every type the collector reads", () => {
  const varbinds = [
    { oid: "1.3.6.1.2.1.1.1.0", value: S("hello") },
    { oid: "1.3.6.1.2.1.1.2.0", value: { type: T.OID, value: "1.3.6.1.4.1.14988.1" } },
    { oid: "1.3.6.1.2.1.2.2.1.8.1", value: I(-129) },
    { oid: "1.3.6.1.2.1.31.1.1.1.6.1", value: C64(2 ** 40 + 7) },
    { oid: "1.3.6.1.2.1.2.2.1.10.1", value: { type: T.COUNTER32, value: 4294967295 } },
    { oid: "1.3.6.1.4.1.9.9.23.1.2.1.1.4.2.1", value: { type: T.IP_ADDRESS, value: "10.0.0.1" } },
    { oid: "1.0.8802.1.1.2.1.4.1.1.9.0.1.1", value: { type: T.NO_SUCH_INSTANCE } },
  ];
  const msg = decodeMessage(encodeMessage({ version: 1, community: "s3cret", pduType: T.RESPONSE, requestId: 123456, varbinds }));
  assert.equal(msg.community, "s3cret");
  assert.equal(msg.requestId, 123456);
  assert.equal(msg.varbinds[0].value.toString(), "hello");
  assert.equal(msg.varbinds[1].value, "1.3.6.1.4.1.14988.1");
  assert.equal(msg.varbinds[2].value, -129);
  assert.equal(msg.varbinds[3].value, 2 ** 40 + 7);
  assert.equal(msg.varbinds[4].value, 4294967295);
  assert.equal(msg.varbinds[5].value, "10.0.0.1");
  assert.equal(msg.varbinds[6].type, T.NO_SUCH_INSTANCE);
  // Multi-byte arcs and long lengths.
  assert.ok(encOid("1.3.6.1.4.1.2636.3.1.13.1.8").length > 10);
  assert.equal(decodeMessage(encodeMessage({ pduType: T.RESPONSE, requestId: 1, varbinds: [{ oid: "1.3.6.1.2.1.1.1.0", value: S("x".repeat(300)) }] })).varbinds[0].value.length, 300);
});

test("OIDs order numerically, not as text", () => {
  assert.ok(compareOid("1.3.6.1.2.1.2.2.1.10", "1.3.6.1.2.1.2.2.1.9") > 0);
});

test("a subnet expands to its host addresses", () => {
  const hosts = expandCidr("192.168.1.0/30");
  assert.deepEqual(hosts, ["192.168.1.1", "192.168.1.2"]);
  assert.equal(expandCidr("10.0.0.0/24").length, 254);
  assert.throws(() => expandCidr("10.0.0.0/8"), /larger/);
});

test("traffic rates come from counter deltas; a reset is skipped, a 32-bit wrap isn't", () => {
  const prev = { 1: { in: 1000, out: 0, bits: 64, up: true }, 2: { in: 4294967000, out: 0, bits: 32, up: true }, 3: { in: 900, out: 0, bits: 64, up: true } };
  const curr = { 1: { in: 2000, out: 500, bits: 64, up: true }, 2: { in: 704, out: 0, bits: 32, up: true }, 3: { in: 100, out: 0, bits: 64, up: true } };
  const r = rates(prev, curr, 10);
  // if1: 1000 octets/10s = 800 bps in; if2 wrapped by 1000 octets = 800 bps; if3 reset → skipped
  assert.equal(r.inBps, 1600);
  assert.equal(r.outBps, 400);
  assert.equal(rates(null, curr, 10), null, "no previous poll, no rate — never a guess");
});

// ── Against the fake device ──────────────────────────────────────────────────
test("SNMP polling of a real UDP device", async (t) => {
  const agent = new FakeAgent(routerMib());
  const port = await agent.listen();
  t.after(() => agent.close());
  const session = (opts = {}) => openSession("127.0.0.1", { port, timeoutMs: 400, ...opts });

  await t.test("identifies the device", async () => {
    const s = session();
    try {
      const sys = await identify(s);
      assert.equal(sys.sysName, "core-rtr");
      assert.equal(sys.sysObjectId, "1.3.6.1.4.1.14988.1");
      assert.equal(sys.uptimeSec, 3600);
    } finally { s.close(); }
  });

  await t.test("reads CPU and memory", async () => {
    const s = session();
    try {
      assert.equal(await cpu(s), 30, "average of both processors");
      assert.equal(await memory(s), 75, "(total − available) / total");
    } finally { s.close(); }
  });

  await t.test("walks work over GETNEXT (v1) as well as GETBULK (v2c)", async () => {
    for (const version of ["v1", "v2c"]) {
      const s = session({ version });
      try {
        const rows = await s.walk(OID.hrProcessorLoad);
        assert.deepEqual(rows.map((r) => r.value), [20, 40], version);
      } finally { s.close(); }
    }
  });

  await t.test("interface counters skip loopback", async () => {
    const s = session();
    try {
      const c = await interfaceCounters(s);
      assert.deepEqual(Object.values(c).map((i) => i.name).sort(), ["ether1", "ether2"]);
    } finally { s.close(); }
  });

  await t.test("LLDP and CDP neighbours become links", async () => {
    const s = session();
    try {
      const links = await neighbours(s, "192.168.1.1");
      const lldp = links.find((l) => l.protocol === "lldp");
      assert.deepEqual(lldp.remote, { name: "access-sw1", ip: "192.168.1.2", chassisId: "00:1a:2b:3c:4d:5e", description: "Cisco IOS Software, C2960" });
      assert.equal(lldp.localPort, "ether1");
      assert.equal(lldp.remotePort, "Gi0/24");
      const cdp = links.find((l) => l.protocol === "cdp");
      assert.equal(cdp.remote.ip, "192.168.1.50");
      assert.equal(cdp.localPort, "ether2", "local port named from ifName");
    } finally { s.close(); }
  });

  await t.test("a wrong community gets silence, not data", async () => {
    const s = session({ community: "wrong" });
    try { assert.equal(await identify(s), null); } finally { s.close(); }
  });
});

test("one collector cycle, end to end", async (t) => {
  const device = new FakeAgent(routerMib());
  const port = await device.listen();
  t.after(() => device.close());

  const reports = [];
  const config = {
    pollingIntervalSec: 60, discoveryIntervalMin: 60, subnets: ["127.0.0.1/32"],
    snmp: { version: "v2c", community: "public", port, timeoutMs: 400 }, known: [], jobs: [{ id: "job-1", kind: "discovery" }],
  };
  const fakeFetch = async (url, init) => {
    const path = new URL(url).pathname;
    if (path.endsWith("/config") || path.endsWith("/hello")) return new Response(JSON.stringify(config));
    if (path.endsWith("/report")) { reports.push(JSON.parse(init.body)); return new Response(JSON.stringify({ ok: true })); }
    return new Response("{}", { status: 404 });
  };
  const agent = new Agent({ url: "http://127.0.0.1:1", token: "exc_test", fetchImpl: fakeFetch, log: {} });
  // Loopback refuses TCP on closed ports, which counts as "something is there".
  agent.config = config;
  await agent.cycle();
  device.set(routerMib({ octetsIn: 1_000_000 + 125_000, octetsOut: 2_000_000 }));
  agent.counters.set("127.0.0.1", { ...agent.counters.get("127.0.0.1"), at: Date.now() - 10_000 });
  config.jobs = [];
  await agent.cycle();

  const first = reports[0];
  const router = first.devices.find((d) => d.ip === "127.0.0.1");
  assert.equal(router.sysName, "core-rtr");
  assert.equal(router.cpu, 30);
  assert.equal(router.inBps, undefined, "no traffic figure until there are two readings");
  assert.equal(first.links.length, 2);
  assert.deepEqual(first.jobResults.map((j) => [j.id, j.ok]), [["job-1", true]]);

  const second = reports[1].devices.find((d) => d.ip === "127.0.0.1");
  assert.ok(Math.abs(second.inBps - 100_000) < 2_000, `≈ 125 kB over ~10 s = 100 kbit/s, got ${second.inBps}`);
});

test("the token never travels over plain http to a remote host", () => {
  assert.throws(() => new Agent({ url: "http://execui.example.com", token: "exc_x" }), /https/);
  assert.doesNotThrow(() => new Agent({ url: "https://execui.example.com", token: "exc_x" }));
});
