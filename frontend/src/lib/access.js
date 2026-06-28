/**
 * Department-based access policy (frontend mirror of
 * backend/src/modules/access/access.policy.js). Single source of truth for
 * gating the sidebar and routes. The backend independently enforces the same
 * rules at the API layer.
 */

export const SECTIONS = ["crm", "marketing", "network", "services", "analytics"];

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
  const role = user?.role;
  if (role === "enterprise_admin" || role === "system_admin") {
    return { dept: "executive", label: DEPT_LABELS.executive, privileged: true, ...MATRIX.executive };
  }
  const dept = canonicalDept(user?.department);
  const privileged = dept === "executive";
  return { dept, label: DEPT_LABELS[dept], privileged, ...MATRIX[dept] };
}

export function canAccessSection(user, section) {
  return accessFor(user).sections.includes(section);
}
