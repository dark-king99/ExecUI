import * as svc from "./service.service.js";

// ── Helper ────────────────────────────────────────────────────────────────────

function getTenantId(req) {
  return req.user?.tenantId;
}

function getUserId(req) {
  return req.user?.id;
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export async function getDashboardOverview(req, res) {
  try {
    const data = await svc.getDashboardOverview(getTenantId(req));
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// ── Catalog ───────────────────────────────────────────────────────────────────

export async function listCatalogItems(req, res) {
  try {
    const items = await svc.listCatalogItems(getTenantId(req), req.query);
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function createCatalogItem(req, res) {
  try {
    const item = await svc.createCatalogItem(getTenantId(req), req.body);
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// ── Requests ──────────────────────────────────────────────────────────────────

export async function listRequests(req, res) {
  try {
    const requests = await svc.listRequests(getTenantId(req), req.query);
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function createRequest(req, res) {
  try {
    const request = await svc.createRequest(getTenantId(req), getUserId(req), req.body);
    res.status(201).json(request);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function getRequest(req, res) {
  try {
    const request = await svc.getRequest(getTenantId(req), req.params.id);
    res.json(request);
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ message: "Not found" });
    res.status(500).json({ message: err.message });
  }
}

export async function updateRequestStatus(req, res) {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ message: "status is required" });
    const updated = await svc.updateRequestStatus(getTenantId(req), req.params.id, status);
    res.json(updated);
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ message: "Not found" });
    res.status(500).json({ message: err.message });
  }
}

// ── Approvals ─────────────────────────────────────────────────────────────────

export async function listPendingApprovals(req, res) {
  try {
    const approvals = await svc.listPendingApprovals(getTenantId(req));
    res.json(approvals);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function approveRequest(req, res) {
  try {
    const result = await svc.approveRequest(
      getTenantId(req),
      req.params.id,
      getUserId(req),
      req.body.notes,
    );
    res.json(result);
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ message: "Not found" });
    res.status(500).json({ message: err.message });
  }
}

export async function rejectRequest(req, res) {
  try {
    const result = await svc.rejectRequest(
      getTenantId(req),
      req.params.id,
      getUserId(req),
      req.body.notes,
    );
    res.json(result);
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ message: "Not found" });
    res.status(500).json({ message: err.message });
  }
}

// ── Knowledge Base ────────────────────────────────────────────────────────────

export async function listKBArticles(req, res) {
  try {
    const articles = await svc.listKBArticles(getTenantId(req), req.query);
    res.json(articles);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function createKBArticle(req, res) {
  try {
    const article = await svc.createKBArticle(getTenantId(req), req.body);
    res.status(201).json(article);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// ── Reports ───────────────────────────────────────────────────────────────────

export async function getReportsSummary(req, res) {
  try {
    const data = await svc.getReportsSummary(getTenantId(req));
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// ── SLA ───────────────────────────────────────────────────────────────────────

export async function getSLAStats(req, res) {
  try {
    const data = await svc.getSLAStats(getTenantId(req));
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// ── Settings ──────────────────────────────────────────────────────────────────

export async function getSettings(req, res) {
  try {
    const data = await svc.getSettings(getTenantId(req));
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function updateSettings(req, res) {
  try {
    const data = await svc.updateSettings(getTenantId(req), req.body);
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}
