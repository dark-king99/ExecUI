import { z } from "zod";

/**
 * validate(schema) — zod-validate req.body before the handler runs.
 * On failure: 400 with the first problem spelled out ("password: String must
 * contain at least 8 character(s)"), never a blanket 500.
 */
export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body ?? {});
    if (!result.success) {
      const first = result.error.issues[0];
      const field = first.path.join(".");
      return res.status(400).json({
        message: field ? `${field}: ${first.message}` : first.message,
        field: field || undefined,
        status: 400,
      });
    }
    req.body = result.data; // parsed + stripped of unknown keys
    next();
  };
}
