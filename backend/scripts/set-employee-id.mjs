/**
 * Set a user's Employee ID.
 *
 * Employee IDs are now opaque 7-character codes (lowercase letters + digits)
 * and are no longer displayed in the app, so this is the supported way to set
 * a specific one for an existing account (e.g. your admin login).
 *
 * Usage (from backend/):
 *   node scripts/set-employee-id.mjs <email> <employeeId>
 *   node scripts/set-employee-id.mjs doeblah004@gmail.com z7yx3w0
 *
 * Requires DATABASE_URL to point at the target database.
 */
import prisma from "../src/config/database.js";

const EMP_ID_RE = /^[a-z0-9]{7}$/;

const email = (process.argv[2] || "doeblah004@gmail.com").trim().toLowerCase();
const employeeId = (process.argv[3] || "z7yx3w0").trim().toLowerCase();

async function main() {
  if (!EMP_ID_RE.test(employeeId)) {
    throw new Error(`Employee ID must be exactly 7 letters/digits (got "${employeeId}")`);
  }

  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true, email: true, tenantId: true, employeeId: true },
  });
  if (!user) throw new Error(`No user found with email ${email}`);

  // Employee IDs are unique within a tenant.
  const clash = await prisma.user.findFirst({
    where: { tenantId: user.tenantId, employeeId, NOT: { id: user.id } },
    select: { email: true },
  });
  if (clash) throw new Error(`Employee ID "${employeeId}" is already used by ${clash.email} in this enterprise`);

  await prisma.user.update({ where: { id: user.id }, data: { employeeId } });
  console.log(`✓ ${user.email}: employee ID "${user.employeeId ?? "—"}" → "${employeeId}"`);
}

main()
  .catch((err) => { console.error("✗", err.message); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
