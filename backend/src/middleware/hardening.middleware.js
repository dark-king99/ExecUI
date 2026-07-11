/**
 * Global request-hardening layer — runs on every request, before any route.
 * Covers the "input validation on every request/step" and "don't crash under
 * overload" requirements without needing a schema on all ~450 routes.
 */
import { log } from "../lib/logger.js";

// ── Prototype-pollution / mass-assignment guard ──────────────────────────────
const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const MAX_DEPTH = 12;   // reject absurdly nested payloads (DoS via deep objects)
const MAX_KEYS = 2000;  // reject objects with a runaway number of keys

function scan(value, depth, counter) {
  if (depth > MAX_DEPTH) return "payload nested too deeply";
  if (value && typeof value === "object") {
    const keys = Object.keys(value);
    counter.n += keys.length;
    if (counter.n > MAX_KEYS) return "payload has too many fields";
    for (const k of keys) {
      if (FORBIDDEN_KEYS.has(k)) return `illegal field name "${k}"`;
      const bad = scan(value[k], depth + 1, counter);
      if (bad) return bad;
    }
  }
  return null;
}

export function sanitizeInput(req, res, next) {
  for (const src of [req.body, req.query, req.params]) {
    if (src && typeof src === "object") {
      const problem = scan(src, 0, { n: 0 });
      if (problem) return res.status(400).json({ message: `Invalid request: ${problem}`, status: 400 });
    }
  }
  next();
}

// ── Content-Type enforcement for mutating requests ───────────────────────────
// A body-bearing POST/PUT/PATCH must declare JSON (multipart uploads excepted),
// so we never mis-parse or accept a body of an unexpected type.
export function enforceJsonContentType(req, res, next) {
  const m = req.method;
  if (m === "POST" || m === "PUT" || m === "PATCH") {
    const ct = req.headers["content-type"] || "";
    const hasBody = req.headers["content-length"] && Number(req.headers["content-length"]) > 0;
    const isJson = ct.includes("application/json");
    const isMultipart = ct.includes("multipart/form-data"); // file uploads
    if (hasBody && !isJson && !isMultipart) {
      return res.status(415).json({ message: "Unsupported content type — expected application/json", status: 415 });
    }
  }
  next();
}

// ── Overload protection: cap concurrent in-flight requests ───────────────────
// A traffic spike that outruns the event loop is shed with 503 instead of
// piling up until the process falls over.
export function concurrencyLimiter({ max = 200 } = {}) {
  let inflight = 0;
  return (req, res, next) => {
    // Never shed health checks — the orchestrator needs a truthful answer.
    if (req.path === "/health" || req.path.startsWith("/health/")) return next();
    if (inflight >= max) {
      res.setHeader("Retry-After", "2");
      log.warn("overload_shed", { path: req.originalUrl, inflight });
      return res.status(503).json({ message: "Server busy — please retry in a moment.", status: 503 });
    }
    inflight++;
    res.on("finish", () => { inflight--; });
    res.on("close", () => { inflight--; });
    next();
  };
}

// ── Per-request timeout ──────────────────────────────────────────────────────
// A stuck handler (slow query, wedged upstream) is failed cleanly rather than
// holding a socket forever. SSE streams are exempt (they're long-lived).
export function requestTimeout({ ms = 25_000 } = {}) {
  return (req, res, next) => {
    if (req.path.endsWith("/notifications/stream")) return next();
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        log.warn("request_timeout", { path: req.originalUrl, ms });
        res.status(503).json({ message: "The request took too long. Please try again.", status: 503 });
      }
    }, ms);
    res.on("finish", () => clearTimeout(timer));
    res.on("close", () => clearTimeout(timer));
    next();
  };
}

/** Clamp pagination params to a safe range (helper for list endpoints). */
export function clampPage(query = {}, { defLimit = 50, maxLimit = 200 } = {}) {
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || defLimit, 1), maxLimit);
  const offset = Math.max(parseInt(query.offset, 10) || 0, 0);
  return { limit, offset };
}
