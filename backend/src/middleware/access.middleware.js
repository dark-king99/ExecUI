import prisma from "../config/database.js";
import { accessFor } from "../modules/access/access.policy.js";

// Short-lived department cache so the guard doesn't hit the DB on every request
// for tokens minted before department was embedded in the JWT.
const deptCache = new Map(); // userId -> { department, t }
const TTL = 30_000;

async function departmentOf(req) {
  if (req.user.department !== undefined && req.user.department !== null) return req.user.department;
  const cached = deptCache.get(req.user.userId);
  if (cached && Date.now() - cached.t < TTL) return cached.department;
  const u = await prisma.user.findUnique({ where: { id: req.user.userId }, select: { department: true } });
  const department = u?.department ?? null;
  deptCache.set(req.user.userId, { department, t: Date.now() });
  return department;
}

/** Attach the resolved access descriptor to req.access (assumes authenticate ran). */
export async function attachAccess(req, _res, next) {
  try {
    const department = await departmentOf(req);
    req.access = accessFor({ role: req.user?.role, department });
    next();
  } catch (err) {
    next(err);
  }
}

/** Reject the request unless the user's department may access `section`. */
export function requireModule(section) {
  return async (req, res, next) => {
    try {
      if (!req.access) await attachAccess(req, res, () => {});
      if (!req.access || !req.access.sections.includes(section)) {
        return res.status(403).json({
          message: `Access denied: your department does not have access to ${section}.`,
          code: "DEPARTMENT_FORBIDDEN",
          section,
        });
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
