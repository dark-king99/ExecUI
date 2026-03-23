export default function CRMInsight({ role }) {
    const safeRole = role ?? "employee";
  
    // ---- MOCK UNIFIED CUSTOMER DATA (SAFE, STATIC) ----
    const customers = [
      {
        id: 1,
        name: "Alice Johnson",
        interactions: 14,
        lastContactDays: 2,
        segment: "High Value",
      },
      {
        id: 2,
        name: "Bob Smith",
        interactions: 3,
        lastContactDays: 21,
        segment: "Standard",
      },
      {
        id: 3,
        name: "Charlie Davis",
        interactions: 7,
        lastContactDays: 9,
        segment: "Growth",
      },
    ];
  
    // ---- AI DERIVATION HELPERS (PURE, SAFE) ----
    const getEngagementLabel = (score) => {
      if (score >= 10) return "High";
      if (score >= 5) return "Medium";
      return "Low";
    };
  
    const getRiskStatus = (days) => {
      if (days > 14) return "At Risk";
      return "Healthy";
    };
  
    const getNextAction = (customer) => {
      if (customer.lastContactDays > 14) {
        return "Reach out with a follow-up message";
      }
      if (customer.interactions > 10) {
        return "Offer premium or upsell services";
      }
      return "Maintain regular engagement";
    };
  
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
        <div>
          <h3 className="font-semibold  text-slate-900 dark:text-white">
            AI Customer Insights
          </h3>
          <p className="text-sm text-slate-500">
            Per-customer intelligence powered by unified CRM data
          </p>
        </div>
  
        {/* CUSTOMER AI CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4">
          {customers.map((customer) => {
            const engagementLabel = getEngagementLabel(customer.interactions);
            const riskStatus = getRiskStatus(customer.lastContactDays);
            const nextAction = getNextAction(customer);
  
            return (
              <div
                key={customer.id}
                className="rounded-xl border bg-white dark:bg-slate-900 p-4 space-y-3"
              >
                {/* Header */}
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">
                      {customer.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      Segment: {customer.segment}
                    </p>
                  </div>
  
                  <span
                    className={`text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700 animate-pulse"
                        ${
                      riskStatus === "At Risk"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {riskStatus}
                  </span>
                </div>
  
                {/* Engagement */}
                <div className="text-sm text-slate-600">
                  Engagement:{" "}
                  <strong>{engagementLabel}</strong> ({customer.interactions} interactions)
                </div>
  
                {/* Last contact */}
                <div className="text-sm text-slate-600">
                  Last contact:{" "}
                  <strong>{customer.lastContactDays} days ago</strong>
                </div>
  
                {/* AI Recommendation */}
                <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 text-sm">
                  <p className="font-medium  text-slate-900 dark:text-white">
                    AI Recommendation
                  </p>
                  <p className="text-slate-600 mt-1">
                    {nextAction}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
  
        {/* Footer (debug-safe) */}
        <p className="text-xs text-slate-400">
          AI insights generated for role: {safeRole}
        </p>
      </div>
    );
  }
  