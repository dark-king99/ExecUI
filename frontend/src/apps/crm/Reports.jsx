import { useState } from "react";
import { FileText, BarChart2, TrendingUp, Users, RefreshCw, Download, AlertCircle } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import { Card, CardHeader, CardBody } from "../../components/ui/Card";
import { SkeletonTable } from "../../components/ui/Skeleton";
import { useApi } from "../../hooks/useApi";
import { crm } from "../../services/api";

const REPORT_TYPES = [
  { id: "pipeline", name: "Pipeline Report", icon: BarChart2, description: "Current pipeline by stage, owner, and value", color: "orange" },
  { id: "forecast", name: "Forecast Report", icon: TrendingUp, description: "Commit, best case, and pipeline forecast vs quota", color: "sky" },
  { id: "activity", name: "Activity Report", icon: Users, description: "Calls, emails, meetings, and demos by rep", color: "emerald" },
  { id: "winloss", name: "Win/Loss Report", icon: FileText, description: "Won and lost deal analysis with reasons", color: "amber" },
  { id: "renewals", name: "Renewals Report", icon: RefreshCw, description: "Upcoming renewals by health, ARR, and owner", color: "indigo" },
  { id: "revenue", name: "Revenue Report", icon: BarChart2, description: "Revenue breakdown by segment, product, and region", color: "violet" },
];

const COLOR_MAP = {
  orange: "bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400",
  sky:    "bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400",
  emerald:"bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400",
  amber:  "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400",
  indigo: "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400",
  violet: "bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400",
};

function ReportViewer({ type, onBack }) {
  const { data, loading, error } = useApi(() => {
    if (type === "pipeline") return crm.pipeline.summary();
    if (type === "forecast") return crm.forecast.summary();
    if (type === "winloss") return crm.analytics.winLoss();
    if (type === "renewals") return crm.renewals.summary();
    if (type === "revenue") return crm.analytics.summary();
    return crm.reps.summary();
  }, [type]);

  const meta = REPORT_TYPES.find(r => r.id === type);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-sm text-slate-500 hover:text-orange-600 transition">← Back to Reports</button>
        <span className="text-slate-300 dark:text-slate-700">|</span>
        <span className="text-sm font-semibold text-slate-900 dark:text-white">{meta?.name}</span>
      </div>
      <Card>
        <CardHeader title={meta?.name ?? "Report"} icon={meta?.icon ?? FileText} />
        <CardBody>
          {loading ? <SkeletonTable rows={8} /> : error ? (
            <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400"><AlertCircle size={15} />{error}</div>
          ) : !data ? (
            <p className="text-sm text-slate-500 text-center py-8">No data available for this report.</p>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-end">
                <button className="flex items-center gap-1.5 text-xs border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition">
                  <Download size={13} /> Export CSV
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800">
                      <th className="text-left pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider pr-4">Metric</th>
                      <th className="text-right pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {Object.entries(data).filter(([k, v]) => v != null && typeof v !== "object").map(([key, val]) => (
                      <tr key={key} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                        <td className="py-3 pr-4 text-slate-600 dark:text-slate-400 capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</td>
                        <td className="py-3 text-right font-semibold text-slate-900 dark:text-white">{String(val)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

export default function Reports() {
  const [activeReport, setActiveReport] = useState(null);
  if (activeReport) return <ReportViewer type={activeReport} onBack={() => setActiveReport(null)} />;
  return (
    <div className="space-y-6">
      <PageHeader title="CRM Reports" subtitle="Structured reports for performance, pipeline, and revenue analysis" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {REPORT_TYPES.map(({ id, name, icon: Icon, description, color }) => (
          <button key={id} onClick={() => setActiveReport(id)}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 text-left hover:border-orange-300 dark:hover:border-orange-700 hover:shadow-md transition group"
          >
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center mb-4 ${COLOR_MAP[color]}`}>
              <Icon size={20} />
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-white text-sm mb-1 group-hover:text-orange-600 transition">{name}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
            <div className="mt-4 flex items-center gap-1 text-xs text-orange-600 font-medium opacity-0 group-hover:opacity-100 transition">
              View Report →
            </div>
          </button>
        ))}
      </div>
      <Card>
        <CardHeader title="Recent Reports" icon={FileText} />
        <CardBody>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {REPORT_TYPES.slice(0, 4).map((r, i) => (
              <div key={r.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <div>
                  <div className="text-sm font-medium text-slate-900 dark:text-white">{r.name}</div>
                  <div className="text-xs text-slate-400">Generated {i === 0 ? "today" : i === 1 ? "yesterday" : `${i + 1} days ago`}</div>
                </div>
                <button onClick={() => setActiveReport(r.id)} className="text-xs text-orange-600 hover:text-orange-700 font-medium transition">View</button>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
