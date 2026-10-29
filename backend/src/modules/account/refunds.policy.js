export const REFUND_WINDOW_DAYS = 30;

export function refundDeadlineFrom(firstPaidAt) {
  if (!firstPaidAt) return null;
  const paidAt = new Date(firstPaidAt);
  if (Number.isNaN(paidAt.getTime())) return null;
  return new Date(paidAt.getTime() + REFUND_WINDOW_DAYS * 24 * 60 * 60 * 1000);
}

export function isRefundWindowOpen(firstPaidAt, now = new Date()) {
  const deadline = refundDeadlineFrom(firstPaidAt);
  return !!deadline && now <= deadline;
}
