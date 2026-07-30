/**
 * Global search registry — what is searchable, and by whom.
 *
 * This is the security boundary of federated search. Each source declares the
 * Prisma model, the fields that may be matched, the fields that may be
 * *returned*, and the access it requires. The engine reads nothing else, so a
 * column that isn't listed here can never be searched or surfaced — and adding
 * one is a deliberate act rather than an accident of the ORM.
 *
 * Access is layered exactly as it is everywhere else in the product:
 *   `module`    — the caller's department/plan sections must include it
 *   `adminOnly` — enterprise/system admins only
 * A source with neither is available to any signed-in employee.
 *
 * Field weights drive ranking. A query matching a name should beat the same
 * query buried in a description, or the results read as random.
 *
 * Pure module: no database, no I/O, fully unit-tested.
 *
 * Links come from `lib/recordLinks.js` — the same table the SPA reads — so a
 * result always opens the record it names rather than the list it lives in.
 */
import { linkTo } from "../../lib/recordLinks.js";

const f = (field, weight, opts = {}) => ({ field, weight, ...opts });

export const SOURCES = {
  // ── CRM ───────────────────────────────────────────────────────────────────
  contacts: {
    id: "contacts", label: "Contacts", module: "crm", model: "contact",
    icon: "user", link: () => "/crm/contacts",
    fields: [f("name", 10), f("email", 8), f("key", 4)],
    select: { id: true, name: true, email: true, createdAt: true },
    title: (r) => r.name,
    subtitle: (r) => r.email,
    dateField: "createdAt",
  },

  deals: {
    id: "deals", label: "Deals", module: "crm", model: "crmOpportunity",
    icon: "trending-up", link: () => "/crm/pipeline",
    fields: [f("name", 10), f("source", 3), f("stage", 3)],
    select: { id: true, name: true, value: true, stage: true, status: true, createdAt: true },
    title: (r) => r.name,
    subtitle: (r) => [r.stage, r.value != null ? `value ${r.value}` : null].filter(Boolean).join(" · "),
    dateField: "createdAt",
  },

  tickets: {
    id: "tickets", label: "Support tickets", module: "crm", model: "crmTicket",
    icon: "life-buoy", link: (r) => linkTo("ticket", r.id),
    fields: [f("subject", 10), f("ticket_number", 9, { exactOnly: true }), f("customer_name", 7), f("description", 4), f("contactEmail", 6)],
    select: {
      id: true, ticket_number: true, subject: true, customer_name: true,
      status: true, priority: true, contactEmail: true, createdAt: true,
    },
    title: (r) => r.subject,
    subtitle: (r) => [r.ticket_number, r.customer_name, r.status].filter(Boolean).join(" · "),
    dateField: "createdAt",
  },

  crm_tasks: {
    id: "crm_tasks", label: "CRM tasks", module: "crm", model: "crmTask",
    icon: "check-square", link: () => "/crm/tasks",
    fields: [f("title", 10), f("relatedCustomerName", 6)],
    select: { id: true, title: true, status: true, priority: true, relatedCustomerName: true, createdAt: true },
    title: (r) => r.title,
    subtitle: (r) => [r.relatedCustomerName, r.status].filter(Boolean).join(" · "),
    dateField: "createdAt",
  },

  // ── Marketing ─────────────────────────────────────────────────────────────
  campaigns: {
    id: "campaigns", label: "Campaigns", module: "marketing", model: "marketingCampaign",
    icon: "megaphone", link: () => "/marketing/campaigns",
    fields: [f("name", 10), f("objective", 5), f("channel", 4)],
    select: { id: true, name: true, status: true, channel: true, budget: true, createdAt: true },
    title: (r) => r.name,
    subtitle: (r) => [r.channel, r.status].filter(Boolean).join(" · "),
    dateField: "createdAt",
  },

  social_posts: {
    id: "social_posts", label: "Social posts", module: "marketing", model: "socialPost",
    icon: "share-2", link: () => "/marketing/social",
    fields: [f("content", 8)],
    select: { id: true, content: true, status: true, platforms: true, createdAt: true },
    title: (r) => String(r.content ?? "").slice(0, 90),
    subtitle: (r) => [(r.platforms ?? []).join(", "), r.status].filter(Boolean).join(" · "),
    dateField: "createdAt",
  },

  // ── Business services ─────────────────────────────────────────────────────
  projects: {
    id: "projects", label: "Projects", module: "services", model: "bizProject",
    icon: "layers", link: () => "/services/team",
    fields: [f("name", 10), f("description", 4)],
    select: { id: true, name: true, status: true, progress: true, createdAt: true },
    title: (r) => r.name,
    subtitle: (r) => [r.status, r.progress != null ? `${r.progress}%` : null].filter(Boolean).join(" · "),
    dateField: "createdAt",
  },

  biz_tasks: {
    id: "biz_tasks", label: "Team tasks", module: "services", model: "bizTask",
    icon: "check-square", link: () => "/services/team",
    fields: [f("title", 10), f("description", 4), f("assignee", 6)],
    select: { id: true, title: true, status: true, assignee: true, createdAt: true },
    title: (r) => r.title,
    subtitle: (r) => [r.assignee, r.status].filter(Boolean).join(" · "),
    dateField: "createdAt",
  },

  sops: {
    id: "sops", label: "Procedures (SOPs)", module: "services", model: "bizSOP",
    icon: "book-open", link: () => "/services/operations",
    fields: [f("title", 10), f("description", 5), f("department", 4)],
    select: { id: true, title: true, description: true, department: true, status: true, createdAt: true },
    title: (r) => r.title,
    subtitle: (r) => [r.department, r.status].filter(Boolean).join(" · "),
    dateField: "createdAt",
  },

  clients: {
    id: "clients", label: "Clients", module: "services", model: "bizClient",
    icon: "briefcase", link: () => "/services/marketing",
    fields: [f("name", 10), f("email", 7), f("company", 8)],
    select: { id: true, name: true, email: true, company: true, status: true, createdAt: true },
    title: (r) => r.name,
    subtitle: (r) => [r.company, r.email].filter(Boolean).join(" · "),
    dateField: "createdAt",
  },

  // ── Network ───────────────────────────────────────────────────────────────
  devices: {
    id: "devices", label: "Devices", module: "network", model: "networkDevice",
    icon: "server", link: () => "/network/monitoring",
    fields: [f("hostname", 10), f("ip_address", 9, { exactOnly: true }), f("os", 4), f("region", 4)],
    select: { id: true, hostname: true, ip_address: true, status: true, device_type: true, createdAt: true },
    title: (r) => r.hostname,
    subtitle: (r) => [r.ip_address, r.device_type, r.status].filter(Boolean).join(" · "),
    dateField: "createdAt",
  },

  alerts: {
    id: "alerts", label: "Network alerts", module: "network", model: "networkAlert",
    icon: "alert-triangle", link: () => "/network/monitoring",
    fields: [f("title", 10), f("message", 5)],
    select: { id: true, title: true, severity: true, status: true, createdAt: true },
    title: (r) => r.title,
    subtitle: (r) => [r.severity, r.status].filter(Boolean).join(" · "),
    dateField: "createdAt",
  },

  // ── Documents & contracts ─────────────────────────────────────────────────
  documents: {
    id: "documents", label: "Documents", model: "document",
    icon: "file-text", link: (r) => linkTo("document", r.id),
    fields: [f("title", 10), f("description", 5)],
    select: { id: true, title: true, description: true, category: true, status: true, currentVersion: true, updatedAt: true },
    where: { status: "active" },
    title: (r) => r.title,
    subtitle: (r) => [r.category, r.currentVersion ? `v${r.currentVersion}` : null].filter(Boolean).join(" · "),
    dateField: "updatedAt",
  },

  contracts: {
    id: "contracts", label: "Contracts", adminOnly: true, model: "contract",
    icon: "file-signature", link: (r) => linkTo("contract", r.id),
    fields: [f("title", 10), f("counterparty", 9), f("notes", 3)],
    select: { id: true, title: true, counterparty: true, status: true, value: true, currency: true, endDate: true, updatedAt: true },
    title: (r) => r.title,
    subtitle: (r) => [r.counterparty, r.status].filter(Boolean).join(" · "),
    dateField: "updatedAt",
  },

  // ── Knowledge base ────────────────────────────────────────────────────────
  // Internal-only articles are matched too — for employees. The portal uses a
  // separate, public-only path (see kb.service.js), never this one.
  kb_articles: {
    id: "kb_articles", label: "Help articles", model: "kbArticle",
    icon: "book-open", link: (r) => linkTo("article", r.id),
    fields: [f("title", 10), f("excerpt", 6), f("body", 4)],
    select: { id: true, title: true, excerpt: true, slug: true, status: true, visibility: true, updatedAt: true },
    where: { status: { not: "archived" } },
    title: (r) => r.title,
    subtitle: (r) => [r.visibility === "internal" ? "Internal" : "Public", r.status].filter(Boolean).join(" · "),
    dateField: "updatedAt",
  },

  // ── People (admin only — this is the staff directory) ──────────────────────
  people: {
    id: "people", label: "People", adminOnly: true, model: "user",
    icon: "users", link: (r) => linkTo("person", r.id),
    fields: [f("firstName", 9), f("lastName", 9), f("email", 8), f("jobTitle", 5), f("employeeId", 7, { exactOnly: true })],
    select: {
      id: true, firstName: true, lastName: true, email: true,
      jobTitle: true, department: true, isActive: true, createdAt: true,
    },
    where: { isActive: true },
    title: (r) => `${r.firstName ?? ""} ${r.lastName ?? ""}`.trim() || r.email,
    subtitle: (r) => [r.jobTitle, r.department].filter(Boolean).join(" · "),
    dateField: "createdAt",
  },
};

export const SOURCE_IDS = Object.keys(SOURCES);
export const getSource = (id) => SOURCES[id] ?? null;

/**
 * Which sources this caller may search. The intersection of what they can see
 * in the UI and what the registry allows — never a superset.
 */
export function sourcesFor({ sections = [], isAdmin = false } = {}) {
  return Object.values(SOURCES).filter((s) => {
    if (s.adminOnly && !isAdmin) return false;
    if (s.module && !sections.includes(s.module)) return false;
    return true;
  });
}

export function canSearch(source, access) {
  if (!source) return false;
  return sourcesFor(access).some((s) => s.id === source.id);
}

/** UI-facing description of a source: no model names, no field lists. */
export const describeSource = (s) => ({
  id: s.id, label: s.label, icon: s.icon, module: s.module ?? null, adminOnly: !!s.adminOnly,
});

// ── Query parsing ────────────────────────────────────────────────────────────
const MAX_TERMS = 6;
const MAX_TERM = 60;

/**
 * Split a query into search terms.
 *
 * Quoted phrases stay whole ("acme corp" is one term), everything else splits on
 * whitespace. Terms shorter than two characters are dropped: a single letter
 * matches most of the database and makes the results useless.
 */
export function parseQuery(raw) {
  const text = String(raw ?? "").trim().slice(0, 200);
  if (!text) return { terms: [], phrases: [] };

  const phrases = [];
  const rest = text.replace(/"([^"]+)"/g, (_m, phrase) => {
    const p = phrase.trim();
    if (p.length >= 2) phrases.push(p.slice(0, MAX_TERM));
    return " ";
  });

  // Unpaired quotes are punctuation the user left behind, not something to
  // search for — a query of `""` should find nothing, not rows containing quotes.
  const words = rest
    .split(/\s+/)
    .map((w) => w.replace(/"/g, "").trim())
    .filter((w) => w.length >= 2);
  const terms = [...phrases, ...words].slice(0, MAX_TERMS).map((t) => t.slice(0, MAX_TERM));
  return { terms, phrases };
}

// ── Scoring ──────────────────────────────────────────────────────────────────
/**
 * How well one field value matches one term, as a multiplier on the field's
 * weight. Exact beats prefix beats word-start beats substring — so searching
 * "ada" ranks the person called Ada above a ticket that mentions "roadmap".
 */
export function matchQuality(value, term) {
  if (value == null) return 0;
  const v = String(value).toLowerCase();
  const t = String(term).toLowerCase();
  if (!v || !t) return 0;

  if (v === t) return 4;
  if (v.startsWith(t)) return 3;
  // A term at the start of any word in the value.
  if (new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i").test(v)) return 2;
  if (v.includes(t)) return 1;
  return 0;
}

/**
 * Score a row against the query. Sums the best match per term across fields, so
 * a row matching every term outranks one matching a single term repeatedly.
 * Recency breaks ties: of two equally good matches, the fresher one is more
 * likely to be what someone is looking for.
 */
export function scoreRow(source, row, terms, { now = Date.now() } = {}) {
  let score = 0;
  let matchedTerms = 0;

  for (const term of terms) {
    let best = 0;
    for (const { field, weight, exactOnly } of source.fields) {
      const quality = matchQuality(row[field], term);
      if (!quality) continue;
      // Identifier-ish fields (ticket numbers, IPs, employee ids) only count
      // when they really match — a substring of an id is noise.
      if (exactOnly && quality < 3) continue;
      best = Math.max(best, weight * quality);
    }
    if (best > 0) { score += best; matchedTerms++; }
  }

  if (!matchedTerms) return 0;
  // Matching all terms is worth much more than matching one of them well.
  if (matchedTerms === terms.length && terms.length > 1) score *= 1.5;

  const when = source.dateField ? row[source.dateField] : null;
  if (when) {
    const ageDays = Math.max(0, (now - new Date(when).getTime()) / 86_400_000);
    // A gentle decay: worth about 10% at a week old, ~1% after a year.
    score += 6 / (1 + ageDays / 7);
  }
  return Math.round(score * 100) / 100;
}

/** Short snippet of the field that matched, for context under the title. */
export function snippetFor(source, row, terms, { length = 140 } = {}) {
  for (const term of terms) {
    for (const { field } of source.fields) {
      const value = row[field];
      if (value == null) continue;
      const text = String(value);
      const at = text.toLowerCase().indexOf(String(term).toLowerCase());
      if (at === -1 || text.length <= 40) continue;
      const start = Math.max(0, at - 40);
      const slice = text.slice(start, start + length).replace(/\s+/g, " ").trim();
      return `${start > 0 ? "…" : ""}${slice}${start + length < text.length ? "…" : ""}`;
    }
  }
  return null;
}
