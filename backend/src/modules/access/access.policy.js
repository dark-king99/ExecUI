/**
 * Department-based access policy — the single source of truth for which
 * core modules and analytics slices an employee may access, based on their
 * department (and role). Mirrored on the frontend in src/lib/access.js.
 *
 * Model: "strict by function". Enterprise admins, system admins, and anyone
 * in an Executive/leadership department get full visibility.
 */

export const SECTIONS = ["crm", "marketing", "network", "services", "analytics"];

/**
 * Sections that administer the organization rather than serve a job. Granted by
 * an admin role, never by a department — so `requireModule("services")` refuses
 * an ordinary employee whatever their department says.
 */
export const ADMIN_ONLY_SECTIONS = ["services"];

// department key -> { sections, slices }
//
// `general` is where every employee lands whose department is blank or
// unrecognized — every newly invited person until somebody sets one. It used to
// grant Business Services and nothing else, so a new employee got the company's
// financial and strategic planning tools and no CRM, Marketing or Network.
const MATRIX = {
  executive:  { sections: [...SECTIONS],                                slices: ["marketing", "sales", "network"] },
  sales:      { sections: ["crm", "analytics"],                         slices: ["sales"] },
  marketing:  { sections: ["marketing", "analytics"],                   slices: ["marketing"] },
  it:         { sections: ["network", "analytics"],                     slices: ["network"] },
  finance:    { sections: ["crm", "analytics"],                         slices: ["sales"] },
  operations: { sections: ["network", "analytics"],                     slices: ["network"] },
  general:    { sections: ["crm", "marketing", "network", "analytics"], slices: ["marketing", "sales", "network"] },
};

export const DEPT_LABELS = {
  executive: "Executive", sales: "Sales", marketing: "Marketing",
  it: "IT & Network", finance: "Finance", operations: "Operations", general: "General",
};

/** Normalize a free-text department string into a canonical department key. */
export function canonicalDept(raw) {
  const s = String(raw || "").toLowerCase();
  if (/exec|ceo|cfo|coo|cto|chief|leadership|founder|owner|president|c-level/.test(s)) return "executive";
  if (/sales|revenue|account exec|business dev|\bbd\b|pipeline/.test(s)) return "sales";
  if (/market|growth|brand|demand|content|\bseo\b|social|comms/.test(s)) return "marketing";
  if (/\bit\b|network|infra|devops|engineer|technolog|security|sysadmin|\bsre\b|cloud/.test(s)) return "it";
  if (/financ|account|treasur|payroll|\baudit\b|billing/.test(s)) return "finance";
  if (/operation|\bops\b|logistic|supply|facilit|procure|delivery/.test(s)) return "operations";
  return "general";
}

/** Resolve the full access descriptor for a user ({ role, department }). */
export function accessFor({ role, department } = {}) {
  if (role === "enterprise_admin" || role === "system_admin") {
    return { dept: "executive", label: DEPT_LABELS.executive, privileged: true, ...MATRIX.executive };
  }
  const dept = canonicalDept(department);
  const privileged = dept === "executive";
  const base = MATRIX[dept];
  // Admin-only sections are dropped here rather than at each route, so
  // `requireModule("services")` refuses an ordinary employee no matter which
  // department they are in — including Executive.
  return {
    dept, label: DEPT_LABELS[dept], privileged,
    ...base,
    sections: base.sections.filter((s) => !ADMIN_ONLY_SECTIONS.includes(s)),
  };
}

export function canAccessSection(access, section) {
  return !!access && access.sections.includes(section);
}

export function canAccessSlice(access, slice) {
  return !!access && access.slices.includes(slice);
}

/**
 * Narrow a department access descriptor by the tenant's plan entitlements.
 * Effective access = department permissions ∩ plan entitlements.
 */
export function intersectWithPlan(access, planEntitlements) {
  if (!access || !planEntitlements) return access;
  const planSections = new Set(planEntitlements.sections || []);
  const planSlices = new Set(planEntitlements.analyticsSlices || []);
  return {
    ...access,
    sections: access.sections.filter((s) => planSections.has(s)),
    slices: (access.slices || []).filter((sl) => planSlices.has(sl)),
    plan: planEntitlements,
  };
}
