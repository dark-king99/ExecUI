/**
 * The collector's main loop.
 *
 *   every discovery interval  sweep the subnets in network settings; identify
 *                             what answers (SNMP, reverse DNS, MAC); read
 *                             LLDP/CDP neighbours for the map
 *   every polling interval    check every known device is reachable and read
 *                             CPU, memory and traffic from the ones with SNMP
 *   on request                run a queued "Network Discovery" job right away
 *
 * Configuration comes from ExecUI on every cycle, so changing subnets or
 * intervals in Network → Settings takes effect without touching this machine.
 */
import os from "node:os";
import { expandCidr, probeHost, arpTable, reverseDns, pool } from "./net.js";
import { openSession, identify, cpu, memory, interfaceCounters, rates, neighbours } from "./poll.js";

export const VERSION = "1.0.0";
const CONCURRENCY = 64;

export class Agent {
  constructor({ url, token, log = console, fetchImpl = fetch, once = false } = {}) {
    if (!url || !token) throw new Error("EXECUI_URL and EXECUI_COLLECTOR_TOKEN are required");
    const parsed = new URL(url);
    const local = ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname);
    // The token can read the SNMP community; it only travels over TLS.
    if (parsed.protocol !== "https:" && !local && process.env.EXECUI_ALLOW_HTTP !== "1") {
      throw new Error("EXECUI_URL must be https:// (set EXECUI_ALLOW_HTTP=1 only for a lab)");
    }
    Object.assign(this, { base: parsed.toString().replace(/\/$/, ""), token, log, fetch: fetchImpl, once });
    this.tracked = new Map();   // ip → { snmp: bool, openPorts }
    this.counters = new Map();  // ip → { at, counters }
    this.lastDiscovery = 0;
    this.config = null;
  }

  async api(method, path, body) {
    const res = await this.fetch(`${this.base}/api/collector${path}`, {
      method,
      headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json", Accept: "application/json" },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(60_000),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(`${res.status} ${data.message ?? res.statusText}`), { status: res.status });
    return data;
  }

  // ── Discovery ──────────────────────────────────────────────────────────────
  async discover(subnets) {
    const started = Date.now();
    const targets = [...new Set(subnets.flatMap((c) => { try { return expandCidr(c); } catch (e) { this.log.warn?.(`skip ${c}: ${e.message}`); return []; } }))];
    const found = [];
    await pool(targets, CONCURRENCY, async (ip) => {
      const probe = await probeHost(ip);
      if (!probe.alive) return;
      const device = await this.describe(ip, probe);
      found.push(device);
      this.tracked.set(ip, { snmp: device.snmp, openPorts: probe.openPorts });
    });
    const macs = await arpTable();
    for (const d of found) d.mac = d.mac ?? macs.get(d.ip) ?? null;

    // Neighbours from every SNMP device — this is what draws the map.
    const links = (await pool(found.filter((d) => d.snmp), 16, async (d) => {
      const s = openSession(d.ip, this.config.snmp);
      try { return await neighbours(s, d.ip); } catch { return []; } finally { s.close(); }
    })).flat();

    this.lastDiscovery = Date.now();
    this.log.info?.(`discovery: ${targets.length} addresses, ${found.length} answered, ${links.length} links, ${((Date.now() - started) / 1000).toFixed(1)}s`);
    return { devices: found, links, durationMs: Date.now() - started, scanned: targets.length };
  }

  /** Identify one live host and read its metrics. */
  async describe(ip, probe) {
    const s = openSession(ip, this.config.snmp);
    try {
      const sys = await identify(s);
      const device = {
        ip, reachable: true, latencyMs: probe.latencyMs, openPorts: probe.openPorts, snmp: !!sys,
        ...(sys ?? {}),
        hostname: sys?.sysName ?? (await reverseDns(ip)),
      };
      if (sys) Object.assign(device, await this.measure(ip, s));
      return device;
    } finally {
      s.close();
    }
  }

  async measure(ip, session) {
    const [c, m, counters] = await Promise.all([cpu(session), memory(session), interfaceCounters(session).catch(() => ({}))]);
    const prev = this.counters.get(ip);
    const now = Date.now();
    this.counters.set(ip, { at: now, counters });
    const r = prev ? rates(prev.counters, counters, (now - prev.at) / 1000) : null;
    return { cpu: c, mem: m, ...(r ? { inBps: r.inBps, outBps: r.outBps } : {}) };
  }

  // ── Polling ────────────────────────────────────────────────────────────────
  async poll() {
    for (const ip of this.config.known ?? []) if (!this.tracked.has(ip)) this.tracked.set(ip, { snmp: true, openPorts: [] });
    const ips = [...this.tracked.keys()];
    return pool(ips, CONCURRENCY, async (ip) => {
      const probe = await probeHost(ip, { ports: this.tracked.get(ip).openPorts.length ? this.tracked.get(ip).openPorts : undefined });
      if (!probe.alive) return { ip, reachable: false };
      return this.describe(ip, probe);
    });
  }

  // ── Loop ───────────────────────────────────────────────────────────────────
  async cycle() {
    this.config = await this.api("GET", "/config");
    const jobs = this.config.jobs ?? [];
    const due = Date.now() - this.lastDiscovery >= this.config.discoveryIntervalMin * 60_000;
    const report = { devices: [], links: [], jobResults: [] };

    if (due || jobs.length) {
      if (!this.config.subnets?.length) {
        report.error = "No subnets configured in Network → Settings, so there is nothing to discover.";
        for (const j of jobs) report.jobResults.push({ id: j.id, ok: false, summary: report.error });
        this.lastDiscovery = Date.now();
      } else {
        const d = await this.discover(this.config.subnets);
        report.devices = d.devices;
        report.links = d.links;
        for (const j of jobs) report.jobResults.push({ id: j.id, ok: true, durationMs: d.durationMs, summary: `Scanned ${d.scanned} addresses; ${d.devices.length} answered; ${d.links.length} links.` });
      }
    }
    // Poll everything known that the sweep didn't just measure.
    const fresh = new Set(report.devices.map((d) => d.ip));
    const polled = (await this.poll()).filter((d) => d && !fresh.has(d.ip));
    report.devices.push(...polled);

    const result = await this.api("POST", "/report", report);
    this.log.info?.(`report: ${JSON.stringify(result)}`);
    return result;
  }

  async run() {
    this.config = await this.api("POST", "/hello", { version: VERSION, hostname: os.hostname(), platform: `${os.platform()} ${os.arch()}` });
    this.log.info?.(`connected to ${this.base}; polling every ${this.config.pollingIntervalSec}s, discovering every ${this.config.discoveryIntervalMin}m`);
    let backoff = 5_000;
    for (;;) {
      try {
        await this.cycle();
        backoff = 5_000;
        if (this.once) return;
        await new Promise((r) => setTimeout(r, Math.max(30, this.config.pollingIntervalSec) * 1000));
      } catch (e) {
        if (e.status === 401) { this.log.error?.("ExecUI rejected the token (revoked?). Stopping."); throw e; }
        this.log.warn?.(`cycle failed: ${e.message}; retrying in ${backoff / 1000}s`);
        if (this.once) throw e;
        await new Promise((r) => setTimeout(r, backoff));
        backoff = Math.min(backoff * 2, 5 * 60_000);
      }
    }
  }
}
