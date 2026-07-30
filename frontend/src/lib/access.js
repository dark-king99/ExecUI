/**
 * Department-based access policy (frontend mirror of
 * backend/src/modules/access/access.policy.js). Single source of truth for
 * gating the sidebar and routes. The backend independently enforces the same
 * rules at the API layer.
 *
 * Effective access = the tenant's PLAN entitlements ∩ the employee's
 * DEPARTMENT permissions. The plan caps what the whole org bought; the
 * department caps what this employee may touch within that.
 */

import { entitlementsFor } from "./plans.js";

export const SECTIONS = ["crm", "marketing", "network", "services", "analytics"];

/**
 * The two roles that administer an organization. Named here rather than repeated
 * as a literal array at each call site, so "who counts as an admin" has one
 * answer that the sidebar, the routes and each page all read.
 */
export const ADMIN_ROLES = ["enterprise_admin", "system_admin"];
export const isAdminRole = (role) => ADMIN_ROLES.includes(role);
export const isAdminUser = (user) => isAdminRole(user?.role);

const MATRIX = {
  executive:  { sections: [...SECTIONS],                         slices: ["marketing", "sales", "network"] },
  sales:      { sections: ["crm", "analytics"],                  slices: ["sales"] },
  marketing:  { sections: ["marketing", "analytics"],            slices: ["marketing"] },
  it:         { sections: ["network", "analytics"],              slices: ["network"] },
  finance:    { sections: ["services"],                          slices: [] },
  operations: { sections: ["services", "network", "analytics"],  slices: ["network"] },
  general:    { sections: ["services"],                          slices: [] },
};

export const DEPT_LABELS = {
  executive: "Executive", sales: "Sales", marketing: "Marketing",
  it: "IT & Network", finance: "Finance", operations: "Operations", general: "General",
};

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

export function accessFor(user) {
  // 1. Department permissions (what this employee may touch).
  const role = user?.role;
  let base;
  if (role === "enterprise_admin" || role === "system_admin") {
    base = { dept: "executive", label: DEPT_LABELS.executive, privileged: true, ...MATRIX.executive };
  } else {
    const dept = canonicalDept(user?.department);
    base = { dept, label: DEPT_LABELS[dept], privileged: dept === "executive", ...MATRIX[dept] };
  }

  // 2. Plan entitlements (what the whole org bought). Effective = intersection.
  const plan = user?.plan || "executive";
  const ent = entitlementsFor(plan, user?.planSolutions || []);
  // "analytics" is always available where the plan grants any analytics slice.
  const planSections = new Set(ent.sections);
  const sections = base.sections.filter((s) => planSections.has(s));
  const slices = (base.slices || []).filter((sl) => ent.analyticsSlices.includes(sl));

  return { ...base, plan, sections, slices, planEntitlements: ent };
}

export function canAccessSection(user, section) {
  return accessFor(user).sections.includes(section);
}

/** Effective access to a specific solution: plan grants it AND dept allows the module. */
export function canAccessSolution(user, module, solutionId) {
  const a = accessFor(user);
  if (!a.sections.includes(module === "network" ? "network" : module)) return false;
  const ent = a.planEntitlements;
  if (module === "network") return ent.solutions.network === "all";
  return (ent.solutions[module] || []).includes(solutionId);
}
