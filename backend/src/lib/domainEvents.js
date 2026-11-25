/**
 * Tiny in-process domain-event bus.
 *
 * Exists to break an import cycle: the Prisma layer emits events, the workflow
 * engine (and in-process listeners like the contract register) consume them,
 * and neither side imports the other. Handlers are fire-and-forget and fully
 * isolated — a failing automation can never fail the database write that
 * triggered it.
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
