import { useState, useCallback } from "react";
import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import { SkeletonTable } from "../../components/ui/Skeleton";
import { useApi, useMutation } from "../../hooks/useApi";
import { analytics } from "../../services/api";
import { useToast } from "../../components/ui/Toast";
import { Search, Play, Save, Table, Loader2, RefreshCw, Trash2 } from "lucide-react";

const METRICS    = ["ARR", "MRR", "Leads", "Pipeline Value", "Win Rate", "CAC", "LTV", "Churn Rate", "NPS"];
const DIMENSIONS = ["Segment", "Month", "Quarter", "Region", "Rep", "Channel", "Product"];

function toggle(list, val) {
  return list.includes(val) ? list.filter((v) => v !== val) : [...list, val];
}

export default function SelfServeExplorer() {
  const toast = useToast();

  const {
    data: savedQueries,
    loading: queriesLoading,
    refetch: refetchQueries,
  } = useApi(() => analytics.savedQueries());

  const [query,      setQuery]      = useState("SELECT segment, month, SUM(arr) FROM metrics\nWHERE month = 'current'\nGROUP BY segment, month");
  const [results,    setResults]    = useState(null);
  const [selMetrics, setSelMetrics] = useState([]);
  const [selDims,    setSelDims]    = useState([]);

  const { mutate: runQuery, loading: running } = useMutation(
    (body) => analytics.runQuery(body),
    {
      onSuccess: (data) => setResults(data),
      onError:   (err)  => toast({ message: err?.message ?? "Query failed.", type: "error" }),
    }
  );

  const { mutate: saveQuery, loading: saving } = useMutation(
    (body) => analytics.saveQuery(body),
    {
      onSuccess: () => {
        toast({ message: "Query saved.", type: "success" });
        refetchQueries();
      },
      onError: (err) => toast({ message: err?.message ?? "Save failed.", type: "error" }),
    }
  );

  const handleRun  = () => runQuery({ sql: query, metrics: selMetrics, dimensions: selDims });
  const handleSave = () => {
    if (!query.trim()) { toast({ message: "Nothing to save.", type: "warning" }); return; }
    saveQuery({ sql: query, metrics: selMetrics, dimensions: selDims });
  };

  const loadSavedQuery = (q) => {
    if (q.sql) setQuery(q.sql);
    if (q.metrics) setSelMetrics(q.metrics);
    if (q.dimensions) setSelDims(q.dimensions);
    setResults(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Self-Serve Explorer"
        subtitle="Saved queries, dimensions, segments and ad-hoc exploration"
      />

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
                    {METRICS.map((m) => (
                      <button
                        key={m}
                        onClick={() => setSelMetrics((prev) => toggle(prev, m))}
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
                    {DIMENSIONS.map((d) => (
                      <button
                        key={d}
                        onClick={() => setSelDims((prev) => toggle(prev, d))}
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
                <p className="text-xs font-semibold text-slate-500 uppercase mb-2">SQL</p>
                <textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleRun}
                  disabled={running}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg transition disabled:opacity-60"
                >
                  {running ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                  Run Query
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 border border-slate-200 dark:border-slate-700 text-sm px-4 py-2 rounded-lg text-slate-600 dark:text-slate-300 hover:border-indigo-400 transition disabled:opacity-60"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Save
                </button>
              </div>
            </CardBody>
          </Card>

          {/* Results */}
          {results && (
            <Card>
              <CardHeader title={`Results — ${results.rows?.length ?? 0} rows`} icon={Table} />
              <CardBody>
                {results.rows?.length > 0 ? (
                  <>
                    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800">
                          <tr>
                            {(results.columns ?? Object.keys(results.rows[0])).map((k) => (
                              <th key={k} className="px-4 py-2 text-left text-xs font-semibold uppercase text-slate-400">{k}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {results.rows.map((row, i) => (
                            <tr key={i} className="bg-white dark:bg-slate-900">
                              {Object.values(row).map((v, j) => (
                                <td key={j} className="px-4 py-3 text-slate-700 dark:text-slate-300">{String(v)}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">
                      {results.rows.length} rows · {results.duration ?? "—"}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-slate-500 text-center py-4">Query returned no results.</p>
                )}
              </CardBody>
            </Card>
          )}
        </div>

        {/* Saved queries */}
        <Card>
          <CardHeader
            title="Saved Queries"
            icon={Save}
            actions={
              <button onClick={refetchQueries} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <RefreshCw size={14} />
              </button>
            }
          />
          <CardBody className="space-y-3">
            {queriesLoading ? (
              <SkeletonTable rows={4} />
            ) : savedQueries?.length > 0 ? (
              savedQueries.map((q) => (
                <button
                  key={q.id ?? q.name}
                  onClick={() => loadSavedQuery(q)}
                  className="w-full text-left p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 transition"
                >
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{q.name}</p>
                  <div className="flex gap-3 text-xs text-slate-400 mt-1">
                    <span>{q.lastRun ?? q.updatedAt ?? "Never run"}</span>
                    <span>{q.author ?? q.createdBy ?? ""}</span>
                  </div>
                </button>
              ))
            ) : (
              <p className="text-sm text-slate-500 text-center py-4">No saved queries yet.</p>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
