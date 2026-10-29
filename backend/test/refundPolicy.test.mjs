import assert from "node:assert/strict";
import test from "node:test";
import { isRefundWindowOpen, refundDeadlineFrom, REFUND_WINDOW_DAYS } from "../src/modules/account/refunds.policy.js";

test("refund window opens for 30 days after the captured first payment", () => {
  const paidAt = new Date("2026-10-01T10:00:00.000Z");
  assert.equal(REFUND_WINDOW_DAYS, 30);
  assert.equal(refundDeadlineFrom(paidAt).toISOString(), "2026-10-31T10:00:00.000Z");
  assert.equal(isRefundWindowOpen(paidAt, new Date("2026-10-31T10:00:00.000Z")), true);
  assert.equal(isRefundWindowOpen(paidAt, new Date("2026-10-31T10:00:00.001Z")), false);
});

test("refund window does not start during a free trial or without a valid payment date", () => {
  assert.equal(refundDeadlineFrom(null), null);
  assert.equal(refundDeadlineFrom("not-a-date"), null);
  assert.equal(isRefundWindowOpen(null), false);
});
