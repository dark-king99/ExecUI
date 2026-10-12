import test from "node:test";
import assert from "node:assert/strict";
import {
  isPaddleWebhookIpAllowed,
  parsePaddleIpv4Cidrs,
  paddleWebhookIpAllowlist,
} from "../src/modules/billing/paddle-webhook-ips.js";

test("Paddle live IP list accepts only valid IPv4 /32 entries", () => {
  const addresses = parsePaddleIpv4Cidrs({
    data: {
      ipv4_cidrs: [
        "34.237.3.244/32",
        "35.155.119.135/32",
        "192.0.2.0/24",
        "not-an-ip/32",
        "2001:db8::1/32",
        null,
      ],
    },
  });
  assert.deepEqual([...addresses], ["34.237.3.244", "35.155.119.135"]);
});

test("Paddle IP list fails closed for a missing or empty address list", () => {
  assert.throws(() => parsePaddleIpv4Cidrs({ data: {} }), /ipv4_cidrs/);
  assert.throws(() => parsePaddleIpv4Cidrs({ data: { ipv4_cidrs: ["192.0.2.0/24"] } }), /no valid IPv4/);
});

test("production allowlist fetches Paddle's endpoint and gates webhook requests", async () => {
  const originalFetch = globalThis.fetch;
  const originalEnvironment = process.env.PADDLE_ENV;
  const requested = [];
  globalThis.fetch = async (url) => {
    requested.push(String(url));
    return {
      ok: true,
      json: async () => ({ data: { ipv4_cidrs: ["34.237.3.244/32"] } }),
    };
  };
  process.env.PADDLE_ENV = "production";

  try {
    assert.equal(await isPaddleWebhookIpAllowed("34.237.3.244"), true);
    assert.equal(await isPaddleWebhookIpAllowed("203.0.113.12"), false);
    assert.deepEqual(requested, ["https://api.paddle.com/ips"]);

    let allowed = false;
    await paddleWebhookIpAllowlist(
      { ip: "34.237.3.244" },
      { status: () => { throw new Error("allowed address was rejected"); } },
      () => { allowed = true; },
    );
    assert.equal(allowed, true);

    let rejectedStatus = null;
    let rejectedBody = null;
    await paddleWebhookIpAllowlist(
      { ip: "203.0.113.12" },
      {
        status(status) {
          rejectedStatus = status;
          return this;
        },
        json(body) { rejectedBody = body; },
      },
      () => { throw new Error("unlisted address was allowed"); },
    );
    assert.equal(rejectedStatus, 403);
    assert.match(rejectedBody.message, /not authorized/);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalEnvironment === undefined) delete process.env.PADDLE_ENV;
    else process.env.PADDLE_ENV = originalEnvironment;
  }
});
