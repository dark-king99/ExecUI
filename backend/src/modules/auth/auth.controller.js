import prisma from "../../config/database.js";
import { bootstrapEnterprise } from "./bootstrap.service.js";
import jwt from "jsonwebtoken";

export const registerEnterprise = async (req, res) => {
  try {
    const { companyName, company, email, password, firstName, lastName, role } = req.body;

    // Accept either 'companyName' (API callers) or 'company' (Login.jsx form field)
    const resolvedCompany = companyName || company;

    if (!resolvedCompany || !email || !password) {
      return res.status(400).json({
        message: "Company name, email and password are required"
      });
    }

    const baseSlug = resolvedCompany
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");

    const slug = `${baseSlug}-${Date.now()}`;

    const result = await bootstrapEnterprise({
      companyName: resolvedCompany,
      companySlug: slug,
      email,
      password,
      firstName: firstName || email.split("@")[0],
      lastName:  lastName  || "User"
    });

    // Issue a JWT immediately so the client is logged in after signup
    const token = jwt.sign(
      {
        userId:   result.adminUser.id,
        tenantId: result.adminUser.tenantId,
        role:     "enterprise_admin"
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES || "1d" }
    );

    res.status(201).json({
      token,
      user: {
        id:       result.adminUser.id,
        email:    result.adminUser.email,
        firstName: result.adminUser.firstName,
        lastName:  result.adminUser.lastName,
        tenantId: result.adminUser.tenantId,
        role:     "enterprise_admin"
      }
    });

  } catch (error) {
    // Friendly duplicate-email message
    if (error.message?.includes("already exists")) {
      return res.status(409).json({ message: "An account with that email already exists." });
    }
    res.status(500).json({ message: error.message });
  }
};
