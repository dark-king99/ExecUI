/**
 * HR / People Ops routes — mounted at /api/hr and /api/payroll.
 *
 * Access model, which is the most important thing in this module:
 *
 *   • **Self-service** (`/api/hr/me/*`) — anyone signed in, and *only* about
 *     themselves. The user id always comes from the token, never from the
 *     request, so there is no id to tamper with.
 *   • **Manager actions** — deciding leave and approving hours for your own
 *     reports. Enforced in the services against the employment record.
 *   • **Everything else is admin-only.** Salaries, bank details, pay runs and
 *     the tax table are the most sensitive data in the product; there is no
 *     department that gets partial access to them.
 */
import express from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requireRole } from "../../middleware/role.middleware.js";
import * as people from "./people.service.js";
import * as leave from "./leave.service.js";
import * as time from "./time.service.js";
import * as payroll from "./payroll.service.js";
import { catalog } from "./hr.registry.js";

const router = express.Router();
const admin = requireRole("enterprise_admin", "system_admin");

const actor = (req) => ({ userId: req.user.userId, role: req.user.role, name: req.user.name, tenantId: req.user.tenantId });
const uid = (req) => req.user.userId;

const handle = (fn, status = 200) => async (req, res) => {
  try { res.status(status).json(await fn(req)); }
  catch (err) { res.status(err.status ?? 500).json({ message: err.message }); }
};

router.use(authenticate);

// ── Catalog ──────────────────────────────────────────────────────────────────
router.get("/catalog", handle(() => catalog()));

// ── Self-service (everyone, about themselves only) ───────────────────────────
router.get("/me", handle((req) => people.myProfile(uid(req))));
router.put("/me", handle((req) => people.updateMyProfile(uid(req), req.body)));
router.get("/me/leave", handle(async (req) => ({
  balances: await leave.ensureBalances(uid(req), req.query.year ? Number(req.query.year) : undefined),
  requests: await leave.listRequests({ userId: uid(req), limit: 50 }),
})));
router.post("/me/leave", handle((req) => leave.requestLeave(actor(req), { ...req.body, userId: uid(req) }), 201));
router.post("/me/leave/:id/cancel", handle((req) => leave.cancelRequest(actor(req), req.params.id)));
router.get("/me/time", handle(async (req) => ({
  entries: await time.listEntries({ userId: uid(req), from: req.query.from, to: req.query.to }),
  summary: await time.summary({ userId: uid(req), from: req.query.from, to: req.query.to }),
})));
router.post("/me/time", handle((req) => time.logTime(actor(req), { ...req.body, userId: uid(req) }), 201));
router.put("/me/time/:id", handle((req) => time.updateEntry(actor(req), req.params.id, req.body)));
router.delete("/me/time/:id", handle((req) => time.deleteEntry(actor(req), req.params.id)));
router.post("/me/time/submit", handle((req) => time.submitRange(actor(req), { ...req.body, userId: uid(req) })));
router.get("/me/payslips", handle((req) => payroll.myPayslips(uid(req), { limit: req.query.limit })));
router.get("/me/payslips/ytd", handle((req) => payroll.yearToDate(uid(req), req.query.year ? Number(req.query.year) : undefined)));
router.get("/me/payslips/:id", handle((req) => payroll.getPayslip(req.params.id, { forUserId: uid(req) })));

router.get("/me/payslips/:id/pdf", async (req, res) => {
  try {
    const buffer = await payroll.payslipPdf(req.params.id, { forUserId: uid(req) });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="payslip-${req.params.id.slice(0, 8)}.pdf"`);
    res.send(buffer);
  } catch (err) {
    res.status(err.status ?? 500).json({ message: err.message });
  }
});

// ── Manager actions (authorization lives in the services) ────────────────────
router.get("/team/leave", handle((req) => leave.listRequests({ status: req.query.status ?? "pending", limit: req.query.limit })));
router.post("/leave/requests/:id/decide", handle((req) => leave.decideRequest(actor(req), req.params.id, req.body)));
router.get("/team/time", handle((req) => time.listEntries({ status: req.query.status ?? "submitted", userId: req.query.userId, from: req.query.from, to: req.query.to })));
router.post("/time/decide", handle((req) => time.approveEntries(actor(req), req.body)));

// Shared, non-sensitive: who is away, so the team can plan.
router.get("/leave/calendar", handle((req) => leave.calendar({ from: req.query.from, to: req.query.to })));
router.get("/leave/types", handle((req) => leave.listTypes({ includeInactive: req.query.all === "true" })));

// ── People administration ────────────────────────────────────────────────────
router.get("/stats", admin, handle(() => people.stats()));
router.get("/org-chart", admin, handle(() => people.orgChart()));
router.get("/people", admin, handle((req) => people.listPeople({
  status: req.query.status, search: req.query.search, department: req.query.department,
  includeInactive: req.query.includeInactive === "true", limit: req.query.limit,
})));
router.get("/people/:userId", admin, handle((req) => people.getPerson(req.params.userId)));
router.put("/people/:userId", admin, handle((req) => people.upsertProfile(uid(req), req.params.userId, req.body)));
router.post("/people/:userId/note", admin, handle((req) => people.addNote(uid(req), req.params.userId, req.body?.note), 201));
router.post("/people/:userId/reveal", admin, handle((req) => people.revealSensitive(uid(req), req.params.userId, req.body?.field)));
router.get("/people/:userId/compensation", admin, handle((req) => people.listCompensation(req.params.userId)));
router.post("/people/:userId/compensation", admin, handle((req) => people.addCompensation(uid(req), req.params.userId, req.body), 201));
router.get("/people/:userId/components", admin, handle((req) => payroll.listAssignments(req.params.userId)));
router.put("/compensation/:id", admin, handle((req) => people.updateCompensation(uid(req), req.params.id, req.body)));
router.delete("/compensation/:id", admin, handle((req) => people.deleteCompensation(uid(req), req.params.id)));

// ── Leave administration ─────────────────────────────────────────────────────
router.post("/leave/types", admin, handle((req) => leave.createType(req.body), 201));
router.put("/leave/types/:id", admin, handle((req) => leave.updateType(req.params.id, req.body)));
router.delete("/leave/types/:id", admin, handle((req) => leave.deleteType(req.params.id)));
router.post("/leave/types/seed", admin, handle((req) => leave.seedDefaultTypes(), 201));
router.get("/leave/requests", admin, handle((req) => leave.listRequests({
  userId: req.query.userId, status: req.query.status, from: req.query.from, to: req.query.to, limit: req.query.limit,
})));
router.post("/leave/requests", admin, handle((req) => leave.requestLeave(actor(req), req.body), 201));
router.get("/leave/balances", admin, handle((req) => leave.listBalances({
  userId: req.query.userId, year: req.query.year ? Number(req.query.year) : undefined,
})));
router.post("/leave/balances", admin, handle((req) => leave.adjustBalance(uid(req), req.body)));
router.post("/leave/rollover", admin, handle((req) => leave.rollOverYear(
  req.body?.fromYear ? Number(req.body.fromYear) : undefined,
  req.body?.toYear ? Number(req.body.toYear) : undefined,
)));

// ── Timesheet administration ─────────────────────────────────────────────────
router.get("/time", admin, handle((req) => time.listEntries({
  userId: req.query.userId, status: req.query.status, from: req.query.from, to: req.query.to, limit: req.query.limit,
})));
router.post("/time", admin, handle((req) => time.logTime(actor(req), req.body), 201));
router.post("/time/:id/reopen", admin, handle((req) => time.reopenEntry(actor(req), req.params.id)));

export default router;

// ── Payroll (admin only, mounted at /api/payroll) ────────────────────────────
export const payrollRouter = express.Router();
payrollRouter.use(authenticate, admin);

payrollRouter.get("/stats", handle(() => payroll.payrollStats()));

// Components
payrollRouter.get("/components", handle((req) => payroll.listComponents({ includeInactive: req.query.all === "true" })));
payrollRouter.post("/components", handle((req) => payroll.createComponent(uid(req), req.body), 201));
payrollRouter.put("/components/:id", handle((req) => payroll.updateComponent(req.params.id, req.body)));
payrollRouter.delete("/components/:id", handle((req) => payroll.deleteComponent(req.params.id)));
payrollRouter.post("/components/assign", handle((req) => payroll.assignComponent(req.body), 201));
payrollRouter.delete("/components/assign/:id", handle((req) => payroll.unassignComponent(req.params.id)));

// Tax tables
payrollRouter.get("/tax-tables", handle(() => payroll.listTaxTables()));
payrollRouter.put("/tax-tables", handle((req) => payroll.upsertTaxTable(uid(req), req.body)));
payrollRouter.delete("/tax-tables/:id", handle((req) => payroll.deleteTaxTable(req.params.id)));
payrollRouter.post("/tax-tables/:id/preview", handle((req) => payroll.previewTax(req.params.id, req.body?.annualIncome)));

// Runs
payrollRouter.get("/runs", handle((req) => payroll.listRuns({ status: req.query.status, limit: req.query.limit })));
payrollRouter.post("/runs", handle((req) => payroll.createRun(uid(req), req.body), 201));
payrollRouter.get("/runs/:id", handle((req) => payroll.getRun(req.params.id)));
payrollRouter.put("/runs/:id", handle((req) => payroll.updateRun(req.params.id, req.body)));
payrollRouter.delete("/runs/:id", handle((req) => payroll.deleteRun(req.params.id)));
payrollRouter.post("/runs/:id/calculate", handle((req) => payroll.calculateRun(uid(req), req.params.id)));
payrollRouter.post("/runs/:id/approval", handle((req) => payroll.requestRunApproval(actor(req), req.params.id, req.body), 201));
payrollRouter.post("/runs/:id/status", handle((req) => payroll.transitionRun(actor(req), req.params.id, req.body?.status, {
  note: req.body?.note, paymentRef: req.body?.paymentRef,
})));

// Payslips
payrollRouter.get("/payslips/:id", handle((req) => payroll.getPayslip(req.params.id)));
payrollRouter.get("/payslips/:id/pdf", async (req, res) => {
  try {
    const buffer = await payroll.payslipPdf(req.params.id);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="payslip-${req.params.id.slice(0, 8)}.pdf"`);
    res.send(buffer);
  } catch (err) {
    res.status(err.status ?? 500).json({ message: err.message });
  }
});

// Bank payment file. JSON by default (so the console can show what's missing),
// or the raw CSV with ?download=true.
payrollRouter.get("/runs/:id/bank-file", async (req, res) => {
  try {
    const result = await payroll.bankExport(uid(req), req.params.id);
    if (req.query.download === "true") {
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
      return res.send(result.csv);
    }
    // Without ?download the account numbers are withheld — the caller is asking
    // "is this ready?", not "give me everyone's bank details".
    res.json({ ...result, csv: undefined, preview: result.csv.split("\n").slice(0, 1) });
  } catch (err) {
    res.status(err.status ?? 500).json({ message: err.message });
  }
});
