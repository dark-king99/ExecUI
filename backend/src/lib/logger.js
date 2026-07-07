/**
 * Structured JSON logging — one line per event, greppable and
 * machine-parseable, zero dependencies.
 *
 *   {"time":"…","level":"info","msg":"request","reqId":"…","method":"GET",…}
 *
 * LOG_LEVEL env var controls verbosity (debug | info | warn | error).
 */
import crypto from "crypto";

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const threshold = LEVELS[process.env.LOG_LEVEL?.toLowerCase()] ?? LEVELS.info;

function write(level, msg, fields = {}) {
  if (LEVELS[level] < threshold) return;
  const line = JSON.stringify({ time: new Date().toISOString(), level, msg, ...fields });
  (level === "error" || level === "warn" ? process.stderr : process.stdout).write(line + "\n");
}

export const log = {
  debug: (msg, fields) => write("debug", msg, fields),
  info:  (msg, fields) => write("info", msg, fields),
  warn:  (msg, fields) => write("warn", msg, fields),
  error: (msg, fields) => write("error", msg, fields),
};

/**
 * Express middleware: tag every request with an id and log one summary line
 * on completion (method, path, status, duration, user/tenant when known).
 * The id is echoed in the X-Request-Id header so users can quote it in
 * bug reports and you can grep straight to the failing request.
 */
export function requestLogger(req, res, next) {
  req.id = req.headers["x-request-id"] || crypto.randomUUID();
  res.setHeader("X-Request-Id", req.id);
  const start = process.hrtime.bigint();

  res.on("finish", () => {
    // Health checks and static assets would drown out the signal.
    if (req.path === "/health" || req.path.startsWith("/api/uploads")) return;
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    write(res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info", "request", {
      reqId: req.id,
      method: req.method,
      path: req.originalUrl?.split("?")[0] ?? req.path,
      status: res.statusCode,
      ms: Math.round(ms * 10) / 10,
      userId: req.user?.userId,
      tenantId: req.user?.tenantId,
    });
  });

  next();
}
