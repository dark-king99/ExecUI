/**
 * The permissions an organization admin may grant to a role.
 *
 * Deliberately a closed list. The Permission table also holds coarse signup
 * keys (`admin_access`…) and the role-management keys (`role.create`…); none of
 * those is grantable from the UI, because handing them out would be a way to
 * manufacture admins. Only keys that gate a specific capability are here.
 *
 * Every entry names what it unlocks, computed from the agent's action registry
 * rather than written by hand, so the text an admin reads when granting can't
 * drift from what the grant actually does.
 */
import { ACTIONS } from "../assistant/assistant.actions.js";

// Keys the generic ExecAI record tools check (assistant.policy WRITE_PERMISSIONS).
const RECORD_WRITES = {
  "crm.contact.write": "Create and update CRM contacts through ExecAI",
  "marketing.campaign.create": "Create marketing campaigns through ExecAI",
};

// Keys that gate screens rather than agent actions.
const SCREEN_CAPABILITIES = {
  "network.settings.manage": [
    "Create and revoke network collectors",
    "Change subnets, polling, SNMP and alert thresholds",
    "Connect and sync a monitoring tool",
  ],
};

export const GRANTABLE = [
  { key: "crm.contact.write", group: "CRM", label: "Edit contacts & account notes",
    description: "Create and update CRM contacts, and add notes to accounts." },
  { key: "crm.pipeline.manage", group: "CRM", label: "Manage the pipeline",
    description: "Create leads and move them between open stages. Closing a deal stays manual." },
  { key: "crm.activity.write", group: "CRM", label: "Manage colleagues' activities",
    description: "Assign CRM tasks to other people and complete tasks that aren't yours. Everyone can already manage their own." },
  { key: "marketing.campaign.create", group: "Marketing", label: "Create campaigns",
    description: "Create marketing campaigns. Starting one still needs a person in the Marketing module." },
  { key: "marketing.audience.write", group: "Marketing", label: "Draft audiences",
    description: "Create audience segments as drafts. Activating one stays manual." },
  { key: "marketing.experiment.write", group: "Marketing", label: "Draft experiments",
    description: "Create experiments as drafts. Starting one stays manual." },
  { key: "network.alerts.manage", group: "Network", label: "Acknowledge alerts",
    description: "Acknowledge open network alerts. Resolving stays manual." },
  { key: "network.incidents.manage", group: "Network", label: "Open incidents",
    description: "Open new network incidents." },
  { key: "network.changes.request", group: "Network", label: "Request changes",
    description: "Submit network change requests. They are always created pending; approving stays manual." },
  { key: "network.settings.manage", group: "Network", label: "Manage network collection",
    description: "Set up collectors, network settings and the monitoring-tool connection. Collector tokens can read the SNMP community." },
];

const BY_KEY = new Map(GRANTABLE.map((p) => [p.key, p]));
export const isGrantable = (key) => BY_KEY.has(key);
export const grantable = (key) => BY_KEY.get(key) ?? null;

/** The agent actions and record writes a key unlocks, for display. */
export function unlocksFor(key) {
  const actions = Object.values(ACTIONS)
    .filter((a) => a.permission === key || a.elevated === key)
    .map((a) => a.description);
  return [...(RECORD_WRITES[key] ? [RECORD_WRITES[key]] : []), ...(SCREEN_CAPABILITIES[key] ?? []), ...actions];
}

/** Catalog for the admin UI, grouped in display order. */
export function catalog() {
  return GRANTABLE.map((p) => ({ ...p, unlocks: unlocksFor(p.key) }));
}

// ── Role names ───────────────────────────────────────────────────────────────
/**
 * Names a tenant may not give a role.
 *
 * A role's NAME is what lands in the session token and what `requireRole`
 * checks. `system_admin` is the platform operator — it confirms payments,
 * decides refunds and sets a tenant's pricing segment — so a tenant admin who
 * could create a role called that and join it would hold all of it.
 * `enterprise_admin` already exists in every tenant; a second one would be a
 * way to mint admins outside the deliberate promotion path.
 */
export const RESERVED_ROLE_NAMES = new Set(["system_admin", "enterprise_admin"]);
export const ADMIN_ROLE_NAMES = RESERVED_ROLE_NAMES;

/**
 * Normalize a requested role name to the stored form: lowercase, words joined
 * by underscores. Normalizing before the reserved check is what stops
 * "System Admin" or "SYSTEM-ADMIN" from slipping past it.
 */
export function normalizeRoleName(raw) {
  const name = String(raw ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  if (name.length < 2 || name.length > 40) {
    throw Object.assign(new Error("A role name must be 2–40 letters or numbers."), { status: 400 });
  }
  if (RESERVED_ROLE_NAMES.has(name)) {
    throw Object.assign(new Error(`"${name}" is reserved and can't be used as a role name.`), { status: 400 });
  }
  return name;
}
