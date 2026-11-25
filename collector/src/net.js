/**
 * Finding hosts on a LAN without special privileges.
 *
 * Reachability uses the system `ping` (no raw sockets needed) and, because many
 * hosts drop ICMP, TCP connects to common ports — a "connection refused" is as
 * good as an answer: something is there to refuse. MAC addresses come from the
 * operating system's ARP table, which the sweep itself has just populated.
 */
import { execFile } from "node:child_process";
import net from "node:net";
import fs from "node:fs/promises";
import dns from "node:dns/promises";
import os from "node:os";

export const PROBE_PORTS = [22, 80, 443, 445, 3389, 9100, 8080, 161];

const toInt = (ip) => ip.split(".").reduce((n, o) => n * 256 + Number(o), 0);
const toIp = (n) => [24, 16, 8, 0].map((s) => (n >>> s) & 255).join(".");

/** Host addresses in a CIDR (network and broadcast excluded below /31). */
export function expandCidr(cidr, { max = 4096 } = {}) {
  const [ip, bitsRaw] = String(cidr).split("/");
  const bits = Number(bitsRaw ?? 32);
  const size = 2 ** (32 - bits);
  if (size > max) throw new Error(`${cidr} is larger than ${max} addresses`);
  const base = (toInt(ip) & (bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0)) >>> 0;
  if (size <= 2) return Array.from({ length: size }, (_, i) => toIp(base + i));
  return Array.from({ length: size - 2 }, (_, i) => toIp(base + 1 + i));
}

/** Round-trip time in ms via the system ping, or null if no reply. */
export function ping(ip, { timeoutMs = 1000 } = {}) {
  const win = os.platform() === "win32";
  const args = win ? ["-n", "1", "-w", String(timeoutMs), ip]
    : os.platform() === "darwin" ? ["-c", "1", "-W", String(timeoutMs), ip]
      : ["-c", "1", "-W", String(Math.max(1, Math.ceil(timeoutMs / 1000))), ip];
  return new Promise((resolve) => {
    execFile("ping", args, { timeout: timeoutMs + 1500, windowsHide: true }, (error, stdout) => {
      if (error) return resolve(null);
      const m = String(stdout).match(/time[=<]\s*([\d.]+)\s*ms/i);
      resolve(m ? Number(m[1]) : 0.5);
    });
  });
}

/** Try one TCP port. → { open, alive, ms } */
export function tcpProbe(ip, port, { timeoutMs = 700 } = {}) {
  return new Promise((resolve) => {
    const started = Date.now();
    const socket = net.connect({ host: ip, port });
    const done = (open, alive) => { socket.destroy(); resolve({ open, alive, ms: Date.now() - started }); };
    socket.setTimeout(timeoutMs, () => done(false, false));
    socket.once("connect", () => done(true, true));
    socket.once("error", (e) => done(false, e.code === "ECONNREFUSED"));
  });
}

/** Is anything at `ip`? Ping first, then TCP. → { alive, latencyMs, openPorts } */
export async function probeHost(ip, { ports = PROBE_PORTS.filter((p) => p !== 161) } = {}) {
  const rtt = await ping(ip);
  const results = await Promise.all(ports.map((p) => tcpProbe(ip, p).then((r) => ({ port: p, ...r }))));
  const openPorts = results.filter((r) => r.open).map((r) => r.port);
  const tcpAlive = results.find((r) => r.alive);
  return {
    alive: rtt != null || !!tcpAlive,
    latencyMs: rtt ?? (tcpAlive ? tcpAlive.ms : null),
    openPorts,
  };
}

/** IP → MAC from the OS neighbour table. */
export async function arpTable() {
  const map = new Map();
  try {
    if (os.platform() === "linux") {
      const lines = (await fs.readFile("/proc/net/arp", "utf8")).split("\n").slice(1);
      for (const l of lines) {
        const [ip, , flags, hw] = l.trim().split(/\s+/);
        if (ip && hw && flags !== "0x0" && hw !== "00:00:00:00:00:00") map.set(ip, hw.toLowerCase());
      }
      return map;
    }
    const out = await new Promise((resolve) => execFile("arp", ["-a"], { timeout: 5000, windowsHide: true }, (_, stdout) => resolve(String(stdout ?? ""))));
    for (const m of out.matchAll(/(\d+\.\d+\.\d+\.\d+)\)?\s+(?:at\s+)?([0-9a-f]{1,2}[:-][0-9a-f]{1,2}[:-][0-9a-f]{1,2}[:-][0-9a-f]{1,2}[:-][0-9a-f]{1,2}[:-][0-9a-f]{1,2})/gi)) {
      map.set(m[1], m[2].toLowerCase().replace(/-/g, ":").split(":").map((x) => x.padStart(2, "0")).join(":"));
    }
  } catch { /* no neighbour table available: MACs stay unknown */ }
  return map;
}

export async function reverseDns(ip, { timeoutMs = 1500 } = {}) {
  try {
    const names = await Promise.race([dns.reverse(ip), new Promise((_, r) => setTimeout(() => r(new Error("timeout")), timeoutMs))]);
    return names?.[0] ?? null;
  } catch { return null; }
}

/** Run `fn` over `items` with at most `limit` in flight. */
export async function pool(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  }));
  return out;
}
