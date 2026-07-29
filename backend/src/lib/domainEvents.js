/**
 * Tiny in-process domain-event bus.
 *
 * Exists to break an import cycle: the Prisma layer emits events, the webhooks
 * module consumes them, and neither needs to import the other. Handlers are
 * fire-and-forget and fully isolated — a webhook problem can never fail the
 * database write that triggered it.
 */
const handlers = new Set();

/** Subscribe. Returns an unsubscribe function. */
export function onDomainEvent(handler) {
  handlers.add(handler);
  return () => handlers.delete(handler);
}

/** Emit to every subscriber. Never throws, never awaits. */
export function emitDomainEvent(event) {
  for (const handler of handlers) {
    try {
      const out = handler(event);
      if (out && typeof out.catch === "function") out.catch(() => {});
    } catch {
      /* a listener must never break the caller */
    }
  }
}

export const listenerCount = () => handlers.size;
