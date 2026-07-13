/**
 * assistText — the one helper every AI feature calls.
 *
 * Flow (cost-safe):
 *   1. No live provider  → return the deterministic fallback (free, unmetered).
 *   2. Consume 1 quota unit for the tenant (throws 429 when the plan's monthly
 *      allowance is spent — that error propagates to the client).
 *   3. Call the model; on any provider error, return the fallback so the feature
 *      still works. (We already consumed a unit, but the request succeeded from
 *      the user's view — acceptable, and provider errors are rare.)
 *
 * Callers pass a SHORT pre-computed `context`/`user` string — never raw rows —
 * which keeps input tokens (and cost) low.
 */
import { aiConfigured, complete } from "./ai.js";
import { consume } from "./aiQuota.js";

export async function assistText({ tenantId, system, user, history = [], maxTokens, fallback }) {
  const fb = () => (typeof fallback === "function" ? fallback() : fallback);
  if (!aiConfigured()) return fb();

  await consume(tenantId); // throws QuotaError (429) if over the plan allowance

  try {
    return await complete({ system, user, history, maxTokens });
  } catch {
    return fb();
  }
}
