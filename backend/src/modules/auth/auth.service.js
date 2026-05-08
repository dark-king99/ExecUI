import prisma from "../../config/database.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import ApiError from "../../utils/apiError.js";

export async function register(data) {
  const { email, password, firstName, lastName, tenantId, roleId } = data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new ApiError(409, "User already exists");

  const passwordHash = await bcrypt.hash(password, 10);

  return prisma.user.create({
    data: { email, passwordHash, firstName, lastName, tenantId, roleId }
  });
}

export async function login(email, password) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { tenant: true, role: true }
  });

  if (!user) throw new ApiError(401, "Invalid credentials");

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new ApiError(401, "Invalid credentials");

  const payload = {
    userId:   user.id,
    tenantId: user.tenantId,
    role:     user.role.name
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES || "1d"
  });

  return {
    token,
    user: {
      id:       user.id,
      email:    user.email,
      tenantId: user.tenantId,
      role:     user.role.name
    }
  };
}
