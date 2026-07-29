import * as svc from "./reports.service.js";

const uid = (req) => req.user.userId;
const tid = (req) => req.user.tenantId;

const handle = (fn) => async (req, res) => {
  try { res.json(await fn(req)); }
  catch (err) { res.status(err.status ?? 500).json({ message: err.message }); }
};

export const listDatasets  = handle((req) => svc.listDatasets(uid(req), tid(req)));
export const preview       = handle((req) => svc.preview(uid(req), tid(req), req.body));

export const listReports   = handle((req) => svc.listReports(uid(req), tid(req)));
export const getReport     = handle((req) => svc.getReport(uid(req), tid(req), req.params.id));
export const createReport  = handle((req) => svc.createReport(uid(req), tid(req), req.body));
export const updateReport  = handle((req) => svc.updateReport(uid(req), tid(req), req.params.id, req.body));
export const deleteReport  = handle((req) => svc.deleteReport(uid(req), tid(req), req.params.id));
export const runSaved      = handle((req) => svc.runSaved(uid(req), tid(req), req.params.id, req.body || {}));

export const listSchedules  = handle((req) => svc.listSchedules(uid(req), tid(req)));
export const createSchedule = handle((req) => svc.createSchedule(uid(req), tid(req), req.body));
export const updateSchedule = handle((req) => svc.updateSchedule(uid(req), tid(req), req.params.id, req.body));
export const deleteSchedule = handle((req) => svc.deleteSchedule(uid(req), tid(req), req.params.id));
export const runScheduleNow = handle((req) => svc.runScheduleNow(uid(req), tid(req), req.params.id));

/** Binary download — streams the rendered file rather than JSON. */
export const exportReport = async (req, res) => {
  try {
    const { buffer, mime, filename } = await svc.exportReport(uid(req), tid(req), req.body || {});
    res.setHeader("Content-Type", mime);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", buffer.length);
    res.send(buffer);
  } catch (err) {
    res.status(err.status ?? 500).json({ message: err.message });
  }
};
