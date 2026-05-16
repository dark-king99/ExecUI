import prisma from "../../config/database.js";

// ── Dashboard Overview ────────────────────────────────────────────────────────

export async function getDashboardOverview(tenantId) {
  const [
    totalDevices,
    serversTotal,
    serversOnline,
    endpointsTotal,
    endpointsUp,
    cloudDevices,
    activeAlerts,
    criticalAlerts,
    openIncidents,
    utilAgg,
    cloudRegions,
  ] = await Promise.all([
    prisma.networkDevice.count({ where: { tenantId } }),
    prisma.networkDevice.count({ where: { tenantId, device_type: "server" } }),
    prisma.networkDevice.count({ where: { tenantId, device_type: "server", status: "up" } }),
    prisma.networkDevice.count({ where: { tenantId, device_type: "endpoint" } }),
    prisma.networkDevice.count({ where: { tenantId, device_type: "endpoint", status: "up" } }),
    prisma.networkDevice.count({ where: { tenantId, device_type: "cloud" } }),
    prisma.networkDevice.count({ where: { tenantId, status: { not: "up" } } }),
    prisma.networkAlert.count({ where: { tenantId, severity: "critical", status: "open" } }),
    prisma.networkIncident.count({ where: { tenantId, status: { notIn: ["resolved", "closed"] } } }),
    prisma.networkDevice.aggregate({ where: { tenantId }, _avg: { cpu_util: true, mem_util: true } }),
    prisma.networkDevice.findMany({
      where: { tenantId, region: { not: null } },
      select: { region: true },
      distinct: ["region"],
    }),
  ]);

  const avgCpu = Math.round(utilAgg._avg.cpu_util ?? 0);
  const avgMem = Math.round(utilAgg._avg.mem_util ?? 0);
  const endpointsHealthyPct = endpointsTotal > 0
    ? Math.round((endpointsUp / endpointsTotal) * 100)
    : 100;

  // Derive health statuses
  const networkStatus  = activeAlerts === 0 ? "Operational" : criticalAlerts > 0 ? "Degraded" : "Warning";
  const endpointHealth = endpointsHealthyPct >= 95 ? "Good" : endpointsHealthyPct >= 80 ? "Fair" : "At Risk";
  const serverLoad     = avgCpu < 50 ? "Normal" : avgCpu < 75 ? "Moderate" : "High";
  const securePosture  = criticalAlerts === 0 ? "Secure" : "At Risk";

  // Cloud control
  const openIncidentWarning = openIncidents > 0;

  return {
    kpis: {
      total_devices: totalDevices,
      servers_online: serversOnline,
      servers_total: serversTotal,
      active_alerts: activeAlerts,
      endpoints_healthy_pct: endpointsHealthyPct,
      cloud_regions: cloudRegions.length,
      avg_cpu_util: avgCpu,
      avg_mem_util: avgMem,
    },
    health: {
      network_status: networkStatus,
      endpoint_health: endpointHealth,
      server_load: serverLoad,
      security_posture: securePosture,
    },
    cloud: {
      active_regions: cloudRegions.length,
      cloud_devices: cloudDevices,
      incidents_count: openIncidents,
      has_warnings: openIncidentWarning,
    },
  };
}

// ── Device Usage (top devices by CPU) ─────────────────────────────────────────

export async function getDeviceUsage(tenantId) {
  const devices = await prisma.networkDevice.findMany({
    where: { tenantId },
    orderBy: { cpu_util: "desc" },
    take: 8,
    select: {
      id: true, hostname: true, device_type: true, status: true,
      cpu_util: true, mem_util: true, bandwidth_mbps: true, region: true,
    },
  });
  return devices;
}

// ── Storage / Backup Stats ────────────────────────────────────────────────────

export async function getStorageStats(tenantId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [total, successToday, failedToday, totalSize] = await Promise.all([
    prisma.networkBackup.count({ where: { tenantId } }),
    prisma.networkBackup.count({ where: { tenantId, status: "success", createdAt: { gte: today, lt: tomorrow } } }),
    prisma.networkBackup.count({ where: { tenantId, status: "failed",  createdAt: { gte: today, lt: tomorrow } } }),
    prisma.networkBackup.aggregate({ where: { tenantId }, _sum: { size_gb: true } }),
  ]);

  return {
    total_backups: total,
    successful_today: successToday,
    failed_today: failedToday,
    total_size_gb: Math.round((totalSize._sum.size_gb ?? 0) * 10) / 10,
  };
}

// ── Devices CRUD ──────────────────────────────────────────────────────────────

// Map Prisma fields → shape the Inventory view expects
function deviceShape(d) {
  return {
    id:         d.id,
    name:       d.hostname,
    ip:         d.ip_address,
    type:       d.device_type,
    status:     d.status === "up" ? "Online" : d.status === "down" ? "Offline" : "Warning",
    location:   d.region ?? d.cloud_provider ?? "—",
    lastSeen:   d.updatedAt ? new Date(d.updatedAt).toLocaleString() : "—",
    cpu_util:   d.cpu_util,
    mem_util:   d.mem_util,
    os:         d.os,
  };
}

export async function listDevices(tenantId, query = {}) {
  const { type, status, search, take = 500, skip = 0, limit } = query;
  const rows = await prisma.networkDevice.findMany({
    where: {
      tenantId,
      ...(type   ? { device_type: type }   : {}),
      ...(status ? { status }               : {}),
      ...(search ? {
        OR: [
          { hostname:   { contains: search, mode: "insensitive" } },
          { ip_address: { contains: search } },
        ],
      } : {}),
    },
    orderBy: { hostname: "asc" },
    take: Number(limit ?? take),
    skip: Number(skip),
  });
  return rows.map(deviceShape);
}

export async function getDevice(tenantId, id) {
  const d = await prisma.networkDevice.findFirstOrThrow({ where: { id, tenantId } });
  return deviceShape(d);
}

export async function createDevice(tenantId, data) {
  // Accept both shaped names and raw Prisma names
  const payload = {
    hostname:      data.name      ?? data.hostname,
    ip_address:    data.ip        ?? data.ip_address,
    device_type:   data.type      ?? data.device_type ?? "server",
    status:        data.status === "Online" ? "up" : data.status === "Offline" ? "down" : data.status ?? "up",
    region:        data.location  ?? data.region,
    os:            data.os,
    cpu_util:      data.cpu_util  ?? 0,
    mem_util:      data.mem_util  ?? 0,
    bandwidth_mbps: data.bandwidth_mbps ?? 0,
    cloud_provider: data.cloud_provider,
    tenantId,
  };
  const d = await prisma.networkDevice.create({ data: payload });
  return deviceShape(d);
}

export async function updateDevice(tenantId, id, data) {
  await prisma.networkDevice.findFirstOrThrow({ where: { id, tenantId } });
  const d = await prisma.networkDevice.update({ where: { id }, data });
  return deviceShape(d);
}

export async function deleteDevice(tenantId, id) {
  await prisma.networkDevice.findFirstOrThrow({ where: { id, tenantId } });
  return prisma.networkDevice.delete({ where: { id } });
}

// ── Alerts CRUD ───────────────────────────────────────────────────────────────

export async function listAlerts(tenantId, query = {}) {
  const { severity, status, take = 50, skip = 0 } = query;
  return prisma.networkAlert.findMany({
    where: {
      tenantId,
      ...(severity ? { severity } : {}),
      ...(status   ? { status }   : {}),
    },
    include: { device: { select: { hostname: true, ip_address: true } } },
    orderBy: { createdAt: "desc" },
    take: Number(take),
    skip: Number(skip),
  });
}

export async function createAlert(tenantId, data) {
  return prisma.networkAlert.create({ data: { ...data, tenantId } });
}

export async function acknowledgeAlert(tenantId, id) {
  await prisma.networkAlert.findFirstOrThrow({ where: { id, tenantId } });
  return prisma.networkAlert.update({ where: { id }, data: { status: "acknowledged" } });
}

export async function resolveAlert(tenantId, id) {
  await prisma.networkAlert.findFirstOrThrow({ where: { id, tenantId } });
  return prisma.networkAlert.update({ where: { id }, data: { status: "resolved", resolvedAt: new Date() } });
}

// ── Incidents CRUD ────────────────────────────────────────────────────────────

export async function listIncidents(tenantId, query = {}) {
  const { severity, status, take = 50, skip = 0 } = query;
  return prisma.networkIncident.findMany({
    where: {
      tenantId,
      ...(severity ? { severity } : {}),
      ...(status   ? { status }   : {}),
    },
    orderBy: { createdAt: "desc" },
    take: Number(take),
    skip: Number(skip),
  });
}

export async function getIncident(tenantId, id) {
  return prisma.networkIncident.findFirstOrThrow({ where: { id, tenantId } });
}

export async function createIncident(tenantId, data) {
  return prisma.networkIncident.create({ data: { ...data, tenantId } });
}

export async function updateIncident(tenantId, id, data) {
  await prisma.networkIncident.findFirstOrThrow({ where: { id, tenantId } });
  return prisma.networkIncident.update({ where: { id }, data });
}

export async function resolveIncident(tenantId, id) {
  await prisma.networkIncident.findFirstOrThrow({ where: { id, tenantId } });
  return prisma.networkIncident.update({
    where: { id },
    data: { status: "resolved", resolvedAt: new Date() },
  });
}

export async function escalateIncident(tenantId, id) {
  await prisma.networkIncident.findFirstOrThrow({ where: { id, tenantId } });
  return prisma.networkIncident.update({ where: { id }, data: { severity: "critical" } });
}

// ── Changes CRUD ──────────────────────────────────────────────────────────────

export async function listChanges(tenantId, query = {}) {
  const { status, take = 50, skip = 0 } = query;
  return prisma.networkChange.findMany({
    where: { tenantId, ...(status ? { status } : {}) },
    orderBy: { createdAt: "desc" },
    take: Number(take),
    skip: Number(skip),
  });
}

export async function getChange(tenantId, id) {
  return prisma.networkChange.findFirstOrThrow({ where: { id, tenantId } });
}

export async function createChange(tenantId, data) {
  return prisma.networkChange.create({ data: { ...data, tenantId } });
}

export async function approveChange(tenantId, id) {
  await prisma.networkChange.findFirstOrThrow({ where: { id, tenantId } });
  return prisma.networkChange.update({ where: { id }, data: { status: "approved" } });
}

export async function rejectChange(tenantId, id) {
  await prisma.networkChange.findFirstOrThrow({ where: { id, tenantId } });
  return prisma.networkChange.update({ where: { id }, data: { status: "rejected" } });
}

// ── Backups ───────────────────────────────────────────────────────────────────

export async function listBackups(tenantId, query = {}) {
  const { status, take = 50, skip = 0 } = query;
  return prisma.networkBackup.findMany({
    where: { tenantId, ...(status ? { status } : {}) },
    orderBy: { createdAt: "desc" },
    take: Number(take),
    skip: Number(skip),
  });
}

export async function createBackup(tenantId, data) {
  return prisma.networkBackup.create({ data: { ...data, tenantId } });
}

// ── Capacity (derived from devices) ──────────────────────────────────────────

export async function getCapacitySummary(tenantId) {
  const agg = await prisma.networkDevice.aggregate({
    where: { tenantId },
    _avg: { cpu_util: true, mem_util: true, bandwidth_mbps: true },
    _count: { id: true },
  });
  const critical = await prisma.networkDevice.count({ where: { tenantId, cpu_util: { gte: 90 } } });
  const warning  = await prisma.networkDevice.count({ where: { tenantId, cpu_util: { gte: 75, lt: 90 } } });
  return {
    total: agg._count.id,
    avgCpu: Math.round(agg._avg.cpu_util ?? 0),
    avgMem: Math.round(agg._avg.mem_util ?? 0),
    avgBandwidthMbps: Math.round(agg._avg.bandwidth_mbps ?? 0),
    critical,
    warning,
  };
}

export async function getCapacityLinks(tenantId) {
  return prisma.networkDevice.findMany({
    where: { tenantId },
    select: { id: true, hostname: true, cpu_util: true, mem_util: true, bandwidth_mbps: true, status: true },
    orderBy: { bandwidth_mbps: "desc" },
    take: 20,
  });
}

// ── Stubs for features not yet database-backed ────────────────────────────────

const stub    = () => Promise.resolve([]);
const stubObj = (shape = {}) => () => Promise.resolve(shape);

export const getTrafficOverview  = stubObj({ inboundMbps: 0, outboundMbps: 0, totalMbps: 0 });
export const getTopTalkers       = stub;
export const getTrafficProtocols = stub;
export const getTrafficAnomalies = stub;

export const getTopologyRegions = stub;
export const getTopologyNodes   = stub;
export const getTopologyLinks   = stub;

export const getIncidentTimeline = stub;

export const listServiceHealth = stub;
export const getServiceHealth  = stubObj({});

export const listAutomationJobs      = stub;
export const listAutomationTemplates = stub;
export const runAutomationJob        = stubObj({ started: true });
export const createAutomationJob     = stubObj({});

export const listDocs = stub;
export const getDoc   = stubObj({});

export const listPolicies  = stub;
export const checkPolicy   = stubObj({ compliant: true });

export const getNetworkSettings    = stubObj({});
export const updateNetworkSettings = stubObj({ updated: true });
export const listSettingsProfiles  = stub;
export const getSettingsProfile    = stubObj({});
export const updateSettingsProfile = stubObj({ updated: true });

// ── Server Management ─────────────────────────────────────────────────────────

function serverShape(s) {
  return {
    id:          s.id,
    name:        s.name,
    hostname:    s.hostname,
    ip:          s.ip_address,
    os:          s.os,
    cores:       s.cores,
    ram_gb:      s.ram_gb,
    disk_gb:     s.disk_gb,
    cpu_util:    s.cpu_util,
    mem_util:    s.mem_util,
    disk_util:   s.disk_util,
    status:      s.status,
    environment: s.environment,
    region:      s.region,
    tags:        s.tags ? s.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
    createdAt:   s.createdAt,
    updatedAt:   s.updatedAt,
  };
}

export async function listServers(tenantId, query = {}) {
  const { status, environment, search, limit = 200, skip = 0 } = query;
  const rows = await prisma.networkServer.findMany({
    where: {
      tenantId,
      ...(status      ? { status }      : {}),
      ...(environment ? { environment } : {}),
      ...(search ? {
        OR: [
          { name:       { contains: search, mode: "insensitive" } },
          { hostname:   { contains: search, mode: "insensitive" } },
          { ip_address: { contains: search } },
        ],
      } : {}),
    },
    orderBy: { name: "asc" },
    take: Number(limit),
    skip: Number(skip),
  });
  return rows.map(serverShape);
}

export async function getServer(tenantId, id) {
  const s = await prisma.networkServer.findFirstOrThrow({ where: { id, tenantId } });
  return serverShape(s);
}

export async function createServer(tenantId, data) {
  const s = await prisma.networkServer.create({
    data: {
      name:        data.name,
      hostname:    data.hostname ?? data.name,
      ip_address:  data.ip ?? data.ip_address ?? "",
      os:          data.os ?? "linux",
      cores:       Number(data.cores ?? 1),
      ram_gb:      parseFloat(data.ram_gb ?? 0),
      disk_gb:     parseFloat(data.disk_gb ?? 0),
      cpu_util:    parseFloat(data.cpu_util ?? 0),
      mem_util:    parseFloat(data.mem_util ?? 0),
      disk_util:   parseFloat(data.disk_util ?? 0),
      status:      data.status ?? "online",
      environment: data.environment ?? "prod",
      region:      data.region ?? null,
      tags:        Array.isArray(data.tags) ? data.tags.join(",") : (data.tags ?? null),
      tenantId,
    },
  });
  return serverShape(s);
}

export async function updateServer(tenantId, id, data) {
  await prisma.networkServer.findFirstOrThrow({ where: { id, tenantId } });
  const payload = {};
  if (data.name        != null) payload.name        = data.name;
  if (data.hostname    != null) payload.hostname    = data.hostname;
  if (data.ip_address  != null) payload.ip_address  = data.ip_address;
  if (data.ip          != null) payload.ip_address  = data.ip;
  if (data.os          != null) payload.os          = data.os;
  if (data.cores       != null) payload.cores       = Number(data.cores);
  if (data.ram_gb      != null) payload.ram_gb      = parseFloat(data.ram_gb);
  if (data.disk_gb     != null) payload.disk_gb     = parseFloat(data.disk_gb);
  if (data.cpu_util    != null) payload.cpu_util    = parseFloat(data.cpu_util);
  if (data.mem_util    != null) payload.mem_util    = parseFloat(data.mem_util);
  if (data.disk_util   != null) payload.disk_util   = parseFloat(data.disk_util);
  if (data.status      != null) payload.status      = data.status;
  if (data.environment != null) payload.environment = data.environment;
  if (data.region      != null) payload.region      = data.region;
  if (data.tags        != null) payload.tags        = Array.isArray(data.tags) ? data.tags.join(",") : data.tags;
  const s = await prisma.networkServer.update({ where: { id }, data: payload });
  return serverShape(s);
}

export async function deleteServer(tenantId, id) {
  await prisma.networkServer.findFirstOrThrow({ where: { id, tenantId } });
  await prisma.networkServer.delete({ where: { id } });
  return { deleted: true };
}

export async function restartServer(tenantId, id) {
  await prisma.networkServer.findFirstOrThrow({ where: { id, tenantId } });
  const s = await prisma.networkServer.update({
    where: { id },
    data: { status: "rebooting", cpu_util: 5, mem_util: 20 },
  });
  return serverShape(s);
}

export async function syncServerMetrics(tenantId, id) {
  await prisma.networkServer.findFirstOrThrow({ where: { id, tenantId } });
  const cpu  = Math.round(Math.random() * 80 + 5);
  const mem  = Math.round(Math.random() * 70 + 15);
  const disk = Math.round(Math.random() * 60 + 10);
  const s = await prisma.networkServer.update({
    where: { id },
    data: { cpu_util: cpu, mem_util: mem, disk_util: disk, status: "online" },
  });
  return serverShape(s);
}

export async function getServerMetrics(tenantId) {
  const agg = await prisma.networkServer.aggregate({
    where: { tenantId },
    _avg: { cpu_util: true, mem_util: true, disk_util: true },
    _count: { id: true },
  });
  const online  = await prisma.networkServer.count({ where: { tenantId, status: "online" } });
  const offline = await prisma.networkServer.count({ where: { tenantId, status: "offline" } });
  const highCpu = await prisma.networkServer.count({ where: { tenantId, cpu_util: { gte: 80 } } });
  return {
    total:   agg._count.id,
    online,
    offline,
    highCpu,
    avgCpu:  Math.round(agg._avg.cpu_util  ?? 0),
    avgMem:  Math.round(agg._avg.mem_util  ?? 0),
    avgDisk: Math.round(agg._avg.disk_util ?? 0),
  };
}

// ── Visual Network Monitor ────────────────────────────────────────────────────

export async function getMonitorOverview(tenantId) {
  const [devices, servers, alertCounts, incidents] = await Promise.all([
    prisma.networkDevice.findMany({
      where: { tenantId },
      select: { id: true, hostname: true, device_type: true, status: true, cpu_util: true, mem_util: true, bandwidth_mbps: true, region: true, ip_address: true },
    }),
    prisma.networkServer.findMany({
      where: { tenantId },
      select: { id: true, name: true, hostname: true, status: true, cpu_util: true, mem_util: true, disk_util: true, environment: true, region: true },
    }),
    prisma.networkAlert.groupBy({
      by: ["severity"],
      where: { tenantId, status: "open" },
      _count: { id: true },
    }),
    prisma.networkIncident.count({ where: { tenantId, status: { notIn: ["resolved", "closed"] } } }),
  ]);

  const alertsBySev = Object.fromEntries(alertCounts.map(a => [a.severity, a._count.id]));

  const allNodes = [
    ...devices.map(d => ({
      id:       d.id,
      label:    d.hostname,
      type:     d.device_type,
      status:   d.status === "up" ? "online" : d.status === "down" ? "offline" : "warning",
      cpu:      d.cpu_util,
      mem:      d.mem_util,
      bw:       d.bandwidth_mbps,
      region:   d.region,
      ip:       d.ip_address,
      source:   "device",
    })),
    ...servers.map(s => ({
      id:     s.id,
      label:  s.name,
      type:   "server",
      status: s.status,
      cpu:    s.cpu_util,
      mem:    s.mem_util,
      disk:   s.disk_util,
      region: s.region,
      env:    s.environment,
      source: "server",
    })),
  ];

  return {
    nodes: allNodes,
    summary: {
      total:    allNodes.length,
      online:   allNodes.filter(n => n.status === "online" || n.status === "up").length,
      offline:  allNodes.filter(n => n.status === "offline" || n.status === "down").length,
      warning:  allNodes.filter(n => n.status === "warning" || n.status === "degraded").length,
      critical: alertsBySev.critical ?? 0,
      openIncidents: incidents,
    },
  };
}

export async function getMonitorMetrics(tenantId) {
  const devices = await prisma.networkDevice.findMany({
    where: { tenantId },
    select: { id: true, hostname: true, device_type: true, cpu_util: true, mem_util: true, bandwidth_mbps: true, status: true, region: true },
    orderBy: { cpu_util: "desc" },
  });
  const servers = await prisma.networkServer.findMany({
    where: { tenantId },
    select: { id: true, name: true, cpu_util: true, mem_util: true, disk_util: true, status: true },
    orderBy: { cpu_util: "desc" },
  });
  return { devices, servers };
}

export async function getMonitorEvents(tenantId) {
  const [alerts, incidents] = await Promise.all([
    prisma.networkAlert.findMany({
      where: { tenantId },
      include: { device: { select: { hostname: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.networkIncident.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);
  return {
    alerts: alerts.map(a => ({ ...a, deviceName: a.device?.hostname })),
    incidents,
  };
}

// ── Network User Restrictions ─────────────────────────────────────────────────

export async function listRestrictions(tenantId, query = {}) {
  const { enabled, rule_type, limit = 200, skip = 0 } = query;
  const filter = {
    tenantId,
    ...(enabled   != null ? { enabled: enabled === "true" || enabled === true } : {}),
    ...(rule_type ? { rule_type } : {}),
  };
  return prisma.networkUserRestriction.findMany({
    where: filter,
    orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
    take: Number(limit),
    skip: Number(skip),
  });
}

export async function getRestriction(tenantId, id) {
  return prisma.networkUserRestriction.findFirstOrThrow({ where: { id, tenantId } });
}

export async function createRestriction(tenantId, data) {
  return prisma.networkUserRestriction.create({
    data: {
      name:          data.name,
      description:   data.description ?? null,
      target_type:   data.target_type ?? "user",
      target:        data.target,
      rule_type:     data.rule_type ?? "block",
      protocol:      data.protocol ?? "any",
      port:          data.port ?? null,
      direction:     data.direction ?? "both",
      priority:      Number(data.priority ?? 100),
      enabled:       data.enabled !== false,
      bandwidth_kbps: data.bandwidth_kbps ? Number(data.bandwidth_kbps) : null,
      tenantId,
    },
  });
}

export async function updateRestriction(tenantId, id, data) {
  await prisma.networkUserRestriction.findFirstOrThrow({ where: { id, tenantId } });
  return prisma.networkUserRestriction.update({ where: { id }, data });
}

export async function deleteRestriction(tenantId, id) {
  await prisma.networkUserRestriction.findFirstOrThrow({ where: { id, tenantId } });
  await prisma.networkUserRestriction.delete({ where: { id } });
  return { deleted: true };
}

export async function toggleRestriction(tenantId, id) {
  const r = await prisma.networkUserRestriction.findFirstOrThrow({ where: { id, tenantId } });
  return prisma.networkUserRestriction.update({ where: { id }, data: { enabled: !r.enabled } });
}

// ── Firewall Rules ────────────────────────────────────────────────────────────

export async function listFirewallRules(tenantId, query = {}) {
  const { chain, enabled, limit = 500, skip = 0 } = query;
  return prisma.firewallRule.findMany({
    where: {
      tenantId,
      ...(chain   ? { chain }   : {}),
      ...(enabled != null ? { enabled: enabled === "true" || enabled === true } : {}),
    },
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
    take: Number(limit),
    skip: Number(skip),
  });
}

export async function getFirewallRule(tenantId, id) {
  return prisma.firewallRule.findFirstOrThrow({ where: { id, tenantId } });
}

export async function createFirewallRule(tenantId, data) {
  return prisma.firewallRule.create({
    data: {
      name:         data.name,
      description:  data.description ?? null,
      chain:        data.chain   ?? "INPUT",
      action:       data.action  ?? "ACCEPT",
      protocol:     data.protocol ?? "any",
      src_ip:       data.src_ip  ?? null,
      dst_ip:       data.dst_ip  ?? null,
      src_port:     data.src_port ?? null,
      dst_port:     data.dst_port ?? null,
      zone_src:     data.zone_src ?? null,
      zone_dst:     data.zone_dst ?? null,
      priority:     Number(data.priority ?? 100),
      enabled:      data.enabled !== false,
      log_traffic:  data.log_traffic === true || data.log_traffic === "true",
      tenantId,
    },
  });
}

export async function updateFirewallRule(tenantId, id, data) {
  await prisma.firewallRule.findFirstOrThrow({ where: { id, tenantId } });
  return prisma.firewallRule.update({ where: { id }, data });
}

export async function deleteFirewallRule(tenantId, id) {
  await prisma.firewallRule.findFirstOrThrow({ where: { id, tenantId } });
  await prisma.firewallRule.delete({ where: { id } });
  return { deleted: true };
}

export async function toggleFirewallRule(tenantId, id) {
  const r = await prisma.firewallRule.findFirstOrThrow({ where: { id, tenantId } });
  return prisma.firewallRule.update({ where: { id }, data: { enabled: !r.enabled } });
}

export async function getFirewallZones(tenantId) {
  const rules = await prisma.firewallRule.findMany({
    where: { tenantId, enabled: true },
    select: { chain: true, action: true, zone_src: true, zone_dst: true },
  });
  const devices = await prisma.networkDevice.count({ where: { tenantId } });
  const servers = await prisma.networkServer.count({ where: { tenantId } });
  const activeRules = rules.length;
  const blockRules  = rules.filter(r => r.action === "DROP" || r.action === "REJECT").length;
  const zones = ["WAN", "LAN", "DMZ"].map(zone => ({
    name:   zone,
    rules:  rules.filter(r => r.zone_src === zone || r.zone_dst === zone).length,
    status: "active",
  }));
  return { zones, summary: { activeRules, blockRules, totalDevices: devices + servers } };
}

export async function getFirewallLogs(tenantId) {
  const rules = await prisma.firewallRule.findMany({
    where: { tenantId, log_traffic: true, enabled: true },
    select: { id: true, name: true, action: true, chain: true, protocol: true, src_ip: true, dst_ip: true },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });
  return rules.map((r, i) => ({
    id:       `log-${r.id}-${i}`,
    rule:     r.name,
    action:   r.action,
    chain:    r.chain,
    protocol: r.protocol,
    src:      r.src_ip ?? "any",
    dst:      r.dst_ip ?? "any",
    time:     new Date(Date.now() - i * 60000).toISOString(),
  }));
}

// ── Global Network Sync ───────────────────────────────────────────────────────

export async function syncAllNetwork(tenantId) {
  const [deviceCount, serverCount, alertCount, incidentCount, restrictionCount, firewallCount] = await Promise.all([
    prisma.networkDevice.count({ where: { tenantId } }),
    prisma.networkServer.count({ where: { tenantId } }),
    prisma.networkAlert.count({ where: { tenantId, status: "open" } }),
    prisma.networkIncident.count({ where: { tenantId, status: { notIn: ["resolved", "closed"] } } }),
    prisma.networkUserRestriction.count({ where: { tenantId, enabled: true } }),
    prisma.firewallRule.count({ where: { tenantId, enabled: true } }),
  ]);
  return {
    synced: true,
    timestamp: new Date().toISOString(),
    summary: {
      devices:      deviceCount,
      servers:      serverCount,
      openAlerts:   alertCount,
      openIncidents: incidentCount,
      activeRestrictions: restrictionCount,
      activeFirewallRules: firewallCount,
    },
  };
}
