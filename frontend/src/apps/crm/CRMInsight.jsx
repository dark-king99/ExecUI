import { AlertCircle } from "lucide-react";
import { useApi } from "../../hooks/useApi";
import { crm } from "../../services/api";

const getEngagementLabel = (score) => score >= 10 ? "High" : score >= 5 ? "Medium" : "Low";
const getRiskStatus = (days) => days > 14 ? "At Risk" : "Healthy";
const getNextAction = (c) => {
  if (c.lastContactDays > 14) return "Reach out with a follow-up message";
  if (c.interactions > 10) return "Offer premium or upsell services";
  return "Maintain regular engagement";
};

export default function CRMInsight({ role }) {
  const { data: customers, loading, error } = useApi(
    () => crm.customers.list({ limit: 12 }), [], { pollingInterval: 300000 }
  );

  const allCustomers = customers ?? [];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
      <div className="mb-4">
        <h3 className="font-semibold text-slate-900 dark:text-white">AI Customer Insights</h3>
        <p className="text-sm text-slate-500">Per-customer intelligence powered by unified CRM data</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 mb-4">
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {loading && allCustomers.length === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 animate-pulse">
          {[1,2,3].map(i => <div key={i} className="h-40 bg-slate-100 dark:bg-slate-700 rounded-xl" />)}
        </div>
      )}

      {!loading && !error && allCustomers.length === 0 && (
        <p className="text-sm text-slate-500 text-center py-8">No customer data available.</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 gap-4">
        {allCustomers.map(customer => {
          const engagementLabel = getEngagementLabel(customer.interactions ?? 0);
          const riskStatus = getRiskStatus(customer.lastContactDays ?? 0);
          const nextAction = getNextAction(customer);

          return (
            <div key={customer.id} className="rounded-xl border bg-white dark:bg-slate-900 p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">{customer.name}</p>
                  <p className="text-xs text-slate-500">Segment: {customer.segment ?? "—"}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${riskStatus === "At Risk" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
                  {riskStatus}
                </span>
              </div>

              <div className="text-sm text-slate-600 dark:text-slate-400">
                Engagement: <strong>{engagementLabel}</strong> ({customer.interactions ?? 0} interactions)
              </div>

              <div className="text-sm text-slate-600 dark:text-slate-400">
                Last contact: <strong>{customer.lastContactDays ?? "—"} days ago</strong>
              </div>

              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 text-sm">
                <p className="font-medium text-slate-900 dark:text-white">AI Recommendation</p>
                <p className="text-slate-600 dark:text-slate-400 mt-1">{nextAction}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
