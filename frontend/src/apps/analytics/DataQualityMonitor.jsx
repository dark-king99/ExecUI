import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody, CardHeader, Stat } from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import { Database, CheckCircle, AlertTriangle, Clock, XCircle } from "lucide-react";

const datasets = [
  { name: "CRM Contacts",        freshness: "2m ago",  completeness: 98, schema: "stable", duplicates: 12, status: "healthy" },
  { name: "Campaign Events",     freshness: "5m ago",  completeness: 95, schema: "stable", duplicates: 0,  status: "healthy" },
  { name: "Network Telemetry",   freshness: "1m ago",  completeness: 100,schema: "stable", duplicates: 0,  status: "healthy" },
  { name: "Revenue Attribution", freshness: "1h ago",  completeness: 88, schema: "drift",  duplicates: 34, status: "warning" },
  { name: "Product Usage",       freshness: "3h ago",  completeness: 91, schema: "stable", duplicates: 8,  status: "warning" },
  { name: "Lead Scores",         freshness: "6h ago",  completeness: 72, schema: "drift",  duplicates: 0,  status: "critical" },
];

const statusVariant = { healthy: "success", warning: "warning", critical: "danger" };

function QualityBar({ pct }) {
  const color = pct >= 95 ? "bg-emerald-500" : pct >= 80 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-2 rounded-full bg-slate-200 dark:bg-slate-700">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{pct}%</span>
    </div>
  );
}

export default function DataQualityMonitor() {
  const healthy  = datasets.filter(d => d.status === "healthy").length;
  const warning  = datasets.filter(d => d.status === "warning").length;
  const critical = datasets.filter(d => d.status === "critical").length;
  const avgComplete = Math.round(datasets.reduce((s, d) => s + d.completeness, 0) / datasets.length);

  return (
    <div className="space-y-6">
      <PageHeader title="Data Quality Monitor" subtitle="Dataset freshness, completeness, schema drift and deduplication" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Datasets Healthy"   value={healthy}      icon={CheckCircle}  color="emerald" />
        <Stat label="Warnings"           value={warning}      icon={AlertTriangle} color="amber" />
        <Stat label="Critical"           value={critical}     icon={XCircle}      color="red" />
        <Stat label="Avg Completeness"   value={`${avgComplete}%`} icon={Database} color="indigo" />
      </div>

      <Card>
        <CardHeader title="Dataset Health" icon={Database} />
        <CardBody>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  {["Dataset", "Freshness", "Completeness", "Schema", "Duplicates", "Status"].map(h => (
                    <th key={h} className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {datasets.map(ds => (
                  <tr key={ds.name} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{ds.name}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                      <span className="flex items-center gap-1"><Clock size={12} className="text-slate-400" /> {ds.freshness}</span>
                    </td>
                    <td className="px-4 py-3"><QualityBar pct={ds.completeness} /></td>
                    <td className="px-4 py-3">
                      <StatusBadge label={ds.schema} variant={ds.schema === "drift" ? "warning" : "success"} />
                    </td>
                    <td className="px-4 py-3">
                      {ds.duplicates > 0
                        ? <span className="text-amber-600 dark:text-amber-400 font-semibold">{ds.duplicates}</span>
                        : <span className="text-emerald-500">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge label={ds.status} variant={statusVariant[ds.status]} dot />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Schema Drift Alerts" icon={AlertTriangle} />
          <CardBody className="space-y-3">
            {datasets.filter(d => d.schema === "drift").map(d => (
              <div key={d.name} className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{d.name}</p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">Schema drift detected. Downstream pipelines may be affected.</p>
                <button className="text-xs text-indigo-600 dark:text-indigo-400 mt-2 hover:underline">Review diff →</button>
              </div>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Deduplication Queue" icon={Database} />
          <CardBody className="space-y-3">
            {datasets.filter(d => d.duplicates > 0).map(d => (
              <div key={d.name} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{d.name}</p>
                  <p className="text-xs text-slate-400">{d.duplicates} duplicate records</p>
                </div>
                <button className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">Deduplicate →</button>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
