import prisma from "../../config/database.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export async function loginUser({ email, password }) {

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      tenant: true,
      role: true
    }
  });

  if (!user) {
    throw new Error("Invalid credentials");
  }

  const valid = await bcrypt.compare(password, user.passwordHash);

  if (!valid) {
    throw new Error("Invalid credentials");
  }

  const token = jwt.sign(
    {
      userId: user.id,
      tenantId: user.tenantId,
      role: user.role.name
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES || "1d" }
  );

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role.name
    }
  };
}