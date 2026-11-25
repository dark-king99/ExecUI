/**
 * Connected accounts — mounted at /api/connections.
 *
 * Every route needs a signed-in user except the OAuth callback (exported as
 * `callbackRouter` and mounted ahead of the session check), which the browser
 * reaches straight from Google or Microsoft. That callback trusts
 * nothing in the URL except the single-use `state`, and always ends with a
 * redirect back into the app — never a token, never a JSON body with secrets.
 */
import express from "express";
import prisma from "../../config/database.js";
import { log } from "../../lib/logger.js";
import * as svc from "./connections.service.js";
import { syncConnection } from "./sync.service.js";

const router = express.Router();
/** The OAuth callback alone — mounted before the app's session check. */
export const callbackRouter = express.Router();
const actor = (req) => ({ tenantId: req.user.tenantId, userId: req.user.userId, role: req.user.role });

const handle = (fn) => async (req, res) => {
  try { res.json(await fn(req)); }
  catch (e) { res.status(e.status ?? 500).json({ message: e.message }); }
};

// The provider's redirect. Outcome goes back to the page as a query flag only.
callbackRouter.get("/oauth/:provider/callback", async (req, res) => {
  try {
    await svc.completeConnect(req.params.provider, {
      code: req.query.code, state: req.query.state, error: req.query.error,
    });
    res.redirect(svc.frontendUrl(`/account/connections?connected=${encodeURIComponent(req.params.provider)}`));
  } catch (e) {
    log.warn?.("connection_callback_failed", { provider: req.params.provider, error: e.message });
    res.redirect(svc.frontendUrl(`/account/connections?error=${encodeURIComponent(String(e.message).slice(0, 200))}`));
  }
});

// Everything below runs after the app-wide authenticate + trial check.
router.get("/", handle((req) => svc.listConnections(actor(req))));
router.post("/oauth/:provider/start", handle((req) => svc.startConnect(actor(req), req.params.provider, req.body?.purpose)));
router.patch("/:id", handle((req) => svc.updateConnection(actor(req), req.params.id, req.body ?? {})));
router.delete("/:id", handle((req) => svc.disconnect(actor(req), req.params.id)));

// Sync one of my connections now, rather than waiting for the scheduler.
router.post("/:id/sync", handle(async (req) => {
  const { connections } = await svc.listConnections(actor(req));
  if (!connections.some((c) => c.id === req.params.id)) throw Object.assign(new Error("Connection not found"), { status: 404 });
  const row = await prisma.oAuthConnection.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId } });
  const result = await syncConnection(row);
  const after = await prisma.oAuthConnection.findFirst({ where: { id: row.id } });
  return { result, connection: after ? svc.shape(after) : null };
}));

export default router;
