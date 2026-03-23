import prisma from "../../config/database.js";
import { comparePassword, hashPassword } from "../../utils/hash.js";
import { signAccessToken, signRefreshToken } from "../../utils/jwt.js";
import ApiError from "../../utils/apiError.js";



export async function register(data) {
  const { email, password, name, type } = data;

  const existing = await prisma.user.findUnique({
    where: { email }
  });

  if (existing) {
    throw new Error("User already exists");
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name,
      type
    }
  });

  return user;
}

export async function login(email, password) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      memberships: true
    }
  });

  if (!user) {
    throw new ApiError(401, "Invalid credentials");
  }

  if (!user) {
    throw new Error("Invalid credentials");
  }

  const valid = await comparePassword(password, user.passwordHash);

  if (!valid) {
    throw new Error("Invalid credentials");
  }

  let tenantId = null;
  let role = "CUSTOMER";

  if (user.memberships.length > 0) {
    tenantId = user.memberships[0].tenantId;
    role = user.memberships[0].role;
  }

  const payload = {
    userId: user.id,
    tenantId,
    role,
    type: user.type
  };

  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  await prisma.session.create({
    data: {
      userId: user.id,
      refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    }
  });

  return {
    accessToken,
    refreshToken,
    user: payload
  };
}

export async function refresh(refreshToken) {
  const session = await prisma.session.findUnique({
    where: { refreshToken }
  });

  if (!session) {
    throw new Error("Invalid session");
  }

  const payload = {
    userId: session.userId
  };

  const accessToken = signAccessToken(payload);

  return { accessToken };
}