/**
 * Typed API errors — throw these from services/controllers and the central
 * error middleware (and each module's `handle` wrapper) maps them to the right
 * HTTP status instead of a blanket 500.
 */
export class ApiError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.status = status;
  }
}

export class ValidationError extends ApiError {
  constructor(message = "Invalid request") { super(message, 400); }
}
export class UnauthorizedError extends ApiError {
  constructor(message = "Unauthorized") { super(message, 401); }
}
export class ForbiddenError extends ApiError {
  constructor(message = "Forbidden") { super(message, 403); }
}
export class NotFoundError extends ApiError {
  constructor(message = "Not found") { super(message, 404); }
}
export class ConflictError extends ApiError {
  constructor(message = "Conflict") { super(message, 409); }
}

/** Best-effort status for an arbitrary thrown error (Prisma codes included). */
export function statusOf(err) {
  if (typeof err?.status === "number") return err.status;
  if (typeof err?.statusCode === "number") return err.statusCode;
  switch (err?.code) {
    case "P2025": return 404; // record not found
    case "P2002": return 409; // unique constraint violation
    case "P2003": return 409; // foreign key constraint violation
    default: return 500;
  }
}
