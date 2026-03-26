import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody, CardHeader, Stat } from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import { useToast } from "../../components/ui/Toast";
import { CreditCard, DollarSign, Calendar, Download, AlertCircle, Loader2 } from "lucide-react";
import { useApi } from "../../hooks/useApi";
import { account } from "../../services/api";

export default function Billing() {
  const toast = useToast();

  const { data: billing, loading: billingLoading, error: billingError } = useApi(
    () => account.billing.get(), [], { pollingInterval: 120000 }
  );
  const { data: invoices, loading: invoicesLoading, error: invoicesError } = useApi(
    () => account.billing.invoices(), [], { pollingInterval: 120000 }
  );

  const plan = billing?.plan ?? {};
  const payment = billing?.paymentMethod ?? {};

  return (
    <div className="space-y-6">
      <PageHeader title="Billing" subtitle="Manage your subscription, payment method and invoices" />

      {billingError && (
        <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
          <AlertCircle size={16} /> {billingError}
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <Stat label="Current Plan" value={billingLoading ? "…" : (plan.name ?? "—")} icon={CreditCard} color="indigo" />
        <Stat label="Monthly Cost"  value={billingLoading ? "…" : (plan.monthlyCost ?? "—")} icon={DollarSign} color="sky" />
        <Stat label="Next Renewal"  value={billingLoading ? "…" : (billing?.nextRenewal ?? "—")} icon={Calendar} color="emerald" />
      </div>

      <Card>
        <CardHeader title="Subscription" icon={CreditCard} />
        <CardBody>
          {billingLoading ? (
            <div className="animate-pulse space-y-2">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
              <div className="h-3 bg-slate-100 dark:bg-slate-700/60 rounded w-1/2" />
            </div>
          ) : plan.name ? (
            <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20 mb-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-bold text-indigo-700 dark:text-indigo-300">{plan.name}</p>
                  {plan.features?.length > 0 && (
                    <ul className="mt-2 space-y-1 text-xs text-indigo-600 dark:text-indigo-400">
                      {plan.features.map(f => (
                        <li key={f} className="flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />{f}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">{plan.monthlyCost}</p>
                  <p className="text-xs text-indigo-500">/month</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500 py-4">No active subscription found.</p>
          )}
          <button
            onClick={() => toast({ message: "Opening plan comparison…", type: "info" })}
            className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Compare plans →
          </button>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Payment Method" icon={CreditCard} />
        <CardBody>
          {billingLoading ? (
            <div className="animate-pulse h-14 bg-slate-100 dark:bg-slate-700 rounded-xl" />
          ) : payment.last4 ? (
            <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="h-8 w-12 rounded bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-500">{payment.brand?.toUpperCase() ?? "CARD"}</div>
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">•••• •••• •••• {payment.last4}</p>
                  {payment.expiry && <p className="text-xs text-slate-400">Expires {payment.expiry}</p>}
                </div>
              </div>
              <StatusBadge label="Default" variant="success" dot />
            </div>
          ) : (
            <p className="text-sm text-slate-500">No payment method on file.</p>
          )}
          <button
            onClick={() => toast({ message: "Payment method update flow opened", type: "info" })}
            className="mt-3 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Update payment method →
          </button>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Invoices" icon={Download} />
        <CardBody className="space-y-2">
          {invoicesError && (
            <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
              <AlertCircle size={16} /> {invoicesError}
            </div>
          )}

          {invoicesLoading && !invoices && (
            <div className="space-y-2 animate-pulse">
              {[1, 2, 3].map(i => <div key={i} className="h-12 bg-slate-100 dark:bg-slate-700 rounded-xl" />)}
            </div>
          )}

          {!invoicesLoading && !invoicesError && invoices?.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-4">No invoices found.</p>
          )}

          {invoices?.map(inv => (
            <div key={inv.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">{inv.id}</p>
                <p className="text-xs text-slate-400">{inv.date}{inv.plan ? ` · ${inv.plan}` : ""}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-sm text-slate-900 dark:text-white">{inv.amount}</span>
                <StatusBadge label={inv.status} variant={inv.status === "paid" ? "success" : "warning"} dot />
                <button
                  onClick={() => toast({ message: `Downloading ${inv.id}…`, type: "info" })}
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
