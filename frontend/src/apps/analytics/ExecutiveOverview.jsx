import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody, CardHeader, Stat } from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import { BarChart3, TrendingUp, Users, DollarSign, Activity, ShieldCheck } from "lucide-react";

const northStarKPIs = [
  { label: "ARR",              value: "$4.2M",  delta: 18,  icon: DollarSign,  color: "indigo" },
  { label: "Active Customers", value: "1,840",  delta: 12,  icon: Users,       color: "sky" },
  { label: "NRR",              value: "114%",   delta: 4,   icon: TrendingUp,  color: "emerald" },
  { label: "Gross Margin",     value: "72%",    delta: -1,  icon: BarChart3,   color: "amber" },
  { label: "CAC Payback",      value: "11 mo",  delta: -2,  icon: Activity,    color: "sky" },
  { label: "NPS Score",        value: "61",     delta: 8,   icon: ShieldCheck, color: "emerald" },
];

const healthSummary = [
  { area: "Revenue",      status: "healthy",  note: "Q1 on track at 89% of plan" },
  { area: "Pipeline",     status: "healthy",  note: "$3.4M pipeline, 2.1x coverage" },
  { area: "Churn",        status: "warning",  note: "2 at-risk accounts flagged" },
  { area: "Infrastructure", status: "healthy", note: "All services SLO green" },
  { area: "Compliance",   status: "warning",  note: "Firewall policy exceptions open" },
];

const statusVariant = { healthy: "success", warning: "warning", critical: "danger" };

export default function ExecutiveOverview() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Executive Overview"
        subtitle="North-star KPIs and business health snapshot"
      />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {northStarKPIs.map(kpi => (
          <Stat key={kpi.label} label={kpi.label} value={kpi.value} delta={kpi.delta} icon={kpi.icon} color={kpi.color} />
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Business Health Summary" icon={ShieldCheck} />
          <CardBody className="space-y-3">
            {healthSummary.map(h => (
              <div key={h.area} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{h.area}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{h.note}</p>
                </div>
                <StatusBadge label={h.status} variant={statusVariant[h.status]} dot />
              </div>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Revenue vs Plan (Monthly)" icon={TrendingUp} />
          <CardBody>
            <div className="space-y-3">
              {[
                { month: "Oct", actual: 310, plan: 320, pct: 97 },
                { month: "Nov", actual: 380, plan: 360, pct: 106 },
                { month: "Dec", actual: 290, plan: 310, pct: 94 },
                { month: "Jan", actual: 420, plan: 400, pct: 105 },
                { month: "Feb", actual: 490, plan: 460, pct: 107 },
                { month: "Mar", actual: 520, plan: 580, pct: 90 },
              ].map(m => (
                <div key={m.month} className="flex items-center gap-3">
                  <span className="w-8 text-xs text-slate-400">{m.month}</span>
                  <div className="flex-1 h-4 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${m.pct >= 100 ? "bg-emerald-500" : m.pct >= 90 ? "bg-amber-500" : "bg-red-400"}`}
                      style={{ width: `${(m.actual / 580) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold w-12 text-right text-slate-700 dark:text-slate-300">{m.pct}%</span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
