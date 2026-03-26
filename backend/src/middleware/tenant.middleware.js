export function requireTenant(req, res, next) {
    if (!req.user || !req.user.tenantId) {
      return res.status(403).json({ error: "Tenant access required" });
    }
  
    next();
  }