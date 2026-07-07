import * as svc from "./overview.service.js";

const tid = (req) => req.user.tenantId;
const uid = (req) => req.user.userId;

const handle = (fn) => async (req, res) => {
  try { res.json(await fn(req)); }
  catch (err) { res.status(err.status ?? 500).json({ message: err.message }); }
};

export const getDashboard = handle((req) => svc.getDashboard(uid(req), tid(req)));
export const postMessage  = handle((req) => svc.postMessage(uid(req), tid(req), req.body));
export const emailReport  = handle((req) => svc.emailReport(uid(req), tid(req)));
export const listDepartments = (_req, res) => res.json(svc.DEPARTMENTS);
