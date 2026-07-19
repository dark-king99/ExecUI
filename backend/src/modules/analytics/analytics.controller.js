import * as svc from "./analytics.service.js";

const handle = (fn) => async (req, res) => {
  try {
    res.json(await fn(req));
  } catch (err) {
    console.error("[analytics]", err.message);
    res.status(err.status ?? 500).json({ message: err.message });
  }
};

const tid = (req) => req.user.tenantId;

export const getKpis                = handle((req) => svc.getKpis(tid(req)));
export const getHealthSummary       = handle((req) => svc.getHealthSummary(tid(req)));
export const getRevenueVsPlan       = handle((req) => svc.getRevenueVsPlan(tid(req)));
export const getOperationalServices = handle((req) => svc.getOperationalServices(tid(req)));
export const getOperationalEvents   = handle((req) => svc.getOperationalEvents(tid(req)));
export const getCohorts             = handle((req) => svc.getCohorts(tid(req)));
export const getRetentionByTier     = handle((req) => svc.getRetentionByTier(tid(req)));
export const getChurnSignals        = handle((req) => svc.getChurnSignals(tid(req)));
export const getRevenueSegments     = handle((req) => svc.getRevenueSegments(tid(req)));
export const getExpansionPipeline   = handle((req) => svc.getExpansionPipeline(tid(req)));
export const getDatasets            = handle((req) => svc.getDatasets(tid(req)));
export const getSavedQueries        = handle(()    => svc.getSavedQueries());
export const runQuery               = handle((req) => svc.runQuery(tid(req), req.body));
export const saveQuery              = handle((req) => svc.saveQuery(req.body));
export const deleteQuery            = (_req, res)  => res.status(204).end();
export const deduplicateDataset     = handle((req) => svc.deduplicateDataset(req.params.id));
