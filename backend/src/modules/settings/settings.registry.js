/**
 * Per-tenant settings registry — one declaration per configurable value.
 *
 * Before this, every org-level option became another column on Tenant (`plan`,
 * `planSolutions`, `industry`, `networkProfile`…), so each new one cost a
 * migration and each consumer had to know where to look. A setting is now a
 * registry entry: the storage, validation, defaulting, plan gating and public
 * exposure all follow from the declaration.
 *
 * Per setting:
 *   key        stable identifier, also the DB key — never rename one in place
 *   group      how the admin UI clusters it
 *   type       "string" | "color" | "email" | "url" | "boolean"
 *   default    what a tenant that has never set it gets
 *   entitlement  plan flag required to SET it (null = every plan may)
 *   public     may be read with no session at all — see the warning below
 *   max        length cap for strings
 *   describe   one line shown next to the field in the admin UI
 *
 * `public: true` is the sharp edge. Those values are served by the customer
 * portal and the signing page, which have no session by design, so anyone who
 * knows an organization's slug can read them. Only put things there that are
 * already public by their nature — the name and logo an organization *wants*
 * shown to its own customers. Never a value that leaks how the org is
 * configured internally.
 */

export const GROUPS = [
  { id: "branding", label: "Branding", describe: "What your people and your customers see." },
];

const s = (key, o) => ({ key, group: "branding", type: "string", default: null, entitlement: null, public: false, max: 200, ...o });

export const SETTINGS = [
  s("branding.productName", {
    label: "Product name",
    describe: "Replaces “ExecUI” in your portals and outbound email. Leave blank to keep it.",
    entitlement: "branding", public: true, max: 60,
  }),
  s("branding.logoUrl", {
    type: "url",
    label: "Logo",
    describe: "Shown in the app sidebar and on your customer-facing pages.",
    entitlement: "branding", public: true, max: 500,
  }),
  s("branding.primaryColor", {
    type: "color",
    label: "Accent colour",
    describe: "Used for buttons and highlights on your customer-facing pages.",
    entitlement: "branding", public: true, max: 7,
  }),
  s("branding.supportEmail", {
    type: "email",
    label: "Support address",
    describe: "Shown to customers as the way to reach you. Does not change who mail is sent from.",
    entitlement: "branding", public: true, max: 160,
  }),
  s("branding.hidePoweredBy", {
    type: "boolean",
    label: "Hide “Powered by ExecUI”",
    describe: "Removes the platform credit from your customer portal and signing pages.",
    default: false,
    entitlement: "branding", public: true,
  }),
  s("branding.emailFromName", {
    label: "Email sender name",
    describe:
      "The display name on outbound mail. The sending address stays on the platform domain — " +
      "changing that needs a verified domain of your own.",
    entitlement: "branding", public: false, max: 60,
  }),
];

const BY_KEY = new Map(SETTINGS.map((x) => [x.key, x]));

export const getSetting = (key) => BY_KEY.get(key) ?? null;
export const PUBLIC_KEYS = SETTINGS.filter((x) => x.public).map((x) => x.key);
export const DEFAULTS = Object.fromEntries(SETTINGS.map((x) => [x.key, x.default]));

const HEX = /^#[0-9a-fA-F]{6}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate and normalize a value for `key`.
 * Returns { value } on success or { error } — never throws, so a caller can
 * report every bad field at once rather than the first.
 */
export function coerce(key, raw) {
  const def = getSetting(key);
  if (!def) return { error: `Unknown setting "${key}"` };

  // Clearing a setting is always allowed: it falls back to the default.
  if (raw === null || raw === undefined || raw === "") {
    return { value: def.type === "boolean" ? !!def.default : null };
  }

  if (def.type === "boolean") return { value: raw === true || raw === "true" };

  const text = String(raw).trim();
  if (text.length > def.max) return { error: `${def.label} must be ${def.max} characters or fewer` };

  switch (def.type) {
    case "color":
      if (!HEX.test(text)) return { error: `${def.label} must be a hex colour like #4f46e5` };
      return { value: text.toLowerCase() };
    case "email":
      if (!EMAIL.test(text)) return { error: `${def.label} must be a valid email address` };
      return { value: text.toLowerCase() };
    case "url":
      // Same-origin upload paths are the normal case (the logo uploader writes
      // one); absolute http(s) is allowed so an existing CDN asset can be used.
      if (text.startsWith("/")) return { value: text };
      try {
        const u = new URL(text);
        if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("scheme");
        return { value: u.toString() };
      } catch {
        return { error: `${def.label} must be a URL or an uploaded file` };
      }
    default:
      return { value: text };
  }
}
