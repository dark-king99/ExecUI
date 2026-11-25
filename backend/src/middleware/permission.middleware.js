import prisma from "../config/database.js";

const ADMIN_ROLES = new Set(["enterprise_admin", "system_admin"]);

/**
 * Require a role permission. Admins pass; everyone else must hold the key.
 *
 * This used to let a role with NO permissions through every check — a
 * "bootstrap" allowance — and deny a role with some permissions but not this
 * one. Both halves were wrong in practice:
 *   • Signup gives admin roles four coarse keys and never the fine-grained ones,
 *     so real admins were refused (e.g. 403 on the role-permission API).
 *   • An employee role went from passing every check to failing all of them the
 *     moment an admin granted it its first, unrelated permission.
 * A check now means the same thing whatever else a role holds.
 */
export const requirePermission = (permissionKey) => {
  return async (req, res, next) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          role: {
            include: {
              rolePermissions: {
                include: { permission: true },
              },
            },
          },
        },
      });

      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      if (ADMIN_ROLES.has(user.role?.name)) return next();

      const permissions = user.role?.rolePermissions?.map((entry) => entry.permission.key) ?? [];
      if (!permissions.includes(permissionKey)) {
        return res.status(403).json({ message: "Permission denied" });
      }

      next();
    } catch (error) {
      res.status(error.status ?? 500).json({ message: error.message });
    }
  };
};
