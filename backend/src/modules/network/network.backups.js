/**
 * Device configuration backups.
 *
 * A "Config Backup" job is queued (by a person, or daily when enabled in
 * settings). The collector receives each target with the read-only command
 * for its vendor, fetches the configuration over SSH with a key that never
 * leaves the collector machine, and reports the text. Here it is:
 *   • stored encrypted, and only when it differs from the last version;
 *   • a change raises an info alert (and a chat post) — config drift is
 *     exactly what someone wants to know about;
 *   • kept to the last 30 versions per device;
 *   • viewable and diffable by people who may manage network collection.
 */
import crypto from "crypto";
import prisma from "../../config/database.js";
import { encryptSecret, decryptSecret } from "../../lib/secrets.js";
import { notifyChat } from "../connections/chat.service.js";

const err = (message, status = 400) => Object.assign(new Error(message), { status });
export const KEEP_VERSIONS = 30;
const MAX_CONFIG = 2 * 1024 * 1024;

/** The read-only command that prints a device's configuration, by vendor/OS. */
export function backupCommand(device) {
  const d = `${device.vendor ?? ""} ${device.sys_descr ?? ""} ${device.os ?? ""}`.toLowerCase();
  if (/mikrotik|routeros/.test(d)) return "/export";
  if (/juniper|junos/.test(d)) return "show configuration | display set";
  if (/fortinet|fortigate|fortios/.test(d)) return "show full-configuration";
  if (/huawei|h3c|comware|vrp/.test(d)) return "display current-configuration";
  if (/cisco|arista|eos|ios|nx-os|procurve|aruba|dell|brocade|extreme/.test(d)) return "show running-config";
  return null;
}

/** Targets for a backup job: every device with an address and a known command. */
export async function backupTargets(tenantId) {
  const devices = await prisma.networkDevice.findMany({
    where: { tenantId, ip_address: { not: "" }, device_type: { in: ["router", "switch", "firewall", "wireless"] } },
    select: { id: true, ip_address: true, vendor: true, sys_descr: true, os: true },
    take: 500,
  });
  return devices.map((d) => ({ deviceId: d.id, ip: d.ip_address, command: backupCommand(d) })).filter((t) => t.command);
}

/** Store the results a collector reported. */
export async function ingestBackups(tenantId, collectorId, results) {
  const out = { stored: 0, unchanged: 0, failed: 0 };
  for (const r of (Array.isArray(results) ? results : []).slice(0, 500)) {
    const device = typeof r?.deviceId === "string" ? await prisma.networkDevice.findFirst({ where: { id: r.deviceId, tenantId } }) : null;
    if (!device) continue;
    if (!r.ok || typeof r.config !== "string" || !r.config.trim()) {
      out.failed += 1;
      await prisma.networkBackup.create({ data: { tenantId, device_name: device.hostname, backup_type: "config", status: "failed", size_gb: 0 } });
      continue;
    }
    const config = r.config.slice(0, MAX_CONFIG).replace(/\r\n/g, "\n");
    const sha256 = crypto.createHash("sha256").update(config).digest("hex");
    const last = await prisma.networkConfigBackup.findFirst({ where: { tenantId, deviceId: device.id }, orderBy: { takenAt: "desc" } });
    await prisma.networkBackup.create({ data: { tenantId, device_name: device.hostname, backup_type: "config", status: "success", size_gb: Buffer.byteLength(config) / 1024 ** 3 } });
    if (last?.sha256 === sha256) { out.unchanged += 1; continue; }

    const e = encryptSecret(config);
    await prisma.networkConfigBackup.create({
      data: {
        tenantId, deviceId: device.id, collectorId, sha256, size: Buffer.byteLength(config), lines: config.split("\n").length,
        changed: !!last, contentCipher: e.ciphertext, contentIv: e.iv, contentTag: e.tag,
      },
    });
    out.stored += 1;
    if (last) {
      const title = `Configuration changed on ${device.hostname}`;
      await prisma.networkAlert.create({ data: { tenantId, deviceId: device.id, kind: `config:${device.id}:${sha256.slice(0, 12)}`, severity: "info", status: "open", title, message: "A new version was backed up. Compare it with the previous one in Network → Devices." } });
      notifyChat(tenantId, "network_alerts", { title: `📝 ${title}`, text: "Compare versions in ExecUI.", link: "/network/inventory" });
    }
    // Keep the newest versions only.
    const old = await prisma.networkConfigBackup.findMany({ where: { tenantId, deviceId: device.id }, orderBy: { takenAt: "desc" }, skip: KEEP_VERSIONS, select: { id: true } });
    if (old.length) await prisma.networkConfigBackup.deleteMany({ where: { id: { in: old.map((o) => o.id) } } });
  }
  return out;
}

const versionShape = (v) => ({ id: v.id, deviceId: v.deviceId, takenAt: v.takenAt, size: v.size, lines: v.lines, changed: v.changed, sha256: v.sha256 });

export async function listVersions(tenantId, deviceId) {
  const rows = await prisma.networkConfigBackup.findMany({ where: { tenantId, deviceId: String(deviceId) }, orderBy: { takenAt: "desc" }, take: KEEP_VERSIONS });
  return rows.map(versionShape);
}

async function load(tenantId, id) {
  const v = await prisma.networkConfigBackup.findFirst({ where: { id: String(id), tenantId } });
  if (!v) throw err("Backup not found", 404);
  return { v, text: decryptSecret({ ciphertext: v.contentCipher, iv: v.contentIv, tag: v.contentTag }) };
}

export async function getVersion(tenantId, id, actorId) {
  const { v, text } = await load(tenantId, id);
  // Configs carry secrets: viewing one is worth a line in the audit log.
  await prisma.auditLog.create({ data: { tenantId, userId: actorId, action: "network.config.viewed", resource: "config_backup", resourceId: v.id, detail: `Viewed configuration backup of device ${v.deviceId}` } }).catch(() => {});
  return { ...versionShape(v), content: text };
}

/**
 * Line diff of a version against the one before it (or `against`).
 * Common head/tail are trimmed first; a middle too large to compare line by
 * line is reported as such rather than diffed badly.
 */
export function diffLines(a, b, { maxMiddle = 3000 } = {}) {
  const x = a.split("\n"), y = b.split("\n");
  let head = 0;
  while (head < x.length && head < y.length && x[head] === y[head]) head += 1;
  let tail = 0;
  while (tail < x.length - head && tail < y.length - head && x[x.length - 1 - tail] === y[y.length - 1 - tail]) tail += 1;
  const xm = x.slice(head, x.length - tail), ym = y.slice(head, y.length - tail);
  if (xm.length > maxMiddle || ym.length > maxMiddle) return { tooLarge: true, removed: xm.length, added: ym.length, lines: [] };
  // LCS table (Uint16 rows are enough for ≤ 3000 lines).
  const n = xm.length, m = ym.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = xm[i] === ym[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const lines = [];
  let i = 0, j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && xm[i] === ym[j]) { i += 1; j += 1; continue; }
    // On a tie, removals come before additions (the usual diff order).
    if (i < n && (j >= m || dp[i + 1][j] >= dp[i][j + 1])) { lines.push({ op: "-", line: head + i + 1, text: xm[i] }); i += 1; }
    else { lines.push({ op: "+", line: head + j + 1, text: ym[j] }); j += 1; }
  }
  return { tooLarge: false, added: lines.filter((l) => l.op === "+").length, removed: lines.filter((l) => l.op === "-").length, lines };
}

export async function diffVersion(tenantId, id, actorId) {
  const { v, text } = await load(tenantId, id);
  const prev = await prisma.networkConfigBackup.findFirst({ where: { tenantId, deviceId: v.deviceId, takenAt: { lt: v.takenAt } }, orderBy: { takenAt: "desc" } });
  if (!prev) return { first: true, ...versionShape(v), added: v.lines, removed: 0, lines: [] };
  const before = decryptSecret({ ciphertext: prev.contentCipher, iv: prev.contentIv, tag: prev.contentTag });
  await prisma.auditLog.create({ data: { tenantId, userId: actorId, action: "network.config.diffed", resource: "config_backup", resourceId: v.id, detail: `Compared configuration versions of device ${v.deviceId}` } }).catch(() => {});
  return { first: false, from: versionShape(prev), to: versionShape(v), ...diffLines(before, text) };
}

/** Queue the daily backup job for tenants that turned it on. */
export async function queueDailyBackups(now = new Date()) {
  const due = await prisma.networkSettings.findMany({
    where: { backupEnabled: true, OR: [{ backupLastQueuedAt: null }, { backupLastQueuedAt: { lt: new Date(now.getTime() - 23 * 3_600_000) } }] },
    select: { tenantId: true },
  });
  for (const { tenantId } of due) {
    let job = await prisma.networkAutomationJob.findFirst({ where: { tenantId, kind: "config_backup" } });
    if (!job) {
      job = await prisma.networkAutomationJob.create({
        data: { tenantId, name: "Nightly Config Backup", kind: "config_backup", trigger: "schedule", targets: "Routers, switches, firewalls", steps: ["Fetch configuration over SSH", "Compare with last version", "Store if changed"], description: "Daily backup of device configurations, run by your collector." },
      });
    }
    if (!["queued", "running"].includes(job.status)) await prisma.networkAutomationJob.update({ where: { id: job.id }, data: { status: "queued" } });
    await prisma.networkSettings.update({ where: { tenantId }, data: { backupLastQueuedAt: now } });
  }
  return due.length;
}
