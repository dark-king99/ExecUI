import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody, CardHeader, Stat } from "../../components/ui/Card";
import { BarChart3, TrendingUp, Users, Target } from "lucide-react";

const conversionData = [
  { stage: "Leads",       count: 284, pct: 100 },
  { stage: "Qualified",   count: 108, pct: 38 },
  { stage: "Demo",        count: 54,  pct: 19 },
  { stage: "Proposal",    count: 32,  pct: 11 },
  { stage: "Negotiation", count: 20,  pct: 7 },
  { stage: "Won",         count: 11,  pct: 4 },
];

const velocity = [
  { stage: "Lead → Qualified",   avg: "2.4d",  change: -8 },
  { stage: "Qualified → Demo",   avg: "5.1d",  change: 3 },
  { stage: "Demo → Proposal",    avg: "8.2d",  change: -12 },
  { stage: "Proposal → Close",   avg: "14.6d", change: 5 },
];

const winLoss = [
  { reason: "Pricing",           win: 22, loss: 38 },
  { reason: "Feature gap",       win: 8,  loss: 24 },
  { reason: "Competitive loss",  win: 5,  loss: 18 },
  { reason: "Timing",            win: 12, loss: 14 },
  { reason: "Champions",         win: 31, loss: 6 },
];

export default function CRMAnalytics() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="CRM Analytics"
        subtitle="Pipeline velocity, conversion funnel, win/loss analysis and revenue trends"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Pipeline Velocity" value="$48k/d"  icon={TrendingUp} color="indigo" delta={11} />
        <Stat label="Conversion Rate"   value="3.9%"    icon={Target}    color="emerald" delta={-2} />
        <Stat label="Avg Sales Cycle"   value="30.3d"   icon={BarChart3} color="sky" />
        <Stat label="Win Rate"          value="44%"     icon={Users}     color="amber" delta={6} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Funnel */}
        <Card>
          <CardHeader title="Conversion Funnel" icon={Target} />
          <CardBody className="space-y-3">
            {conversionData.map((s, i) => (
              <div key={s.stage} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-700 dark:text-slate-300">{s.stage}</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{s.count} <span className="font-normal text-slate-400 text-xs">({s.pct}%)</span></span>
                </div>
                <div className="h-6 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full flex items-center px-3 transition-all"
                    style={{ width: `${s.pct}%` }}
                  >
                    {s.pct > 15 && <span className="text-xs font-semibold text-white">{s.pct}%</span>}
                  </div>
                </div>
              </div>
            ))}
          </CardBody>
        </Card>

        {/* Pipeline Velocity */}
        <Card>
          <CardHeader title="Stage Velocity" icon={TrendingUp} />
          <CardBody className="space-y-3">
            {velocity.map(v => (
              <div key={v.stage} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                <p className="text-sm text-slate-700 dark:text-slate-300">{v.stage}</p>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-slate-900 dark:text-white text-sm">{v.avg}</span>
                  <span className={`text-xs font-medium ${v.change < 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                    {v.change < 0 ? `${v.change}%` : `+${v.change}%`}
                  </span>
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>

      {/* Win/Loss */}
      <Card>
        <CardHeader title="Win / Loss Reasons" icon={BarChart3} />
        <CardBody className="space-y-3">
          {winLoss.map(w => {
            const total = w.win + w.loss;
            const winPct = Math.round((w.win / total) * 100);
            return (
              <div key={w.reason} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-700 dark:text-slate-300">{w.reason}</span>
                  <div className="flex gap-3 text-xs">
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">W:{w.win}</span>
                    <span className="text-red-500 font-semibold">L:{w.loss}</span>
                  </div>
                </div>
                <div className="h-3 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex">
                  <div className="h-full bg-emerald-500 rounded-l-full" style={{ width: `${winPct}%` }} />
                  <div className="h-full bg-red-400 rounded-r-full" style={{ width: `${100 - winPct}%` }} />
                </div>
              </div>
            );
          })}
        </CardBody>
      </Card>
    </div>
  );
}
