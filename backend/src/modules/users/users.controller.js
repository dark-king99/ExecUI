import prisma from "../../config/database.js";
import bcrypt from "bcrypt";

export const listUsers = async (req, res) => {
  try {

    const users = await prisma.user.findMany({
      where: {
        tenantId: req.user.tenantId
      }
    });

    res.json(users);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const inviteUser = async (req, res) => {
  try {

    const { email, password, firstName, lastName, roleId } = req.body;

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        roleId,
        tenantId: req.user.tenantId
      }
    });

    res.status(201).json(user);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};