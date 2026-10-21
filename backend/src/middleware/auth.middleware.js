import jwt from "jsonwebtoken";
import { runWithTenant } from "../lib/tenantContext.js";
import { withAnalyticsContext } from "../lib/analytics.js";

/**
 * Verify the bearer token, attach req.user, and enter the tenant context for
 * the rest of the request. Running the downstream chain inside
 * runWithTenant(...) means every DB query the request makes is automatically
 * scoped to the caller's tenant (see config/database.js) — cross-tenant access
 * is impossible even if a handler forgets to filter.
 */
export const authenticate = (req, res, next) => {
  if (req.user) return next();
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }
    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded?.tenantId) {
      return res.status(401).json({ message: "Malformed token: no tenant" });
    }
    req.user = decoded;

    // Everything downstream inherits both the tenant boundary and the stable
    // authenticated user ID, including any server-side error captured later.
    const sessionId = req.headers["x-posthog-session-id"];
    return withAnalyticsContext(
      {
        userId: decoded.userId,
        tenantId: decoded.tenantId,
        role: decoded.role,
        sessionId: Array.isArray(sessionId) ? sessionId[0] : sessionId,
      },
      () => runWithTenant(
        { tenantId: decoded.tenantId, userId: decoded.userId, role: decoded.role },
        () => next(),
      ),
    );
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
