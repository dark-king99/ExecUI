import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody, CardHeader, Stat } from "../../components/ui/Card";
import { Users, TrendingUp, Calendar } from "lucide-react";

// Retention cohort data: each row is a cohort, columns are months 0-6
const cohorts = [
  { cohort: "Oct 2025", size: 120, retention: [100, 82, 74, 68, 63, 59, 55] },
  { cohort: "Nov 2025", size: 145, retention: [100, 80, 72, 65, 61, 57, null] },
  { cohort: "Dec 2025", size: 98,  retention: [100, 84, 76, 70, 65, null, null] },
  { cohort: "Jan 2026", size: 162, retention: [100, 86, 78, 72, null, null, null] },
  { cohort: "Feb 2026", size: 188, retention: [100, 88, 80, null, null, null, null] },
  { cohort: "Mar 2026", size: 210, retention: [100, 85, null, null, null, null, null] },
];

function heatColor(val) {
  if (val === null) return "bg-slate-100 dark:bg-slate-800 text-transparent";
  if (val >= 80) return "bg-emerald-500 text-white";
  if (val >= 65) return "bg-emerald-400/80 text-white";
  if (val >= 50) return "bg-amber-400/80 text-white";
  return "bg-red-400/80 text-white";
}

export default function CohortRetention() {
  const latestAvg = Math.round(
    cohorts.reduce((s, c) => s + c.retention[1], 0) / cohorts.length
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Cohort & Retention" subtitle="Monthly user cohort retention heatmap and trend analysis" />

      <div className="grid grid-cols-3 gap-4">
        <Stat label="Cohorts Tracked"  value={cohorts.length}   icon={Calendar}  color="indigo" />
        <Stat label="Avg M1 Retention" value={`${latestAvg}%`}  icon={Users}     color="emerald" delta={3} />
        <Stat label="Best Cohort"      value="Feb 2026"          icon={TrendingUp} color="sky" />
      </div>

      {/* Cohort heatmap */}
      <Card>
        <CardHeader title="Retention Cohort Heatmap" icon={Users} />
        <CardBody>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="px-3 py-2 text-left text-xs font-semibold text-slate-400">Cohort</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-slate-400">Size</th>
                  {["M0","M1","M2","M3","M4","M5","M6"].map(m => (
                    <th key={m} className="px-3 py-2 text-center text-xs font-semibold text-slate-400">{m}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {cohorts.map(row => (
                  <tr key={row.cohort}>
                    <td className="px-3 py-2 text-sm text-slate-700 dark:text-slate-300 whitespace-nowrap">{row.cohort}</td>
                    <td className="px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300">{row.size}</td>
                    {row.retention.map((val, i) => (
                      <td key={i} className="px-1 py-1">
                        <div className={`text-center text-xs font-semibold px-2 py-1 rounded ${heatColor(val)}`}>
                          {val !== null ? `${val}%` : ""}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-3 mt-4 text-xs text-slate-400">
            <span>Legend:</span>
            {[["≥80%","bg-emerald-500"], ["65-80%","bg-emerald-400/80"], ["50-65%","bg-amber-400/80"], ["<50%","bg-red-400/80"]].map(([l, c]) => (
              <span key={l} className="flex items-center gap-1">
                <span className={`h-3 w-3 rounded ${c}`} />{l}
              </span>
            ))}
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Retention by Plan Tier" icon={TrendingUp} />
          <CardBody className="space-y-3">
            {[
              { tier: "Enterprise", m1: "92%", m3: "84%", m6: "76%" },
              { tier: "Pro",        m1: "85%", m3: "74%", m6: "64%" },
              { tier: "Starter",    m1: "72%", m3: "58%", m6: "44%" },
              { tier: "Trial",      m1: "45%", m3: "28%", m6: "19%" },
            ].map(r => (
              <div key={r.tier} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{r.tier}</p>
                <div className="flex gap-4 text-xs">
                  <span>M1: <strong className="text-emerald-600 dark:text-emerald-400">{r.m1}</strong></span>
                  <span>M3: <strong className="text-amber-600 dark:text-amber-400">{r.m3}</strong></span>
                  <span>M6: <strong className="text-red-500">{r.m6}</strong></span>
                </div>
              </div>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Churn Risk Signals" icon={Users} />
          <CardBody className="space-y-3">
            {[
              { signal: "No login in 14 days",      affected: 48,  risk: "medium" },
              { signal: "Feature adoption < 3",     affected: 92,  risk: "high" },
              { signal: "Support tickets open > 2", affected: 21,  risk: "high" },
              { signal: "Usage drop > 30%",         affected: 34,  risk: "medium" },
            ].map(s => (
              <div key={s.signal} className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                <p className="text-sm text-slate-700 dark:text-slate-300">{s.signal}</p>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{s.affected}</span>
                  <span className={`text-xs font-medium ${s.risk === "high" ? "text-red-500" : "text-amber-500"}`}>{s.risk}</span>
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
