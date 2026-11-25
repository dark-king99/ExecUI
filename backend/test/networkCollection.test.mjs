/**
 * Network collection: settings that are really saved, collectors and their
 * tokens, what a report does to inventory/alerts/links, the map, and the
 * honest replacements for what used to be invented.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { parseCidr, isPrivate } from "../src/modules/network/network.settings.js";
import { vendorFrom, typeFrom } from "../src/modules/network/network.classify.js";
import { cleanDevice } from "../src/modules/network/network.collectors.js";

const HAS_DB = !!process.env.DATABASE_URL;

test("only private subnets of a sane size can be scanned", () => {
  assert.equal(parseCidr("192.168.1.77/24"), "192.168.1.0/24");
  assert.equal(parseCidr("10.20.0.0/20"), "10.20.0.0/20");
  assert.throws(() => parseCidr("8.8.8.0/24"), /private/);
  assert.throws(() => parseCidr("10.0.0.0/16"), /too large/);
  assert.throws(() => parseCidr("192.168.1/24"), /isn't a subnet/);
  assert.equal(isPrivate("172.31.255.255"), true);
  assert.equal(isPrivate("172.32.0.1"), false);
});

test("devices are classified from what they report", () => {
  assert.equal(vendorFrom({ sysObjectId: "1.3.6.1.4.1.14988.1" }), "MikroTik");
  assert.equal(typeFrom({ sysDescr: "RouterOS RB4011", sysServices: 78 }), "router");
  assert.equal(typeFrom({ sysDescr: "Cisco IOS Software, C2960", sysServices: 2 }), "switch");
  assert.equal(typeFrom({ sysDescr: "FortiGate-60F v7.2" }), "firewall");
  assert.equal(typeFrom({ sysDescr: "HP LaserJet M404" }), "printer");
  assert.equal(typeFrom({ openPorts: [3389] }), "endpoint");
});

test("report entries are validated and clipped", () => {
  assert.equal(cleanDevice({ ip: "999.1.1.1", reachable: true }), null);
  const d = cleanDevice({ ip: "10.0.0.5", reachable: true, cpu: 250, mac: "00-1A-2B-3C-4D-5E", sysName: "x".repeat(500) });
  assert.equal(d.cpu, 100);
  assert.equal(d.mac, "00:1a:2b:3c:4d:5e");
  assert.equal(d.hostname.length, 120);
});

test("network collection against the database", { skip: !HAS_DB && "DATABASE_URL not set" }, async (t) => {
  const { default: prisma } = await import("../src/config/database.js");
  const { runUnscoped, runWithTenant } = await import("../src/lib/tenantContext.js");
  const settings = await import("../src/modules/network/network.settings.js");
  const collectors = await import("../src/modules/network/network.collectors.js");
  const svc = await import("../src/modules/network/network.service.js");
  const { syncMonitoring } = await import("../src/modules/network/network.monitoring.js");
  const { checkCollectors } = await import("../src/modules/network/network.scheduler.js");

  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const { tenant, user } = await runUnscoped(async () => {
    const tenant = await prisma.tenant.create({ data: { name: `Net ${stamp}`, slug: `net-${stamp}`, code: `NT${stamp}`.slice(0, 12), plan: "executive" } });
    const role = await prisma.role.create({ data: { name: "enterprise_admin", tenantId: tenant.id } });
    const user = await prisma.user.create({ data: { email: `net-${stamp}@t.test`, firstName: "N", lastName: "T", passwordHash: "x", tenantId: tenant.id, roleId: role.id } });
    return { tenant, user };
  });
  const tenantId = tenant.id;
  const inT = (fn) => runWithTenant({ tenantId }, fn);

  t.after(async () => {
    await runUnscoped(async () => {
      for (const m of ["networkConfigBackup", "networkBackup", "networkFlowStat", "networkFlowConversation", "networkMetricSample", "networkLink", "networkAlert", "networkAutomationJob", "networkServer", "networkDevice", "networkCollector", "networkSettings", "auditLog"]) {
        await prisma[m].deleteMany({ where: { tenantId } }).catch(() => {});
      }
      await prisma.user.deleteMany({ where: { tenantId } });
      await prisma.role.deleteMany({ where: { tenantId } });
      await prisma.tenant.delete({ where: { id: tenantId } }).catch(() => {});
    });
  });

  await t.test("settings are saved, and secrets never come back", async () => {
    const saved = await inT(() => settings.updateSettings(tenantId, {
      subnets: "192.168.1.0/24, 10.0.5.0/24", pollingIntervalSec: 120, snmpCommunity: "s3cret-community", cpuThreshold: 80,
    }));
    assert.deepEqual(saved.subnets, ["192.168.1.0/24", "10.0.5.0/24"]);
    assert.equal(saved.hasSnmpCommunity, true);
    assert.ok(!JSON.stringify(saved).includes("s3cret"));
    const again = await inT(() => svc.getNetworkSettings(tenantId));
    assert.equal(again.pollingIntervalSec, 120, "it was really stored");
    // SNMPv3: incomplete credentials are reported to the collector, not sent half-done.
    await inT(() => settings.updateSettings(tenantId, { snmpVersion: "v3", snmpV3: { user: "monitor", level: "authPriv", authProtocol: "sha256", authPassword: "auth-pass-123" } }));
    const half = await collectors.collectorConfig(await collectors.collectorForToken((await inT(() => collectors.createCollector(tenantId, user.id, { name: "tmp" }))).token));
    assert.match(half.snmp.error, /privacy password/);
    const v3 = await inT(() => settings.updateSettings(tenantId, { snmpV3: { privPassword: "priv-pass-456" } }));
    assert.equal(v3.snmpV3.hasPrivPassword, true);
    assert.ok(!JSON.stringify(v3).includes("priv-pass-456") && !JSON.stringify(v3).includes("auth-pass-123"));
    await assert.rejects(inT(() => settings.updateSettings(tenantId, { snmpV3: { privProtocol: "des" } })), /DES/);
    await assert.rejects(inT(() => settings.updateSettings(tenantId, { snmpV3: { authPassword: "short" } })), /8–128/);
    await inT(() => settings.updateSettings(tenantId, { snmpVersion: "v2c" }));
    await assert.rejects(inT(() => settings.updateSettings(tenantId, { subnets: ["1.1.1.0/24"] })), /private/);
    const preset = await inT(() => svc.updateSettingsProfile(tenantId, "critical"));
    assert.equal(preset.pollingIntervalSec, 30, "a preset is applied, not pretended");
    await inT(() => settings.updateSettings(tenantId, { cpuThreshold: 80, autoResolveAlerts: true }));
  });

  let collector, token;
  await t.test("a collector's token works once issued and stops when revoked", async () => {
    ({ collector, token } = await inT(() => collectors.createCollector(tenantId, user.id, { name: "HQ" })));
    assert.match(token, /^exc_/);
    assert.ok(!JSON.stringify(await inT(() => collectors.listCollectors(tenantId))).includes(token), "the token is shown once only");
    const row = await collectors.collectorForToken(token);
    assert.equal(row.id, collector.id);
    const config = await collectors.collectorConfig(row, { hostname: "probe-01", version: "1.0.0" });
    assert.deepEqual(config.subnets, ["192.168.1.0/24", "10.0.5.0/24"]);
    assert.equal(config.snmp.community, "s3cret-community", "the collector, and only the collector, gets the community");
    await inT(() => settings.updateSettings(tenantId, { snmpVersion: "v3" }));
    const v3cfg = await collectors.collectorConfig(row);
    assert.deepEqual(v3cfg.snmp, { version: "v3", user: "monitor", level: "authPriv", authProtocol: "sha256", authPassword: "auth-pass-123", privProtocol: "aes", privPassword: "priv-pass-456" });
    await inT(() => settings.updateSettings(tenantId, { snmpVersion: "v2c" }));
    assert.equal(await collectors.collectorForToken("exc_not-a-real-token"), null);
  });

  const report = (devices, extra = {}) => collectors.collectorForToken(token).then((c) => collectors.ingestReport(c, { devices, ...extra }));
  let manual;
  await t.test("a report builds inventory, adopting what was typed in by hand", async () => {
    manual = await runUnscoped(() => prisma.networkDevice.create({ data: { tenantId, hostname: "Front desk PC", ip_address: "192.168.1.30", device_type: "endpoint", cpu_util: 12 } }));
    const out = await report([
      { ip: "192.168.1.1", reachable: true, snmp: true, sysName: "core-rtr", sysDescr: "RouterOS RB4011", sysObjectId: "1.3.6.1.4.1.14988.1", sysServices: 78, cpu: 30, mem: 75, inBps: 2_000_000, outBps: 1_000_000, latencyMs: 1.2 },
      { ip: "192.168.1.30", reachable: true, latencyMs: 3 },
      { ip: "8.8.8.8", reachable: true },
    ]);
    assert.equal(out.created, 1);
    assert.equal(out.skipped, 1, "a public address is never added");
    const rtr = await runUnscoped(() => prisma.networkDevice.findFirst({ where: { tenantId, ip_address: "192.168.1.1" } }));
    assert.equal(rtr.vendor, "MikroTik");
    assert.equal(rtr.device_type, "router");
    assert.equal(rtr.source, "collector");
    assert.equal(rtr.cpu_util, 30);
    const pc = await runUnscoped(() => prisma.networkDevice.findFirst({ where: { id: manual.id } }));
    assert.equal(pc.source, "collector");
    assert.equal(pc.hostname, "Front desk PC", "a name a person chose is kept");
    assert.equal(pc.metricsAt, null, "reachable isn't the same as measured");
  });

  await t.test("thresholds and outages raise one alert each, and clear themselves", async () => {
    await report([{ ip: "192.168.1.1", reachable: true, snmp: true, cpu: 95 }]);
    await report([{ ip: "192.168.1.1", reachable: true, snmp: true, cpu: 97 }]);
    const cpuAlerts = await runUnscoped(() => prisma.networkAlert.findMany({ where: { tenantId, kind: "cpu" } }));
    assert.equal(cpuAlerts.length, 1, "one condition, one alert");
    await report([{ ip: "192.168.1.1", reachable: true, snmp: true, cpu: 40 }]);
    assert.equal((await runUnscoped(() => prisma.networkAlert.findFirst({ where: { id: cpuAlerts[0].id } }))).status, "resolved");

    await report([{ ip: "192.168.1.30", reachable: false }, { ip: "192.168.1.99", reachable: false }]);
    const pc = await runUnscoped(() => prisma.networkDevice.findFirst({ where: { id: manual.id } }));
    assert.equal(pc.status, "down");
    const down = await runUnscoped(() => prisma.networkAlert.findMany({ where: { tenantId, kind: "unreachable" } }));
    assert.equal(down.length, 1, "an unknown silent address isn't news");
    assert.equal(down[0].severity, "critical");
    await report([{ ip: "192.168.1.30", reachable: true }]);
    assert.equal((await runUnscoped(() => prisma.networkAlert.findFirst({ where: { id: down[0].id } }))).status, "resolved");
  });

  await t.test("LLDP/CDP neighbours become the only links on the map", async () => {
    const lldp = { protocol: "lldp", local: { ip: "192.168.1.1" }, localPort: "ether1", remote: { name: "access-sw1", ip: "192.168.1.2", description: "Cisco IOS Software, C2960" }, remotePort: "Gi0/24" };
    // The switch reports the same cable from its side.
    const back = { protocol: "lldp", local: { ip: "192.168.1.2" }, localPort: "Gi0/24", remote: { name: "core-rtr", ip: "192.168.1.1" }, remotePort: "ether1" };
    await report([], { links: [lldp] });
    await report([], { links: [back] });
    const links = await runUnscoped(() => prisma.networkLink.findMany({ where: { tenantId } }));
    assert.equal(links.length, 1, "one cable, stored once");
    const sw = await runUnscoped(() => prisma.networkDevice.findFirst({ where: { tenantId, ip_address: "192.168.1.2" } }));
    assert.equal(sw.device_type, "switch", "a neighbour the sweep missed is still added");

    const map = await inT(() => svc.getTopologyMap(tenantId));
    assert.equal(map.links.length, 1);
    assert.equal(map.links[0].sourcePort || map.links[0].targetPort ? true : false, true);
    const pcNode = map.nodes.find((n) => n.id === manual.id);
    assert.equal(pcNode.connected, false, "the PC has no known cable, so none is drawn");
    assert.ok(!map.links.some((l) => l.source === manual.id || l.target === manual.id));

    // A cable nobody has reported for two days is no longer drawn.
    await runUnscoped(() => prisma.networkLink.updateMany({ where: { tenantId }, data: { lastSeenAt: new Date(Date.now() - 48 * 3_600_000) } }));
    assert.equal((await inT(() => svc.getTopologyMap(tenantId))).links.length, 0);
    await runUnscoped(() => prisma.networkLink.updateMany({ where: { tenantId }, data: { lastSeenAt: new Date() } }));
  });

  await t.test("NetFlow summaries become a per-application breakdown", async () => {
    const flows = await import("../src/modules/network/network.flows.js");
    assert.equal(flows.serviceName(6, 443), "HTTPS");
    assert.equal(flows.serviceName(17, 8801), "Zoom");
    assert.equal(flows.serviceName(6, 40001), "TCP 40001");
    assert.deepEqual(await inT(() => svc.getTrafficProtocols(tenantId)), [], "no flow data, no breakdown");
    await inT(() => settings.updateSettings(tenantId, { flow: { enabled: true, port: 2055 } }));
    const cfg = await collectors.collectorConfig(await collectors.collectorForToken(token));
    assert.deepEqual(cfg.flow, { enabled: true, port: 2055 });
    const until = new Date(), since = new Date(Date.now() - 60_000);
    const out = await report([], { flows: {
      since: since.toISOString(), until: until.toISOString(),
      byService: [{ protocol: 6, port: 443, bytes: 750_000, packets: 600 }, { protocol: 17, port: 53, bytes: 250_000, packets: 2000 }, { protocol: 999, port: 1, bytes: 5 }],
      conversations: [{ src: "192.168.1.20", dst: "142.250.1.1", protocol: 6, port: 443, bytes: 700_000, packets: 500 }, { src: "<script>", dst: "x", bytes: 1 }],
    } });
    assert.equal(out.flows, 3, "the invalid protocol and the junk conversation are dropped");
    const mix = await inT(() => svc.getTrafficProtocols(tenantId));
    assert.deepEqual(mix.map((m) => [m.name, m.percent]), [["HTTPS", 75], ["DNS", 25]]);
    const convs = await inT(() => svc.getTrafficConversations(tenantId));
    assert.equal(convs[0].service, "HTTPS");
    assert.equal(convs[0].src, "192.168.1.20");
  });

  await t.test("traffic is measured or it's absent", async () => {
    const tr = await inT(() => svc.getTrafficOverview(tenantId));
    assert.equal(tr.measured, true);
    const talkers = await inT(() => svc.getTopTalkers(tenantId));
    assert.equal(talkers[0].bytes, null, "no invented volume");
    await runUnscoped(() => prisma.networkDevice.updateMany({ where: { tenantId }, data: { metricsAt: null } }));
    const none = await inT(() => svc.getTrafficOverview(tenantId));
    assert.equal(none.measured, false);
    assert.equal(none.totalMbps, null);
    const dash = await inT(() => svc.getDashboardOverview(tenantId));
    assert.equal(dash.kpis.avg_cpu_util, null, "typed-in numbers aren't averaged as readings");
  });

  await t.test("what can't really happen is refused, not faked", async () => {
    const server = await runUnscoped(() => prisma.networkServer.create({ data: { tenantId, name: "db", hostname: "db", ip_address: "192.168.1.200" } }));
    await assert.rejects(inT(() => svc.restartServer(tenantId, server.id)), /can't restart/);
    await assert.rejects(inT(() => svc.syncServerMetrics(tenantId, server.id)), /No live metrics/);
    await assert.rejects(inT(() => svc.checkPolicy(tenantId, "p1")), /No compliance checks/);
    assert.deepEqual(await inT(() => svc.getFirewallLogs(tenantId)), []);

    const reboot = await inT(() => svc.createAutomationJob(tenantId, { templateId: "tpl-reboot" }));
    await assert.rejects(inT(() => svc.runAutomationJob(tenantId, reboot.id)), /no runner/);
  });

  await t.test("discovery jobs really run on the collector", async () => {
    const job = await inT(() => svc.createAutomationJob(tenantId, { templateId: "tpl-discover" }));
    await runUnscoped(() => prisma.networkCollector.update({ where: { id: collector.id }, data: { lastSeenAt: new Date() } }));
    const queued = await inT(() => svc.runAutomationJob(tenantId, job.id));
    assert.equal(queued.status, "queued");
    const cfg = await collectors.collectorConfig(await collectors.collectorForToken(token));
    assert.deepEqual(cfg.jobs.map((j) => j.id), [job.id]);
    await report([], { jobResults: [{ id: job.id, ok: true, durationMs: 4200, summary: "Scanned 508 addresses" }] });
    const done = await runUnscoped(() => prisma.networkAutomationJob.findFirst({ where: { id: job.id } }));
    assert.equal(done.status, "success");
    assert.equal(done.lastResult, "Scanned 508 addresses");
  });

  await t.test("configuration backups: versioned, encrypted, diffed, alerting on change", async () => {
    const backups = await import("../src/modules/network/network.backups.js");
    assert.equal(backups.backupCommand({ vendor: "MikroTik" }), "/export");
    assert.equal(backups.backupCommand({ sys_descr: "Cisco IOS Software, C2960" }), "show running-config");
    assert.equal(backups.backupCommand({ vendor: "HP", sys_descr: "LaserJet" }), null, "printers aren't backed up");

    const job = await inT(() => svc.createAutomationJob(tenantId, { templateId: "tpl-backup" }));
    await runUnscoped(() => prisma.networkCollector.update({ where: { id: collector.id }, data: { lastSeenAt: new Date() } }));
    await assert.rejects(inT(() => svc.runAutomationJob(tenantId, job.id)), /SSH user/);
    await inT(() => settings.updateSettings(tenantId, { backup: { sshUser: "backup" } }));
    await inT(() => svc.runAutomationJob(tenantId, job.id));
    const cfg = await collectors.collectorConfig(await collectors.collectorForToken(token));
    assert.equal(cfg.backup.sshUser, "backup");
    const backupJob = cfg.jobs.find((j) => j.kind === "config_backup");
    const rtr = await runUnscoped(() => prisma.networkDevice.findFirst({ where: { tenantId, ip_address: "192.168.1.1" } }));
    const target = backupJob.targets.find((x) => x.deviceId === rtr.id);
    assert.equal(target.command, "/export");

    const v1 = "# RouterOS\n/system identity set name=core-rtr\n/snmp community set public name=S3CRET\n";
    await report([], { backups: [{ deviceId: rtr.id, ok: true, config: v1 }], jobResults: [{ id: job.id, ok: true, summary: "Backed up 1 of 1 device." }] });
    await report([], { backups: [{ deviceId: rtr.id, ok: true, config: v1 }] });
    let versions = await inT(() => backups.listVersions(tenantId, rtr.id));
    assert.equal(versions.length, 1, "an unchanged config isn't stored twice");
    assert.equal(versions[0].changed, false);
    const raw = await runUnscoped(() => prisma.networkConfigBackup.findFirst({ where: { tenantId } }));
    assert.ok(!JSON.stringify(raw).includes("S3CRET"), "configs are ciphertext at rest");

    const v2 = v1.replace("name=core-rtr", "name=core-rtr-1") + "/ip firewall filter add chain=input action=drop\n";
    await report([], { backups: [{ deviceId: rtr.id, ok: true, config: v2 }, { deviceId: rtr.id, ok: false, error: "timeout" }] });
    versions = await inT(() => backups.listVersions(tenantId, rtr.id));
    assert.equal(versions.length, 2);
    assert.equal(versions[0].changed, true);
    const changeAlert = await runUnscoped(() => prisma.networkAlert.findFirst({ where: { tenantId, kind: { startsWith: `config:${rtr.id}` } } }));
    assert.match(changeAlert.title, /Configuration changed/);
    const diff = await inT(() => backups.diffVersion(tenantId, versions[0].id, user.id));
    assert.deepEqual(diff.lines.map((l) => `${l.op}${l.text}`), ["-/system identity set name=core-rtr", "+/system identity set name=core-rtr-1", "+/ip firewall filter add chain=input action=drop"]);
    const full = await inT(() => backups.getVersion(tenantId, versions[0].id, user.id));
    assert.match(full.content, /core-rtr-1/);
    assert.equal(await runUnscoped(() => prisma.auditLog.count({ where: { tenantId, action: "network.config.viewed" } })), 1, "viewing a config is audited");
    assert.equal(await runUnscoped(() => prisma.networkBackup.count({ where: { tenantId, status: "failed" } })), 1);
    assert.equal((await runUnscoped(() => prisma.networkAutomationJob.findFirst({ where: { id: job.id } }))).status, "success");
  });

  await t.test("a silent collector raises an alert; a revoked one is locked out", async () => {
    await runUnscoped(() => prisma.networkCollector.update({ where: { id: collector.id }, data: { lastSeenAt: new Date(Date.now() - 30 * 60_000) } }));
    await checkCollectors();
    assert.equal(await runUnscoped(() => prisma.networkAlert.count({ where: { tenantId, kind: `collector:${collector.id}`, status: "open" } })), 1);
    await inT(() => collectors.revokeCollector(tenantId, user.id, collector.id));
    assert.equal(await collectors.collectorForToken(token), null);
  });

  await t.test("LibreNMS devices, traffic and links are imported", async () => {
    await inT(() => settings.updateSettings(tenantId, { monitoring: { tool: "librenms", url: "https://nms.example.test", token: "lnms-token" } }));
    const original = globalThis.fetch;
    const seen = [];
    const added = [];
    let openAlerts = [{ id: 501, device_id: 8, rule_id: 4, state: 1, severity: "critical", timestamp: "2026-11-25 10:00:00" }];
    globalThis.fetch = async (url, init) => {
      seen.push([String(url), init.headers["X-Auth-Token"]]);
      const path = new URL(url).pathname + new URL(url).search;
      const json = (b) => new Response(JSON.stringify(b), { headers: { "Content-Type": "application/json" } });
      if (path === "/api/v0/devices" && init.method === "POST") { added.push(JSON.parse(init.body)); return json({ status: "ok" }); }
      if (path.startsWith("/api/v0/devices")) return json({ status: "ok", devices: [
        { device_id: 7, hostname: "10.0.5.1", sysName: "branch-fw", ip: "10.0.5.1", status: 1, uptime: 86400, type: "firewall", sysDescr: "FortiGate-40F", location: "Branch" },
        { device_id: 8, hostname: "10.0.5.2", sysName: "branch-sw", ip: "10.0.5.2", status: 0, type: "network", sysDescr: "Cisco IOS Software, C1000" },
      ] });
      if (path.startsWith("/api/v0/ports")) return json({ status: "ok", ports: [{ device_id: 7, ifInOctets_rate: 1000, ifOutOctets_rate: 500 }] });
      if (path.startsWith("/api/v0/resources/links")) return json({ status: "ok", links: [{ local_device_id: 7, local_port_id: 3, remote_device_id: 8, remote_port: "Gi1/0/1", protocol: "lldp" }] });
      if (path.startsWith("/api/v0/alerts")) return json({ status: "ok", alerts: openAlerts });
      if (path.startsWith("/api/v0/rules")) return json({ status: "ok", rules: [{ id: 4, name: "Device Down! Due to no ICMP response." }] });
      return new Response("{}", { status: 404 });
    };
    try {
      // A collector-found SNMP device LibreNMS doesn't know yet gets pushed to it.
      await runUnscoped(() => prisma.networkDevice.create({ data: { tenantId, hostname: "lab-sw", ip_address: "10.0.5.40", device_type: "switch", source: "collector", snmp: true } }));
      await inT(() => settings.updateSettings(tenantId, { monitoring: { tool: "librenms", url: "https://nms.example.test", autoAdd: true } }));
      const out = await syncMonitoring(tenantId);
      assert.equal(out.devices, 2);
      assert.equal(out.links, 1);
      assert.deepEqual(out.alerts, { open: 1, opened: 1, resolved: 0 });
      // Every collector-found SNMP device LibreNMS doesn't have yet — the router from earlier and lab-sw.
      assert.deepEqual(added.map((a) => [a.hostname, a.version]).sort(), [["10.0.5.40", "v2c"], ["192.168.1.1", "v2c"]]);
      const down = await runUnscoped(() => prisma.networkAlert.findFirst({ where: { tenantId, kind: "librenms:501" } }));
      assert.equal(down.severity, "critical");
      assert.match(down.title, /Device Down.*branch-sw/);
      // Cleared in LibreNMS → resolved here; the pushed device isn't pushed again.
      openAlerts = [];
      const again = await syncMonitoring(tenantId);
      assert.equal(again.alerts.resolved, 1);
      assert.equal(added.length, 2, "nothing is pushed twice");
    } finally { globalThis.fetch = original; }
    assert.ok(seen.every(([, tok]) => tok === "lnms-token"));
    const fw = await runUnscoped(() => prisma.networkDevice.findFirst({ where: { tenantId, externalRef: "librenms:7" } }));
    assert.equal(fw.source, "monitoring");
    assert.equal(fw.device_type, "firewall");
    assert.equal(fw.in_bps, 8000, "octets/s → bits/s");
    const sw = await runUnscoped(() => prisma.networkDevice.findFirst({ where: { tenantId, externalRef: "librenms:8" } }));
    assert.equal(sw.status, "down");
    assert.ok(!JSON.stringify(await inT(() => svc.getNetworkSettings(tenantId))).includes("lnms-token"));
    const listed = await inT(() => svc.listDevices(tenantId));
    assert.equal(listed.find((d) => d.externalRef === "librenms:7").externalUrl, "https://nms.example.test/device/device=7/");
  });
});

test("social publishing records no invented engagement", { skip: !HAS_DB && "DATABASE_URL not set" }, async () => {
  const { syncEngagements } = await import("../src/modules/marketing/social/social.service.js");
  const { default: prisma } = await import("../src/config/database.js");
  const { runUnscoped, runWithTenant } = await import("../src/lib/tenantContext.js");
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const tenant = await runUnscoped(() => prisma.tenant.create({ data: { name: `Soc ${stamp}`, slug: `soc-${stamp}`, code: `SC${stamp}`.slice(0, 12), plan: "executive" } }));
  try {
    const r = await runWithTenant({ tenantId: tenant.id }, () => syncEngagements(tenant.id));
    assert.equal(r.synced, 0);
    assert.equal(await runUnscoped(() => prisma.socialEngagement.count({ where: { tenantId: tenant.id } })), 0, "no sample comments are created");
  } finally {
    await runUnscoped(() => prisma.tenant.delete({ where: { id: tenant.id } }));
  }
});
