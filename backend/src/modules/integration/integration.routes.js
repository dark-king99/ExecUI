import express from "express";
import prisma from "../../config/database.js";
import { apiKeyAuth, requireScope } from "../../middleware/apikey.middleware.js";

/**
 * Public integration API (v1). External servers authenticate with an API key
 * (X-API-Key header or `Authorization: Bearer exk_live_…`). Every route is
 * tenant-scoped to the key's tenant — a key can never read another tenant's data.
 */
const router = express.Router();
router.use(apiKeyAuth);

// Health/identity check — verify a key works.
router.get("/ping", (req, res) =>
  res.json({ ok: true, tenant: req.apiKey.tenantId, key: req.apiKey.name, scopes: req.apiKey.scopes, time: new Date().toISOString() }),
);

// Read-scoped tenant summary (example integration payload).
router.get("/summary", requireScope("read"), async (req, res, next) => {
  try {
    const tenantId = req.apiKey.tenantId;
    const [users, deals, campaigns, devices, clients] = await Promise.all([
      prisma.user.count({ where: { tenantId } }),
      prisma.crmOpportunity.count({ where: { tenantId } }),
      prisma.marketingCampaign.count({ where: { tenantId } }),
      prisma.networkDevice.count({ where: { tenantId } }),
      prisma.bizClient.count({ where: { tenantId } }),
    ]);
    res.json({ tenant: tenantId, generatedAt: new Date().toISOString(), counts: { users, deals, campaigns, devices, clients } });
  } catch (err) {
    next(err);
  }
});

// Write-scoped example: ingest an external event into the audit trail.
router.post("/events", requireScope("write"), async (req, res, next) => {
  try {
    const { action, detail } = req.body || {};
    if (!action) return res.status(400).json({ message: "'action' is required" });
    // Attribute the event to a real user (the key's creator, or any tenant user).
    const userId = req.apiKey.createdById
      || (await prisma.user.findFirst({ where: { tenantId: req.apiKey.tenantId }, select: { id: true } }))?.id;
    if (!userId) return res.status(202).json({ recorded: false, note: "no user available to attribute the event" });
    const log = await prisma.auditLog.create({
      data: { tenantId: req.apiKey.tenantId, userId, action: String(action), detail: detail ? String(detail) : null, resource: "integration" },
    });
    res.status(201).json({ id: log.id, recorded: true });
  } catch (err) {
    next(err);
  }
});

export default router;
