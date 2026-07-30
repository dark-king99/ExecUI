/**
 * Data-governance registry — the map of what personal data this system holds.
 *
 * One declaration per category drives everything: what a data-subject export
 * contains, what erasure touches, and what retention purges. Keeping it in a
 * single place is the point — a privacy answer you can only give by grepping
 * the codebase is one you can't defend to a regulator.
 *
 * Per category:
 *   model         Prisma delegate
 *   dateField     the field retention measures age from
 *   subject       how a row links to a person:
 *                   { by: "userId" }         → matches an employee's id
 *                   { by: "email", field }   → matches an email address
 *                   { by: "self" }           → the person record itself
 *                   null                     → not subject-linked (retention only)
 *   onErase       "delete" | "anonymize" — audit evidence is anonymized, never
 *                 destroyed, so the trail survives the person leaving.
 *   anonymize     field → replacement, applied when a row is anonymized
 *   defaultRetentionDays  null = keep indefinitely unless a policy says otherwise
 */

export const REDACTED = "[redacted]";

const cat = (id, o) => ({ id, ...o });

export const CATEGORIES = [
  // ── The person record itself ──────────────────────────────────────────────
  cat("employee_profile", {
    label: "Employee profile",
    model: "user",
    dateField: "createdAt",
    subject: { by: "self" },
    onErase: "anonymize", // keeps ownership links (deals, approvals) intact
    anonymize: {
      firstName: REDACTED,
      lastName: REDACTED,
      // email is NOT NULL + UNIQUE, so it gets a per-row tombstone rather than
      // null — that keeps the row valid and collision-free while removing the
      // identifier. Values may be a function of the row for exactly this case.
      email: (row) => `erased-${row.id}@deleted.invalid`,
      phone: null, avatarUrl: null, jobTitle: null, employeeId: null,
      passwordHash: null, mfaSecret: null, isActive: false, status: "erased",
    },
    exportFields: ["id", "email", "firstName", "lastName", "phone", "jobTitle", "department", "employeeId", "status", "isActive", "lastLoginAt", "createdAt"],
    defaultRetentionDays: null,
    pii: true,
  }),

  cat("contacts", {
    label: "CRM contacts",
    model: "contact",
    dateField: "createdAt",
    subject: { by: "email", field: "email" },
    onErase: "delete",
    exportFields: ["id", "name", "email", "createdAt"],
    defaultRetentionDays: null,
    pii: true,
  }),

  // ── Evidence: anonymize, never destroy ────────────────────────────────────
  cat("audit_logs", {
    label: "Audit logs",
    model: "auditLog",
    dateField: "createdAt",
    subject: { by: "userId" },
    onErase: "anonymize",
    anonymize: { ipAddress: null, detail: REDACTED },
    exportFields: ["id", "action", "resource", "resourceId", "detail", "ipAddress", "createdAt"],
    defaultRetentionDays: 730,
    pii: true,
    note: "Anonymized rather than deleted so the audit trail stays complete.",
  }),

  // ── Operational / telemetry ───────────────────────────────────────────────
  cat("sessions", {
    label: "Login sessions",
    model: "userSession",
    dateField: "startedAt",
    subject: { by: "userId" },
    onErase: "delete",
    exportFields: ["id", "ipAddress", "userAgent", "startedAt", "endedAt", "isActive"],
    defaultRetentionDays: 90,
    pii: true,
  }),

  cat("notifications", {
    label: "Notifications",
    model: "notification",
    dateField: "createdAt",
    subject: { by: "userId" },
    onErase: "delete",
    exportFields: ["id", "type", "title", "body", "link", "createdAt"],
    defaultRetentionDays: 90,
    pii: false,
  }),

  cat("email_logs", {
    label: "Email logs",
    model: "emailLog",
    dateField: "createdAt",
    subject: { by: "email", field: "toEmail" },
    onErase: "anonymize",
    anonymize: { toEmail: REDACTED, subject: REDACTED },
    exportFields: ["id", "toEmail", "fromEmail", "subject", "status", "context", "createdAt"],
    defaultRetentionDays: 90,
    pii: true,
  }),

  cat("direct_messages", {
    label: "Direct messages",
    model: "directMessage",
    dateField: "createdAt",
    subject: { by: "userId", field: "senderId" },
    onErase: "anonymize",
    anonymize: { body: REDACTED },
    exportFields: ["id", "senderId", "recipientId", "body", "createdAt"],
    defaultRetentionDays: 365,
    pii: true,
  }),

  cat("reward_events", {
    label: "Reward activity",
    model: "rewardEvent",
    dateField: "createdAt",
    subject: { by: "userId" },
    onErase: "delete",
    exportFields: ["id", "category", "type", "points", "detail", "createdAt"],
    defaultRetentionDays: 365,
    pii: false,
  }),

  cat("approval_decisions", {
    label: "Approval decisions",
    model: "approvalDecision",
    dateField: "createdAt",
    subject: { by: "userId" },
    onErase: "anonymize",
    anonymize: { userName: REDACTED },
    exportFields: ["id", "requestId", "stepIndex", "decision", "comment", "createdAt"],
    defaultRetentionDays: null,
    pii: true,
    note: "Anonymized so sign-off history remains auditable.",
  }),

  // ── HR / People Ops ───────────────────────────────────────────────────────
  cat("employment_record", {
    label: "Employment record",
    model: "employmentProfile",
    dateField: "createdAt",
    subject: { by: "userId" },
    onErase: "anonymize",
    // The row survives because payslips and leave reference it, but everything
    // personal goes — including the encrypted government ids and bank details,
    // whose ciphertext is destroyed rather than merely hidden.
    anonymize: {
      dateOfBirth: null,
      emergencyName: null, emergencyPhone: null, emergencyRelation: null,
      taxIdCipher: null, taxIdIv: null, taxIdTag: null, taxIdLast4: null,
      nationalIdCipher: null, nationalIdIv: null, nationalIdTag: null, nationalIdLast4: null,
      bankName: null, bankAccountCipher: null, bankAccountIv: null, bankAccountTag: null, bankAccountLast4: null,
      notes: REDACTED,
      status: "terminated",
    },
    // Note what is NOT exportable: the ciphertext columns. A data subject gets
    // the *value* of their own bank details on request through HR, not the raw
    // encrypted blob and certainly not its key material.
    exportFields: [
      "id", "userId", "employmentType", "status", "hireDate", "probationEndAt",
      "endDate", "terminationReason", "workLocation", "managerId", "costCenter",
      "weeklyHours", "dateOfBirth", "emergencyName", "emergencyPhone",
      "emergencyRelation", "bankName", "bankAccountLast4", "createdAt",
    ],
    defaultRetentionDays: null,
    pii: true,
    note: "Anonymized rather than deleted so payroll history stays valid. Encrypted ids and bank details are destroyed.",
  }),

  cat("compensation", {
    label: "Compensation history",
    model: "compensation",
    dateField: "effectiveFrom",
    subject: { by: "userId" },
    onErase: "anonymize",
    anonymize: { note: REDACTED, reason: REDACTED },
    exportFields: ["id", "effectiveFrom", "payType", "baseAmount", "currency", "payFrequency", "reason", "createdAt"],
    defaultRetentionDays: null,
    pii: true,
    note: "Kept: pay history is what a payslip is explained by, and is usually a statutory record.",
  }),

  cat("payslips", {
    label: "Payslips",
    model: "payslip",
    dateField: "createdAt",
    subject: { by: "userId" },
    onErase: "anonymize",
    anonymize: { note: REDACTED },
    exportFields: [
      "id", "payRunId", "currency", "gross", "taxableGross", "tax", "deductions",
      "net", "employerCost", "hours", "daysWorked", "unpaidLeaveDays", "lines", "createdAt",
    ],
    defaultRetentionDays: null,
    pii: true,
    note: "Payroll records are statutorily retained (commonly 3–7 years) — never purge these without checking local law.",
  }),

  cat("leave_records", {
    label: "Leave records",
    model: "leaveRequest",
    dateField: "startDate",
    subject: { by: "userId" },
    onErase: "anonymize",
    // The reason for sick or compassionate leave is health data; it goes, while
    // the fact of the absence stays so payroll and entitlements reconcile.
    anonymize: { reason: REDACTED, decisionNote: REDACTED },
    exportFields: ["id", "leaveTypeId", "startDate", "endDate", "days", "halfDay", "reason", "status", "createdAt"],
    defaultRetentionDays: 1825,
    pii: true,
    note: "Reasons can be health data, so they are redacted on erasure even though the absence itself is kept.",
  }),

  cat("timesheets", {
    label: "Timesheets",
    model: "timeEntry",
    dateField: "date",
    subject: { by: "userId" },
    onErase: "anonymize",
    anonymize: { note: REDACTED, project: REDACTED },
    exportFields: ["id", "date", "hours", "overtimeHours", "project", "status", "createdAt"],
    defaultRetentionDays: 1825,
    pii: false,
    note: "Hours underpin pay, so they are kept as evidence of what was paid for.",
  }),

  cat("employment_events", {
    label: "Employment timeline",
    model: "employmentEvent",
    dateField: "createdAt",
    subject: { by: "userId" },
    onErase: "anonymize",
    anonymize: { detail: REDACTED, fromValue: null, toValue: null, actorName: REDACTED },
    exportFields: ["id", "type", "detail", "effectiveAt", "createdAt"],
    defaultRetentionDays: null,
    pii: true,
    note: "Anonymized so the employment audit trail survives without its contents.",
  }),

  cat("signature_parties", {
    label: "E-signature parties",
    model: "signer",
    dateField: "createdAt",
    subject: { by: "email", field: "email" },
    onErase: "anonymize",
    // A signature is evidence that someone agreed to something, so the row must
    // survive erasure — but the identifiers don't have to. email is UNIQUE per
    // envelope, so it becomes a per-row tombstone rather than a constant.
    anonymize: {
      name: REDACTED,
      email: (row) => `erased-${row.id}@deleted.invalid`,
      signatureName: REDACTED,
      ip: null, userAgent: null, tokenHash: null,
    },
    exportFields: ["id", "requestId", "name", "email", "role", "status", "signatureName", "consent", "viewedAt", "signedAt", "createdAt"],
    defaultRetentionDays: null,
    pii: true,
    note: "Anonymized so signature evidence survives, without keeping the signer's identity.",
  }),

  // ── Retention-only (no personal subject link) ─────────────────────────────
  cat("signature_trail", {
    label: "E-signature audit trail",
    model: "signatureEvent",
    dateField: "createdAt",
    subject: null,
    onErase: null,
    defaultRetentionDays: null,
    pii: true,
    note: "Records IP addresses. Kept indefinitely by default — it's what proves a signature happened.",
  }),

  cat("contract_events", {
    label: "Contract timeline",
    model: "contractEvent",
    dateField: "createdAt",
    subject: null,
    onErase: null,
    defaultRetentionDays: null,
    pii: false,
    note: "The record of how each contract reached its current status.",
  }),

  cat("webhook_deliveries", {
    label: "Webhook deliveries",
    model: "webhookDelivery",
    dateField: "createdAt",
    subject: null,
    onErase: null,
    defaultRetentionDays: 30,
    pii: false,
    note: "Payloads can contain customer data — purged aggressively by default.",
  }),

  cat("workflow_runs", {
    label: "Automation run history",
    model: "workflowRun",
    dateField: "createdAt",
    subject: null,
    onErase: null,
    defaultRetentionDays: 90,
    pii: false,
  }),

  cat("social_snapshots", {
    label: "Social follower snapshots",
    model: "socialFollowerSnapshot",
    dateField: "createdAt",
    subject: null,
    onErase: null,
    defaultRetentionDays: 365,
    pii: false,
  }),
];

export const BY_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));
export const getCategory = (id) => BY_ID[id] || null;

/** Categories that can be tied to a person (drive export + erasure). */
export const subjectCategories = () => CATEGORIES.filter((c) => c.subject);

/** Categories a retention policy can be written for. */
export const retainableCategories = () => CATEGORIES.filter((c) => c.dateField);

/**
 * Prisma `where` clause locating one subject's rows in a category.
 * Returns null when the category can't be linked to this subject.
 */
export function subjectWhere(category, { userId, email }) {
  const s = category.subject;
  if (!s) return null;
  if (s.by === "self") return userId ? { id: userId } : email ? { email } : null;
  if (s.by === "userId") return userId ? { [s.field || "userId"]: userId } : null;
  if (s.by === "email") return email ? { [s.field]: email } : null;
  return null;
}

/** Public description for the compliance console. */
export function describeCategory(c) {
  return {
    id: c.id,
    label: c.label,
    pii: !!c.pii,
    subjectLinked: !!c.subject,
    onErase: c.onErase,
    defaultRetentionDays: c.defaultRetentionDays,
    note: c.note || null,
  };
}
