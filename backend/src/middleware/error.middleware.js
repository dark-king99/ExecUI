import { statusOf } from "../lib/errors.js";
import { log } from "../lib/logger.js";

export function errorHandler(err, req, res, _next) {
  const status = statusOf(err);

  // 4xx are the caller's mistake — one warn line. 5xx are ours — full stack.
  if (status >= 500) {
    log.error("unhandled_error", {
      reqId: req.id, path: req.originalUrl, status,
      message: err.message, stack: err.stack,
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
