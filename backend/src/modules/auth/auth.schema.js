import { z } from "zod";

// Shapes match the real auth endpoints (email + password + employee ID model).

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(200),
  employeeId: z.string().min(1).max(50),
  mfaCode: z.string().regex(/^\d{6}$/, "must be a 6-digit code").optional(),
});

export const enterpriseSignupSchema = z.object({
  company: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(200),
  firstName: z.string().max(60).optional(),
  lastName: z.string().max(60).optional(),
});

export const employeeSignupSchema = z.object({
  enterpriseCode: z.string().min(4).max(20),
  employeeId: z.string().min(1).max(50),
  email: z.string().email(),
  password: z.string().min(8).max(200),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(8).max(200),
});

export const selectPlanSchema = z.object({
  plan: z.enum(["starter", "standard", "premium", "enterprise", "executive", "custom"]),
  customSolutions: z.array(z.string().max(60)).max(30).optional(),
  industry: z.string().max(40).optional(),
  // Executive's network tier — "office" (base) or "datacenter" (enterprise price).
  networkProfile: z.enum(["office", "datacenter"]).optional(),
  billingInterval: z.enum(["month", "year"]).optional(),
});

export const refundRequestSchema = z.object({
  reason: z.enum(["not_a_fit", "missing_features", "billing_issue", "technical_issue", "other"]),
  details: z.string().trim().min(20).max(2000),
});

export const refundRequestUpdateSchema = z.object({
  status: z.enum(["submitted", "under_review", "needs_information", "approved", "declined", "refunded"]),
  adminNote: z.string().trim().max(2000).optional(),
  paddleRefundReference: z.string().trim().max(120).optional(),
});

export const inviteSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1).max(60),
  lastName: z.string().min(1).max(60),
  employeeId: z.string().max(50).optional(),
  roleId: z.string().max(60).optional(),
  role: z.string().max(60).optional(),
  department: z.string().max(80).optional(),
  jobTitle: z.string().max(120).optional(),
  phone: z.string().max(40).optional(),
});
