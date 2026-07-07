/**
 * In-memory sliding-window rate limiter (zero deps). Suitable for a single
 * process; swap the store for Redis if the API ever runs multi-instance.
 *
 *   router.post("/login", rateLimit({ windowMs: 60_000, max: 10 }), handler);
 *
 * Keys by IP by default; pass keyFn to add e.g. the attempted email so an
 * attacker can't lock everyone out from one address rotating targets.
 */
const buckets = new Map(); // key -> number[] (request timestamps)

// Drop stale buckets so a long-lived process doesn't accumulate them.
setInterval(() => {
  const cutoff = Date.now() - 15 * 60_000;
  for (const [key, times] of buckets) {
    if (times[times.length - 1] < cutoff) buckets.delete(key);
  }
}, 5 * 60_000).unref();

export function rateLimit({ windowMs = 60_000, max = 30, keyFn, message } = {}) {
  return (req, res, next) => {
    const ip = req.ip ?? req.headers["x-forwarded-for"] ?? "unknown";
    const key = `${req.path}|${keyFn ? keyFn(req) : ip}`;
    const now = Date.now();

    const times = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
    if (times.length >= max) {
      const retryAfter = Math.ceil((times[0] + windowMs - now) / 1000);
      res.setHeader("Retry-After", String(retryAfter));
      return res.status(429).json({
        message: message ?? `Too many attempts — try again in ${retryAfter}s.`,
        status: 429,
      });
    }
    times.push(now);
    buckets.set(key, times);
    next();
  };
}

/** Stricter limiter for credential endpoints: 10/min per IP+email pair. */
export const authRateLimit = rateLimit({
  windowMs: 60_000,
  max: 10,
  keyFn: (req) => `${req.ip}|${String(req.body?.email ?? "").toLowerCase()}`,
  message: "Too many sign-in attempts. Wait a minute and try again.",
});
