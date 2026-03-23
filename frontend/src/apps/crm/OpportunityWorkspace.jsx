import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody, CardHeader, Stat } from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import { Target, TrendingUp, DollarSign, Users, Plus } from "lucide-react";

const stages = [
  { label: "Prospecting", count: 14, value: "$420k",  color: "bg-slate-300 dark:bg-slate-600" },
  { label: "Qualified",   count: 9,  value: "$810k",  color: "bg-sky-400" },
  { label: "Proposal",    count: 6,  value: "$1.2M",  color: "bg-indigo-500" },
  { label: "Negotiation", count: 4,  value: "$960k",  color: "bg-violet-500" },
  { label: "Closed Won",  count: 11, value: "$2.1M",  color: "bg-emerald-500" },
];

const opportunities = [
  { name: "Solstice – Platform Expansion",  stage: "Negotiation",  value: "$240k", risk: "low",    owner: "J. Torres",  close: "Mar 30" },
  { name: "Atlas Retail – CRM Bundle",      stage: "Proposal",     value: "$180k", risk: "medium", owner: "M. Patel",   close: "Apr 15" },
  { name: "Meridian – Network Suite",       stage: "Qualified",    value: "$320k", risk: "high",   owner: "S. Lee",     close: "May 01" },
  { name: "NordVentures – AI Copilot",      stage: "Negotiation",  value: "$95k",  risk: "low",    owner: "J. Torres",  close: "Mar 28" },
  { name: "CapitalGroup – Data Platform",   stage: "Prospecting",  value: "$520k", risk: "high",   owner: "A. Kim",     close: "Jun 30" },
];

const riskVariant = { low: "success", medium: "warning", high: "danger" };
const stageVariant = { "Prospecting": "neutral", "Qualified": "info", "Proposal": "indigo", "Negotiation": "warning", "Closed Won": "success" };

export default function OpportunityWorkspace() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Opportunities"
        subtitle="Stage progression, risk scoring, next-best-action and stakeholder map"
        actions={
          <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg transition">
            <Plus size={15} /> New Opportunity
          </button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Open Opps"     value="33"    icon={Target}    color="indigo" />
        <Stat label="Pipeline Value" value="$3.4M" icon={DollarSign} color="sky" />
        <Stat label="Avg Deal Size"  value="$103k" icon={TrendingUp} color="emerald" delta={12} />
        <Stat label="Win Rate (90d)" value="44%"   icon={Users}     color="amber" />
      </div>

      {/* Pipeline funnel */}
      <Card>
        <CardHeader title="Pipeline Funnel" icon={Target} />
        <CardBody>
          <div className="space-y-3">
            {stages.map((s, i) => (
              <div key={s.label} className="flex items-center gap-4">
                <div className="w-28 text-sm text-slate-700 dark:text-slate-300 shrink-0">{s.label}</div>
                <div className="flex-1 h-7 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${s.color} flex items-center px-3`}
                    style={{ width: `${Math.max(15, 100 - i * 18)}%` }}
                  >
                    <span className="text-xs font-semibold text-white">{s.count} deals</span>
                  </div>
                </div>
                <div className="w-16 text-sm font-semibold text-slate-700 dark:text-slate-300 text-right">{s.value}</div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Opportunity list */}
      <Card>
        <CardHeader title="Active Opportunities" icon={DollarSign} />
        <CardBody>
          <div className="space-y-3">
            {opportunities.map(opp => (
              <div key={opp.name} className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 transition">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{opp.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <StatusBadge label={opp.stage} variant={stageVariant[opp.stage]} />
                    <span className="text-xs text-slate-400">Close: {opp.close}</span>
                    <span className="text-xs text-slate-400">Owner: {opp.owner}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge label={`${opp.risk} risk`} variant={riskVariant[opp.risk]} dot />
                  <span className="text-sm font-bold text-slate-900 dark:text-white">{opp.value}</span>
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
