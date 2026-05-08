import prisma from "../../config/database.js";
import bcrypt from "bcrypt";

export async function bootstrapEnterprise({
  companyName,
  companySlug,
  email,
  password,
  firstName,
  lastName
}) {

  const passwordHash = await bcrypt.hash(password, 10);

  return prisma.$transaction(async (tx) => {

    const tenant = await tx.tenant.create({
      data: {
        name: companyName,
        slug: companySlug
      }
    });

    const adminRole = await tx.role.create({
      data: {
        name: "enterprise_admin",
        tenantId: tenant.id
      }
    });

    const employeeRole = await tx.role.create({
      data: {
        name: "employee",
        tenantId: tenant.id
      }
    });

    const permissions = [
      { key: "crm_access", description: "CRM Access" },
      { key: "marketing_access", description: "Marketing Access" },
      { key: "network_access", description: "Network Access" },
      { key: "admin_access", description: "Admin Access" }
    ];
    
    for (const permission of permissions) {

      // Upsert: create if not exists, skip update — key is globally unique across tenants
      const createdPermission = await tx.permission.upsert({
        where: { key: permission.key },
        update: {},
        create: {
          key: permission.key,
          description: permission.description
        }
      });

      // Link permission to admin role (skip if already linked)
      await tx.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: adminRole.id,
            permissionId: createdPermission.id
          }
        },
        update: {},
        create: {
          roleId: adminRole.id,
          permissionId: createdPermission.id
        }
      });
    }

    const existingUser = await tx.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      throw new Error("User already exists with this email");
    }
    
    const adminUser = await tx.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        tenantId: tenant.id,
        roleId: adminRole.id
      }
    });

    return {
      tenant,
      adminUser
    };
  });
}