import { z } from "zod";

const KINDS = ["api", "webhook", "slack", "custom"];
const AUTH_TYPES = ["bearer", "header", "none"];

// A target URL must be http(s) — never a file://, localhost-scheme, etc.
const httpUrl = z.string().trim().min(1).max(2048)
  .regex(/^https?:\/\//i, "Target URL must start with http:// or https://");

// Create a connection. Secrets are validated for shape here; encryption + the
// "secret required unless authType is none" rule stay in the service.
export const createIntegrationSchema = z.object({
  name: z.string().trim().min(1, "A name is required").max(120),
  baseUrl: httpUrl,
  kind: z.enum(KINDS).optional(),
  authType: z.enum(AUTH_TYPES).optional(),
  authHeader: z.string().max(120).optional(),
  secret: z.string().min(1).max(4096).optional(),
});

// Update: every field optional; only the ones present are applied.
export const updateIntegrationSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  baseUrl: httpUrl.optional(),
  kind: z.enum(KINDS).optional(),
  authType: z.enum(AUTH_TYPES).optional(),
  authHeader: z.string().max(120).optional(),
  status: z.enum(["active", "disabled"]).optional(),
  secret: z.string().min(1).max(4096).optional(),
});
