import test from "node:test";
import assert from "node:assert/strict";
import { executePython, pythonSandboxStatus } from "../src/lib/pythonSandbox.js";

test("Python execution reports the isolated runner as unavailable until configured", async () => {
  const previousUrl = process.env.PYTHON_SANDBOX_URL;
  const previousToken = process.env.PYTHON_SANDBOX_TOKEN;
  delete process.env.PYTHON_SANDBOX_URL;
  delete process.env.PYTHON_SANDBOX_TOKEN;

  try {
    assert.equal(pythonSandboxStatus(), "not_configured");
    await assert.rejects(executePython({ code: "print(1)", inputs: {} }), { status: 503 });
  } finally {
    if (previousUrl === undefined) delete process.env.PYTHON_SANDBOX_URL;
    else process.env.PYTHON_SANDBOX_URL = previousUrl;
    if (previousToken === undefined) delete process.env.PYTHON_SANDBOX_TOKEN;
    else process.env.PYTHON_SANDBOX_TOKEN = previousToken;
  }
});

test("Python runner rejects invalid code and input without making a network request", async () => {
  const previousUrl = process.env.PYTHON_SANDBOX_URL;
  const previousToken = process.env.PYTHON_SANDBOX_TOKEN;
  process.env.PYTHON_SANDBOX_URL = "https://sandbox.example.invalid";
  process.env.PYTHON_SANDBOX_TOKEN = "test-token";

  try {
    assert.equal(pythonSandboxStatus(), "configured");
    await assert.rejects(executePython({ code: "", inputs: {} }), { status: 400 });
    await assert.rejects(executePython({ code: "print(1)", inputs: [] }), { status: 400 });
    await assert.rejects(executePython({ code: "x".repeat(16_001), inputs: {} }), { status: 400 });
  } finally {
    if (previousUrl === undefined) delete process.env.PYTHON_SANDBOX_URL;
    else process.env.PYTHON_SANDBOX_URL = previousUrl;
    if (previousToken === undefined) delete process.env.PYTHON_SANDBOX_TOKEN;
    else process.env.PYTHON_SANDBOX_TOKEN = previousToken;
  }
});
