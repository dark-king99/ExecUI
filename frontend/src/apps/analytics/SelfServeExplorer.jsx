import { useState } from "react";
import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import { Search, Play, Save, Table } from "lucide-react";

const savedQueries = [
  { name: "Monthly ARR by Segment",      lastRun: "2h ago",   author: "J. Torres" },
  { name: "Churn by Cohort",             lastRun: "Yesterday", author: "A. Kim" },
  { name: "Lead Source → Revenue",       lastRun: "3d ago",   author: "M. Patel" },
  { name: "Campaign ROI Summary",        lastRun: "1d ago",   author: "S. Lee" },
];

const metrics = ["ARR", "MRR", "Leads", "Pipeline Value", "Win Rate", "CAC", "LTV", "Churn Rate", "NPS"];
const dimensions = ["Segment", "Month", "Quarter", "Region", "Rep", "Channel", "Product"];

const sampleResult = [
  { segment: "Enterprise",  month: "Feb", arr: "$2.1M",  churn: "1.2%" },
  { segment: "Mid-Market",  month: "Feb", arr: "$1.4M",  churn: "2.8%" },
  { segment: "SMB",         month: "Feb", arr: "$0.7M",  churn: "4.1%" },
];

export default function SelfServeExplorer() {
  const [query, setQuery] = useState("SELECT segment, month, SUM(arr) FROM metrics\nWHERE month = 'Feb'\nGROUP BY segment, month");
  const [ran, setRan] = useState(false);
  const [selMetrics, setSelMetrics] = useState(["ARR", "Churn Rate"]);
  const [selDims, setSelDims] = useState(["Segment", "Month"]);

  const toggle = (list, set, val) =>
    set(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);

  return (
    <div className="space-y-6">
      <PageHeader title="Self-Serve Explorer" subtitle="Saved queries, dimensions, segments and ad-hoc exploration" />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Builder */}
        <div className="xl:col-span-2 space-y-4">
          <Card>
            <CardHeader title="Query Builder" icon={Search} />
            <CardBody className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Metrics</p>
                  <div className="flex flex-wrap gap-1.5">
                    {metrics.map(m => (
                      <button
                        key={m}
                        onClick={() => toggle(selMetrics, setSelMetrics, m)}
                        className={`px-2 py-1 rounded-lg text-xs border transition ${
                          selMetrics.includes(m)
                            ? "bg-indigo-600 border-indigo-600 text-white"
                            : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-indigo-400"
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Dimensions</p>
                  <div className="flex flex-wrap gap-1.5">
                    {dimensions.map(d => (
                      <button
                        key={d}
                        onClick={() => toggle(selDims, setSelDims, d)}
                        className={`px-2 py-1 rounded-lg text-xs border transition ${
                          selDims.includes(d)
                            ? "bg-sky-600 border-sky-600 text-white"
                            : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-sky-400"
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase mb-2">SQL (auto-generated)</p>
                <textarea
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setRan(true)}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg transition"
                >
                  <Play size={14} /> Run Query
                </button>
                <button className="flex items-center gap-2 border border-slate-200 dark:border-slate-700 text-sm px-4 py-2 rounded-lg text-slate-600 dark:text-slate-300 hover:border-indigo-400 transition">
                  <Save size={14} /> Save
                </button>
              </div>
            </CardBody>
          </Card>

          {ran && (
            <Card>
              <CardHeader title="Results" icon={Table} />
              <CardBody>
                <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800">
                      <tr>{Object.keys(sampleResult[0]).map(k => <th key={k} className="px-4 py-2 text-left text-xs font-semibold uppercase text-slate-400">{k}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {sampleResult.map((row, i) => (
                        <tr key={i} className="bg-white dark:bg-slate-900">
                          {Object.values(row).map((v, j) => <td key={j} className="px-4 py-3 text-slate-700 dark:text-slate-300">{v}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-slate-400 mt-2">{sampleResult.length} rows · 0.12s</p>
              </CardBody>
            </Card>
          )}
        </div>

        {/* Saved queries */}
        <Card>
          <CardHeader title="Saved Queries" icon={Save} />
          <CardBody className="space-y-3">
            {savedQueries.map(q => (
              <button
                key={q.name}
                onClick={() => setRan(true)}
                className="w-full text-left p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 transition"
              >
                <p className="text-sm font-medium text-slate-900 dark:text-white">{q.name}</p>
                <div className="flex gap-3 text-xs text-slate-400 mt-1">
                  <span>{q.lastRun}</span>
                  <span>{q.author}</span>
                </div>
              </button>
            ))}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
