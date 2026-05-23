import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

// ── Seed data ─────────────────────────────────────────────────────────────────

const SEED_TRANSACTIONS = [
  { type: "income",  category: "Revenue",     amount: 148000, description: "Enterprise license renewal – Nexus Corp",   date: "2026-04-01", status: "completed" },
  { type: "income",  category: "Sales",       amount: 62500,  description: "New contract – Vertex Systems",             date: "2026-04-08", status: "completed" },
  { type: "expense", category: "Payroll",     amount: 87200,  description: "April payroll disbursement",                date: "2026-04-15", status: "completed" },
  { type: "expense", category: "Operations",  amount: 12400,  description: "AWS infrastructure – April",                date: "2026-04-15", status: "completed" },
  { type: "income",  category: "Services",    amount: 34800,  description: "Professional services – CloudBase Inc",     date: "2026-04-18", status: "completed" },
  { type: "expense", category: "Marketing",   amount: 18600,  description: "LinkedIn Ads + Google Ads – Q2 sprint",     date: "2026-04-20", status: "completed" },
  { type: "income",  category: "Revenue",     amount: 91000,  description: "Mid-market upgrade – DataStream LLC",       date: "2026-04-22", status: "completed" },
  { type: "expense", category: "Equipment",   amount: 9800,   description: "Hardware refresh – 4 workstations",         date: "2026-04-24", status: "completed" },
  { type: "income",  category: "Investments", amount: 21500,  description: "Interest + dividend distribution",          date: "2026-04-28", status: "completed" },
  { type: "expense", category: "Office",      amount: 5600,   description: "Office lease – May",                        date: "2026-05-01", status: "completed" },
  { type: "income",  category: "Revenue",     amount: 55000,  description: "Pilot contract – Horizon Health",           date: "2026-05-05", status: "pending"   },
  { type: "expense", category: "Taxes",       amount: 38400,  description: "Q1 estimated tax payment",                  date: "2026-05-10", status: "completed" },
  { type: "income",  category: "Sales",       amount: 28000,  description: "Upsell – API seat expansion",               date: "2026-05-12", status: "completed" },
  { type: "expense", category: "Operations",  amount: 7200,   description: "SaaS tooling renewal (Slack, Notion, etc)", date: "2026-05-14", status: "completed" },
  { type: "income",  category: "Services",    amount: 16500,  description: "Training & onboarding – new client",        date: "2026-05-16", status: "pending"   },
];

const SEED_TAX_PLANS = [
  {
    title: "R&D Tax Credit 2026",
    year: 2026,
    status: "active",
    estimated_savings: 48000,
    strategy: "Qualify engineering headcount and platform build costs under Section 41.",
    notes: "Submit via Form 6765. Coordinate with CPA by Aug 15.",
  },
  {
    title: "Section 179 Equipment Deduction",
    year: 2026,
    status: "active",
    estimated_savings: 22000,
    strategy: "Deduct full cost of hardware purchased in Q1-Q2 under Section 179.",
    notes: "Cap is $1.16M. Current eligible spend: $98k.",
  },
  {
    title: "Opportunity Zone Investment",
    year: 2025,
    status: "completed",
    estimated_savings: 31500,
    strategy: "Invest capital gains into Qualified Opportunity Zone Fund for deferral.",
    notes: "QOF investment completed Dec 2025. 10-year hold period started.",
  },
  {
    title: "QSBS Exclusion Planning",
    year: 2026,
    status: "active",
    estimated_savings: 65000,
    strategy: "Structure Series A shares to qualify under Section 1202 for 100% gain exclusion.",
    notes: "Legal review pending with outside counsel.",
  },
];

const SEED_INVESTMENTS = [
  { name: "Growth Equity Portfolio",  type: "stocks",      initial_value: 250000, current_value: 312400, status: "active",  notes: "Diversified tech + SaaS basket via managed account." },
  { name: "Corporate Bond Ladder",    type: "bonds",       initial_value: 100000, current_value: 104200, status: "active",  notes: "Investment-grade, 2–5 year maturities." },
  { name: "San Jose Commercial Unit", type: "real_estate", initial_value: 480000, current_value: 541000, status: "active",  notes: "Office condo — leased to third party at $3.8k/mo." },
  { name: "Series A Co-investment",   type: "other",       initial_value: 75000,  current_value: 110000, status: "active",  notes: "Minority stake in B2B fintech startup." },
  { name: "Treasury ETF (SGOV)",      type: "bonds",       initial_value: 60000,  current_value: 61800,  status: "active",  notes: "Short-term T-bill exposure for liquidity reserve." },
];

const SEED_SOPS = [
  {
    title: "Customer Onboarding",
    department: "Customer Service",
    description: "End-to-end process for activating new enterprise customers.",
    steps: ["Send welcome email + credentials within 2 hours of contract sign", "Schedule kickoff call within 48 hours", "Provision tenant and initial users in admin panel", "Deliver product walkthrough (live or recorded)", "Assign dedicated CSM and schedule 30-day check-in"],
    status: "active",
    version: "2.3",
  },
  {
    title: "Monthly Close & Reporting",
    department: "Finance",
    description: "Steps to close the books and generate monthly financial reports.",
    steps: ["Reconcile all bank accounts by 2nd business day", "Review and categorize all transactions", "Run P&L and balance sheet reports", "Compare actuals vs budget — flag variances >5%", "Present summary to leadership by 5th business day"],
    status: "active",
    version: "1.8",
  },
  {
    title: "Security Incident Response",
    department: "IT",
    description: "Escalation and remediation protocol for security events.",
    steps: ["Detect & classify incident (P1/P2/P3)", "Notify security lead and CISO within 15 minutes", "Isolate affected systems immediately", "Preserve logs and evidence chain", "Root cause analysis within 24 hours", "Post-mortem report to stakeholders within 72 hours"],
    status: "active",
    version: "3.1",
  },
  {
    title: "Sales Deal Qualification (MEDDIC)",
    department: "Sales",
    description: "Qualify opportunities using the MEDDIC framework before committing resources.",
    steps: ["Identify Metrics (quantifiable value)", "Confirm Economic Buyer access", "Map Decision Criteria and process", "Identify and neutralize technical/business risks", "Find and enable internal Champion", "Document on deal card in CRM"],
    status: "active",
    version: "1.4",
  },
  {
    title: "Employee Offboarding",
    department: "HR",
    description: "Secure and compliant process for employee departures.",
    steps: ["Notify IT and revoke all system access day of departure", "Recover company hardware and assets", "Conduct exit interview", "Transfer knowledge and handover documentation", "Update org chart and reassign open tickets", "Process final payroll and benefits termination"],
    status: "active",
    version: "2.0",
  },
  {
    title: "Product Release Checklist",
    department: "Engineering",
    description: "Pre- and post-release gates for all production deployments.",
    steps: ["Code review approved by 2 engineers", "CI/CD pipeline green (all tests pass)", "Staging QA sign-off from product", "Feature flag enabled for 5% rollout", "Monitor error rates for 1 hour", "Full rollout or rollback decision by on-call eng"],
    status: "active",
    version: "4.2",
  },
  {
    title: "Lead Nurture Campaign Launch",
    department: "Marketing",
    description: "Pre-launch checklist for all outbound nurture sequences.",
    steps: ["Segment audience list and validate suppression list", "Review email copy and design (legal if required)", "A/B test subject line on 10% sample", "Schedule send windows based on timezone data", "Monitor open/click rates for first 6 hours", "Log results in campaign tracker"],
    status: "active",
    version: "1.6",
  },
  {
    title: "Vendor Procurement & Approval",
    department: "Operations",
    description: "Process for evaluating and approving new vendor relationships.",
    steps: ["Submit vendor request form with business justification", "Security review for data access (if applicable)", "Legal review of MSA/DPA", "Finance approval for budget impact", "Executive sign-off for contracts >$50k", "Add to vendor registry and set renewal reminder"],
    status: "draft",
    version: "1.1",
  },
];

const SEED_WORKFLOWS = [
  {
    name: "New Lead Auto-Assign",
    description: "Automatically assign inbound leads to reps based on round-robin + territory.",
    department: "Sales",
    trigger: "New contact created with source = inbound",
    steps: ["Check territory mapping", "Apply round-robin assignment", "Send rep notification", "Create follow-up task (T+24h)"],
    status: "active",
    is_automated: true,
  },
  {
    name: "Invoice Approval Flow",
    description: "Route vendor invoices for approval before payment release.",
    department: "Finance",
    trigger: "Invoice uploaded to billing system",
    steps: ["Auto-match to PO (if exists)", "Route to manager if amount >$5k", "CFO approval for amounts >$25k", "Trigger payment in banking system", "Log in ERP"],
    status: "active",
    is_automated: true,
  },
  {
    name: "Customer Health Score Update",
    description: "Weekly recalculation of customer health scores based on usage + support data.",
    department: "Customer Service",
    trigger: "Scheduled — every Monday 06:00 UTC",
    steps: ["Pull usage metrics from product analytics", "Pull open ticket count and age", "Pull last login date", "Compute composite health score", "Flag at-risk accounts (score <60) for CSM review"],
    status: "active",
    is_automated: true,
  },
  {
    name: "Contract Renewal Reminder",
    description: "Notify account owners 90, 60 and 30 days before contract expiry.",
    department: "Sales",
    trigger: "Contract end_date - 90 days",
    steps: ["Send 90-day heads-up to AE + CSM", "Create renewal opportunity in CRM", "Send 60-day email to customer champion", "Escalate to manager if no response at 30 days"],
    status: "active",
    is_automated: true,
  },
  {
    name: "Weekly KPI Report",
    description: "Compile and distribute weekly business KPIs to leadership.",
    department: "Operations",
    trigger: "Scheduled — every Friday 17:00 UTC",
    steps: ["Pull revenue and pipeline data", "Pull operational metrics", "Generate PDF summary", "Email to exec distribution list"],
    status: "active",
    is_automated: false,
  },
  {
    name: "New Hire IT Setup",
    description: "Provision all systems and access for a new hire on their start date.",
    department: "IT",
    trigger: "Employee start_date - 1 business day",
    steps: ["Create SSO account", "Provision email and calendar", "Add to relevant Slack channels", "Assign laptop + deliver access card", "Send welcome email with setup guide"],
    status: "active",
    is_automated: false,
  },
];

const SEED_GOALS = [
  {
    title: "Reach $5M ARR",
    category: "growth",
    description: "Grow recurring revenue to $5M by end of fiscal year through new logo acquisition and expansion.",
    target_date: "2026-12-31",
    progress: 76,
    status: "in_progress",
    priority: "high",
    milestones: [
      { title: "$3M ARR", target: "2026-03-31", completed: true },
      { title: "$4M ARR", target: "2026-07-31", completed: false },
      { title: "$5M ARR", target: "2026-12-31", completed: false },
    ],
  },
  {
    title: "Launch Self-Serve Product Tier",
    category: "digital_transformation",
    description: "Build and launch a PLG motion with a freemium tier to reduce CAC and accelerate top-of-funnel.",
    target_date: "2026-09-01",
    progress: 48,
    status: "in_progress",
    priority: "high",
    milestones: [
      { title: "Product requirements finalized", target: "2026-03-15", completed: true },
      { title: "Beta launch to 50 users",        target: "2026-06-01", completed: false },
      { title: "GA launch",                      target: "2026-09-01", completed: false },
    ],
  },
  {
    title: "Expand into EMEA Market",
    category: "market_expansion",
    description: "Establish sales + support presence in UK and Germany; sign 10 EMEA logos.",
    target_date: "2026-12-31",
    progress: 22,
    status: "at_risk",
    priority: "medium",
    milestones: [
      { title: "Hire EMEA Sales Lead",           target: "2026-04-30", completed: true },
      { title: "UK entity established",          target: "2026-06-30", completed: false },
      { title: "5 EMEA logos signed",            target: "2026-09-30", completed: false },
      { title: "10 EMEA logos signed",           target: "2026-12-31", completed: false },
    ],
  },
  {
    title: "Reduce Support Ticket Volume 30%",
    category: "operational_efficiency",
    description: "Invest in self-serve docs, in-app guidance, and AI chatbot to deflect Tier-1 tickets.",
    target_date: "2026-08-31",
    progress: 61,
    status: "in_progress",
    priority: "medium",
    milestones: [
      { title: "Knowledge base rebuild",         target: "2026-03-31", completed: true },
      { title: "In-app tooltips shipped",        target: "2026-05-15", completed: true },
      { title: "AI chatbot go-live",             target: "2026-07-01", completed: false },
    ],
  },
  {
    title: "ISO 27001 Certification",
    category: "operational_efficiency",
    description: "Achieve ISO 27001 certification to unlock enterprise deals and reduce procurement friction.",
    target_date: "2026-10-31",
    progress: 35,
    status: "in_progress",
    priority: "high",
    milestones: [
      { title: "Gap assessment complete",        target: "2026-03-31", completed: true },
      { title: "Controls implementation",        target: "2026-07-31", completed: false },
      { title: "Stage 1 audit",                  target: "2026-09-15", completed: false },
      { title: "Certification awarded",          target: "2026-10-31", completed: false },
    ],
  },
  {
    title: "AI-Powered Analytics Features",
    category: "innovation",
    description: "Ship 3 AI-driven features (anomaly detection, forecast, churn prediction) into the analytics module.",
    target_date: "2026-11-30",
    progress: 15,
    status: "planning",
    priority: "medium",
    milestones: [
      { title: "Anomaly detection shipped",      target: "2026-07-31", completed: false },
      { title: "Revenue forecast model",         target: "2026-09-30", completed: false },
      { title: "Churn prediction live",          target: "2026-11-30", completed: false },
    ],
  },
];

const SEED_MARKET_ANALYSIS = [
  {
    title: "B2B SaaS Analytics — Competitive Landscape",
    market: "B2B SaaS / Analytics",
    analysis_type: "competitive",
    summary: "Market is growing at 18% CAGR. Three Tier-1 players (Tableau, Power BI, Looker) dominate enterprise. Mid-market is underserved — strongest opportunity.",
    opportunities: ["Mid-market analytics gap", "AI/ML feature differentiation", "Vertical-specific packaging"],
    threats: ["Continued Microsoft Power BI bundling", "Price compression from open-source tools", "Consolidation among larger vendors"],
    status: "active",
  },
  {
    title: "EMEA Expansion — Regulatory & Market Entry",
    market: "Europe (UK, DACH)",
    analysis_type: "market_entry",
    summary: "GDPR compliance is table-stakes. UK post-Brexit data rules require separate DPA consideration. Germany is strongest enterprise market but has long sales cycles.",
    opportunities: ["GDPR-compliant positioning advantage", "German Mittelstand underserved by US vendors", "UK fintech sector high propensity to buy"],
    threats: ["GDPR fines risk", "Extended procurement timelines", "Local competition (SAP, Software AG)"],
    status: "active",
  },
  {
    title: "PLG / Self-Serve Market Trends",
    market: "SaaS — Product-Led Growth",
    analysis_type: "trend",
    summary: "PLG is now the dominant go-to-market for sub-$50k ACV deals. Bottom-up adoption reduces CAC by 3-5x. Free tier is expected by buyers in this segment.",
    opportunities: ["CAC reduction through free tier", "Viral adoption loop via data sharing", "Land-and-expand from self-serve to enterprise"],
    threats: ["Free tier cannibalization risk", "Support cost increase for low-ACV customers", "Competitor freemium (Metabase, Grafana)"],
    status: "active",
  },
  {
    title: "AI Feature Demand — Customer Survey Q1 2026",
    market: "Existing Customer Base",
    analysis_type: "customer",
    summary: "72% of surveyed customers want AI-assisted anomaly detection. 61% would pay a premium for predictive churn signals. Willingness to pay +$200–400/mo.",
    opportunities: ["AI premium tier pricing", "Churn prediction as retention tool for CSM", "Anomaly detection reduces customer manual work"],
    threats: ["Customer data privacy concerns (34%)", "Competitors shipping AI features faster", "AI feature build complexity + cost"],
    status: "active",
  },
];

const SEED_CAMPAIGNS = [
  { name: "Spring Enterprise Outreach",   platform: "email",    status: "active",    budget: 8000,  spent: 4200,  leads: 84,  conversions: 12, start_date: "2026-04-01", end_date: "2026-05-31" },
  { name: "LinkedIn Decision-Maker Ads",  platform: "linkedin", status: "active",    budget: 15000, spent: 9800,  leads: 142, conversions: 18, start_date: "2026-04-15", end_date: "2026-06-30" },
  { name: "Webinar — Analytics Trends",   platform: "webinar",  status: "completed", budget: 4000,  spent: 3800,  leads: 218, conversions: 31, start_date: "2026-03-10", end_date: "2026-03-10" },
  { name: "Google Ads — Mid-Market",      platform: "google",   status: "active",    budget: 12000, spent: 7100,  leads: 96,  conversions: 9,  start_date: "2026-05-01", end_date: "2026-06-30" },
  { name: "Content SEO Push — Q2",        platform: "seo",      status: "active",    budget: 5000,  spent: 2100,  leads: 64,  conversions: 6,  start_date: "2026-04-01", end_date: "2026-06-30" },
  { name: "Account-Based Marketing Pilot", platform: "email",   status: "paused",    budget: 6000,  spent: 1400,  leads: 22,  conversions: 4,  start_date: "2026-05-01", end_date: "2026-07-31" },
];

const SEED_CLIENTS = [
  { name: "Jordan Marsh",    company: "Nexus Corp",      email: "jordan@nexuscorp.com",    phone: "+1-415-555-0101", annual_value: 148000, status: "active",   contract_end: "2027-03-31", industry: "Technology" },
  { name: "Priya Nair",      company: "Vertex Systems",  email: "priya@vertexsys.com",     phone: "+1-212-555-0182", annual_value: 62500,  status: "active",   contract_end: "2026-12-31", industry: "Finance" },
  { name: "Marcus Cole",     company: "CloudBase Inc",   email: "mcole@cloudbase.io",      phone: "+1-628-555-0145", annual_value: 34800,  status: "active",   contract_end: "2026-09-30", industry: "Cloud Services" },
  { name: "Alicia Forsythe", company: "DataStream LLC",  email: "aforsythe@datastream.co", phone: "+1-312-555-0167", annual_value: 91000,  status: "active",   contract_end: "2027-01-31", industry: "Data & Analytics" },
  { name: "Kai Watanabe",    company: "Horizon Health",  email: "kwatanabe@horizonhx.com", phone: "+1-408-555-0133", annual_value: 55000,  status: "active",   contract_end: "2026-11-30", industry: "Healthcare" },
  { name: "Elena Romero",    company: "Pinnacle Retail",  email: "eromero@pinnacle.com",   phone: "+1-310-555-0119", annual_value: 28000,  status: "prospect", contract_end: null,         industry: "Retail" },
  { name: "Devin Okafor",    company: "Finbridge Corp",  email: "dokafor@finbridge.com",   phone: "+1-646-555-0188", annual_value: 42000,  status: "inactive", contract_end: "2025-12-31", industry: "Finance" },
  { name: "Sarah Lund",      company: "OmniLogic",       email: "slund@omnilogic.ai",      phone: "+1-510-555-0176", annual_value: 19500,  status: "prospect", contract_end: null,         industry: "AI/ML" },
];

const SEED_MEMBERS = [
  { name: "Alex Rivera",    role: "Engineering Lead",      department: "Engineering",       email: "arivera@company.com",  status: "active", skills: ["React", "Node.js", "PostgreSQL", "AWS"] },
  { name: "Priya Sharma",   role: "Product Manager",       department: "Operations",        email: "psharma@company.com",  status: "active", skills: ["Product Strategy", "Roadmapping", "Jira", "Analytics"] },
  { name: "Jordan Kim",     role: "Account Executive",     department: "Sales",             email: "jkim@company.com",     status: "active", skills: ["Enterprise Sales", "MEDDIC", "Salesforce", "Negotiation"] },
  { name: "Taylor Brooks",  role: "Customer Success Mgr",  department: "Customer Service",  email: "tbrooks@company.com",  status: "active", skills: ["Onboarding", "NPS", "Churn Prevention", "Gainsight"] },
  { name: "Morgan Davies",  role: "Marketing Manager",     department: "Marketing",         email: "mdavies@company.com",  status: "active", skills: ["Demand Gen", "HubSpot", "Content Strategy", "SEO"] },
  { name: "Casey Nguyen",   role: "DevOps Engineer",       department: "IT",                email: "cnguyen@company.com",  status: "active", skills: ["Kubernetes", "Terraform", "CI/CD", "Monitoring"] },
  { name: "Sam Patel",      role: "Financial Analyst",     department: "Finance",           email: "spatel@company.com",   status: "active", skills: ["FP&A", "Excel", "Looker", "Budget Management"] },
  { name: "Jamie Torres",   role: "HR Business Partner",   department: "HR",                email: "jtorres@company.com",  status: "active", skills: ["Talent Acquisition", "Performance Mgmt", "Workday", "L&D"] },
];

const SEED_PROJECTS = [
  {
    name: "Analytics Dashboard v3",
    description: "Rebuild the analytics dashboard with real-time data, AI insights and self-serve query builder.",
    status: "in_progress",
    priority: "high",
    progress: 72,
    budget: 85000,
    team_members: ["Alex Rivera", "Priya Sharma", "Casey Nguyen"],
    start_date: "2026-02-01",
    end_date: "2026-07-31",
  },
  {
    name: "EMEA Market Expansion",
    description: "Launch sales, legal and support infrastructure for UK and Germany markets.",
    status: "in_progress",
    priority: "high",
    progress: 28,
    budget: 120000,
    team_members: ["Jordan Kim", "Jamie Torres", "Sam Patel"],
    start_date: "2026-03-01",
    end_date: "2026-12-31",
  },
  {
    name: "ISO 27001 Compliance",
    description: "Implement security controls and achieve ISO 27001 certification.",
    status: "in_progress",
    priority: "high",
    progress: 35,
    budget: 45000,
    team_members: ["Casey Nguyen", "Alex Rivera", "Jamie Torres"],
    start_date: "2026-01-15",
    end_date: "2026-10-31",
  },
  {
    name: "Self-Serve PLG Tier",
    description: "Build freemium product tier with automated onboarding and in-app upgrade prompts.",
    status: "planning",
    priority: "medium",
    progress: 15,
    budget: 60000,
    team_members: ["Alex Rivera", "Priya Sharma", "Morgan Davies"],
    start_date: "2026-05-01",
    end_date: "2026-09-01",
  },
  {
    name: "CRM Migration to New Platform",
    description: "Migrate all CRM data and workflows from legacy system to new stack.",
    status: "completed",
    priority: "medium",
    progress: 100,
    budget: 28000,
    team_members: ["Jordan Kim", "Taylor Brooks", "Priya Sharma"],
    start_date: "2025-10-01",
    end_date: "2026-01-31",
  },
];

const SEED_TASKS = [
  { title: "Implement cohort retention heatmap",   project_id: null, status: "done",        priority: "high",   assignee: "Alex Rivera",    due_date: "2026-05-10" },
  { title: "Review ISO 27001 gap assessment",       project_id: null, status: "done",        priority: "high",   assignee: "Casey Nguyen",   due_date: "2026-04-30" },
  { title: "Draft EMEA pricing deck",              project_id: null, status: "in_progress", priority: "high",   assignee: "Jordan Kim",     due_date: "2026-05-30" },
  { title: "Write UK entity registration docs",    project_id: null, status: "in_progress", priority: "medium", assignee: "Sam Patel",      due_date: "2026-06-10" },
  { title: "Set up German legal entity",           project_id: null, status: "todo",        priority: "medium", assignee: "Jamie Torres",   due_date: "2026-06-30" },
  { title: "Build AI anomaly detection prototype", project_id: null, status: "in_progress", priority: "high",   assignee: "Alex Rivera",    due_date: "2026-07-15" },
  { title: "Redesign onboarding email sequence",   project_id: null, status: "review",      priority: "medium", assignee: "Morgan Davies",  due_date: "2026-05-25" },
  { title: "Quarterly NPS survey — enterprise",    project_id: null, status: "todo",        priority: "low",    assignee: "Taylor Brooks",  due_date: "2026-06-01" },
  { title: "Conduct performance reviews Q2",       project_id: null, status: "todo",        priority: "medium", assignee: "Jamie Torres",   due_date: "2026-06-15" },
  { title: "Kubernetes cluster upgrade to 1.31",   project_id: null, status: "review",      priority: "high",   assignee: "Casey Nguyen",   due_date: "2026-05-28" },
  { title: "Close Horizon Health renewal",         project_id: null, status: "in_progress", priority: "urgent", assignee: "Jordan Kim",     due_date: "2026-05-31" },
  { title: "Update vendor risk register",          project_id: null, status: "todo",        priority: "low",    assignee: "Sam Patel",      due_date: "2026-06-20" },
];

// ── Lazy seeding ──────────────────────────────────────────────────────────────

async function lazySeed(tenantId) {
  const count = await prisma.bizTransaction.count({ where: { tenantId } });
  if (count > 0) return;

  const now = new Date();

  await prisma.bizTransaction.createMany({    data: SEED_TRANSACTIONS.map((t)  => ({ ...t,  tenantId })) });
  await prisma.bizTaxPlan.createMany({        data: SEED_TAX_PLANS.map((t)     => ({ ...t,  tenantId })) });
  await prisma.bizInvestment.createMany({     data: SEED_INVESTMENTS.map((i)   => ({ ...i,  tenantId })) });
  await prisma.bizSOP.createMany({            data: SEED_SOPS.map((s)          => ({ ...s,  steps: s.steps,    tenantId })) });
  await prisma.bizWorkflow.createMany({       data: SEED_WORKFLOWS.map((w)     => ({ ...w,  steps: w.steps,    tenantId })) });
  await prisma.bizGoal.createMany({           data: SEED_GOALS.map((g)         => ({ ...g,  milestones: g.milestones, tenantId })) });
  await prisma.bizMarketAnalysis.createMany({ data: SEED_MARKET_ANALYSIS.map((m) => ({ ...m, opportunities: m.opportunities, threats: m.threats, tenantId })) });
  await prisma.bizCampaign.createMany({       data: SEED_CAMPAIGNS.map((c)     => ({ ...c,  tenantId })) });
  await prisma.bizClient.createMany({         data: SEED_CLIENTS.map((c)       => ({ ...c,  tenantId })) });
  await prisma.bizMember.createMany({         data: SEED_MEMBERS.map((m)       => ({ ...m,  skills: m.skills,  tenantId })) });
  await prisma.bizProject.createMany({        data: SEED_PROJECTS.map((p)      => ({ ...p,  team_members: p.team_members, tenantId })) });
  await prisma.bizTask.createMany({           data: SEED_TASKS.map((t)         => ({ ...t,  tenantId })) });
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export async function getDashboardStats(tenantId) {
  await lazySeed(tenantId);

  const [
    transactions, projects, members, clients, goals, sops,
  ] = await Promise.all([
    prisma.bizTransaction.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" } }),
    prisma.bizProject.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" } }),
    prisma.bizMember.findMany({ where: { tenantId } }),
    prisma.bizClient.findMany({ where: { tenantId } }),
    prisma.bizGoal.findMany({ where: { tenantId } }),
    prisma.bizSOP.count({ where: { tenantId } }),
  ]);

  const income   = transactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expenses = transactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const active   = projects.filter(p => p.status === "in_progress");
  const avgProg  = goals.length
    ? Math.round(goals.reduce((s, g) => s + g.progress, 0) / goals.length)
    : 0;

  return {
    financial: {
      total_income:      income,
      total_expenses:    expenses,
      net_profit:        income - expenses,
      transaction_count: transactions.length,
    },
    projects: {
      active:    active.length,
      completed: projects.filter(p => p.status === "completed").length,
      total:     projects.length,
    },
    team:     {
      active_members: members.filter(m => m.status === "active").length,
      total:          members.length,
    },
    clients: {
      active:      clients.filter(c => c.status === "active").length,
      total:       clients.length,
      total_value: clients.filter(c => c.status === "active").reduce((s, c) => s + c.annual_value, 0),
    },
    operations: { sops_count: sops },
    strategic: {
      goals_count:  goals.length,
      avg_progress: avgProg,
    },
    recent_transactions: transactions.slice(0, 5),
    recent_projects:     active.slice(0, 4),
  };
}

// ── Financial – Transactions ──────────────────────────────────────────────────
export async function listTransactions(tenantId) {
  await lazySeed(tenantId);
  return prisma.bizTransaction.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" } });
}

export async function createTransaction(tenantId, data) {
  return prisma.bizTransaction.create({
    data: {
      type:        data.type ?? 'income',
      category:    data.category,
      amount:      Number(data.amount) || 0,
      description: data.description ?? null,
      date:        data.date ?? new Date().toISOString().split('T')[0],
      status:      data.status ?? 'completed',
      tenantId,
    },
  });
}

export async function deleteTransaction(tenantId, id) {
  await prisma.bizTransaction.deleteMany({ where: { id, tenantId } });
}

// ── Financial – Tax Plans ─────────────────────────────────────────────────────
export async function listTaxPlans(tenantId) {
  await lazySeed(tenantId);
  return prisma.bizTaxPlan.findMany({ where: { tenantId }, orderBy: { year: "desc" } });
}

export async function createTaxPlan(tenantId, data) {
  return prisma.bizTaxPlan.create({
    data: {
      title:             data.title ?? `Tax Plan ${data.year ?? new Date().getFullYear()}`,
      year:              Number(data.year) || new Date().getFullYear(),
      status:            data.status ?? 'active',
      estimated_savings: Number(data.estimated_savings) || 0,
      strategy:          data.strategy ?? null,
      notes:             data.notes ?? null,
      tenantId,
    },
  });
}

export async function deleteTaxPlan(tenantId, id) {
  await prisma.bizTaxPlan.deleteMany({ where: { id, tenantId } });
}

// ── Financial – Investments ───────────────────────────────────────────────────
const RISK_LEVEL_BY_TYPE = { stocks: 'high', bonds: 'low', real_estate: 'medium', other: 'medium' };

export async function listInvestments(tenantId) {
  await lazySeed(tenantId);
  const invs = await prisma.bizInvestment.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" } });
  return invs.map((inv) => ({
    ...inv,
    roi_percentage: inv.initial_value > 0
      ? Number(((inv.current_value - inv.initial_value) / inv.initial_value * 100).toFixed(2))
      : 0,
    risk_level: RISK_LEVEL_BY_TYPE[inv.type] ?? 'medium',
  }));
}

export async function createInvestment(tenantId, data) {
  return prisma.bizInvestment.create({
    data: {
      name:          data.name,
      type:          data.type ?? 'stocks',
      initial_value: Number(data.initial_value) || 0,
      current_value: Number(data.current_value) || 0,
      status:        data.status ?? 'active',
      notes:         data.notes ?? null,
      tenantId,
    },
  });
}

export async function deleteInvestment(tenantId, id) {
  await prisma.bizInvestment.deleteMany({ where: { id, tenantId } });
}

// ── Operations – SOPs ─────────────────────────────────────────────────────────
export async function listSOPs(tenantId) {
  await lazySeed(tenantId);
  return prisma.bizSOP.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" } });
}

export async function createSOP(tenantId, data) {
  return prisma.bizSOP.create({
    data: {
      title:       data.title,
      department:  data.department,
      description: data.description ?? null,
      steps:       data.steps ?? [],
      status:      data.status ?? 'active',
      version:     data.version ?? '1.0',
      tenantId,
    },
  });
}

export async function updateSOP(tenantId, id, data) {
  const updateData = {};
  if (data.title !== undefined)       updateData.title       = data.title;
  if (data.department !== undefined)  updateData.department  = data.department;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.steps !== undefined)       updateData.steps       = data.steps;
  if (data.status !== undefined)      updateData.status      = data.status;
  if (data.version !== undefined)     updateData.version     = data.version;
  return prisma.bizSOP.update({ where: { id }, data: updateData });
}

export async function deleteSOP(tenantId, id) {
  await prisma.bizSOP.deleteMany({ where: { id, tenantId } });
}

// ── Operations – Workflows ────────────────────────────────────────────────────
export async function listWorkflows(tenantId) {
  await lazySeed(tenantId);
  return prisma.bizWorkflow.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" } });
}

export async function createWorkflow(tenantId, data) {
  return prisma.bizWorkflow.create({
    data: {
      name:         data.name,
      description:  data.description ?? null,
      department:   data.department ?? null,
      trigger:      data.trigger ?? null,
      steps:        data.steps ?? [],
      status:       data.status ?? 'active',
      is_automated: data.is_automated ?? false,
      tenantId,
    },
  });
}

export async function deleteWorkflow(tenantId, id) {
  await prisma.bizWorkflow.deleteMany({ where: { id, tenantId } });
}

// ── Strategic – Goals ─────────────────────────────────────────────────────────
export async function listGoals(tenantId) {
  await lazySeed(tenantId);
  return prisma.bizGoal.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" } });
}

export async function createGoal(tenantId, data) {
  return prisma.bizGoal.create({
    data: {
      title:       data.title,
      category:    data.category ?? 'growth',
      description: data.description ?? null,
      target_date: data.target_date ?? null,
      progress:    Number(data.progress) || 0,
      milestones:  data.milestones ?? [],
      status:      data.status ?? 'in_progress',
      priority:    data.priority ?? 'medium',
      tenantId,
    },
  });
}

export async function updateGoal(tenantId, id, data) {
  const updateData = {};
  if (data.title !== undefined)       updateData.title       = data.title;
  if (data.category !== undefined)    updateData.category    = data.category;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.target_date !== undefined) updateData.target_date = data.target_date;
  if (data.progress !== undefined)    updateData.progress    = Number(data.progress) || 0;
  if (data.milestones !== undefined)  updateData.milestones  = data.milestones;
  if (data.status !== undefined)      updateData.status      = data.status;
  if (data.priority !== undefined)    updateData.priority    = data.priority;
  return prisma.bizGoal.update({ where: { id }, data: updateData });
}

export async function deleteGoal(tenantId, id) {
  await prisma.bizGoal.deleteMany({ where: { id, tenantId } });
}

// ── Strategic – Market Analysis ───────────────────────────────────────────────
export async function listMarketAnalysis(tenantId) {
  await lazySeed(tenantId);
  return prisma.bizMarketAnalysis.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" } });
}

export async function createMarketAnalysis(tenantId, data) {
  return prisma.bizMarketAnalysis.create({
    data: {
      title:         data.title,
      market:        data.market ?? data.market_segment ?? '',
      analysis_type: data.analysis_type ?? 'competitive',
      summary:       data.summary ?? data.findings ?? null,
      opportunities: data.opportunities ?? [],
      threats:       data.threats ?? [],
      status:        data.status ?? 'active',
      tenantId,
    },
  });
}

export async function deleteMarketAnalysis(tenantId, id) {
  await prisma.bizMarketAnalysis.deleteMany({ where: { id, tenantId } });
}

// ── Marketing / Sales – Campaigns ────────────────────────────────────────────
export async function listCampaigns(tenantId) {
  await lazySeed(tenantId);
  const campaigns = await prisma.bizCampaign.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" } });
  return campaigns.map((c) => ({ ...c, type: c.platform }));
}

export async function createCampaign(tenantId, data) {
  return prisma.bizCampaign.create({
    data: {
      name:       data.name,
      platform:   data.type ?? data.platform ?? 'email',
      status:     data.status ?? 'draft',
      budget:     Number(data.budget) || 0,
      spent:      Number(data.spent) || 0,
      start_date: data.start_date ?? null,
      end_date:   data.end_date ?? null,
      tenantId,
    },
  });
}

export async function updateCampaign(tenantId, id, data) {
  const updateData = {};
  if (data.name !== undefined)       updateData.name       = data.name;
  if (data.type !== undefined)       updateData.platform   = data.type;
  if (data.platform !== undefined)   updateData.platform   = data.platform;
  if (data.status !== undefined)     updateData.status     = data.status;
  if (data.budget !== undefined)     updateData.budget     = Number(data.budget) || 0;
  if (data.spent !== undefined)      updateData.spent      = Number(data.spent) || 0;
  if (data.start_date !== undefined) updateData.start_date = data.start_date;
  if (data.end_date !== undefined)   updateData.end_date   = data.end_date;
  return prisma.bizCampaign.update({ where: { id }, data: updateData });
}

export async function deleteCampaign(tenantId, id) {
  await prisma.bizCampaign.deleteMany({ where: { id, tenantId } });
}

// ── Marketing / Sales – Clients ───────────────────────────────────────────────
export async function listClients(tenantId) {
  await lazySeed(tenantId);
  const clients = await prisma.bizClient.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" } });
  return clients.map((c) => ({ ...c, value: c.annual_value }));
}

export async function createClient(tenantId, data) {
  return prisma.bizClient.create({
    data: {
      name:         data.name,
      company:      data.company ?? null,
      email:        data.email ?? null,
      phone:        data.phone ?? null,
      annual_value: Number(data.annual_value ?? data.value) || 0,
      status:       data.status ?? 'active',
      contract_end: data.contract_end ?? null,
      industry:     data.industry ?? null,
      tenantId,
    },
  });
}

export async function updateClient(tenantId, id, data) {
  const updateData = {};
  if (data.name !== undefined)         updateData.name         = data.name;
  if (data.company !== undefined)      updateData.company      = data.company;
  if (data.email !== undefined)        updateData.email        = data.email;
  if (data.phone !== undefined)        updateData.phone        = data.phone;
  const av = data.annual_value ?? data.value;
  if (av !== undefined)                updateData.annual_value = Number(av) || 0;
  if (data.status !== undefined)       updateData.status       = data.status;
  if (data.contract_end !== undefined) updateData.contract_end = data.contract_end;
  if (data.industry !== undefined)     updateData.industry     = data.industry;
  return prisma.bizClient.update({ where: { id }, data: updateData });
}

export async function deleteClient(tenantId, id) {
  await prisma.bizClient.deleteMany({ where: { id, tenantId } });
}

// ── Team – Members ────────────────────────────────────────────────────────────
export async function listMembers(tenantId) {
  await lazySeed(tenantId);
  return prisma.bizMember.findMany({ where: { tenantId }, orderBy: { name: "asc" } });
}

export async function createMember(tenantId, data) {
  return prisma.bizMember.create({
    data: { ...data, skills: data.skills ?? [], tenantId },
  });
}

export async function updateMember(tenantId, id, data) {
  const updateData = {};
  if (data.name !== undefined)       updateData.name       = data.name;
  if (data.role !== undefined)       updateData.role       = data.role;
  if (data.department !== undefined) updateData.department = data.department;
  if (data.email !== undefined)      updateData.email      = data.email;
  if (data.status !== undefined)     updateData.status     = data.status;
  if (data.skills !== undefined)     updateData.skills     = data.skills;
  if (data.avatar_url !== undefined) updateData.avatar_url = data.avatar_url;
  return prisma.bizMember.update({ where: { id }, data: updateData });
}

export async function deleteMember(tenantId, id) {
  await prisma.bizMember.deleteMany({ where: { id, tenantId } });
}

// ── Team – Projects ───────────────────────────────────────────────────────────
export async function listProjects(tenantId) {
  await lazySeed(tenantId);
  return prisma.bizProject.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" } });
}

export async function createProject(tenantId, data) {
  return prisma.bizProject.create({
    data: {
      name:         data.name,
      description:  data.description ?? null,
      status:       data.status ?? 'planning',
      priority:     data.priority ?? 'medium',
      progress:     Number(data.progress) || 0,
      budget:       Number(data.budget) || 0,
      team_members: data.team_members ?? [],
      start_date:   data.start_date ?? null,
      end_date:     data.end_date ?? null,
      tenantId,
    },
  });
}

export async function updateProject(tenantId, id, data) {
  const updateData = {};
  if (data.name !== undefined)         updateData.name         = data.name;
  if (data.description !== undefined)  updateData.description  = data.description;
  if (data.status !== undefined)       updateData.status       = data.status;
  if (data.priority !== undefined)     updateData.priority     = data.priority;
  if (data.progress !== undefined)     updateData.progress     = Number(data.progress) || 0;
  if (data.budget !== undefined)       updateData.budget       = Number(data.budget) || 0;
  if (data.team_members !== undefined) updateData.team_members = data.team_members;
  if (data.start_date !== undefined)   updateData.start_date   = data.start_date;
  if (data.end_date !== undefined)     updateData.end_date     = data.end_date;
  return prisma.bizProject.update({ where: { id }, data: updateData });
}

export async function deleteProject(tenantId, id) {
  await prisma.bizProject.deleteMany({ where: { id, tenantId } });
}

// ── Team – Tasks ──────────────────────────────────────────────────────────────
export async function listTasks(tenantId) {
  await lazySeed(tenantId);
  return prisma.bizTask.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" } });
}

export async function createTask(tenantId, data) {
  return prisma.bizTask.create({
    data: {
      title:       data.title,
      description: data.description ?? null,
      project_id:  data.project_id ?? null,
      status:      data.status ?? 'todo',
      priority:    data.priority ?? 'medium',
      assignee:    data.assignee ?? data.assigned_to ?? null,
      due_date:    data.due_date ?? null,
      tenantId,
    },
  });
}

export async function updateTask(tenantId, id, data) {
  const updateData = {};
  if (data.title !== undefined)       updateData.title       = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.project_id !== undefined)  updateData.project_id  = data.project_id;
  if (data.status !== undefined)      updateData.status      = data.status;
  if (data.priority !== undefined)    updateData.priority    = data.priority;
  if (data.due_date !== undefined)    updateData.due_date    = data.due_date;
  const assignee = data.assignee ?? data.assigned_to;
  if (assignee !== undefined)         updateData.assignee    = assignee;
  return prisma.bizTask.update({ where: { id }, data: updateData });
}

export async function deleteTask(tenantId, id) {
  await prisma.bizTask.deleteMany({ where: { id, tenantId } });
}

// ── AI ────────────────────────────────────────────────────────────────────────
export async function aiInsights(tenantId, { module: mod, context, query }) {
  const [goals, projects, transactions] = await Promise.all([
    prisma.bizGoal.findMany({ where: { tenantId }, select: { title: true, progress: true, status: true } }),
    prisma.bizProject.findMany({ where: { tenantId, status: "in_progress" }, select: { name: true, progress: true } }),
    prisma.bizTransaction.findMany({ where: { tenantId }, select: { type: true, amount: true }, take: 30 }),
  ]);

  const income   = transactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expenses = transactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const margin   = income > 0 ? ((income - expenses) / income * 100).toFixed(1) : 0;
  const atRisk   = goals.filter(g => g.status === "at_risk").map(g => g.title);

  return {
    insights: [
      `Net margin is ${margin}% — ${parseFloat(margin) > 25 ? "healthy and above benchmark" : "below the 25% target; review expense categories"}.`,
      projects.length > 0
        ? `${projects.length} project${projects.length > 1 ? "s" : ""} in progress — avg completion ${Math.round(projects.reduce((s,p)=>s+p.progress,0)/projects.length)}%.`
        : "No active projects currently tracked.",
      atRisk.length > 0
        ? `${atRisk.length} strategic goal${atRisk.length > 1 ? "s are" : " is"} at risk: ${atRisk.slice(0,2).join(", ")}.`
        : "All tracked goals are on track.",
    ],
    recommendations: [
      income > expenses
        ? "Consider reinvesting net profit surplus into highest-ROI growth initiatives."
        : "Prioritize expense reduction — payroll and operations are typically highest levers.",
      "Review at-risk strategic goals weekly to identify blockers before they compound.",
      "Ensure ISO 27001 and EMEA expansion milestones have clear owners and deadlines.",
    ],
  };
}

export function generateSOP({ title, department }) {
  return {
    content: `# Standard Operating Procedure: ${title || "New SOP"}\n\n**Department:** ${department || "General"}\n**Version:** 1.0\n**Status:** Draft\n\n## Purpose\nThis SOP defines the repeatable, auditable steps to complete the **${title || "process"}** efficiently and in compliance with company standards.\n\n## Scope\nApplicable to all ${department || "relevant"} team members involved in this process.\n\n## Procedure\n\n1. **Preparation** — Gather required inputs, tools and approvals before starting.\n2. **Execution** — Follow each step sequentially; do not skip steps without documented justification.\n3. **Validation** — Verify outputs meet acceptance criteria defined in this SOP.\n4. **Documentation** — Record completion, exceptions and outcomes in the designated system.\n5. **Escalation** — For any deviation, notify the department lead within 2 business hours.\n\n## Metrics\n- Target completion time: TBD\n- Error rate threshold: < 2%\n- Review frequency: Quarterly\n\n## Review & Approval\nThis SOP should be reviewed every 90 days and updated to reflect process changes.`,
  };
}
