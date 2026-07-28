/**
 * Reward tracking middleware — turns real workspace activity into points.
 *
 * It observes the OUTCOME of each request (via res "finish") and, for a
 * successful mutation on a core module, awards usage/performance points to the
 * caller. Running on finish means it adds zero latency to the user's request
 * and only ever fires for requests that actually succeeded.
 *
 * The award runs inside an explicit tenant context rebuilt from req.user, so it
 * stays correctly isolated even though the request's own async context has
 * already unwound by the time "finish" fires. Tracking is strictly
 * best-effort: any failure is swallowed and can never affect the response.
 */
import { runWithTenant } from "../lib/tenantContext.js";
import { recordAction } from "../modules/rewards/rewards.service.js";

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function rewardTracking(req, res, next) {
  res.on("finish", () => {
    try {
      if (!MUTATING.has(req.method)) return;
      if (res.statusCode < 200 || res.statusCode >= 300) return;
      const user = req.user;
      if (!user?.userId || !user?.tenantId) return;

      let path = (req.originalUrl || req.url || "").split("?")[0];
      if (path.startsWith("/api/")) path = path.slice(4);
      else if (path === "/api") return;

      runWithTenant({ tenantId: user.tenantId, userId: user.userId }, () => {
        recordAction(user.userId, req.method, path).catch(() => {});
      });
    } catch {
      /* tracking must never break the request */
    }
  });
  next();
}
