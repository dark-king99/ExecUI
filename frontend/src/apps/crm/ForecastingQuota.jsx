import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody, CardHeader, Stat } from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import { TrendingUp, DollarSign, Users, Target } from "lucide-react";

const reps = [
  { name: "J. Torres",  quota: "$600k", commit: "$510k", bestCase: "$620k", attainment: 85, status: "on-track" },
  { name: "M. Patel",   quota: "$500k", commit: "$380k", bestCase: "$490k", attainment: 76, status: "at-risk" },
  { name: "S. Lee",     quota: "$400k", commit: "$410k", bestCase: "$430k", attainment: 102,status: "exceeded" },
  { name: "A. Kim",     quota: "$350k", commit: "$210k", bestCase: "$300k", attainment: 60, status: "behind" },
];

const statusVariant = { "on-track": "success", "at-risk": "warning", exceeded: "indigo", behind: "danger" };

function AttainmentBar({ pct }) {
  const color = pct >= 100 ? "bg-indigo-500" : pct >= 80 ? "bg-emerald-500" : pct >= 60 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="w-32 h-2 rounded-full bg-slate-200 dark:bg-slate-700">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{pct}%</span>
    </div>
  );
}

export default function ForecastingQuota() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Forecasting & Quota"
        subtitle="Roll-up forecasts, commit/best-case categories and variance insights"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Team Quota"      value="$1.85M" icon={Target}    color="indigo" />
        <Stat label="Commit"          value="$1.51M" icon={DollarSign} color="sky" />
        <Stat label="Best Case"       value="$1.84M" icon={TrendingUp} color="emerald" />
        <Stat label="Team Attainment" value="82%"    icon={Users}     color="amber" delta={-4} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Rep Forecast Breakdown" icon={Users} />
          <CardBody className="space-y-4">
            {reps.map(rep => (
              <div key={rep.name} className="p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{rep.name}</p>
                  <StatusBadge label={rep.status.replace("-", " ")} variant={statusVariant[rep.status]} dot />
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs text-slate-500 mb-3">
                  <div><span className="block font-semibold text-slate-800 dark:text-slate-200">{rep.quota}</span>Quota</div>
                  <div><span className="block font-semibold text-indigo-600 dark:text-indigo-400">{rep.commit}</span>Commit</div>
                  <div><span className="block font-semibold text-emerald-600 dark:text-emerald-400">{rep.bestCase}</span>Best Case</div>
                </div>
                <AttainmentBar pct={rep.attainment} />
              </div>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Forecast Categories" icon={TrendingUp} />
          <CardBody className="space-y-4">
            {[
              { label: "Closed Won",  value: "$820k",  pct: 44, color: "bg-emerald-500" },
              { label: "Commit",      value: "$690k",  pct: 37, color: "bg-indigo-500" },
              { label: "Best Case",   value: "$330k",  pct: 18, color: "bg-sky-400" },
              { label: "Pipeline",    value: "$2.1M",  pct: 100,color: "bg-slate-300 dark:bg-slate-600" },
            ].map(cat => (
              <div key={cat.label} className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-700 dark:text-slate-300">{cat.label}</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{cat.value}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700">
                  <div className={`h-2 rounded-full ${cat.color}`} style={{ width: `${cat.pct}%` }} />
                </div>
              </div>
            ))}

            <div className="mt-4 p-3 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800">
              <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">AI Forecast Insight</p>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Based on pipeline velocity, Q1 close is projected at <strong>$1.64M</strong> — 89% of quota. 3 deals at high risk of slipping.
              </p>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
