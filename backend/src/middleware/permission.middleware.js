import prisma from "../config/database.js";

export const requirePermission = (permissionKey) => {
  return async (req, res, next) => {
    try {

      const userId = req.user.userId;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          role: {
            include: {
              rolePermissions: {
                include: {
                  permission: true
                }
              }
            }
          }
        }
      });

      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const permissions = user.role.rolePermissions.map(
        (entry) => entry.permission.key
      );

      if (!permissions.includes(permissionKey)) {
        return res.status(403).json({
          message: "Permission denied"
        });
      }

      next();

    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };
};