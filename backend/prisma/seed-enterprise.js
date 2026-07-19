/**
 * Enterprise seed: NexaCorp Inc.
 * Roles, users across 5 departments, CRM deals, network infra, marketing data.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();
const HASH = (pw) => bcrypt.hash(pw, 10);

async function main() {
  // ── Tenant ─────────────────────────────────────────────────────────────────
  const tenant = await prisma.tenant.upsert({
    where: { slug: "nexacorp" },
    update: {},
    create: { name: "NexaCorp Inc.", slug: "nexacorp" },
  });
  const tid = tenant.id;
  console.log("✔ Tenant:", tenant.name);

  // ── Roles ──────────────────────────────────────────────────────────────────
  const roleNames = ["enterprise_admin", "manager", "sales_rep", "it_engineer", "marketing_specialist", "analyst", "employee"];
  const roles = {};
  for (const name of roleNames) {
    const r = await prisma.role.upsert({
      where: { id: (await prisma.role.findFirst({ where: { name, tenantId: tid } }))?.id ?? "none" },
      update: {},
      create: { name, tenantId: tid },
    });
    roles[name] = r.id;
  }
  // Re-query to have IDs reliably
  const dbRoles = await prisma.role.findMany({ where: { tenantId: tid } });
  dbRoles.forEach((r) => (roles[r.name] = r.id));
  console.log("✔ Roles:", Object.keys(roles).join(", "));

  // ── Permissions seed ───────────────────────────────────────────────────────
  const permKeys = [
    "profile.read", "crm.contact.read", "crm.contact.write", "crm.pipeline.manage",
    "user.read", "user.invite", "role.read", "role.create", "role.permission.assign",
    "role.permission.read", "network.overview.read", "network.inventory.read",
    "network.alerts.read", "network.traffic.read", "network.topology.read",
    "network.settings.read", "network.settings.write", "network.documentation.read",
    "views.home.read", "views.account.read", "views.analytics.read",
    "views.crm.read", "views.marketing.read", "views.network.read",
    "marketing.overview.read", "marketing.ai.read", "marketing.campaign.read",
    "marketing.campaign.create", "marketing.emma.read", "marketing.b2b.read",
    "marketing.personalization.read", "marketing.teams.read", "marketing.analytics.read",
    "marketing.cdp.read", "marketing.commerce.read", "analytics.dashboard.view",
    "network.connection.read",
  ];
  for (const key of permKeys) {
    await prisma.permission.upsert({ where: { key }, update: {}, create: { key } });
  }
  const allPerms = await prisma.permission.findMany();
  const permMap = Object.fromEntries(allPerms.map((p) => [p.key, p.id]));

  // enterprise_admin gets everything
  for (const permId of Object.values(permMap)) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: roles["enterprise_admin"], permissionId: permId } },
      update: {},
      create: { roleId: roles["enterprise_admin"], permissionId: permId },
    });
  }
  console.log("✔ Permissions assigned");

  // ── Users ─────────────────────────────────────────────────────────────────
  const usersData = [
    // C-Suite / Admin
    { email: "admin@nexacorp.com",   pw: "Admin@1234",   first: "Alex",    last: "Morgan",    role: "enterprise_admin",     dept: "Executive",   title: "CEO & System Admin",       phone: "+1-555-0100" },
    // IT Dept
    { email: "it.lead@nexacorp.com", pw: "ITLead@1234",  first: "Jordan",  last: "Chen",      role: "it_engineer",          dept: "IT",          title: "IT Manager",               phone: "+1-555-0201" },
    { email: "it.eng@nexacorp.com",  pw: "ITEng@1234",   first: "Sam",     last: "Patel",     role: "it_engineer",          dept: "IT",          title: "Network Engineer",         phone: "+1-555-0202" },
    // Sales Dept
    { email: "sales.mgr@nexacorp.com", pw: "Sales@1234", first: "Taylor",  last: "Brooks",    role: "manager",              dept: "Sales",       title: "Sales Manager",            phone: "+1-555-0301" },
    { email: "rep1@nexacorp.com",    pw: "Rep1@1234",    first: "Casey",   last: "Rivera",    role: "sales_rep",            dept: "Sales",       title: "Account Executive",        phone: "+1-555-0302" },
    { email: "rep2@nexacorp.com",    pw: "Rep2@1234",    first: "Morgan",  last: "Lee",       role: "sales_rep",            dept: "Sales",       title: "Senior Sales Rep",         phone: "+1-555-0303" },
    // Marketing Dept
    { email: "mkt.mgr@nexacorp.com", pw: "Mkt@1234",    first: "Riley",   last: "Watson",    role: "manager",              dept: "Marketing",   title: "Marketing Director",       phone: "+1-555-0401" },
    { email: "mkt.spec@nexacorp.com",pw: "MktS@1234",   first: "Drew",    last: "Foster",    role: "marketing_specialist", dept: "Marketing",   title: "Campaign Specialist",      phone: "+1-555-0402" },
    // Analytics Dept
    { email: "analyst@nexacorp.com", pw: "Anlst@1234",  first: "Quinn",   last: "Adams",     role: "analyst",              dept: "Analytics",   title: "Data Analyst",             phone: "+1-555-0501" },
    // General Employee
    { email: "emp@nexacorp.com",     pw: "Emp@1234",     first: "Blake",   last: "Turner",    role: "employee",             dept: "Operations",  title: "Operations Coordinator",   phone: "+1-555-0601" },
  ];

  const userMap = {};
  for (const u of usersData) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (existing) {
      userMap[u.email] = existing.id;
      continue;
    }
    const created = await prisma.user.create({
      data: {
        email: u.email, passwordHash: await HASH(u.pw),
        firstName: u.first, lastName: u.last,
        department: u.dept, jobTitle: u.title, phone: u.phone,
        isActive: true,
        tenantId: tid, roleId: roles[u.role],
      },
    });
    userMap[u.email] = created.id;
  }
  console.log("✔ Users:", Object.keys(userMap).length);

  const adminId = userMap["admin@nexacorp.com"];
  const salesMgrId = userMap["sales.mgr@nexacorp.com"];
  const rep1Id = userMap["rep1@nexacorp.com"];
  const rep2Id = userMap["rep2@nexacorp.com"];
  const mktMgrId = userMap["mkt.mgr@nexacorp.com"];
  const mktSpecId = userMap["mkt.spec@nexacorp.com"];
  const itLeadId = userMap["it.lead@nexacorp.com"];
  const itEngId = userMap["it.eng@nexacorp.com"];
  const analystId = userMap["analyst@nexacorp.com"];
  const empId = userMap["emp@nexacorp.com"];

  // ── CRM Opportunities (Deals) ──────────────────────────────────────────────
  const opportunities = [
    { name: "Acme Corp Enterprise License", value: 180000, stage: "proposal",      probability: 65,  ownerId: rep1Id },
    { name: "GlobalTech SaaS Expansion",    value: 95000,  stage: "negotiation",   probability: 80,  ownerId: rep1Id },
    { name: "BluePeak Platform Upgrade",    value: 42000,  stage: "qualification", probability: 40,  ownerId: rep2Id },
    { name: "Meridian Co. Annual Renewal",  value: 67500,  stage: "closed_won",    probability: 100, ownerId: rep2Id },
    { name: "SkyBridge Mobile Suite",       value: 23000,  stage: "prospecting",   probability: 20,  ownerId: salesMgrId },
    { name: "TriAxis Cloud Migration",      value: 310000, stage: "proposal",      probability: 55,  ownerId: rep1Id },
    { name: "NovaTech AI Integration",      value: 145000, stage: "negotiation",   probability: 75,  ownerId: salesMgrId },
    { name: "Orinoco Retail Platform",      value: 88000,  stage: "closed_won",    probability: 100, ownerId: rep2Id },
    { name: "Cascade Data Warehousing",     value: 56000,  stage: "prospecting",   probability: 15,  ownerId: rep1Id },
    { name: "Fusion Fintech Contract",      value: 200000, stage: "negotiation",   probability: 85,  ownerId: salesMgrId },
  ];
  for (const opp of opportunities) {
    await prisma.crmOpportunity.create({ data: { ...opp, tenantId: tid } });
  }
  console.log("✔ CRM Opportunities:", opportunities.length);

  // ── CRM Tasks ─────────────────────────────────────────────────────────────
  const tasks = [
    { title: "Follow up with Acme Corp on proposal",    task_type: "call",     status: "pending",     priority: "high",   userId: rep1Id,    relatedCustomerName: "Acme Corp" },
    { title: "Send contract to GlobalTech",              task_type: "email",    status: "in_progress", priority: "urgent", userId: rep1Id,    relatedCustomerName: "GlobalTech" },
    { title: "Schedule demo for BluePeak",               task_type: "meeting",  status: "pending",     priority: "medium", userId: rep2Id,    relatedCustomerName: "BluePeak" },
    { title: "Q3 pipeline review with sales team",       task_type: "meeting",  status: "pending",     priority: "high",   userId: salesMgrId, relatedCustomerName: null },
    { title: "Update Meridian Co. account records",      task_type: "follow_up",status: "completed",   priority: "low",    userId: rep2Id,    relatedCustomerName: "Meridian Co." },
    { title: "Prepare TriAxis migration scope doc",      task_type: "review",   status: "in_progress", priority: "high",   userId: rep1Id,    relatedCustomerName: "TriAxis" },
    { title: "NovaTech legal review follow-up",          task_type: "call",     status: "pending",     priority: "urgent", userId: salesMgrId, relatedCustomerName: "NovaTech" },
    { title: "Onboard Orinoco to customer portal",       task_type: "follow_up",status: "completed",   priority: "medium", userId: rep2Id,    relatedCustomerName: "Orinoco Retail" },
  ];
  for (const t of tasks) {
    await prisma.crmTask.create({ data: { ...t, tenantId: tid, due_date: new Date(Date.now() + 86400000 * 3) } });
  }
  console.log("✔ CRM Tasks:", tasks.length);

  // ── CRM Tickets ───────────────────────────────────────────────────────────
  const tickets = [
    { ticket_number: "TKT-001", subject: "API rate limit exceeded - Acme",       customer_name: "Acme Corp",   category: "technical", priority: "high",   status: "open",        sla_status: "at_risk" },
    { ticket_number: "TKT-002", subject: "Billing discrepancy on invoice #4821",  customer_name: "GlobalTech",  category: "billing",   priority: "medium", status: "in_progress", sla_status: "on_track" },
    { ticket_number: "TKT-003", subject: "SSO integration not working",           customer_name: "BluePeak",    category: "technical", priority: "urgent", status: "open",        sla_status: "breached" },
    { ticket_number: "TKT-004", subject: "Request for custom reporting module",   customer_name: "Meridian Co.",category: "feature",   priority: "low",    status: "pending",     sla_status: "on_track" },
    { ticket_number: "TKT-005", subject: "Data export failing for large sets",    customer_name: "TriAxis",     category: "technical", priority: "high",   status: "in_progress", sla_status: "at_risk" },
    { ticket_number: "TKT-006", subject: "User provisioning delay in onboarding", customer_name: "NovaTech",    category: "general",   priority: "medium", status: "resolved",    sla_status: "on_track" },
  ];
  for (const t of tickets) {
    await prisma.crmTicket.create({ data: { ...t, tenantId: tid } });
  }
  console.log("✔ CRM Tickets:", tickets.length);

  // ── CRM Follow-ups ────────────────────────────────────────────────────────
  const followUps = [
    { customer_name: "Acme Corp",  follow_up_type: "call",    status: "scheduled", scheduled_date: new Date(Date.now() + 86400000 * 1), notes: "Discuss proposal terms",  userId: rep1Id },
    { customer_name: "GlobalTech", follow_up_type: "email",   status: "completed", scheduled_date: new Date(Date.now() - 86400000 * 2), notes: "Sent NDA for review",     userId: rep1Id },
    { customer_name: "TriAxis",    follow_up_type: "meeting", status: "scheduled", scheduled_date: new Date(Date.now() + 86400000 * 5), notes: "Technical requirements",   userId: salesMgrId },
    { customer_name: "Cascade",    follow_up_type: "call",    status: "cancelled", scheduled_date: new Date(Date.now() - 86400000 * 1), notes: "Client unavailable",      userId: rep2Id },
  ];
  for (const f of followUps) {
    await prisma.crmFollowUp.create({ data: { ...f, tenantId: tid } });
  }
  console.log("✔ CRM Follow-ups:", followUps.length);

  // ── Network Devices ───────────────────────────────────────────────────────
  const devices = [
    { hostname: "web-prod-01",  ip_address: "10.0.1.10", device_type: "server",   status: "up",          os: "Ubuntu 22.04", cpu_util: 42,  mem_util: 58, bandwidth_mbps: 450, region: "us-east-1", cloud_provider: "aws" },
    { hostname: "web-prod-02",  ip_address: "10.0.1.11", device_type: "server",   status: "up",          os: "Ubuntu 22.04", cpu_util: 38,  mem_util: 52, bandwidth_mbps: 380, region: "us-east-1", cloud_provider: "aws" },
    { hostname: "db-primary",   ip_address: "10.0.2.10", device_type: "server",   status: "up",          os: "Debian 12",    cpu_util: 71,  mem_util: 84, bandwidth_mbps: 920, region: "us-east-1", cloud_provider: "aws" },
    { hostname: "db-replica",   ip_address: "10.0.2.11", device_type: "server",   status: "up",          os: "Debian 12",    cpu_util: 25,  mem_util: 60, bandwidth_mbps: 150, region: "us-east-2", cloud_provider: "aws" },
    { hostname: "cache-01",     ip_address: "10.0.3.10", device_type: "server",   status: "degraded",    os: "Alpine 3.18",  cpu_util: 91,  mem_util: 79, bandwidth_mbps: 200, region: "us-east-1", cloud_provider: "aws" },
    { hostname: "core-router",  ip_address: "192.168.1.1",device_type:"router",   status: "up",          os: "Cisco IOS",    cpu_util: 12,  mem_util: 30, bandwidth_mbps: 5000,region: "hq",        cloud_provider: "on_prem" },
    { hostname: "edge-switch-01",ip_address:"192.168.1.2",device_type:"switch",   status: "up",          os: "Cisco NX-OS",  cpu_util: 8,   mem_util: 20, bandwidth_mbps: 3000,region: "hq",        cloud_provider: "on_prem" },
    { hostname: "fw-main",      ip_address: "203.0.113.1",device_type:"firewall", status: "up",          os: "pfSense 2.7",  cpu_util: 22,  mem_util: 45, bandwidth_mbps: 2000,region: "hq",        cloud_provider: "on_prem" },
    { hostname: "api-gateway",  ip_address: "10.0.4.10", device_type: "server",   status: "up",          os: "Ubuntu 22.04", cpu_util: 55,  mem_util: 62, bandwidth_mbps: 700, region: "us-west-2", cloud_provider: "aws" },
    { hostname: "worker-01",    ip_address: "10.0.5.10", device_type: "server",   status: "maintenance", os: "Ubuntu 20.04", cpu_util: 0,   mem_util: 0,  bandwidth_mbps: 0,   region: "us-east-1", cloud_provider: "aws" },
    { hostname: "staging-web",  ip_address: "10.1.1.10", device_type: "server",   status: "up",          os: "Ubuntu 22.04", cpu_util: 15,  mem_util: 28, bandwidth_mbps: 80,  region: "us-east-1", cloud_provider: "aws" },
    { hostname: "vpn-gateway",  ip_address: "203.0.113.5",device_type:"router",   status: "up",          os: "OpenVPN",      cpu_util: 18,  mem_util: 35, bandwidth_mbps: 250, region: "hq",        cloud_provider: "on_prem" },
  ];
  for (const d of devices) {
    await prisma.networkDevice.create({ data: { ...d, tenantId: tid } });
  }
  console.log("✔ Network Devices:", devices.length);

  const allDevices = await prisma.networkDevice.findMany({ where: { tenantId: tid } });
  const devMap = Object.fromEntries(allDevices.map((d) => [d.hostname, d.id]));

  // ── Network Alerts ────────────────────────────────────────────────────────
  const alerts = [
    { title: "High CPU on cache-01",         message: "CPU utilisation above 90% for 15 min",     severity: "critical", status: "open",         deviceId: devMap["cache-01"] },
    { title: "High Memory on db-primary",    message: "Memory usage at 84% - approaching limit",  severity: "warning",  status: "acknowledged", deviceId: devMap["db-primary"] },
    { title: "Maintenance mode: worker-01",  message: "Server in scheduled maintenance window",   severity: "info",     status: "acknowledged", deviceId: devMap["worker-01"] },
    { title: "Bandwidth spike on db-primary",message: "920 Mbps throughput detected",             severity: "warning",  status: "open",         deviceId: devMap["db-primary"] },
    { title: "Firewall rule update",         message: "3 new DROP rules applied to fw-main",      severity: "info",     status: "resolved",     deviceId: devMap["fw-main"] },
    { title: "VPN latency elevated",         message: "Avg latency 145ms on vpn-gateway",         severity: "warning",  status: "open",         deviceId: devMap["vpn-gateway"] },
  ];
  for (const a of alerts) {
    await prisma.networkAlert.create({ data: { ...a, tenantId: tid } });
  }
  console.log("✔ Network Alerts:", alerts.length);

  // ── Network Incidents ────────────────────────────────────────────────────
  const incidents = [
    { title: "cache-01 CPU Spike",          description: "Cache server sustained >90% CPU — investigating memory leak in Redis cluster",   severity: "high",     status: "investigating" },
    { title: "Partial DB Replication Lag",  description: "db-replica showing 8s lag behind primary — monitoring",                         severity: "medium",   status: "open" },
    { title: "VPN Performance Degradation", description: "Remote workers reporting slow connectivity through vpn-gateway",                  severity: "medium",   status: "open" },
    { title: "Planned: worker-01 Upgrade",  description: "OS upgrade to Ubuntu 22.04, estimated 2-hour maintenance",                       severity: "low",      status: "resolved" },
  ];
  for (const inc of incidents) {
    await prisma.networkIncident.create({ data: { ...inc, tenantId: tid } });
  }
  console.log("✔ Network Incidents:", incidents.length);

  // ── Network Changes ───────────────────────────────────────────────────────
  const changes = [
    { title: "Expand db-primary RAM to 64 GB",       description: "Current 84% utilisation warrants upgrade",       status: "approved",  priority: "high" },
    { title: "Add second VPN gateway for redundancy", description: "Single point of failure on remote access",       status: "pending",   priority: "medium" },
    { title: "Firewall rule set v2.3 deployment",     description: "New egress filtering for GDPR compliance",       status: "completed", priority: "high" },
    { title: "Migrate cache-01 to cache cluster",     description: "Move from single Redis to Redis Cluster 3-node", status: "pending",   priority: "urgent" },
  ];
  for (const c of changes) {
    await prisma.networkChange.create({ data: { ...c, tenantId: tid } });
  }
  console.log("✔ Network Changes:", changes.length);

  // ── Network Servers ───────────────────────────────────────────────────────
  const servers = [
    { name: "Prod Web 01",  hostname: "web-prod-01",  ip_address: "10.0.1.10", os: "linux",   cores: 8,  ram_gb: 32, disk_gb: 500,  cpu_util: 42, mem_util: 58, disk_util: 38, status: "online",      environment: "prod",    region: "us-east-1", tags: "web,frontend" },
    { name: "DB Primary",   hostname: "db-primary",   ip_address: "10.0.2.10", os: "linux",   cores: 16, ram_gb: 64, disk_gb: 2000, cpu_util: 71, mem_util: 84, disk_util: 62, status: "online",      environment: "prod",    region: "us-east-1", tags: "database,primary" },
    { name: "DB Replica",   hostname: "db-replica",   ip_address: "10.0.2.11", os: "linux",   cores: 16, ram_gb: 64, disk_gb: 2000, cpu_util: 25, mem_util: 60, disk_util: 60, status: "online",      environment: "prod",    region: "us-east-2", tags: "database,replica" },
    { name: "Cache 01",     hostname: "cache-01",     ip_address: "10.0.3.10", os: "linux",   cores: 4,  ram_gb: 16, disk_gb: 100,  cpu_util: 91, mem_util: 79, disk_util: 15, status: "online",      environment: "prod",    region: "us-east-1", tags: "cache,redis" },
    { name: "API Gateway",  hostname: "api-gateway",  ip_address: "10.0.4.10", os: "linux",   cores: 8,  ram_gb: 16, disk_gb: 200,  cpu_util: 55, mem_util: 62, disk_util: 22, status: "online",      environment: "prod",    region: "us-west-2", tags: "api,gateway" },
    { name: "Worker 01",    hostname: "worker-01",    ip_address: "10.0.5.10", os: "linux",   cores: 4,  ram_gb: 8,  disk_gb: 200,  cpu_util: 0,  mem_util: 0,  disk_util: 45, status: "maintenance", environment: "prod",    region: "us-east-1", tags: "worker,queue" },
    { name: "Staging Web",  hostname: "staging-web",  ip_address: "10.1.1.10", os: "linux",   cores: 2,  ram_gb: 4,  disk_gb: 100,  cpu_util: 15, mem_util: 28, disk_util: 12, status: "online",      environment: "staging", region: "us-east-1", tags: "web,staging" },
    { name: "Dev Server",   hostname: "dev-01",       ip_address: "10.2.1.10", os: "linux",   cores: 2,  ram_gb: 8,  disk_gb: 200,  cpu_util: 5,  mem_util: 22, disk_util: 30, status: "online",      environment: "dev",     region: "us-east-1", tags: "dev" },
    { name: "Win App Server",hostname:"win-app-01",   ip_address: "10.0.6.10", os: "windows", cores: 8,  ram_gb: 32, disk_gb: 500,  cpu_util: 33, mem_util: 48, disk_util: 55, status: "online",      environment: "prod",    region: "hq",        tags: "windows,app" },
  ];
  for (const s of servers) {
    await prisma.networkServer.create({ data: { ...s, tenantId: tid } });
  }
  console.log("✔ Network Servers:", servers.length);

  // ── Network User Restrictions ──────────────────────────────────────────────
  const restrictions = [
    { name: "Block Torrent Traffic",    description: "Block BitTorrent on all ports",    target_type: "subnet", target: "0.0.0.0/0",       rule_type: "block",     protocol: "tcp",  port: "6881-6889", direction: "both",     priority: 10,  enabled: true },
    { name: "Rate-Limit Guest WiFi",    description: "Cap guest network at 5 Mbps",      target_type: "subnet", target: "192.168.100.0/24", rule_type: "rate_limit",protocol: "any",  port: "",          direction: "outbound", priority: 20,  enabled: true,  bandwidth_kbps: 5120 },
    { name: "Allow Admin HTTPS",        description: "Admin subnet full HTTPS access",   target_type: "group",  target: "admin-group",      rule_type: "allow",     protocol: "tcp",  port: "443",       direction: "both",     priority: 5,   enabled: true },
    { name: "Block Social Media (Biz)", description: "Block social during business hrs", target_type: "subnet", target: "10.0.0.0/8",       rule_type: "schedule",  protocol: "tcp",  port: "443",       direction: "outbound", priority: 50,  enabled: false },
    { name: "Block Intern Subnet SSH",  description: "No direct SSH from intern VLAN",   target_type: "subnet", target: "10.10.0.0/24",     rule_type: "block",     protocol: "tcp",  port: "22",        direction: "inbound",  priority: 15,  enabled: true },
  ];
  for (const r of restrictions) {
    await prisma.networkUserRestriction.create({ data: { ...r, tenantId: tid } });
  }
  console.log("✔ User Restrictions:", restrictions.length);

  // ── Firewall Rules ─────────────────────────────────────────────────────────
  const fwRules = [
    { name: "Allow Inbound HTTPS",        chain: "INPUT",   action: "ACCEPT", protocol: "tcp",  src_ip: "0.0.0.0/0",     dst_ip: "10.0.0.0/8",   dst_port: "443", priority: 10,  enabled: true,  log_traffic: false },
    { name: "Allow Inbound HTTP",         chain: "INPUT",   action: "ACCEPT", protocol: "tcp",  src_ip: "0.0.0.0/0",     dst_ip: "10.0.0.0/8",   dst_port: "80",  priority: 11,  enabled: true,  log_traffic: false },
    { name: "Allow SSH from Admin IP",    chain: "INPUT",   action: "ACCEPT", protocol: "tcp",  src_ip: "203.0.113.10",  dst_ip: "",             dst_port: "22",  priority: 5,   enabled: true,  log_traffic: true,  zone_src: "admin", zone_dst: "lan" },
    { name: "Drop All Other Inbound",     chain: "INPUT",   action: "DROP",   protocol: "any",  src_ip: "0.0.0.0/0",     dst_ip: "",             dst_port: "",    priority: 999, enabled: true,  log_traffic: true },
    { name: "Allow All Outbound",         chain: "OUTPUT",  action: "ACCEPT", protocol: "any",  src_ip: "10.0.0.0/8",    dst_ip: "0.0.0.0/0",    dst_port: "",    priority: 10,  enabled: true,  log_traffic: false },
    { name: "Block Outbound Telnet",      chain: "OUTPUT",  action: "DROP",   protocol: "tcp",  src_ip: "",              dst_ip: "0.0.0.0/0",    dst_port: "23",  priority: 20,  enabled: true,  log_traffic: true },
    { name: "Allow Internal Forward",     chain: "FORWARD", action: "ACCEPT", protocol: "any",  src_ip: "10.0.0.0/8",    dst_ip: "10.0.0.0/8",   dst_port: "",    priority: 10,  enabled: true,  log_traffic: false },
    { name: "DMZ to LAN REJECT",          chain: "FORWARD", action: "REJECT", protocol: "any",  src_ip: "172.16.0.0/12", dst_ip: "192.168.0.0/16",dst_port: "",   priority: 30,  enabled: true,  log_traffic: true,  zone_src: "dmz", zone_dst: "lan" },
    { name: "Log Suspicious Outbound",    chain: "OUTPUT",  action: "LOG",    protocol: "tcp",  src_ip: "",              dst_ip: "0.0.0.0/0",    dst_port: "4444",priority: 25,  enabled: true,  log_traffic: true },
  ];
  for (const r of fwRules) {
    await prisma.firewallRule.create({ data: { ...r, tenantId: tid } });
  }
  console.log("✔ Firewall Rules:", fwRules.length);

  // ── Marketing Todos ───────────────────────────────────────────────────────
  const mktTodos = [
    { title: "Launch Q3 Email Campaign",          description: "Segment list and schedule drip sequence",   completed: false, priority: "urgent", userId: mktSpecId },
    { title: "Refresh landing page copy",         description: "A/B test two new hero headlines",           completed: false, priority: "high",   userId: mktMgrId },
    { title: "Review Q2 campaign performance",    description: "Compile attribution report for exec review",completed: true,  priority: "medium", userId: analystId },
    { title: "Partner webinar promotional plan",  description: "Coordinate with design for assets",          completed: false, priority: "high",   userId: mktSpecId },
    { title: "Update buyer persona docs",         description: "Incorporate insights from sales interviews", completed: false, priority: "low",    userId: mktMgrId },
  ];
  for (const t of mktTodos) {
    await prisma.marketingTodo.create({ data: { ...t, tenantId: tid, due_date: new Date(Date.now() + 86400000 * 7) } });
  }
  console.log("✔ Marketing Todos:", mktTodos.length);

  // ── Marketing Schedule Events ─────────────────────────────────────────────
  const schedEvents = [
    { title: "Q3 Campaign Kickoff",         event_type: "campaign", start_time: new Date(Date.now() + 86400000 * 2),  end_time: new Date(Date.now() + 86400000 * 2 + 3600000 * 2),  userId: mktMgrId,  location: "HQ Boardroom" },
    { title: "Creative Assets Review",      event_type: "review",   start_time: new Date(Date.now() + 86400000 * 4),  end_time: new Date(Date.now() + 86400000 * 4 + 3600000),       userId: mktSpecId, location: "Zoom" },
    { title: "Email Marketing Deep Dive",   event_type: "meeting",  start_time: new Date(Date.now() + 86400000 * 6),  end_time: new Date(Date.now() + 86400000 * 6 + 3600000 * 1.5),userId: mktSpecId, location: "Slack Huddle" },
    { title: "Attribution ROI Presentation",event_type: "deadline", start_time: new Date(Date.now() + 86400000 * 10), end_time: null, userId: analystId, location: "Board Room A" },
  ];
  for (const e of schedEvents) {
    await prisma.marketingScheduleEvent.create({ data: { ...e, tenantId: tid } });
  }
  console.log("✔ Marketing Events:", schedEvents.length);

  // ── Marketing Activities ──────────────────────────────────────────────────
  const activities = [
    { action: "Created", target: "Summer B2B Campaign",       service: "b2b",             userId: mktSpecId },
    { action: "Updated", target: "Homepage Personalization",  service: "personalization", userId: mktMgrId },
    { action: "Launched",target: "EMMA Email Sequence #7",    service: "emma",            userId: mktSpecId },
    { action: "Uploaded",target: "Q3 Banner Creative Set",    service: "creative",        userId: mktMgrId },
    { action: "Reviewed",target: "Attribution Model v2",      service: "b2b",             userId: analystId },
  ];
  for (const a of activities) {
    await prisma.marketingActivity.create({ data: { ...a, tenantId: tid } });
  }
  console.log("✔ Marketing Activities:", activities.length);

  // ── Network Backups ────────────────────────────────────────────────────────
  const backups = [
    { device_name: "db-primary",  backup_type: "full",        status: "success", size_gb: 48.2 },
    { device_name: "db-primary",  backup_type: "incremental", status: "success", size_gb: 2.1 },
    { device_name: "db-replica",  backup_type: "full",        status: "success", size_gb: 46.9 },
    { device_name: "web-prod-01", backup_type: "incremental", status: "failed",  size_gb: 0 },
    { device_name: "api-gateway", backup_type: "full",        status: "success", size_gb: 12.4 },
  ];
  for (const b of backups) {
    await prisma.networkBackup.create({ data: { ...b, tenantId: tid } });
  }
  console.log("✔ Network Backups:", backups.length);

  // ── Contacts ──────────────────────────────────────────────────────────────
  const contacts = [
    { name: "Acme Corp",    key: "acme-corp",    email: "contact@acmecorp.com" },
    { name: "GlobalTech",   key: "globaltech",   email: "info@globaltech.io" },
    { name: "BluePeak",     key: "bluepeak",     email: "sales@bluepeak.com" },
    { name: "Meridian Co.", key: "meridian-co",  email: "billing@meridian.co" },
    { name: "TriAxis",      key: "triaxis",      email: "tech@triaxis.net" },
    { name: "NovaTech",     key: "novatech",     email: "legal@novatech.ai" },
  ];
  for (const c of contacts) {
    await prisma.contact.upsert({ where: { key: c.key }, update: {}, create: { ...c, tenantId: tid } });
  }
  console.log("✔ Contacts:", contacts.length);

  console.log("\n🎉  NexaCorp seed complete!");
  console.log("\n── Login Credentials ──────────────────────────────────────────");
  console.log("  CEO/Admin          admin@nexacorp.com        Admin@1234");
  console.log("  IT Manager         it.lead@nexacorp.com      ITLead@1234");
  console.log("  IT Engineer        it.eng@nexacorp.com       ITEng@1234");
  console.log("  Sales Manager      sales.mgr@nexacorp.com    Sales@1234");
  console.log("  Sales Rep (Casey)  rep1@nexacorp.com         Rep1@1234");
  console.log("  Sales Rep (Morgan) rep2@nexacorp.com         Rep2@1234");
  console.log("  Marketing Director mkt.mgr@nexacorp.com      Mkt@1234");
  console.log("  Campaign Spec.     mkt.spec@nexacorp.com     MktS@1234");
  console.log("  Data Analyst       analyst@nexacorp.com      Anlst@1234");
  console.log("  Ops Coordinator    emp@nexacorp.com          Emp@1234");
  console.log("──────────────────────────────────────────────────────────────");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
