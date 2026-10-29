import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ClipboardList, ExternalLink, RotateCcw, Send } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import { useToast } from "../../components/ui/Toast";
import { useApi, useMutation } from "../../hooks/useApi";
import { account } from "../../services/api";
import { useUser } from "../../context/UserContext";

const REASONS = [
  ["not_a_fit", "The service is not a fit"],
  ["missing_features", "A feature I need is missing"],
  ["billing_issue", "Billing or charge issue"],
  ["technical_issue", "Technical issue"],
  ["other", "Other"],
];

const STATUSES = [
  ["submitted", "Submitted"],
  ["under_review", "Under review"],
  ["needs_information", "Needs information"],
  ["approved", "Approved for refund"],
  ["declined", "Declined"],
  ["refunded", "Refund issued in Paddle"],
];

const STATUS_STYLE = {
  submitted: "bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
  under_review: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  needs_information: "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  approved: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  declined: "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
  refunded: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
};

function money(amount, currency) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(Number(amount));
  } catch {
    return `${amount} ${currency}`;
  }
}

function dateTime(value) {
  return value ? new Date(value).toLocaleString() : "Unavailable";
}

function RefundRequestCard({ request, onSave, saving }) {
  const [draft, setDraft] = useState({
    status: request.status,
    adminNote: request.adminNote ?? "",
    paddleRefundReference: request.paddleRefundReference ?? "",
  });

  return (
    <article className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-white">{request.tenantName || "Organization"}</h3>
          <p className="mt-1 text-xs text-slate-500">
            {request.submittedBy || "User"}{request.submittedByEmail ? ` · ${request.submittedByEmail}` : ""}
          </p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[request.status] ?? STATUS_STYLE.submitted}`}>
          {STATUSES.find(([value]) => value === request.status)?.[1] ?? request.status}
        </span>
      </div>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs text-slate-500">First paid Paddle transaction</dt>
          <dd className="mt-1 break-all font-mono text-xs text-slate-800 dark:text-slate-200">{request.transactionId}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Charge amount</dt>
          <dd className="mt-1 font-medium text-slate-800 dark:text-slate-200">{money(request.amount, request.currency)}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">First paid on</dt>
          <dd className="mt-1 text-slate-700 dark:text-slate-300">{dateTime(request.firstPaidAt)}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Request submitted</dt>
          <dd className="mt-1 text-slate-700 dark:text-slate-300">{dateTime(request.createdAt)}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Reason</dt>
          <dd className="mt-1 text-slate-700 dark:text-slate-300">{REASONS.find(([value]) => value === request.reason)?.[1] ?? request.reason}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs text-slate-500">Customer explanation</dt>
          <dd className="mt-1 whitespace-pre-wrap text-slate-700 dark:text-slate-300">{request.details}</dd>
        </div>
      </dl>

      <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 dark:border-slate-800 sm:grid-cols-2">
        <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
          Review status
          <select
            value={draft.status}
            onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value }))}
            className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          >
            {STATUSES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
          Paddle refund reference
          <input
            value={draft.paddleRefundReference}
            onChange={(event) => setDraft((current) => ({ ...current, paddleRefundReference: event.target.value }))}
            placeholder="Required after you issue the refund in Paddle"
            className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </label>
        <label className="text-xs font-medium text-slate-600 dark:text-slate-300 sm:col-span-2">
          Message to customer
          <textarea
            value={draft.adminNote}
            onChange={(event) => setDraft((current) => ({ ...current, adminNote: event.target.value }))}
            rows={2}
            maxLength={2000}
            className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </label>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <a
          href="https://vendors.paddle.com/transactions"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-700 hover:underline dark:text-teal-400"
        >
          Open Paddle transactions <ExternalLink size={12} />
        </a>
        <button
          type="button"
          onClick={() => onSave(request.id, draft)}
          disabled={saving}
          className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
        >
          {saving ? "Saving…" : "Save review"}
        </button>
      </div>
    </article>
  );
}

export default function RefundRequests() {
  const toast = useToast();
  const { user } = useUser();
  const isSystemAdmin = user?.role === "system_admin";
  const { data, loading, error } = useApi(() => account.billing.refundRequests(), []);
  const center = data ?? {};
  const requests = useMemo(() => center.requests ?? [], [center.requests]);
  const firstPaid = center.firstPaidTransaction;
  const existingRequest = useMemo(
    () => requests.find((request) => request.transactionId === firstPaid?.transactionId),
    [requests, firstPaid?.transactionId],
  );

  const submitMutation = useMutation(
    (payload) => account.billing.submitRefundRequest(payload),
    {
      onSuccess: () => toast({ message: "Refund request submitted to SUL TECH.", type: "success" }),
      onError: (submissionError) => toast({ message: submissionError.message, type: "error" }),
    },
  );
  const updateMutation = useMutation(
    ({ id, payload }) => account.billing.updateRefundRequest(id, payload),
    {
      onSuccess: () => toast({ message: "Refund review updated. Complete refunds separately in Paddle.", type: "success" }),
      onError: (updateError) => toast({ message: updateError.message, type: "error" }),
    },
  );

  const [reason, setReason] = useState("not_a_fit");
  const [details, setDetails] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    await submitMutation.mutate({ reason, details });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Refund requests"
        subtitle="Requests are reviewed by SUL TECH. A status update does not itself issue a payment refund."
        icon={RotateCcw}
        iconColor="teal"
        actions={<Link to="/account/billing" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-white"><ArrowLeft size={14} /> Billing</Link>}
      />

      {error && <p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300" role="alert">{error}</p>}

      {!isSystemAdmin && (
        <Card>
          <CardHeader
            title="Request a refund"
            subtitle="The one-month request window starts after your first successful paid charge, not during the free trial."
          />
          <CardBody>
            {center.provider !== "paddle" ? (
              <p className="text-sm text-slate-600 dark:text-slate-300">
                This request form is currently available for Paddle subscriptions. Contact SUL TECH through your organization support channel for other billing methods.
              </p>
            ) : !center.providerConfigured ? (
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Paddle billing is not configured for this environment. Contact SUL TECH support for help with your request.
              </p>
            ) : !firstPaid ? (
              <p className="text-sm text-slate-600 dark:text-slate-300">
                No captured paid subscription charge was found yet. The refund period begins only after the trial ends and Paddle successfully captures your first subscription payment.
              </p>
            ) : (
              <>
                <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-700 dark:bg-slate-800/60">
                  <p><span className="font-medium">First paid charge:</span> {money(firstPaid.amount, firstPaid.currency)} on {dateTime(firstPaid.paidAt)}</p>
                  <p className="mt-1"><span className="font-medium">Transaction:</span> <span className="break-all font-mono text-xs">{firstPaid.transactionId}</span></p>
                  <p className="mt-1"><span className="font-medium">Request deadline:</span> {dateTime(center.refundDeadlineAt)}</p>
                  <p className="mt-2 text-xs text-slate-500">Requests must be submitted within 30 days of this first paid charge. Later renewal charges are not covered by this initial-subscription refund window.</p>
                </div>
                {existingRequest ? (
                  <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-800 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-200">
                    A request for this first paid charge is already {existingRequest.status.replaceAll("_", " ")}. SUL TECH's latest note: {existingRequest.adminNote || "No update yet."}
                  </div>
                ) : !center.refundEligible ? (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                    The 30-day refund request window for this charge has ended.
                  </p>
                ) : (
                  <form onSubmit={submit} className="space-y-4">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                      Reason for your request
                      <select
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                        className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
                      >
                        {REASONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </label>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                      Explain your request
                      <textarea
                        value={details}
                        onChange={(event) => setDetails(event.target.value)}
                        minLength={20}
                        maxLength={2000}
                        required
                        rows={5}
                        placeholder="Please describe why you are requesting a refund. Do not include card numbers or payment credentials."
                        className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
                      />
                      <span className="mt-1 block text-xs font-normal text-slate-500">20–2,000 characters. Never submit card or bank details.</span>
                    </label>
                    <button
                      type="submit"
                      disabled={submitMutation.loading || details.trim().length < 20}
                      className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-600 disabled:opacity-50"
                    >
                      <Send size={14} /> {submitMutation.loading ? "Submitting…" : "Submit refund request"}
                    </button>
                  </form>
                )}
              </>
            )}
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader
          title={<span className="flex items-center gap-2"><ClipboardList size={16} /> {isSystemAdmin ? "All customer requests" : "Request history"}</span>}
          subtitle={isSystemAdmin ? "Review the customer's transaction and request in Paddle, coordinate with Paddle support if needed, then record the outcome here." : "Updates from SUL TECH appear here."}
        />
        <CardBody className="space-y-4">
          {loading ? (
            <p className="text-sm text-slate-500">Loading refund requests…</p>
          ) : requests.length === 0 ? (
            <p className="text-sm text-slate-500">No refund requests have been submitted.</p>
          ) : requests.map((request) => (
            isSystemAdmin ? (
              <RefundRequestCard
                key={request.id}
                request={request}
                saving={updateMutation.loading}
                onSave={(id, payload) => updateMutation.mutate({ id, payload })}
              />
            ) : (
              <article key={request.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {money(request.amount, request.currency)} · {dateTime(request.firstPaidAt)}
                  </p>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[request.status] ?? STATUS_STYLE.submitted}`}>
                    {STATUSES.find(([value]) => value === request.status)?.[1] ?? request.status}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{request.details}</p>
                {request.adminNote && <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">{request.adminNote}</p>}
                {request.paddleRefundReference && <p className="mt-2 text-xs text-slate-500">Paddle refund reference: {request.paddleRefundReference}</p>}
              </article>
            )
          ))}
        </CardBody>
      </Card>

      {isSystemAdmin && (
        <p className="text-xs text-slate-500">
          This interface does not send refund commands to Paddle. Issue an approved refund in Paddle or coordinate it with Paddle support first; only then set the request to “Refund issued in Paddle” and enter its reference.
        </p>
      )}
    </div>
  );
}
