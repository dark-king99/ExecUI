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

export async function listDevices(tenantId, query = {}) {
  const { type, status, search, take = 50, skip = 0 } = query;
  return prisma.networkDevice.findMany({
    where: {
      tenantId,
      ...(type   ? { device_type: type }   : {}),
      ...(status ? { status }               : {}),
      ...(search ? { hostname: { contains: search, mode: "insensitive" } } : {}),
    },
    orderBy: { hostname: "asc" },
    take: Number(take),
    skip: Number(skip),
  });
}

export async function getDevice(tenantId, id) {
  return prisma.networkDevice.findFirstOrThrow({ where: { id, tenantId } });
}

export async function createDevice(tenantId, data) {
  return prisma.networkDevice.create({ data: { ...data, tenantId } });
}

export async function updateDevice(tenantId, id, data) {
  await prisma.networkDevice.findFirstOrThrow({ where: { id, tenantId } });
  return prisma.networkDevice.update({ where: { id }, data });
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
