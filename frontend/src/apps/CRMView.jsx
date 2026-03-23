import React from "react";
import SafeSection from "../components/SafeSection";

import CRMInsight from "../apps/crm/CRMInsight";
import CustomerTimeline from "./crm/CustomerTimeline";
import CustomerAISummary from "./crm/CustomerAISummary";
import CustomerAICopilot from "./crm/CustomerAICopilot";
{/*import TeamManager from "./crm/TeamManager";*/}




import ErrorBoundary from "../components/ErrorBoundary";

export default function CRMView({ role }) {
  const effectiveRole = role ?? "employee";

  const selectedCustomer = {
    id: 2,
    name: "Bob Smith",
    interactions: 3,
    lastContactDays: 21,
  };
  

  return (
    <div className="space-y-6  bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">CRM</h1>
      <p className="text-sm text-slate-500">Role: {effectiveRole}</p>

      <SafeSection label="CRM Core">
        <div>CRM Core is alive</div>
      </SafeSection>
      <SafeSection label="Smart CRM">
        
</SafeSection>
<SafeSection label="AI CRM Insights">
  <ErrorBoundary>
    <CRMInsight role={effectiveRole} />
  </ErrorBoundary>
</SafeSection>
<SafeSection label="Customer Timeline">
  <ErrorBoundary>
    <CustomerTimeline />
    </ErrorBoundary>
</SafeSection>
<SafeSection label="AI Customer Summary">
  <ErrorBoundary>
    <CustomerAISummary />
  </ErrorBoundary>
</SafeSection>
<SafeSection label="AI Copilot">
  <ErrorBoundary>
    <CustomerAICopilot customer={selectedCustomer} />
  </ErrorBoundary>
</SafeSection>
{/*<SafeSection label="Team Management">
  <Effective>
    <TeamManager role={effectiveRole} />
  </Effective>
</SafeSection>*/}



    </div>
  );
}
