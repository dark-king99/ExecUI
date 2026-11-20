/**
 * assistText — the one helper every AI feature calls.
 *
 * Flow (cost-safe):
 *   1. No live provider  → return the deterministic fallback (free, unmetered).
 *   2. Consume 1 quota unit for the tenant (throws 429 when the plan's monthly
 *      allowance is spent — that error propagates to the client).
 *   3. Call the model; on provider error, return the deterministic fallback.
 *      Release the reservation only when the request was definitively rejected
 *      before execution; ambiguous failures remain metered.
 *
 * Callers pass a SHORT pre-computed `context`/`user` string — never raw rows —
 * which keeps input tokens (and cost) low.
 */
import { aiConfigured, complete } from "./ai.js";
import { consume, release } from "./aiQuota.js";
import { log } from "./logger.js";

export async function assistText({ tenantId, system, user, history = [], maxTokens, fallback }) {
  const fb = () => (typeof fallback === "function" ? fallback() : fallback);
  if (!aiConfigured()) return fb();

  const reservation = await consume(tenantId); // throws QuotaError (429) if over the plan allowance

  try {
    return await complete({ system, user, history, maxTokens });
  } catch (error) {
    if (error.refundable || error.code === "AI_REQUEST_BLOCKED") await release(tenantId, reservation);
    log.warn("ai_assist_fallback", {
      tenantId,
      error: String(error?.name || "provider_error").slice(0, 100),
    });
    return fb();
  }
}
