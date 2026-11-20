import { randomUUID } from "crypto";

const MAX_CODE_CHARS = 16_000;
const MAX_INPUT_BYTES = 64_000;
const MAX_OUTPUT_BYTES = 64_000;
const TIMEOUT_MS = 8_000;

function configuration() {
  const endpoint = process.env.PYTHON_SANDBOX_URL?.trim();
  const token = process.env.PYTHON_SANDBOX_TOKEN?.trim();
  if (!endpoint || !token) return null;

  let url;
  try {
    url = new URL(endpoint);
  } catch {
    throw new Error("PYTHON_SANDBOX_URL must be an absolute URL.");
  }
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:") {
    throw new Error("PYTHON_SANDBOX_URL must use HTTPS in production.");
  }
  return { endpoint: url.toString().replace(/\/$/, ""), token };
}

export function pythonSandboxStatus() {
  return configuration() ? "configured" : "not_configured";
}

export async function executePython({ code, inputs = {} }) {
  const configured = configuration();
  if (!configured) {
    const error = new Error("Python execution requires a configured isolated sandbox service.");
    error.status = 503;
    throw error;
  }
  if (typeof code !== "string" || !code.trim() || code.length > MAX_CODE_CHARS) {
    const error = new Error(`Python code must contain 1-${MAX_CODE_CHARS} characters.`);
    error.status = 400;
    throw error;
  }
  if (!inputs || typeof inputs !== "object" || Array.isArray(inputs)) {
    const error = new Error("Python inputs must be a JSON object.");
    error.status = 400;
    throw error;
  }
  const body = JSON.stringify({ code, inputs, request_id: randomUUID() });
  if (Buffer.byteLength(body) > MAX_INPUT_BYTES) {
    const error = new Error("Python inputs exceed the 64 KB limit.");
    error.status = 413;
    throw error;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${configured.endpoint}/v1/execute`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${configured.token}`,
      },
      body,
    });
    if (!response.ok) {
      throw new Error(`Isolated Python service returned HTTP ${response.status}.`);
    }
    const responseBody = await response.text();
    if (Buffer.byteLength(responseBody) > MAX_OUTPUT_BYTES) {
      throw new Error("Isolated Python service output exceeded the 64 KB limit.");
    }
    let result;
    try {
      result = JSON.parse(responseBody);
    } catch {
      throw new Error("Isolated Python service returned invalid JSON.");
    }
    if (!result || typeof result !== "object" || !Object.hasOwn(result, "output")) {
      throw new Error("Isolated Python service returned an invalid result.");
    }
    const output = JSON.stringify(result.output);
    if (Buffer.byteLength(output || "") > 32_000) {
      throw new Error("Isolated Python output exceeded the 32 KB limit.");
    }
    return {
      output: result.output,
      logs: Array.isArray(result.logs) ? result.logs.slice(0, 20).map((line) => String(line).slice(0, 500)) : [],
    };
  } finally {
    clearTimeout(timeout);
  }
}
