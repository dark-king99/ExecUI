import prisma from "../../config/database.js"; 
import { bootstrapEnterprise } from "./bootstrap.service.js";

export const registerEnterprise = async (req, res) => {
  try {
    const {
      companyName,
      email,
      password,
      firstName,
      lastName
    } = req.body;

    if (!companyName || !email || !password) {
      return res.status(400).json({
        error: "companyName, email and password are required"
      });
    }

    const baseSlug = companyName
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");

    const slug = `${baseSlug}-${Date.now()}`;

    const result = await bootstrapEnterprise({
      companyName,
      companySlug: slug,
      email,
      password,
      firstName,
      lastName
    });

    res.status(201).json({
      message: "Enterprise created",
      tenant: result.tenant
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};