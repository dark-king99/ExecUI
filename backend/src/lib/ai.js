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
import { randomUUID } from "crypto";
import { capture } from "./analytics.js";
import { log } from "./logger.js";

const AI_KEY   = process.env.AI_API_KEY?.trim() || null;
const AI_BASE  = (process.env.AI_BASE_URL?.trim() || "https://api.groq.com/openai/v1").replace(/\/$/, "");
const AI_MODEL = process.env.AI_MODEL?.trim() || "llama-3.1-8b-instant";

function providerForBaseUrl(baseUrl) {
  try {
    const hostname = new URL(baseUrl).hostname;
    if (hostname.endsWith("groq.com")) return "groq";
    if (hostname.endsWith("openai.com")) return "openai";
    if (hostname.endsWith("openrouter.ai")) return "openrouter";
    if (hostname.endsWith("together.xyz")) return "together";
    if (hostname.endsWith("mistral.ai")) return "mistral";
    if (hostname.endsWith("deepseek.com")) return "deepseek";
    if (hostname.endsWith("x.ai")) return "xai";
    if (hostname === "localhost" || hostname === "127.0.0.1") return "ollama";
  } catch {
    // Let the existing request path report an invalid provider URL.
  }
  return null;
}

const AI_PROVIDER = providerForBaseUrl(AI_BASE);

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

async function captureGeneration({ traceId, messages, outputLimit, started, data, response, error }) {
  const usage = data?.usage ?? {};
  const properties = {
    $ai_trace_id: traceId,
    // No conversation identifier exists, so the process run is the session.
    $ai_session_id: `ai-process-${process.pid}`,
    $ai_model: AI_MODEL,
    $ai_input: messages,
    $ai_input_tokens: usage.prompt_tokens ?? usage.input_tokens,
    $ai_output_tokens: usage.completion_tokens ?? usage.output_tokens,
    $ai_latency: (Date.now() - started) / 1_000,
    $ai_http_status: response?.status,
    $ai_temperature: 0.3,
    $ai_max_tokens: outputLimit,
    $ai_stream: false,
  };

  if (AI_PROVIDER) properties.$ai_provider = AI_PROVIDER;
  if (data?.choices?.[0]?.message?.content) {
    properties.$ai_output_choices = [{
      role: "assistant",
      content: data.choices[0].message.content,
    }];
  }
  if (data?.choices?.[0]?.finish_reason) properties.$ai_stop_reason = data.choices[0].finish_reason;
  if (error) {
    properties.$ai_is_error = true;
    properties.$ai_error = response ? `HTTP ${response.status}` : (error.name || "AI request failed");
  }

  await capture(undefined, "$ai_generation", properties);
}

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

  const outputLimit = Math.min(Number(maxTokens) || MAX_OUTPUT_TOKENS, MAX_OUTPUT_TOKENS);
  const traceId = randomUUID();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  const started = Date.now();
  let response;
  try {
    response = await fetch(`${AI_BASE}/chat/completions`, {
      method: "POST",
      signal: ctrl.signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${AI_KEY}` },
      body: JSON.stringify({
        model: AI_MODEL,
        messages,
        max_tokens: outputLimit,
        temperature: 0.3,
        stream: false,
      }),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`AI provider ${response.status}: ${body.slice(0, 200)}`);
    }
    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error("AI returned an empty response");
    await captureGeneration({ traceId, messages, outputLimit, started, data, response });
    log.info("ai_complete", { model: AI_MODEL, ms: Date.now() - started, usage: data?.usage ?? null });
    return text;
  } catch (error) {
    await captureGeneration({ traceId, messages, outputLimit, started, response, error });
    throw error;
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
