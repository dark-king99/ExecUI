import prisma from "../../config/database.js";
import bcrypt from "bcrypt";
import crypto from "crypto";

// Opaque 7-character employee ID (lowercase letters + digits) — see users.controller.
const EMP_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
const genEmployeeId = () => Array.from({ length: 7 }, () => EMP_ALPHABET[crypto.randomInt(EMP_ALPHABET.length)]).join("");

// Generate a short, human-friendly, unique enterprise join code, e.g. "ACME-9F3K".
function randomSuffix(len = 4) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous 0/O/1/I
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

async function generateEnterpriseCode(tx, companyName) {
  const base = ((companyName || "ORG")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6)) || "ORG";
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = `${base}-${randomSuffix()}`;
    const existing = await tx.tenant.findUnique({ where: { code } });
    if (!existing) return code;
  }
  return `${base}-${randomSuffix(6)}`;
}

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

    const code = await generateEnterpriseCode(tx, companyName);

    const tenant = await tx.tenant.create({
      data: {
        name: companyName,
        slug: companySlug,
        code
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

    // The founding enterprise admin gets a random 7-char employee ID code.
    const adminUser = await tx.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        employeeId: genEmployeeId(),
        status: "active",
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
