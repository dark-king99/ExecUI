/**
 * Document & contract registry — the declarative core of the CLM module.
 *
 * Everything a document or contract is *allowed* to be lives here: its
 * category, its contract type, and — most importantly — the lifecycle states a
 * contract can move between. The transition map is the rule book: the service
 * layer never hand-writes "if status === x then y", it asks this file. That's
 * what stops a contract from jumping straight from `draft` to `active` without
 * ever being signed.
 *
 * Pure module: no database, no I/O, fully unit-tested.
 */

export const REDACTED = "[redacted]";

// ── Document categories ──────────────────────────────────────────────────────
// `retentionHint` is advice shown in the UI, not enforcement — deletion of
// business documents is always a person's decision.
export const DOCUMENT_CATEGORIES = [
  { id: "general",   label: "General",            hint: "Anything that doesn't fit a category below" },
  { id: "contract",  label: "Contract",           hint: "Agreements — usually paired with a contract record" },
  { id: "policy",    label: "Policy & handbook",  hint: "Internal policies, handbooks, codes of conduct" },
  { id: "sop",       label: "Procedure (SOP)",    hint: "Standard operating procedures and runbooks" },
  { id: "proposal",  label: "Proposal & quote",   hint: "Customer-facing proposals, quotes, statements of work" },
  { id: "invoice",   label: "Invoice & finance",  hint: "Invoices, receipts, financial statements" },
  { id: "hr",        label: "HR & personnel",     hint: "Offer letters, reviews, personnel files", sensitive: true },
  { id: "legal",     label: "Legal & compliance", hint: "Filings, certificates, regulatory correspondence", sensitive: true },
  { id: "technical", label: "Technical",          hint: "Architecture, network diagrams, specifications" },
];

export const DOCUMENT_STATUSES = ["active", "archived"];

// ── Contract types ───────────────────────────────────────────────────────────
export const CONTRACT_TYPES = [
  { id: "msa",        label: "Master service agreement" },
  { id: "sow",        label: "Statement of work" },
  { id: "nda",        label: "Non-disclosure agreement" },
  { id: "dpa",        label: "Data processing agreement" },
  { id: "vendor",     label: "Vendor / supplier" },
  { id: "customer",   label: "Customer / subscription" },
  { id: "employment", label: "Employment" },
  { id: "lease",      label: "Lease / property" },
  { id: "license",    label: "Software licence" },
  { id: "other",      label: "Other" },
];

// ── Contract lifecycle ───────────────────────────────────────────────────────
/**
 * Each state declares which states it may move to. Two properties matter:
 *   • `terminal` states accept no further transitions (except renewal, which
 *     creates a *new* contract rather than mutating the old one).
 *   • `countsAsLive` marks the states where the agreement is legally in force —
 *     the renewal scheduler and portfolio value only look at these.
 */
export const CONTRACT_STATES = {
  draft: {
    label: "Draft", tone: "slate",
    description: "Being written. Nothing is committed.",
    to: ["in_review", "pending_signature", "active", "cancelled"],
  },
  in_review: {
    label: "In review", tone: "amber",
    description: "Out for internal approval.",
    to: ["draft", "pending_signature", "active", "cancelled"],
  },
  pending_signature: {
    label: "Pending signature", tone: "blue",
    description: "Approved internally, waiting on signatures.",
    to: ["active", "draft", "cancelled", "expired"],
  },
  active: {
    label: "Active", tone: "emerald", countsAsLive: true,
    description: "In force.",
    to: ["renewed", "expired", "terminated"],
  },
  renewed: {
    label: "Renewed", tone: "indigo", terminal: true,
    description: "Superseded by a renewal contract.",
    to: [],
  },
  expired: {
    label: "Expired", tone: "slate", terminal: true,
    description: "Reached its end date without renewal.",
    to: ["renewed", "active"], // reinstating a lapsed contract is a real thing
  },
  terminated: {
    label: "Terminated", tone: "rose", terminal: true,
    description: "Ended early by one of the parties.",
    to: [],
  },
  cancelled: {
    label: "Cancelled", tone: "slate", terminal: true,
    description: "Abandoned before it ever took effect.",
    to: ["draft"],
  },
};

export const CONTRACT_STATUSES = Object.keys(CONTRACT_STATES);
export const LIVE_STATUSES = CONTRACT_STATUSES.filter((s) => CONTRACT_STATES[s].countsAsLive);

/** Can a contract move from → to? */
export function canTransition(from, to) {
  const state = CONTRACT_STATES[from];
  if (!state || !CONTRACT_STATES[to]) return false;
  return state.to.includes(to);
}

/** Why a transition was refused — phrased for the person who tried it. */
export function transitionError(from, to) {
  if (!CONTRACT_STATES[from]) return `"${from}" isn't a contract status.`;
  if (!CONTRACT_STATES[to]) return `"${to}" isn't a contract status.`;
  if (from === to) return `This contract is already ${CONTRACT_STATES[to].label.toLowerCase()}.`;
  const allowed = CONTRACT_STATES[from].to;
  if (!allowed.length) return `A ${CONTRACT_STATES[from].label.toLowerCase()} contract can't change status — create a renewal instead.`;
  return `A ${CONTRACT_STATES[from].label.toLowerCase()} contract can only move to: ${allowed.map((s) => CONTRACT_STATES[s].label.toLowerCase()).join(", ")}.`;
}

export const nextStates = (from) => (CONTRACT_STATES[from]?.to ?? []).slice();

// ── Signature roles & statuses ───────────────────────────────────────────────
export const SIGNER_ROLES = {
  signer:   "Signs the document",
  approver: "Approves without signing",
  viewer:   "Receives a copy, takes no action",
};

/** Roles that must act before an envelope can complete. */
export const ACTING_ROLES = ["signer", "approver"];

export const SIGNER_STATUSES = ["pending", "sent", "viewed", "signed", "declined"];
export const REQUEST_STATUSES = ["draft", "sent", "completed", "declined", "cancelled", "expired"];

// ── Validation helpers (pure) ────────────────────────────────────────────────
const err = (message, status = 400) => { const e = new Error(message); e.status = status; return e; };

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
export const isEmail = (s) => EMAIL_RE.test(String(s ?? "").trim());

export const documentCategory = (id) => DOCUMENT_CATEGORIES.find((c) => c.id === id) || null;
export const contractType = (id) => CONTRACT_TYPES.find((t) => t.id === id) || null;

/**
 * Validate and normalize a signer list.
 * Rejects duplicates (the DB has a unique index, but a 400 explaining *which*
 * address is duplicated beats a constraint violation) and envelopes with nobody
 * who can actually act on them.
 */
export function validateSigners(signers) {
  if (!Array.isArray(signers) || !signers.length) throw err("Add at least one signer");
  if (signers.length > 25) throw err("An envelope can hold at most 25 signers");

  const seen = new Set();
  const out = signers.map((s, i) => {
    const email = String(s.email ?? "").trim().toLowerCase();
    const name = String(s.name ?? "").trim();
    const role = s.role ?? "signer";
    if (!name) throw err(`Signer ${i + 1} needs a name`);
    if (!isEmail(email)) throw err(`"${s.email ?? ""}" isn't a valid email address`);
    if (!SIGNER_ROLES[role]) throw err(`Unknown signer role "${role}"`);
    if (seen.has(email)) throw err(`${email} is listed twice — each party appears once`);
    seen.add(email);
    return {
      name: name.slice(0, 160),
      email: email.slice(0, 200),
      role,
      order: Number.isFinite(Number(s.order)) ? Math.max(0, Math.trunc(Number(s.order))) : i,
    };
  });

  if (!out.some((s) => ACTING_ROLES.includes(s.role))) {
    throw err("At least one party must be a signer or approver — viewers can't complete an envelope");
  }
  return out.sort((a, b) => a.order - b.order || a.email.localeCompare(b.email));
}

/**
 * Whose turn is it? In a sequential envelope only the lowest unfinished order
 * group may act; in a parallel one everybody may act at once.
 */
export function activeSigners(signers, { sequential = false } = {}) {
  const acting = signers.filter((s) => ACTING_ROLES.includes(s.role) && !["signed", "declined"].includes(s.status));
  if (!sequential) return acting;
  if (!acting.length) return [];
  const turn = Math.min(...acting.map((s) => s.order ?? 0));
  return acting.filter((s) => (s.order ?? 0) === turn);
}

/** Has every party who must act done so? */
export function isEnvelopeComplete(signers) {
  const acting = signers.filter((s) => ACTING_ROLES.includes(s.role));
  return acting.length > 0 && acting.every((s) => s.status === "signed");
}

// ── Contract date maths (pure) ───────────────────────────────────────────────
const DAY = 86_400_000;

/** Whole days from `from` until `date` (negative once it's in the past). */
export function daysUntil(date, from = new Date()) {
  if (!date) return null;
  return Math.ceil((new Date(date).getTime() - new Date(from).getTime()) / DAY);
}

/**
 * When notice must be given to stop an auto-renewal: the notice period before
 * the end date. This is the date that actually matters commercially — miss it
 * and the contract renews whether you wanted it to or not.
 */
export function noticeDeadline(contract) {
  if (!contract?.endDate) return null;
  const days = Number(contract.noticePeriodDays) || 0;
  return new Date(new Date(contract.endDate).getTime() - days * DAY);
}

/** Add whole months, clamping the day so 31 Jan + 1 month is 28/29 Feb. */
export function addMonths(date, months) {
  const d = new Date(date);
  const day = d.getUTCDate();
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1, d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds()));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return target;
}

/**
 * Classify a contract's renewal urgency. Drives both the scheduler and the UI
 * badge, so a reminder email and the console can never disagree.
 */
export function renewalStatus(contract, now = new Date()) {
  if (!contract || !LIVE_STATUSES.includes(contract.status)) return { state: "n/a", days: null };
  if (!contract.endDate) return { state: "evergreen", days: null };

  const days = daysUntil(contract.endDate, now);
  const notice = noticeDeadline(contract);
  const noticeDays = notice ? daysUntil(notice, now) : null;

  if (days < 0) return { state: "overdue", days, noticeDays };
  if (noticeDays != null && noticeDays <= 0) return { state: "notice_passed", days, noticeDays };
  if (days <= 30) return { state: "due_soon", days, noticeDays };
  if (noticeDays != null && noticeDays <= 30) return { state: "notice_soon", days, noticeDays };
  return { state: "ok", days, noticeDays };
}

export const RENEWAL_LABELS = {
  overdue: "Past its end date",
  notice_passed: "Notice window closed",
  due_soon: "Ends within 30 days",
  notice_soon: "Notice due within 30 days",
  evergreen: "No end date",
  ok: "On track",
  "n/a": "Not in force",
};

/** Everything the frontend needs to render the module, with no internals. */
export function catalog() {
  return {
    documentCategories: DOCUMENT_CATEGORIES,
    documentStatuses: DOCUMENT_STATUSES,
    contractTypes: CONTRACT_TYPES,
    contractStates: Object.entries(CONTRACT_STATES).map(([id, s]) => ({
      id, label: s.label, tone: s.tone, description: s.description,
      to: s.to, terminal: !!s.terminal, countsAsLive: !!s.countsAsLive,
    })),
    signerRoles: Object.entries(SIGNER_ROLES).map(([id, label]) => ({ id, label })),
    renewalLabels: RENEWAL_LABELS,
  };
}
