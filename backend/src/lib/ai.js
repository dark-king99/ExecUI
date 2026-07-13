/**
 * Central AI client — the ONLY place the app talks to a language model.
 *
 * Design goals (cost control first):
 *  • Provider-agnostic: any OpenAI-compatible endpoint via env. Defaults to
 *    Groq's free tier (genuinely $0, fast Llama models).
 *  • Off by default: with no AI_API_KEY set, aiConfigured() is false and every
 *    caller falls back to its deterministic template response — zero API cost.
 *  • Token-frugal: tiny system prompt, clamped input, truncated history, a hard
 *    output cap, low temperature. We never send raw DB rows — callers pass a
 *    short pre-computed context string.
 *
 * Configure with:
 *   AI_API_KEY   – provider key (enables live AI; unset ⇒ deterministic mode)
 *   AI_BASE_URL  – default https://api.groq.com/openai/v1
 *   AI_MODEL     – default llama-3.1-8b-instant (cheap/fast; free on Groq)
 *   AI_MAX_TOKENS, AI_MAX_INPUT_CHARS, AI_MAX_HISTORY – cost knobs (see below)
 */
import { log } from "./logger.js";

const AI_KEY   = process.env.AI_API_KEY?.trim() || null;
const AI_BASE  = (process.env.AI_BASE_URL?.trim() || "https://api.groq.com/openai/v1").replace(/\/$/, "");
const AI_MODEL = process.env.AI_MODEL?.trim() || "llama-3.1-8b-instant";

// Cost knobs — deliberately small. Raise via env only if you accept the cost.
const MAX_OUTPUT_TOKENS = Number(process.env.AI_MAX_TOKENS) || 320;
const MAX_INPUT_CHARS   = Number(process.env.AI_MAX_INPUT_CHARS) || 1_200; // per message
const MAX_HISTORY_TURNS = Number(process.env.AI_MAX_HISTORY) || 4;         // last N messages
const TIMEOUT_MS        = Number(process.env.AI_TIMEOUT_MS) || 12_000;

/** Is a live AI provider configured? When false, callers use their fallback. */
export const aiConfigured = () => !!AI_KEY;

export const aiModelInfo = () => ({ configured: aiConfigured(), model: aiConfigured() ? AI_MODEL : null });

const clamp = (s, n) => {
  const str = String(s ?? "");
  return str.length > n ? str.slice(0, n) : str;
};

/**
 * Run a single chat completion. Returns the model's text.
 * Throws on any failure so callers can fall back to a deterministic response.
 * NOTE: does NOT enforce quota — callers must consume quota (aiQuota.js) first,
 * so we never bill against a request that was going to fall back anyway.
 */
export async function complete({ system, user, history = [], maxTokens } = {}) {
  if (!AI_KEY) throw new Error("AI not configured");

  // Keep only the last few turns, each clamped — the cheapest useful context.
  const trimmedHistory = (Array.isArray(history) ? history : [])
    .slice(-MAX_HISTORY_TURNS)
    .filter((m) => m && m.content)
    .map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: clamp(m.content, MAX_INPUT_CHARS),
    }));

  const messages = [];
  if (system) messages.push({ role: "system", content: clamp(system, 600) });
  messages.push(...trimmedHistory);
  messages.push({ role: "user", content: clamp(user, MAX_INPUT_CHARS) });

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  const started = Date.now();
  try {
    const resp = await fetch(`${AI_BASE}/chat/completions`, {
      method: "POST",
      signal: ctrl.signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${AI_KEY}` },
      body: JSON.stringify({
        model: AI_MODEL,
        messages,
        max_tokens: Math.min(Number(maxTokens) || MAX_OUTPUT_TOKENS, MAX_OUTPUT_TOKENS),
        temperature: 0.3,
        stream: false,
      }),
    });
    if (!resp.ok) {
      const body = await resp.text().catch(() => "");
      throw new Error(`AI provider ${resp.status}: ${body.slice(0, 200)}`);
    }
    const data = await resp.json();
    const text = data?.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error("AI returned an empty response");
    log.info("ai_complete", { model: AI_MODEL, ms: Date.now() - started, usage: data?.usage ?? null });
    return text;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Convenience wrapper: try the live model, and on ANY problem return the
 * caller's deterministic fallback string. Callers still gate with quota first.
 */
export async function completeOrFallback(opts, fallback) {
  try {
    return await complete(opts);
  } catch (err) {
    log.warn("ai_fallback", { reason: err.message });
    return typeof fallback === "function" ? fallback() : fallback;
  }
}
