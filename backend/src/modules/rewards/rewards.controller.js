import * as svc from "./rewards.service.js";

const uid = (req) => req.user.userId;

const handle = (fn) => async (req, res) => {
  try { res.json(await fn(req)); }
  catch (err) { res.status(err.status ?? 500).json({ message: err.message }); }
};

// Rules / tiers / badges catalog (for the "how to earn" panel).
export const getConfig = handle(() => svc.getConfig());

// Org-wide leaderboard — every authenticated employee can read it.
export const getLeaderboard = handle((req) => {
  const range = ["all", "month", "week"].includes(req.query.range) ? req.query.range : "all";
  return svc.getLeaderboard({ range });
});

// The caller's own reward profile.
export const getMe = handle(async (req) => {
  const data = await svc.getForUser(uid(req));
  if (!data) { const e = new Error("Profile not found"); e.status = 404; throw e; }
  return data;
});

// A colleague's public reward profile (same org — enforced by tenant scope).
export const getUser = handle(async (req) => {
  const data = await svc.getForUser(req.params.id);
  if (!data) { const e = new Error("Member not found"); e.status = 404; throw e; }
  return data;
});

// Record a navigation visit (called by the client on route changes).
export const track = handle(async (req) => {
  const result = await svc.trackNavigation(uid(req), req.body?.path);
  return { ok: true, ...result };
});
