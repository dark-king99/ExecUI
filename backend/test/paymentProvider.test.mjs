/**
 * Paddle is the only payment provider. What matters most is the failure mode:
 * a deployment that asked for a provider must never fall through to free plans.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { providerId, billingEnabled, PROVIDERS } from "../src/modules/billing/providers/index.js";

function withEnv(env, fn) {
  const saved = { PAYMENT_PROVIDER: process.env.PAYMENT_PROVIDER, PADDLE_API_KEY: process.env.PADDLE_API_KEY };
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) delete process.env[k]; else process.env[k] = v;
  }
  try { return fn(); } finally {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k]; else process.env[k] = v;
    }
  }
}

test("only Paddle and free early access exist", () => {
  assert.deepEqual(Object.keys(PROVIDERS).sort(), ["free", "paddle"]);
});

test("nothing configured is free early access", () => {
  withEnv({ PAYMENT_PROVIDER: undefined, PADDLE_API_KEY: undefined }, () => {
    assert.equal(providerId(), "free");
    assert.equal(billingEnabled(), false);
  });
});

test("a Paddle key, or asking for Paddle, means Paddle", () => {
  withEnv({ PAYMENT_PROVIDER: undefined, PADDLE_API_KEY: "pdl_sdbx_x" }, () => assert.equal(providerId(), "paddle"));
  withEnv({ PAYMENT_PROVIDER: "paddle", PADDLE_API_KEY: undefined }, () => {
    assert.equal(providerId(), "paddle");
    assert.equal(billingEnabled(), true, "a missing key must be an error, not free plans");
  });
});

test("a retired or unknown provider never gives plans away", () => {
  for (const requested of ["manual", "flutterwave", "stripe"]) {
    withEnv({ PAYMENT_PROVIDER: requested, PADDLE_API_KEY: undefined }, () => {
      assert.equal(providerId(), "paddle", requested);
      assert.equal(billingEnabled(), true, requested);
    });
  }
});
