import prisma from "../../config/database.js";
import bcrypt from "bcrypt";

export const createUser = async (data) => {

  const passwordHash = await bcrypt.hash(data.password, 10);

  return prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      roleId: data.roleId,
      tenantId: data.tenantId
    }
  });

};