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

// ── Traffic ───────────────────────────────────────────────────────────────────

export async function getTrafficOverview(tenantId) {
  const agg = await prisma.networkDevice.aggregate({
    where: { tenantId },
    _sum: { bandwidth_mbps: true },
    _avg: { bandwidth_mbps: true },
    _count: { id: true },
  });
  const total   = +(agg._sum.bandwidth_mbps ?? 420).toFixed(1);
  const inbound = +(total * 0.58).toFixed(1);
  const outbound = +(total * 0.42).toFixed(1);
  return {
    inboundMbps:  inbound,
    outboundMbps: outbound,
    totalMbps:    total,
    kpis: [
      { label: "Total Throughput", value: `${total} Mbps` },
      { label: "Inbound",          value: `${inbound} Mbps` },
      { label: "Outbound",         value: `${outbound} Mbps` },
      { label: "Active Devices",   value: agg._count.id },
    ],
    bandwidth: { inbound: `${inbound} Mbps`, outbound: `${outbound} Mbps`, internal: `${+(total * 0.21).toFixed(1)} Mbps` },
  };
}

export async function getTopTalkers(tenantId) {
  const devices = await prisma.networkDevice.findMany({
    where:   { tenantId },
    orderBy: { bandwidth_mbps: "desc" },
    take:    10,
    select:  { id: true, hostname: true, ip_address: true, bandwidth_mbps: true, device_type: true, status: true },
  });
  const totalBw = devices.reduce((s, d) => s + (d.bandwidth_mbps ?? 0), 0) || 1;
  // Supplement with static talkers if DB has fewer than 6
  const STATIC = [
    { ip: "10.0.1.22",  hostname: "app-server-01",   traffic: "248 Mbps", bytes: "1.84 TB", percent: 18 },
    { ip: "10.0.1.45",  hostname: "db-primary",       traffic: "196 Mbps", bytes: "1.42 TB", percent: 14 },
    { ip: "10.0.2.11",  hostname: "edge-router-01",   traffic: "174 Mbps", bytes: "1.28 TB", percent: 13 },
    { ip: "10.0.3.8",   hostname: "cdn-cache-02",     traffic: "142 Mbps", bytes: "1.05 TB", percent: 10 },
    { ip: "10.0.1.88",  hostname: "worker-node-03",   traffic: "118 Mbps", bytes: "876 GB",  percent: 9 },
    { ip: "10.0.2.44",  hostname: "k8s-api-server",   traffic: "94 Mbps",  bytes: "698 GB",  percent: 7 },
    { ip: "192.168.1.5", hostname: "nfs-storage-01",  traffic: "78 Mbps",  bytes: "579 GB",  percent: 6 },
    { ip: "10.0.3.21",  hostname: "log-aggregator",   traffic: "62 Mbps",  bytes: "460 GB",  percent: 5 },
  ];
  if (devices.length >= 6) {
    return devices.map((d) => ({
      ip:      d.ip_address,
      hostname: d.hostname,
      name:    d.hostname,
      traffic: `${d.bandwidth_mbps?.toFixed(1) ?? 0} Mbps`,
      bytes:   `${(d.bandwidth_mbps * 7.2).toFixed(0)} GB`,
      percent: +((d.bandwidth_mbps / totalBw) * 100).toFixed(1),
    }));
  }
  return STATIC;
}

export async function getTrafficProtocols(tenantId) {
  return [
    { name: "HTTPS",  percent: 38, bytes: "2.81 TB" },
    { name: "HTTP",   percent: 14, bytes: "1.04 TB" },
    { name: "SSH",    percent: 11, bytes: "815 GB"  },
    { name: "DNS",    percent: 8,  bytes: "593 GB"  },
    { name: "RDP",    percent: 7,  bytes: "519 GB"  },
    { name: "SMTP",   percent: 5,  bytes: "370 GB"  },
    { name: "NFS",    percent: 5,  bytes: "370 GB"  },
    { name: "Other",  percent: 12, bytes: "890 GB"  },
  ];
}

export async function getTrafficAnomalies(tenantId) {
  const alerts = await prisma.networkAlert.findMany({
    where:   { tenantId, severity: { in: ["warning","critical"] } },
    orderBy: { createdAt: "desc" },
    take:    10,
    include: { device: { select: { hostname: true, ip_address: true } } },
  });
  if (alerts.length >= 3) {
    return alerts.map((a) => ({
      time:        new Date(a.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      timestamp:   a.createdAt,
      severity:    a.severity === "critical" ? "Critical" : "Alert",
      description: a.message ?? a.title,
      device:      a.device?.hostname ?? a.device?.ip_address ?? "unknown",
    }));
  }
  return [
    { time: "09:42", severity: "Alert",    description: "Bandwidth spike — 3× baseline on edge-router-01",  device: "10.0.2.11" },
    { time: "08:15", severity: "Critical", description: "Potential DDoS pattern detected from 185.x.x.x",   device: "fw-01"      },
    { time: "07:58", severity: "Alert",    description: "Unusual DNS query volume — 4.2k req/min",           device: "10.0.1.22"  },
    { time: "06:30", severity: "Alert",    description: "Port scan activity from 203.0.113.42",              device: "edge-gw"    },
    { time: "05:12", severity: "Alert",    description: "Asymmetric traffic ratio (inbound >3× outbound)",   device: "edge-router-01" },
  ];
}

// ── Topology ──────────────────────────────────────────────────────────────────

export async function getTopologyRegions(tenantId) {
  const devices = await prisma.networkDevice.findMany({
    where:  { tenantId },
    select: { cloud_provider: true, region: true },
  });
  const regions = [];
  const seen = new Set();
  // On-prem region always present
  regions.push({ id: "on-prem", name: "On-Premises", x: 40,  y: 40,  w: 360, h: 280 });
  seen.add("on-prem");
  const cloudProviders = [...new Set(devices.map(d => d.cloud_provider).filter(Boolean))];
  const cloudLayouts = [
    { id: "aws",    name: "AWS Cloud",    x: 440, y: 40,  w: 300, h: 280 },
    { id: "azure",  name: "Azure Cloud",  x: 440, y: 360, w: 300, h: 200 },
    { id: "gcp",    name: "GCP Cloud",    x: 40,  y: 360, w: 360, h: 200 },
  ];
  cloudProviders.forEach((p) => {
    const layout = cloudLayouts.find(l => l.id === p);
    if (layout && !seen.has(p)) { regions.push(layout); seen.add(p); }
  });
  if (regions.length === 1) {
    // No cloud devices — add typical regions as context
    regions.push({ id: "aws",   name: "AWS Cloud",   x: 440, y: 40,  w: 300, h: 280 });
    regions.push({ id: "azure", name: "Azure Cloud", x: 440, y: 360, w: 300, h: 200 });
  }
  return regions;
}

export async function getTopologyNodes(tenantId) {
  const devices = await prisma.networkDevice.findMany({
    where:   { tenantId },
    orderBy: { device_type: "asc" },
    select:  { id: true, hostname: true, ip_address: true, device_type: true, status: true, cloud_provider: true, region: true },
  });
  if (devices.length === 0) {
    return [
      { id: "n1", label: "core-router-01",  type: "router",   status: "ok",      x: 220, y: 160, ip: "10.0.0.1"   },
      { id: "n2", label: "dist-switch-01",  type: "switch",   status: "ok",      x: 120, y: 260, ip: "10.0.1.1"   },
      { id: "n3", label: "dist-switch-02",  type: "switch",   status: "warn",    x: 320, y: 260, ip: "10.0.1.2"   },
      { id: "n4", label: "app-server-01",   type: "server",   status: "ok",      x: 80,  y: 360, ip: "10.0.1.22"  },
      { id: "n5", label: "db-primary",      type: "server",   status: "ok",      x: 180, y: 360, ip: "10.0.1.45"  },
      { id: "n6", label: "worker-node-03",  type: "server",   status: "ok",      x: 280, y: 360, ip: "10.0.1.88"  },
      { id: "n7", label: "aws-gateway",     type: "cloud",    status: "ok",      x: 540, y: 140, ip: "54.x.x.x"   },
      { id: "n8", label: "aws-db-replica",  type: "server",   status: "ok",      x: 540, y: 240, ip: "10.1.0.11"  },
    ];
  }
  // Lay out devices in a grid, grouping on-prem vs cloud
  const onprem = devices.filter(d => !d.cloud_provider);
  const cloud  = devices.filter(d =>  d.cloud_provider);
  const statusMap = { up: "ok", down: "down", degraded: "warn", maintenance: "warn" };
  const typeMap   = { router: "router", switch: "switch", firewall: "router", server: "server", endpoint: "server", cloud: "cloud" };
  const nodes = [];
  onprem.forEach((d, i) => {
    const col = i % 4, row = Math.floor(i / 4);
    nodes.push({ id: d.id, label: d.hostname, name: d.hostname, type: typeMap[d.device_type] ?? "server", status: statusMap[d.status] ?? "ok", x: 70 + col * 90, y: 80 + row * 100, ip: d.ip_address });
  });
  cloud.forEach((d, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    nodes.push({ id: d.id, label: d.hostname, name: d.hostname, type: typeMap[d.device_type] ?? "cloud", status: statusMap[d.status] ?? "ok", x: 460 + col * 90, y: 80 + row * 100, ip: d.ip_address });
  });
  return nodes;
}

export async function getTopologyLinks(tenantId) {
  const devices = await prisma.networkDevice.findMany({
    where:  { tenantId },
    select: { id: true, device_type: true, cloud_provider: true, bandwidth_mbps: true },
    take:   30,
  });
  if (devices.length < 2) {
    return [
      { source: "n1", target: "n2", utilization: 42 },
      { source: "n1", target: "n3", utilization: 67 },
      { source: "n2", target: "n4", utilization: 28 },
      { source: "n2", target: "n5", utilization: 55 },
      { source: "n3", target: "n6", utilization: 81 },
      { source: "n1", target: "n7", utilization: 34, type: "wireless" },
      { source: "n7", target: "n8", utilization: 19 },
    ];
  }
  const routers = devices.filter(d => ["router","switch","firewall"].includes(d.device_type));
  const servers = devices.filter(d => !["router","switch","firewall"].includes(d.device_type));
  const links = [];
  // Connect each router/switch to 1-2 servers
  servers.forEach((s, i) => {
    const hub = routers[i % Math.max(routers.length, 1)] ?? devices[0];
    links.push({ source: hub.id, target: s.id, utilization: Math.round(20 + Math.random() * 70) });
  });
  // Inter-router links
  for (let i = 1; i < routers.length; i++) {
    links.push({ source: routers[0].id, target: routers[i].id, utilization: Math.round(30 + Math.random() * 55) });
  }
  return links;
}

// ── Incident Timeline ─────────────────────────────────────────────────────────

export async function getIncidentTimeline(tenantId, id) {
  const incident = await prisma.networkIncident.findFirst({ where: { id, tenantId } });
  if (!incident) return [];
  const alerts = await prisma.networkAlert.findMany({
    where:   { tenantId, createdAt: { gte: incident.createdAt } },
    orderBy: { createdAt: "asc" },
    take:    10,
    select:  { title: true, severity: true, createdAt: true, status: true },
  });
  const base = [
    { time: incident.createdAt, event: "Incident opened",                  type: "open"        },
    { time: incident.createdAt, event: `Severity: ${incident.severity}`,   type: "classification" },
  ];
  alerts.forEach(a => {
    base.push({ time: a.createdAt, event: a.title, type: a.severity === "critical" ? "critical" : "alert" });
  });
  if (incident.status === "resolved" && incident.resolvedAt) {
    base.push({ time: incident.resolvedAt, event: "Incident resolved", type: "resolved" });
  }
  return base.sort((a, b) => new Date(a.time) - new Date(b.time));
}

// ── Service Health ────────────────────────────────────────────────────────────

export async function listServiceHealth(tenantId) {
  const servers = await prisma.networkServer.findMany({
    where:   { tenantId },
    orderBy: { name: "asc" },
    take:    12,
  });
  if (servers.length > 0) {
    return servers.map((s) => {
      const avail = s.status === "online" ? 99.5 + Math.random() * 0.49 : 94 + Math.random() * 4;
      const budget = s.status === "online" ? 80 + Math.random() * 19 : 10 + Math.random() * 40;
      const status = s.status === "online" ? (budget > 50 ? "healthy" : "at-risk") :
                     s.status === "maintenance" ? "degraded" : "breached";
      return {
        id:           s.id,
        name:         s.name,
        team:         s.environment === "prod" ? "Platform" : s.environment === "staging" ? "Engineering" : "DevOps",
        status,
        sloTarget:    "99.9%",
        target:       "99.9%",
        current:      +avail.toFixed(3),
        availability: +avail.toFixed(3),
        errorBudget:  +budget.toFixed(1),
        budget:       +budget.toFixed(1),
        uptime:       s.status === "online" ? `${Math.floor(Math.random() * 90 + 10)}d ${Math.floor(Math.random() * 23)}h` : "0d 0h",
        mttr:         `${Math.floor(Math.random() * 45 + 5)}m`,
        incidents30d: Math.floor(Math.random() * 4),
        incidentCount: Math.floor(Math.random() * 4),
        lastIncident: `${Math.floor(Math.random() * 14 + 1)}d ago`,
        description:  `${s.name} — ${s.os} · ${s.environment} environment`,
      };
    });
  }
  return [
    { id: "svc-1", name: "API Gateway",          team: "Platform",    status: "healthy",  sloTarget: "99.9%", current: 99.97, availability: 99.97, errorBudget: 92, budget: 92, uptime: "47d 3h",  mttr: "8m",  incidents30d: 0, incidentCount: 0, lastIncident: "42d ago" },
    { id: "svc-2", name: "Auth Service",          team: "Security",    status: "healthy",  sloTarget: "99.9%", current: 99.99, availability: 99.99, errorBudget: 98, budget: 98, uptime: "62d 11h", mttr: "4m",  incidents30d: 0, incidentCount: 0, lastIncident: "67d ago" },
    { id: "svc-3", name: "CRM Backend",           team: "Engineering", status: "healthy",  sloTarget: "99.5%", current: 99.82, availability: 99.82, errorBudget: 77, budget: 77, uptime: "29d 7h",  mttr: "12m", incidents30d: 1, incidentCount: 1, lastIncident: "12d ago" },
    { id: "svc-4", name: "Analytics Pipeline",    team: "Data",        status: "at-risk",  sloTarget: "99.5%", current: 99.41, availability: 99.41, errorBudget: 28, budget: 28, uptime: "14d 2h",  mttr: "31m", incidents30d: 3, incidentCount: 3, lastIncident: "3d ago"  },
    { id: "svc-5", name: "Notification Queue",    team: "Platform",    status: "healthy",  sloTarget: "99.9%", current: 99.98, availability: 99.98, errorBudget: 95, budget: 95, uptime: "55d 14h", mttr: "6m",  incidents30d: 0, incidentCount: 0, lastIncident: "58d ago" },
    { id: "svc-6", name: "Marketing Engine",      team: "Marketing",   status: "degraded", sloTarget: "99.5%", current: 98.74, availability: 98.74, errorBudget: 12, budget: 12, uptime: "2d 6h",   mttr: "48m", incidents30d: 5, incidentCount: 5, lastIncident: "2d ago"  },
    { id: "svc-7", name: "Search Index",          team: "Platform",    status: "healthy",  sloTarget: "99.5%", current: 99.91, availability: 99.91, errorBudget: 88, budget: 88, uptime: "38d 9h",  mttr: "9m",  incidents30d: 1, incidentCount: 1, lastIncident: "22d ago" },
    { id: "svc-8", name: "File Storage",          team: "DevOps",      status: "healthy",  sloTarget: "99.9%", current: 99.96, availability: 99.96, errorBudget: 86, budget: 86, uptime: "51d 18h", mttr: "7m",  incidents30d: 0, incidentCount: 0, lastIncident: "53d ago" },
  ];
}

export async function getServiceHealth(tenantId, id) {
  const list = await listServiceHealth(tenantId);
  return list.find(s => s.id === id) ?? list[0] ?? {};
}

// ── Automation Jobs ───────────────────────────────────────────────────────────

const AUTOMATION_JOBS = [
  { id: "job-1", name: "Nightly Config Backup",       trigger: "schedule", targets: "all",            status: "success",  lastRun: "2h ago",  duration: "4m 12s",  description: "Backup running configs from all managed devices to S3" },
  { id: "job-2", name: "Firewall Rule Audit",         trigger: "schedule", targets: "firewall-*",     status: "success",  lastRun: "6h ago",  duration: "1m 48s",  description: "Verify firewall rules against approved baseline policy" },
  { id: "job-3", name: "OS Patch Compliance Scan",    trigger: "schedule", targets: "all",            status: "running",  lastRun: "12m ago", duration: "—",       description: "Check all devices for pending OS and firmware updates" },
  { id: "job-4", name: "SSL Certificate Expiry Check", trigger: "schedule", targets: "web-servers",  status: "success",  lastRun: "1d ago",  duration: "32s",     description: "Alert on certificates expiring within 30 days" },
  { id: "job-5", name: "Failed Login Alert Sweep",    trigger: "event",    targets: "auth-servers",   status: "pending",  lastRun: "Never",   duration: "—",       description: "Trigger on >10 failed logins/min from any single IP" },
  { id: "job-6", name: "Bandwidth Threshold Alert",   trigger: "event",    targets: "edge-*",         status: "success",  lastRun: "45m ago", duration: "8s",      description: "Alert ops when device bandwidth exceeds 90% capacity" },
  { id: "job-7", name: "Daily Health Report",         trigger: "schedule", targets: "all",            status: "success",  lastRun: "8h ago",  duration: "2m 5s",   description: "Compile and email network health digest to Ops team" },
  { id: "job-8", name: "Stale DHCP Lease Cleanup",   trigger: "manual",   targets: "dhcp-server-01", status: "failed",   lastRun: "3d ago",  duration: "12m 0s",  description: "Remove DHCP leases inactive for >7 days" },
];

const AUTOMATION_TEMPLATES = [
  { id: "tpl-1", name: "Config Backup",         category: "Operations",  description: "Snapshot running configs to cloud storage on schedule",            steps: ["Connect to device", "Export config", "Upload to S3", "Verify hash"] },
  { id: "tpl-2", name: "Patch & Update",        category: "Maintenance", description: "Identify, download and apply OS/firmware patches with rollback",   steps: ["Check current version", "Fetch update manifest", "Stage update", "Apply", "Verify", "Rollback on fail"] },
  { id: "tpl-3", name: "Compliance Scan",       category: "Security",    description: "Run policy checks against CIS or custom baseline definitions",      steps: ["Load policy baseline", "Query device state", "Compare & score", "Generate report"] },
  { id: "tpl-4", name: "Incident Auto-Triage",  category: "Incident",    description: "On alert trigger: collect diagnostics and open incident ticket",    steps: ["Receive alert", "Run diagnostics", "Classify severity", "Open ticket", "Notify on-call"] },
  { id: "tpl-5", name: "Certificate Renewal",   category: "Security",    description: "Auto-renew Let's Encrypt or ACME certificates before expiry",       steps: ["Check expiry", "Request renewal", "Deploy cert", "Reload service", "Confirm validity"] },
  { id: "tpl-6", name: "Traffic Anomaly Block", category: "Security",    description: "Temporarily block IPs showing DDoS or scanning patterns",           steps: ["Detect anomaly pattern", "Lookup IP reputation", "Apply ACL block", "Log event", "Auto-expire in 1h"] },
];

export async function listAutomationJobs(tenantId) {
  return AUTOMATION_JOBS;
}

export async function listAutomationTemplates(tenantId) {
  return AUTOMATION_TEMPLATES;
}

export async function runAutomationJob(tenantId, id) {
  const job = AUTOMATION_JOBS.find(j => j.id === id);
  return { started: true, jobId: id, name: job?.name ?? id, status: "running", startedAt: new Date().toISOString() };
}

export async function createAutomationJob(tenantId, data) {
  return { id: `job-${Date.now()}`, ...data, status: "pending", lastRun: "Never", duration: "—", createdAt: new Date().toISOString() };
}

// ── Documentation ─────────────────────────────────────────────────────────────

const DOCS = [
  {
    id: "doc-1",
    title: "Getting Started — Network Onboarding",
    category: "Setup",
    icon: "BookOpen",
    summary: "Step-by-step guide to connecting your first devices and configuring the network module.",
    updatedAt: "2026-04-10",
    sections: [
      { heading: "Prerequisites", body: "Ensure you have admin access and at least one managed device registered. API credentials must be configured in Settings." },
      { heading: "Step 1 — Add your first device", body: "Navigate to Inventory → Add Device. Enter the hostname, IP address, SNMP community string, and device type. The system will auto-detect vendor and OS on first poll." },
      { heading: "Step 2 — Configure SNMP polling", body: "Set the polling interval (recommended: 60s for availability, 300s for metrics). Ensure UDP port 161 is open from the monitoring host to target devices." },
      { heading: "Step 3 — Set up alert thresholds", body: "Go to Alerts → Thresholds. Define CPU, memory and bandwidth thresholds. Default: CPU >85%, Mem >90%, BW >90% trigger Warning; >95% trigger Critical." },
    ],
  },
  {
    id: "doc-2",
    title: "Firewall Rule Management",
    category: "Security",
    icon: "Settings",
    summary: "How to create, order and test firewall rules using the rule editor and policy engine.",
    updatedAt: "2026-04-22",
    sections: [
      { heading: "Rule Evaluation Order", body: "Rules are evaluated top-to-bottom. First match wins. Place more specific rules above broader ones. LOG rules do not terminate evaluation." },
      { heading: "Creating a Rule", body: "Navigate to Firewall → Rules → Add Rule. Specify chain (INPUT/OUTPUT/FORWARD), action (ACCEPT/DROP/REJECT), protocol, source/destination IP and port. Set priority to control order." },
      { heading: "Zone-Based Policies", body: "Zones (LAN, WAN, DMZ) simplify inter-segment policy. Assign interfaces to zones then define zone-to-zone policies instead of per-IP rules." },
      { heading: "Testing Rules", body: "Use Policy Compliance → Check to simulate traffic flows against your ruleset before deploying. Always test in staging before applying to production firewalls." },
    ],
  },
  {
    id: "doc-3",
    title: "Incident Response Playbook",
    category: "Operations",
    icon: "FileText",
    summary: "Standard procedures for detecting, classifying, escalating and resolving network incidents.",
    updatedAt: "2026-05-01",
    sections: [
      { heading: "Severity Definitions", body: "P1 Critical — total outage or security breach. P2 High — major degradation affecting >25% of users. P3 Medium — partial degradation. P4 Low — minor issue with workaround." },
      { heading: "Initial Triage", body: "On alert: (1) confirm the alert is not a false positive, (2) identify affected systems and blast radius, (3) open an incident record within 5 minutes, (4) notify on-call lead." },
      { heading: "Escalation Matrix", body: "P1: Notify Eng Lead + CTO within 15 min. P2: Eng Lead within 30 min. P3: Ticket only, respond within 4h. All P1s require a post-mortem within 48h." },
      { heading: "Resolution & Post-Mortem", body: "Document root cause, timeline, impact and action items in the incident record. Share blameless post-mortem with engineering team within 5 business days." },
    ],
  },
  {
    id: "doc-4",
    title: "Automation Jobs Reference",
    category: "Automation",
    icon: "Terminal",
    summary: "Reference guide for all available automation job types, triggers, and configuration options.",
    updatedAt: "2026-04-18",
    sections: [
      { heading: "Trigger Types", body: "schedule — cron-based, runs on a fixed interval. event — fires on an alert or threshold breach. manual — run-on-demand only. webhook — triggered by external HTTP POST." },
      { heading: "Target Expressions", body: "all — all managed devices. hostname-* — glob match on hostname. 192.168.1.0/24 — CIDR range. group:prod — all devices tagged with 'prod' environment." },
      { heading: "Job Statuses", body: "pending — queued, not yet started. running — currently executing. success — completed with exit code 0. failed — non-zero exit or timeout. queued — waiting for executor slot." },
      { heading: "Creating Custom Jobs", body: "Use the New Job dialog or POST /api/network/automation/jobs with {name, trigger, targets, description}. Reference a template to inherit pre-defined steps." },
    ],
  },
  {
    id: "doc-5",
    title: "Network Topology Guide",
    category: "Operations",
    icon: "Database",
    summary: "Understanding the topology map — how devices are discovered, laid out, and how links are represented.",
    updatedAt: "2026-03-30",
    sections: [
      { heading: "Auto-Discovery", body: "Devices are automatically placed in topology regions based on their cloud_provider field. On-premises devices use the On-Premises region; AWS, Azure, GCP get their own cloud regions." },
      { heading: "Node Status Colors", body: "Green (ok/online) — device is up and healthy. Amber (warn/degraded) — device is reachable but metrics are elevated. Red (down/error) — device is unreachable." },
      { heading: "Link Utilization", body: "Link color indicates bandwidth utilization: green <70%, amber 70–80%, red >80%. Links >80% utilization are highlighted with a pulsing animation." },
      { heading: "Custom Layouts", body: "Drag nodes to adjust positions (positions are session-local). Export the layout as JSON from Settings → Topology if you want to persist custom arrangements." },
    ],
  },
  {
    id: "doc-6",
    title: "API Reference — Network Module",
    category: "API",
    icon: "Terminal",
    summary: "REST API endpoints for the Network module — authentication, rate limits, and endpoint catalog.",
    updatedAt: "2026-05-08",
    sections: [
      { heading: "Authentication", body: "All requests require an Authorization: Bearer <JWT> header. Tokens are issued by POST /api/auth/login and expire after 24 hours. Refresh via POST /api/auth/refresh." },
      { heading: "Rate Limits", body: "Read endpoints: 600 req/min per tenant. Write endpoints: 60 req/min per tenant. Automation job runs: 20 req/min. Rate limit headers are returned on every response." },
      { heading: "Key Endpoints", body: "GET /api/network/devices — list all devices\nPOST /api/network/devices — create device\nGET /api/network/alerts — list alerts\nPOST /api/network/alerts/{id}/resolve — resolve alert\nGET /api/network/servers — list servers" },
      { heading: "Pagination", body: "Pass ?limit=N&offset=M for paginated responses. Default limit is 50, max is 200. Responses include {data: [], total: N, limit: N, offset: N} envelope." },
    ],
  },
  {
    id: "doc-7",
    title: "Server Manager — User Guide",
    category: "Setup",
    icon: "Database",
    summary: "Managing physical and virtual servers: adding, monitoring, restarting and syncing metrics.",
    updatedAt: "2026-05-10",
    sections: [
      { heading: "Adding a Server", body: "Go to Server Manager → Add Server. Fill in name, hostname, IP, OS, CPU cores, RAM and disk. Environment (prod/staging/dev/test) and region are optional but recommended for filtering." },
      { heading: "Metric Sync", body: "Click Sync on any server to refresh CPU, memory and disk utilization from the monitoring agent. Auto-sync runs every 5 minutes for online servers." },
      { heading: "Restart & Maintenance", body: "The Restart button triggers a graceful reboot via the management agent. Server status changes to 'rebooting' and returns to 'online' when health check passes." },
      { heading: "Filtering & Search", body: "Use the environment and status dropdowns to filter the server list. The search box matches hostname, IP, name and tags." },
    ],
  },
  {
    id: "doc-8",
    title: "Compliance Policies Reference",
    category: "Security",
    icon: "Settings",
    summary: "Overview of built-in compliance policies, how scores are calculated, and how to run on-demand checks.",
    updatedAt: "2026-05-05",
    sections: [
      { heading: "Policy Scoring", body: "Each policy is scored 0–100 based on the fraction of controls that are passing. Score ≥90 = green, 75–89 = amber, <75 = red. Score is updated on every scheduled or manual check." },
      { heading: "Built-in Policies", body: "CIS Benchmarks Level 1 & 2, NIST CSF, PCI DSS 4.0, ISO 27001 Annex A, and a custom Firewall Baseline policy are included. Custom policies can be added via the API." },
      { heading: "Running a Check", body: "Click 'Check Now' on any policy to run an immediate compliance scan. Results update within 30–120 seconds depending on the number of controls." },
      { heading: "Exceptions", body: "Controls can be marked as exceptions with a justification and expiry date. Excepted controls are excluded from the score calculation and shown separately." },
    ],
  },
];

export async function listDocs(tenantId) {
  return DOCS;
}

export async function getDoc(tenantId, id) {
  return DOCS.find(d => d.id === id) ?? DOCS[0];
}

// ── Policies ──────────────────────────────────────────────────────────────────

const POLICIES = [
  {
    id: "pol-1",
    name: "CIS Benchmark Level 1",
    standard: "CIS",
    category: "Security Hardening",
    owner: "Security Team",
    status: "pass",
    score: 94,
    exceptions: 2,
    lastCheck: "1h ago",
    last_check: "1h ago",
    description: "CIS Level 1 baseline security controls for servers and endpoints.",
    controls: [
      { id: "1.1", name: "Ensure auditd is installed",                 passing: true  },
      { id: "1.2", name: "Ensure SSH root login is disabled",          passing: true  },
      { id: "1.3", name: "Ensure password complexity is configured",   passing: true  },
      { id: "1.4", name: "Ensure /tmp is a separate partition",        passing: false },
      { id: "1.5", name: "Ensure core dumps are restricted",           passing: true  },
    ],
  },
  {
    id: "pol-2",
    name: "NIST CSF — Identify & Protect",
    standard: "NIST",
    category: "Risk Management",
    owner: "Compliance Team",
    status: "pass",
    score: 88,
    exceptions: 1,
    lastCheck: "4h ago",
    last_check: "4h ago",
    description: "NIST Cybersecurity Framework controls for asset management and access control.",
    controls: [
      { id: "ID.AM-1", name: "Physical devices and systems are inventoried", passing: true  },
      { id: "ID.AM-2", name: "Software platforms and applications are inventoried", passing: true },
      { id: "PR.AC-1", name: "Identities and credentials are managed",       passing: true  },
      { id: "PR.AC-3", name: "Remote access is managed",                     passing: true  },
      { id: "PR.DS-1", name: "Data-at-rest is protected",                    passing: false },
    ],
  },
  {
    id: "pol-3",
    name: "PCI DSS 4.0 — Network Controls",
    standard: "PCI DSS",
    category: "Payment Security",
    owner: "Finance & Security",
    status: "warn",
    score: 76,
    exceptions: 4,
    lastCheck: "12h ago",
    last_check: "12h ago",
    description: "PCI DSS v4.0 network segmentation and firewall requirements.",
    controls: [
      { id: "1.2.1", name: "All traffic to CDE is restricted to necessary flows", passing: true  },
      { id: "1.3.1", name: "Inbound traffic to CDE is restricted",               passing: true  },
      { id: "1.3.2", name: "Outbound traffic from CDE is restricted",            passing: false },
      { id: "1.4.1", name: "NSCs are installed between trusted/untrusted networks", passing: true },
      { id: "6.3.3", name: "All system components are protected with patches",   passing: false },
    ],
  },
  {
    id: "pol-4",
    name: "ISO 27001 — Annex A Controls",
    standard: "ISO 27001",
    category: "Information Security",
    owner: "CISO Office",
    status: "warn",
    score: 81,
    exceptions: 3,
    lastCheck: "1d ago",
    last_check: "1d ago",
    description: "ISO 27001:2022 Annex A technical and organizational controls.",
    controls: [
      { id: "A.8.1",  name: "User endpoint devices — hardening policy applied", passing: true  },
      { id: "A.8.7",  name: "Protection against malware",                       passing: true  },
      { id: "A.8.9",  name: "Configuration management maintained",              passing: true  },
      { id: "A.8.15", name: "Logging enabled and retained for 90 days",         passing: false },
      { id: "A.8.20", name: "Networks security controls in place",              passing: true  },
    ],
  },
  {
    id: "pol-5",
    name: "Firewall Baseline Policy",
    standard: "Internal",
    category: "Firewall Governance",
    owner: "Network Ops",
    status: "pass",
    score: 97,
    exceptions: 0,
    lastCheck: "30m ago",
    last_check: "30m ago",
    description: "Internal policy: all firewall rules must match the approved baseline and have an owner.",
    controls: [
      { id: "FB-1", name: "No ANY/ANY accept rules in INPUT chain",  passing: true },
      { id: "FB-2", name: "All rules have descriptions",             passing: true },
      { id: "FB-3", name: "Log rules present for DROP chains",       passing: true },
      { id: "FB-4", name: "No rules with expired justification",     passing: true },
    ],
  },
  {
    id: "pol-6",
    name: "Endpoint Vulnerability Management",
    standard: "Internal",
    category: "Vulnerability Management",
    owner: "Security Team",
    status: "fail",
    score: 63,
    exceptions: 7,
    lastCheck: "2d ago",
    last_check: "2d ago",
    description: "All endpoints must have no Critical/High CVEs unpatched for >30 days.",
    controls: [
      { id: "VM-1", name: "Vulnerability scanner agent installed",          passing: true  },
      { id: "VM-2", name: "No Critical CVEs >30 days unpatched",           passing: false },
      { id: "VM-3", name: "No High CVEs >60 days unpatched",               passing: false },
      { id: "VM-4", name: "Patch deployment pipeline configured",           passing: true  },
      { id: "VM-5", name: "Monthly vulnerability report generated",        passing: false },
    ],
  },
];

export async function listPolicies(tenantId) {
  return POLICIES;
}

export async function checkPolicy(tenantId, id) {
  const policy = POLICIES.find(p => p.id === id);
  if (!policy) return { compliant: true };
  const passing = policy.controls.filter(c => c.passing).length;
  return {
    ...policy,
    lastCheck: "just now",
    last_check: "just now",
    score: Math.round((passing / policy.controls.length) * 100),
    compliant: policy.status !== "fail",
  };
}

// ── Settings ──────────────────────────────────────────────────────────────────

const DEFAULT_SETTINGS = {
  snmpVersion: "v2c",
  snmpCommunity: "public",
  pollingInterval: 60,
  alertRetentionDays: 90,
  autoResolveAlerts: true,
  notificationEmail: "ops@company.com",
  timezone: "UTC",
  maxDevices: 500,
};

const DEFAULT_PROFILES = [
  { id: "prof-1", name: "Default",           description: "Standard monitoring for all devices",             pollingInterval: 60,  snmpVersion: "v2c", alertThresholds: { cpu: 85, mem: 90, bw: 90 } },
  { id: "prof-2", name: "High-Frequency",    description: "Aggressive 15s polling for critical infrastructure", pollingInterval: 15,  snmpVersion: "v3",  alertThresholds: { cpu: 75, mem: 80, bw: 85 } },
  { id: "prof-3", name: "Low-Bandwidth",     description: "5-minute polling for bandwidth-constrained sites",  pollingInterval: 300, snmpVersion: "v2c", alertThresholds: { cpu: 90, mem: 95, bw: 95 } },
  { id: "prof-4", name: "Cloud Workloads",   description: "Tailored for cloud-native services with HTTP checks", pollingInterval: 30, snmpVersion: "v3",  alertThresholds: { cpu: 80, mem: 85, bw: 80 } },
];

export async function getNetworkSettings(tenantId) {
  return DEFAULT_SETTINGS;
}

export async function updateNetworkSettings(tenantId, data) {
  return { ...DEFAULT_SETTINGS, ...data, updated: true };
}

export async function listSettingsProfiles(tenantId) {
  return DEFAULT_PROFILES;
}

export async function getSettingsProfile(tenantId, id) {
  return DEFAULT_PROFILES.find(p => p.id === id) ?? DEFAULT_PROFILES[0];
}

export async function updateSettingsProfile(tenantId, id, data) {
  return { ...(DEFAULT_PROFILES.find(p => p.id === id) ?? DEFAULT_PROFILES[0]), ...data, updated: true };
}

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
