import prisma from "../../config/database.js";


export const createRole = async (tenantId, name) => {
  return prisma.role.create({
    data: {
      name,
      tenantId
    }
  });
};


export const findRolesByTenant = async (tenantId) => {
  return prisma.role.findMany({
    where: { tenantId },
    include: {
      rolePermissions: {
        include: {
          permission: true
        }
      }
    }
  });
};


export const assignPermissionToRole = async (roleId, permissionId) => {
  return prisma.rolePermission.upsert({
    where: {
      roleId_permissionId: {
        roleId,
        permissionId
      }
    },
    update: {},
    create: {
      roleId,
      permissionId
    },
    include: {
      permission: true
    }
  });
};


export const getRolePermissions = async (roleId) => {
  return prisma.rolePermission.findMany({
    where: { roleId },
    include: {
      permission: true
    }
  });
};


export const getRoleWithPermissions = async (roleId) => {
  return prisma.role.findUnique({
    where: { id: roleId },
    include: {
      rolePermissions: {
        include: {
          permission: true
        }
      }
    }
  });
};