import { useState } from "react";
import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody, CardHeader, Stat } from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import { useToast } from "../../components/ui/Toast";
import { CreditCard, DollarSign, Calendar, Download, AlertCircle, Check, Zap, ExternalLink, RefreshCw } from "lucide-react";
import { useApi, useMutation } from "../../hooks/useApi";
import { account } from "../../services/api";

const PLAN_COLORS = {
  starter:    { ring: "ring-slate-300 dark:ring-slate-700",   badge: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300" },
  growth:     { ring: "ring-indigo-400 dark:ring-indigo-500", badge: "bg-indigo-600 text-white" },
  enterprise: { ring: "ring-slate-300 dark:ring-slate-700",   badge: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300" },
};

function PlanCard({ plan, currentPlanId, onUpgrade, loading }) {
  const isCurrent = plan.id === currentPlanId;
  const color     = PLAN_COLORS[plan.id] ?? PLAN_COLORS.starter;

  return (
    <div className={`relative flex flex-col rounded-2xl border-2 p-5 transition ${
      plan.highlighted
        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
        : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
    }`}>
      {plan.highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-indigo-600 text-white text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1">
            <Zap size={11} /> Most Popular
          </span>
        </div>
      )}

      <div className="mb-4">
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${color.badge}`}>{plan.name}</span>
        <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">{plan.monthlyCost}<span className="text-sm font-normal text-slate-500">/mo</span></p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">or {plan.yearlyCost}/yr — save 2 months</p>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">{plan.description}</p>
      </div>

      <ul className="space-y-1.5 flex-1 mb-5">
        {plan.features?.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
            <Check size={14} className="text-emerald-500 shrink-0 mt-0.5" /> {f}
          </li>
        ))}
      </ul>

      <button
        onClick={() => !isCurrent && onUpgrade(plan.id)}
        disabled={isCurrent || loading}
        className={`w-full py-2 rounded-lg text-sm font-medium transition ${
          isCurrent
            ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 cursor-default"
            : plan.highlighted
            ? "bg-indigo-600 hover:bg-indigo-700 text-white"
            : "border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400"
        }`}
      >
        {isCurrent ? "Current Plan" : loading ? "Updating…" : plan.highlighted ? "Upgrade Now" : "Select Plan"}
      </button>
    </div>
  );
}

export default function Billing() {
  const toast = useToast();
  const [showPlans, setShowPlans] = useState(false);

  const { data: billingData, loading: billingLoading, error: billingError, refetch: refetchBilling } = useApi(
    () => account.billing.get(), [], { pollingInterval: 120000 }
  );
  const billing = billingData ?? null;

  const { data: invoicesData, loading: invoicesLoading, error: invoicesError } = useApi(
    () => account.billing.invoices(), [], { pollingInterval: 120000 }
  );
  const invoices = invoicesData ?? [];

  const { data: plansData } = useApi(() => account.billing.plans(), []);
  const plans = plansData ?? [];

  const { data: pmData } = useApi(() => account.billing.paymentMethods(), []);
  const paymentMethods = pmData ?? [];

  const upgradeMut = useMutation((planId) => account.billing.upgrade({ planId }), {
    onSuccess: (data) => {
      toast({ message: `Plan updated to ${data.plan ?? "new plan"}`, type: "success" });
      setShowPlans(false);
      refetchBilling();
    },
    onError: (e) => toast({ message: e.message, type: "error" }),
  });

  const portalMut = useMutation(() => account.billing.portal({}), {
    onSuccess: (data) => {
      if (data.url) {
        window.open(data.url, "_blank");
      } else {
        toast({ message: "Stripe Customer Portal requires a live API key", type: "info" });
      }
    },
    onError: (e) => toast({ message: e.message, type: "error" }),
  });

  const plan    = billing?.plan ?? {};
  const payment = billing?.paymentMethod ?? paymentMethods?.[0] ?? {};

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing"
        subtitle="Manage your subscription, payment method and invoices"
        icon={CreditCard}
        iconColor="indigo"
        actions={
          <button
            onClick={() => portalMut.mutate()}
            disabled={portalMut.loading}
            className="flex items-center gap-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm px-4 py-2 rounded-lg hover:border-indigo-400 transition"
          >
            <ExternalLink size={14} />
            {portalMut.loading ? "Opening…" : "Customer Portal"}
          </button>
        }
      />

      {billingError && (
        <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
          <AlertCircle size={16} /> {billingError}
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <Stat label="Current Plan"  value={billingLoading ? "…" : (plan.name ?? "—")}         color="indigo" />
        <Stat label="Monthly Cost"  value={billingLoading ? "…" : (plan.monthlyCost ?? "—")}  color="sky" />
        <Stat label="Next Renewal"  value={billingLoading ? "…" : (billing?.nextRenewal ?? "—")} color="emerald" />
      </div>

      {/* Subscription card */}
      <Card>
        <CardHeader title="Subscription" />
        <CardBody>
          {billingLoading ? (
            <div className="animate-pulse space-y-2">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
              <div className="h-3 bg-slate-100 dark:bg-slate-700/60 rounded w-1/2" />
            </div>
          ) : plan.name ? (
            <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20 mb-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-bold text-indigo-700 dark:text-indigo-300">{plan.name}</p>
                    <StatusBadge variant={billing?.status === "active" ? "success" : "warning"} label={billing?.status ?? "active"} dot />
                  </div>
                  {plan.features?.length > 0 && (
                    <ul className="mt-2 space-y-1 text-xs text-indigo-600 dark:text-indigo-400">
                      {plan.features.slice(0, 4).map((f) => (
                        <li key={f} className="flex items-center gap-1.5">
                          <Check size={10} className="text-indigo-500" /> {f}
                        </li>
                      ))}
                      {plan.features.length > 4 && (
                        <li className="text-indigo-400">+{plan.features.length - 4} more features</li>
                      )}
                    </ul>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">{plan.monthlyCost}</p>
                  <p className="text-xs text-indigo-500">/{plan.interval ?? "month"}</p>
                  {billing?.nextRenewal && (
                    <p className="text-xs text-indigo-400 mt-1">Renews {billing.nextRenewal}</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500 py-4">No active subscription found.</p>
          )}
          <button
            onClick={() => setShowPlans((s) => !s)}
            className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            {showPlans ? "Hide plans ↑" : "Compare plans →"}
          </button>
        </CardBody>
      </Card>

      {/* Plans grid */}
      {showPlans && plans.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Available Plans</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {plans.map((p) => (
              <PlanCard
                key={p.id}
                plan={p}
                currentPlanId={plan.id}
                onUpgrade={(id) => upgradeMut.mutate(id)}
                loading={upgradeMut.loading}
              />
            ))}
          </div>
        </div>
      )}

      {/* Payment methods */}
      <Card>
        <CardHeader title="Payment Method" />
        <CardBody>
          {billingLoading ? (
            <div className="animate-pulse h-14 bg-slate-100 dark:bg-slate-700 rounded-xl" />
          ) : payment.last4 ? (
            <div className="space-y-2">
              {paymentMethods.length > 0 ? paymentMethods.map((pm) => (
                <div key={pm.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-12 rounded bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-500 uppercase">
                      {pm.brand?.slice(0, 4) ?? "CARD"}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">•••• •••• •••• {pm.last4}</p>
                      {pm.expiry && <p className="text-xs text-slate-400">Expires {pm.expiry}</p>}
                    </div>
                  </div>
                  {pm.isDefault && <StatusBadge label="Default" variant="success" dot />}
                </div>
              )) : (
                <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-12 rounded bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-500 uppercase">
                      {payment.brand?.slice(0, 4) ?? "CARD"}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">•••• •••• •••• {payment.last4}</p>
                      {payment.expiry && <p className="text-xs text-slate-400">Expires {payment.expiry}</p>}
                    </div>
                  </div>
                  <StatusBadge label="Default" variant="success" dot />
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No payment method on file.</p>
          )}
          <button
            onClick={() => portalMut.mutate()}
            className="mt-3 text-sm text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
          >
            <RefreshCw size={12} /> Update payment method →
          </button>
        </CardBody>
      </Card>

      {/* Invoices */}
      <Card>
        <CardHeader title="Invoices" />
        <CardBody className="space-y-2">
          {invoicesError && (
            <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
              <AlertCircle size={16} /> {invoicesError}
            </div>
          )}

          {invoicesLoading && invoices.length === 0 && (
            <div className="space-y-2 animate-pulse">
              {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-slate-100 dark:bg-slate-700 rounded-xl" />)}
            </div>
          )}

          {!invoicesLoading && !invoicesError && invoices.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-4">No invoices found.</p>
          )}

          {invoices.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">{inv.id}</p>
                <p className="text-xs text-slate-400">{inv.date}{inv.plan ? ` · ${inv.plan}` : ""}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-sm text-slate-900 dark:text-white">{inv.amount}</span>
                <StatusBadge label={inv.status} variant={inv.status === "paid" ? "success" : inv.status === "open" ? "warning" : "neutral"} dot />
                <button
                  onClick={() => {
                    if (inv.hostedUrl) window.open(inv.hostedUrl, "_blank");
                    else if (inv.pdfUrl) window.open(inv.pdfUrl, "_blank");
                    else toast({ message: `Invoice ${inv.id} — PDF available once connected to Stripe`, type: "info" });
                  }}
                  title="Download / View invoice"
                  className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
                >
                  <Download size={14} />
                </button>
              </div>
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}
