import { z } from "zod";

// Direct message: a recipient id + a non-empty body (trimmed server-side).
export const sendDmSchema = z.object({
  toUserId: z.string().min(1).max(60),
  body: z.string().trim().min(1, "Message is required").max(10_000),
});

// Department post: a body + an optional target department ("all" ⇒ everyone).
export const sendDeptSchema = z.object({
  body: z.string().trim().min(1, "Message body is required").max(10_000),
  toDept: z.string().max(40).optional(),
});
