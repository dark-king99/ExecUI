/**
 * Flow collection: NetFlow v5, v9 (templates) and IPFIX packets built byte by
 * byte to the published layouts, parsed, aggregated, and received over UDP.
 */
import test from "node:test";
import assert from "node:assert/strict";
import dgram from "node:dgram";
import { parsePacket, servicePort, FlowAggregator, listenForFlows } from "../src/flow.js";
import { isPrivateIp } from "../src/agent.js";

const ip = (s) => s.split(".").map(Number);

function v5(records, { sampling = 0 } = {}) {
  const buf = Buffer.alloc(24 + records.length * 48);
  buf.writeUInt16BE(5, 0); buf.writeUInt16BE(records.length, 2);
  buf.writeUInt16BE(sampling, 22);
  records.forEach((r, i) => {
    const o = 24 + i * 48;
    Buffer.from(ip(r.src)).copy(buf, o); Buffer.from(ip(r.dst)).copy(buf, o + 4);
    buf.writeUInt32BE(r.packets, o + 16); buf.writeUInt32BE(r.bytes, o + 20);
    buf.writeUInt16BE(r.srcPort, o + 32); buf.writeUInt16BE(r.dstPort, o + 34); buf[o + 38] = r.proto;
  });
  return buf;
}

// Template 256: IN_BYTES(4) IN_PKTS(4) PROTOCOL(1) L4_SRC_PORT(2) IPV4_SRC_ADDR(4) L4_DST_PORT(2) IPV4_DST_ADDR(4)
const FIELDS = [[1, 4], [2, 4], [4, 1], [7, 2], [8, 4], [11, 2], [12, 4]];
function dataRecord(r) {
  const b = Buffer.alloc(21);
  b.writeUInt32BE(r.bytes, 0); b.writeUInt32BE(r.packets, 4); b[8] = r.proto;
  b.writeUInt16BE(r.srcPort, 9); Buffer.from(ip(r.src)).copy(b, 11); b.writeUInt16BE(r.dstPort, 15); Buffer.from(ip(r.dst)).copy(b, 17);
  return b;
}
function set(id, body) { const h = Buffer.alloc(4); h.writeUInt16BE(id, 0); h.writeUInt16BE(4 + body.length, 2); return Buffer.concat([h, body]); }
function templateBody(tid, fields, { enterpriseField = false } = {}) {
  const parts = [Buffer.from([tid >> 8, tid & 255, 0, fields.length + (enterpriseField ? 1 : 0)])];
  for (const [id, len] of fields) { const b = Buffer.alloc(4); b.writeUInt16BE(id, 0); b.writeUInt16BE(len, 2); parts.push(b); }
  if (enterpriseField) { const b = Buffer.alloc(8); b.writeUInt16BE(0x8000 | 100, 0); b.writeUInt16BE(0xffff, 2); b.writeUInt32BE(29305, 4); parts.push(b); }
  return Buffer.concat(parts);
}
function v9(sets) {
  const h = Buffer.alloc(20); h.writeUInt16BE(9, 0); h.writeUInt16BE(sets.length, 2); h.writeUInt32BE(7, 16);
  return Buffer.concat([h, ...sets]);
}
function ipfix(sets) {
  const body = Buffer.concat(sets);
  const h = Buffer.alloc(16); h.writeUInt16BE(10, 0); h.writeUInt16BE(16 + body.length, 2); h.writeUInt32BE(1, 12);
  return Buffer.concat([h, body]);
}

const HTTPS = { src: "192.168.1.20", dst: "142.250.1.1", srcPort: 51515, dstPort: 443, proto: 6, bytes: 1500000, packets: 1200 };
const DNS = { src: "192.168.1.20", dst: "192.168.1.1", srcPort: 40000, dstPort: 53, proto: 17, bytes: 3000, packets: 30 };

test("the service is the well-known port, whichever side it's on", () => {
  assert.equal(servicePort(6, 51515, 443), 443);
  assert.equal(servicePort(6, 443, 51515), 443, "a reply from the server");
  assert.equal(servicePort(17, 40000, 53), 53);
  assert.equal(servicePort(6, 40001, 40002), 40001, "unknown: the lower port");
  assert.equal(servicePort(1, 0, 0), 0, "ICMP has no ports");
});

test("NetFlow v5 records, with sampling applied", () => {
  const { records } = parsePacket(v5([HTTPS, DNS], { sampling: 0x4000 | 10 }), new Map(), "10.0.0.1");
  assert.equal(records.length, 2);
  assert.deepEqual({ ...records[0] }, { ...HTTPS, bytes: HTTPS.bytes * 10, packets: HTTPS.packets * 10 });
});

test("NetFlow v9 needs its template first, then decodes records", () => {
  const templates = new Map();
  const early = parsePacket(v9([set(256, dataRecord(HTTPS))]), templates, "10.0.0.1");
  assert.equal(early.records.length, 0);
  assert.equal(early.waiting, 1, "data before its template is skipped, not guessed");
  const r = parsePacket(v9([set(0, templateBody(256, FIELDS)), set(256, Buffer.concat([dataRecord(HTTPS), dataRecord(DNS), Buffer.alloc(2)]))]), templates, "10.0.0.1");
  assert.deepEqual(r.records.map((x) => [x.src, x.dstPort, x.bytes]), [["192.168.1.20", 443, 1500000], ["192.168.1.20", 53, 3000]]);
  // Templates are per exporter: another router's data isn't decoded with this one's.
  assert.equal(parsePacket(v9([set(256, dataRecord(HTTPS))]), templates, "10.0.0.2").records.length, 0);
});

test("IPFIX, including a variable-length enterprise field it must skip", () => {
  const templates = new Map();
  const rec = Buffer.concat([dataRecord(HTTPS), Buffer.from([5]), Buffer.from("zoom!")]);
  const r = parsePacket(ipfix([set(2, templateBody(300, FIELDS, { enterpriseField: true })), set(300, rec)]), templates, "10.0.0.1");
  assert.equal(r.records.length, 1);
  assert.equal(r.records[0].bytes, 1500000);
  assert.equal(r.records[0].dstPort, 443);
});

test("aggregation by service and by conversation", () => {
  const agg = new FlowAggregator();
  agg.add("10.0.0.1", [HTTPS, HTTPS, DNS]);
  const s = agg.drain();
  assert.deepEqual(s.byService.map((b) => [b.protocol, b.port, b.bytes]), [[6, 443, 3000000], [17, 53, 3000]]);
  assert.equal(s.conversations[0].bytes, 3000000);
  assert.deepEqual(s.exporters, ["10.0.0.1"]);
  assert.equal(agg.drain().byService.length, 0, "each window starts empty");
});

test("exports are received over UDP, from private addresses only", async () => {
  assert.equal(isPrivateIp("192.168.5.1"), true);
  assert.equal(isPrivateIp("8.8.8.8"), false);
  const listener = await listenForFlows({ port: 0, host: "127.0.0.1", allow: isPrivateIp, log: {} });
  try {
    const sock = dgram.createSocket("udp4");
    await new Promise((r) => sock.send(v5([HTTPS]), listener.port, "127.0.0.1", r));
    sock.close();
    await new Promise((r) => setTimeout(r, 100));
    const s = listener.aggregator.drain();
    assert.equal(s.byService[0].port, 443);
  } finally { listener.close(); }
});
