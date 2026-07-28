import { statusOf } from "../lib/errors.js";
import { log } from "../lib/logger.js";
import { captureError } from "../lib/analytics.js";

export function errorHandler(err, req, res, _next) {
  const status = statusOf(err);

  // 4xx are the caller's mistake — one warn line. 5xx are ours — full stack.
  if (status >= 500) {
    log.error("unhandled_error", {
      reqId: req.id, path: req.originalUrl, status,
      message: err.message, stack: err.stack,
    });
    // Stream the failure to analytics so you can see which backend route breaks
    // — no request body / PII, just route + status + ids. Best-effort.
    captureError(err, {
      route: `${req.method} ${req.originalUrl}`,
      status,
      requestId: req.id,
      userId: req.user?.userId,
      tenantId: req.user?.tenantId,
    });
  } else {
    log.warn("request_rejected", { reqId: req.id, path: req.originalUrl, status, message: err.message });
  }

  res.status(status).json({
    // Never leak internals on a 500 — the reqId lets you find the stack in logs.
    message: status >= 500 ? "Something went wrong on our side. Please try again." : err.message,
    status,
    requestId: req.id,
  });
}
