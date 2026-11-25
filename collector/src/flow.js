/**
 * Flow collection: NetFlow v5, NetFlow v9 and IPFIX (v10).
 *
 * Routers and firewalls export a summary of every conversation through them
 * (who talked to whom, on which protocol and port, how many bytes). The
 * collector listens for those exports on UDP, adds them up per
 * (protocol, service port) and per conversation, and hands ExecUI a compact
 * summary each cycle — never the raw records.
 *
 * Template-based formats (v9, IPFIX) describe their records in templates sent
 * every so often; data that arrives before its template is counted as
 * "waiting for template" and skipped, as every collector does.
 */
import dgram from "node:dgram";

const MAX_KEYS = 5000;           // distinct (protocol, port) buckets per cycle
const MAX_CONVERSATIONS = 5000;  // distinct conversations per cycle
const REPORT_TOP = 200;

// Field ids shared by NetFlow v9 and IPFIX.
const F = { BYTES: 1, PKTS: 2, PROTO: 4, SRC_PORT: 7, SRC_V4: 8, DST_PORT: 11, DST_V4: 12, OUT_BYTES: 23, OUT_PKTS: 24, SRC_V6: 27, DST_V6: 28, SAMPLING: 34 };

const uint = (buf, off, len) => {
  let v = 0;
  for (let i = 0; i < len; i++) v = v * 256 + buf[off + i];
  return v;
};
const ipv4 = (buf, off) => `${buf[off]}.${buf[off + 1]}.${buf[off + 2]}.${buf[off + 3]}`;
const ipv6 = (buf, off) => {
  const parts = [];
  for (let i = 0; i < 16; i += 2) parts.push(buf.readUInt16BE(off + i).toString(16));
  return parts.join(":").replace(/(^|:)0(:0)+(:|$)/, "::");
};

/** Well-known service ports: when one side of a flow is one, that's the service. */
const SERVICE_PORTS = new Set([20, 21, 22, 23, 25, 53, 67, 68, 69, 80, 110, 123, 137, 138, 139, 143, 161, 162, 389, 443, 445, 465, 514, 587, 636, 993, 995, 1194, 1433, 1521, 1723, 1883, 3306, 3389, 3478, 5060, 5061, 5222, 5432, 5900, 6379, 8080, 8443, 8801, 8802, 9100, 27017, 51820]);

/** The port that identifies the service: a known one, else the lower one. */
export function servicePort(proto, src, dst) {
  if (proto !== 6 && proto !== 17) return 0;
  if (SERVICE_PORTS.has(dst)) return dst;
  if (SERVICE_PORTS.has(src)) return src;
  return Math.min(src || 65535, dst || 65535) === 65535 ? 0 : Math.min(src, dst);
}

// ── Parsers ──────────────────────────────────────────────────────────────────
export function parseV5(buf) {
  const count = buf.readUInt16BE(2);
  const sampling = buf.readUInt16BE(22) & 0x3fff || 1;
  const out = [];
  for (let i = 0; i < count; i++) {
    const o = 24 + i * 48;
    if (o + 48 > buf.length) break;
    out.push({
      src: ipv4(buf, o), dst: ipv4(buf, o + 4),
      packets: buf.readUInt32BE(o + 16) * sampling, bytes: buf.readUInt32BE(o + 20) * sampling,
      srcPort: buf.readUInt16BE(o + 32), dstPort: buf.readUInt16BE(o + 34), proto: buf[o + 38],
    });
  }
  return out;
}

/** Records from a v9/IPFIX data set using its template. */
function readRecords(buf, start, end, template, sampling = 1) {
  const out = [];
  const fixed = template.fields.every((f) => f.length !== 0xffff);
  const recLen = fixed ? template.fields.reduce((s, f) => s + f.length, 0) : 0;
  let o = start;
  while (o < end && (!fixed || o + recLen <= end)) {
    const r = { bytes: 0, packets: 0, proto: 0, srcPort: 0, dstPort: 0, src: null, dst: null };
    for (const f of template.fields) {
      let len = f.length;
      if (len === 0xffff) { // IPFIX variable length
        len = buf[o]; o += 1;
        if (len === 255) { len = buf.readUInt16BE(o); o += 2; }
      }
      if (o + len > end) return out;
      if (f.enterprise) { o += len; continue; }
      switch (f.id) {
        case F.BYTES: case F.OUT_BYTES: r.bytes += uint(buf, o, len); break;
        case F.PKTS: case F.OUT_PKTS: r.packets += uint(buf, o, len); break;
        case F.PROTO: r.proto = buf[o]; break;
        case F.SRC_PORT: r.srcPort = uint(buf, o, len); break;
        case F.DST_PORT: r.dstPort = uint(buf, o, len); break;
        case F.SRC_V4: r.src = ipv4(buf, o); break;
        case F.DST_V4: r.dst = ipv4(buf, o); break;
        case F.SRC_V6: if (len === 16) r.src = ipv6(buf, o); break;
        case F.DST_V6: if (len === 16) r.dst = ipv6(buf, o); break;
        default: break;
      }
      o += len;
    }
    if (r.bytes || r.packets) out.push({ ...r, bytes: r.bytes * sampling, packets: r.packets * sampling });
    if (!fixed && o >= end) break;
  }
  return out;
}

/**
 * Template-based parser for v9 (`ipfix=false`) and IPFIX (`ipfix=true`).
 * `templates` persists between packets: Map(key → { fields }).
 */
export function parseTemplated(buf, templates, exporter, { ipfix = false } = {}) {
  const domain = buf.readUInt32BE(ipfix ? 12 : 16);
  const headerLen = ipfix ? 16 : 20;
  const end = ipfix ? Math.min(buf.readUInt16BE(2), buf.length) : buf.length;
  const out = [];
  let waiting = 0;
  for (let o = headerLen; o + 4 <= end;) {
    const setId = buf.readUInt16BE(o);
    const setLen = buf.readUInt16BE(o + 2);
    if (setLen < 4 || o + setLen > end) break;
    const setEnd = o + setLen;
    const isTemplate = ipfix ? setId === 2 : setId === 0;
    if (isTemplate) {
      for (let p = o + 4; p + 4 <= setEnd;) {
        const tid = buf.readUInt16BE(p);
        const count = buf.readUInt16BE(p + 2);
        p += 4;
        const fields = [];
        for (let i = 0; i < count && p + 4 <= setEnd; i++) {
          let id = buf.readUInt16BE(p);
          const length = buf.readUInt16BE(p + 2);
          p += 4;
          let enterprise = false;
          if (ipfix && id & 0x8000) { enterprise = true; id &= 0x7fff; p += 4; }
          fields.push({ id, length, enterprise });
        }
        if (tid >= 256) templates.set(`${exporter}/${domain}/${tid}`, { fields });
        if (!count) break;
      }
    } else if (setId >= 256) {
      const t = templates.get(`${exporter}/${domain}/${setId}`);
      if (t) out.push(...readRecords(buf, o + 4, setEnd, t));
      else waiting += 1;
    }
    o = setEnd;
  }
  return { records: out, waiting };
}

/** Parse one export packet (any supported version). */
export function parsePacket(buf, templates, exporter) {
  if (buf.length < 4) return { records: [], version: null };
  const version = buf.readUInt16BE(0);
  if (version === 5) return { version, records: parseV5(buf) };
  if (version === 9) return { version, ...parseTemplated(buf, templates, exporter) };
  if (version === 10) return { version, ...parseTemplated(buf, templates, exporter, { ipfix: true }) };
  return { version, records: [] };
}

// ── Aggregation ──────────────────────────────────────────────────────────────
export class FlowAggregator {
  constructor() { this.reset(); }

  reset() {
    this.since = new Date();
    this.buckets = new Map();
    this.conversations = new Map();
    this.exporters = new Set();
    this.packets = 0;
    this.records = 0;
    this.dropped = 0;
  }

  add(exporter, records) {
    this.exporters.add(exporter);
    this.packets += 1;
    for (const r of records) {
      this.records += 1;
      const port = servicePort(r.proto, r.srcPort, r.dstPort);
      const key = `${r.proto}/${port}`;
      let b = this.buckets.get(key);
      if (!b) {
        if (this.buckets.size >= MAX_KEYS) { this.dropped += 1; continue; }
        b = { protocol: r.proto, port, bytes: 0, packets: 0 };
        this.buckets.set(key, b);
      }
      b.bytes += r.bytes;
      b.packets += r.packets;
      if (r.src && r.dst) {
        const ck = `${r.src}>${r.dst}/${key}`;
        let c = this.conversations.get(ck);
        if (!c) {
          if (this.conversations.size >= MAX_CONVERSATIONS) continue;
          c = { src: r.src, dst: r.dst, protocol: r.proto, port, bytes: 0, packets: 0 };
          this.conversations.set(ck, c);
        }
        c.bytes += r.bytes;
        c.packets += r.packets;
      }
    }
  }

  /** The summary for a report, then start a new window. */
  drain() {
    const until = new Date();
    const top = (m) => [...m.values()].sort((a, b) => b.bytes - a.bytes).slice(0, REPORT_TOP);
    const summary = {
      since: this.since.toISOString(), until: until.toISOString(),
      exporters: [...this.exporters], packets: this.packets, records: this.records, dropped: this.dropped,
      byService: top(this.buckets), conversations: top(this.conversations),
    };
    this.reset();
    return summary;
  }
}

/**
 * Listen for exports. `allow(ip)` decides which exporters are accepted (by
 * default: private addresses only), so a stray sender can't fill the summary.
 */
export function listenForFlows({ port = 2055, host = "0.0.0.0", allow, log = console } = {}) {
  const aggregator = new FlowAggregator();
  const templates = new Map();
  const socket = dgram.createSocket("udp4");
  socket.on("message", (buf, rinfo) => {
    if (allow && !allow(rinfo.address)) return;
    try {
      const { records } = parsePacket(buf, templates, rinfo.address);
      aggregator.add(rinfo.address, records);
    } catch (e) {
      log.warn?.(`bad flow packet from ${rinfo.address}: ${e.message}`);
    }
  });
  socket.on("error", (e) => log.warn?.(`flow listener: ${e.message}`));
  return new Promise((resolve, reject) => {
    socket.once("error", reject);
    socket.bind(port, host, () => {
      socket.off("error", reject);
      resolve({ aggregator, port: socket.address().port, close: () => socket.close() });
    });
  });
}
