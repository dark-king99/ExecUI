/**
 * Report Builder — compose a report from a dataset, run it live, export it to
 * CSV/Excel/PDF, save it, and schedule recurring email delivery.
 *
 * The server owns the rules: it returns only the datasets and fields this user
 * may report on, and validates every definition again on run/export. This page
 * just renders what it's allowed to build.
 */
import { useEffect, useMemo, useState } from "react";
import PageHeader from "../../../../components/ui/PageHeader";
import { Card, CardBody } from "../../../../components/ui/Card";
import { useApi } from "../../../../hooks/useApi";
import { useToast } from "../../../../components/ui/Toast";
import { reports } from "../../../../services/api";
import {
  Table2, Filter, Layers, Play, Download, Save, CalendarClock, Plus, X, Trash2,
  FileSpreadsheet, FileText, FileType, Clock, Mail, Pause, RefreshCw, AlertCircle, Check,
} from "lucide-react";

const DATE_PRESET_LABELS = {
  all_time: "All time", today: "Today", yesterday: "Yesterday",
  last_7_days: "Last 7 days", last_30_days: "Last 30 days", last_90_days: "Last 90 days",
  this_month: "This month", last_month: "Last month", this_quarter: "This quarter",
  this_year: "This year", custom: "Custom range…",
};
const OP_LABELS = {
  eq: "is", ne: "is not", contains: "contains", starts_with: "starts with", in: "is any of",
  is_empty: "is empty", not_empty: "is not empty", gt: ">", gte: "≥", lt: "<", lte: "≤",
  between: "between", on: "on", before: "before", after: "after", in_range: "in range",
};
const FMT_ICON = { csv: FileText, xlsx: FileSpreadsheet, pdf: FileType };
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const cls = (...a) => a.filter(Boolean).join(" ");
const fmtCell = (v, col) => {
  if (v == null || v === "") return "—";
  if (typeof v === "number") return col?.money ? `$${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : v.toLocaleString();
  if (col?.type === "date" && typeof v === "string") return v.slice(0, 10);
  return String(v);
};

function Field({ label, children, hint }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-slate-400">{hint}</span>}
    </label>
  );
}

const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white";

export default function ReportBuilder() {
  const toast = useToast();
  const { data: meta, loading: metaLoading, error: metaError } = useApi(() => reports.datasets(), [], { cacheKey: "reports:datasets" });
  const { data: saved, refetch: refetchSaved } = useApi(() => reports.list(), [], { cacheKey: "reports:list" });
  const { data: schedules, refetch: refetchSchedules } = useApi(() => reports.schedules.list(), [], { cacheKey: "reports:schedules" });

  const [tab, setTab] = useState("builder");
  const [datasetId, setDatasetId] = useState("");
  const [fields, setFields] = useState([]);
  const [filters, setFilters] = useState([]);
  const [datePreset, setDatePreset] = useState("all_time");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [groupBy, setGroupBy] = useState("");
  const [aggs, setAggs] = useState([{ fn: "count", field: "" }]);
  const [sort, setSort] = useState(null);
  const [limit, setLimit] = useState(200);

  const [result, setResult] = useState(null);
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [scheduleFor, setScheduleFor] = useState(null);

  const datasets = meta?.datasets || [];
  const dataset = useMemo(() => datasets.find((d) => d.id === datasetId) || null, [datasets, datasetId]);
  const fieldMap = useMemo(() => Object.fromEntries((dataset?.fields || []).map((f) => [f.key, f])), [dataset]);

  // Pick a sensible default dataset once metadata arrives.
  useEffect(() => {
    if (!datasetId && datasets.length) selectDataset(datasets[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datasets.length]);

  function selectDataset(d) {
    setDatasetId(d.id);
    setFields(d.defaultFields || []);
    setFilters([]);
    setGroupBy("");
    setAggs([{ fn: "count", field: "" }]);
    setSort(d.defaultSort || null);
    setDatePreset("all_time");
    setResult(null);
    setRunError(null);
    setEditingId(null);
  }

  const definition = useMemo(() => {
    const def = { limit: Number(limit) || 200 };
    if (groupBy) {
      def.groupBy = groupBy;
      def.aggregations = aggs
        .filter((a) => a.fn === "count" || a.field)
        .map((a) => (a.fn === "count" ? { fn: "count" } : { fn: a.fn, field: a.field }));
    } else {
      def.fields = fields;
      if (sort?.field) def.sort = sort;
    }
    if (filters.length) {
      def.filters = filters
        .filter((f) => f.field && f.op && (["is_empty", "not_empty"].includes(f.op) || f.value !== ""))
        .map((f) => ({ field: f.field, op: f.op, value: f.value }));
    }
    if (datePreset !== "all_time") {
      def.dateRange = { field: dataset?.dateField, preset: datePreset, from: dateFrom || null, to: dateTo || null };
    }
    return def;
  }, [fields, filters, groupBy, aggs, sort, limit, datePreset, dateFrom, dateTo, dataset]);

  async function run() {
    if (!dataset) return;
    setRunning(true);
    setRunError(null);
    try {
      setResult(await reports.preview({ dataset: dataset.id, definition }));
    } catch (e) {
      setRunError(e.message);
      setResult(null);
    } finally {
      setRunning(false);
    }
  }

  async function download(format) {
    if (!dataset) return;
    try {
      const { filename } = await reports.download({
        dataset: dataset.id, definition, format,
        name: editingId ? saved?.find((s) => s.id === editingId)?.name : dataset.name,
        reportId: editingId || undefined,
      });
      toast.success?.(`Downloaded ${filename}`);
    } catch (e) {
      toast.error?.(e.message);
    }
  }

  async function save() {
    if (!dataset) return;
    const name = window.prompt("Name this report", editingId ? saved?.find((s) => s.id === editingId)?.name : `${dataset.name} report`);
    if (!name) return;
    try {
      if (editingId) {
        await reports.update(editingId, { name, dataset: dataset.id, definition });
        toast.success?.("Report updated.");
      } else {
        const created = await reports.create({ name, dataset: dataset.id, definition });
        setEditingId(created.id);
        toast.success?.("Report saved — you can now schedule it.");
      }
      refetchSaved();
    } catch (e) {
      toast.error?.(e.message);
    }
  }

  function loadSaved(r) {
    const d = datasets.find((x) => x.id === r.dataset);
    if (!d) return toast.error?.("You no longer have access to that data set.");
    const def = r.definition || {};
    setDatasetId(d.id);
    setFields(def.fields || d.defaultFields || []);
    setFilters((def.filters || []).map((f) => ({ ...f, value: Array.isArray(f.value) ? f.value.join(",") : f.value ?? "" })));
    setGroupBy(def.groupBy || "");
    setAggs(def.groupBy ? (def.aggregations || []).map((a) => ({ fn: a.fn, field: a.field || "" })) : [{ fn: "count", field: "" }]);
    setSort(def.sort || d.defaultSort || null);
    setLimit(def.limit || 200);
    setDatePreset(def.dateRange?.preset || "all_time");
    setDateFrom(def.dateRange?.from || "");
    setDateTo(def.dateRange?.to || "");
    setEditingId(r.id);
    setResult(null);
    setTab("builder");
  }

  async function removeReport(r) {
    if (!window.confirm(`Delete "${r.name}"? Any schedules for it are removed too.`)) return;
    try {
      await reports.remove(r.id);
      if (editingId === r.id) setEditingId(null);
      toast.success?.("Report deleted.");
      refetchSaved();
      refetchSchedules();
    } catch (e) { toast.error?.(e.message); }
  }

  const groupableFields = (dataset?.fields || []).filter((f) => f.groupable);
  const aggregatableFields = (dataset?.fields || []).filter((f) => f.aggregatable);

  if (metaLoading) return <div className="mx-auto max-w-7xl"><div className="h-64 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" /></div>;
  if (metaError) return (
    <div className="mx-auto max-w-7xl rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
      Couldn't load the report builder: {metaError}
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Reports"
        subtitle="Build a report on your own data, export it to CSV, Excel or PDF, and have it emailed on a schedule."
        actions={
          <div className="flex rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
            {[["builder", "Builder"], ["saved", `Saved${saved?.length ? ` (${saved.length})` : ""}`], ["schedules", `Schedules${schedules?.length ? ` (${schedules.length})` : ""}`]].map(([id, label]) => (
              <button key={id} onClick={() => setTab(id)}
                className={cls("rounded-md px-3 py-1.5 text-xs font-medium transition",
                  tab === id ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300")}>
                {label}
              </button>
            ))}
          </div>
        }
      />

      {tab === "builder" && (
        <div className="grid gap-5 lg:grid-cols-3">
          {/* ── Definition ─────────────────────────────────────────────── */}
          <div className="space-y-4 lg:col-span-1">
            <Card>
              <CardBody className="space-y-4">
                <Field label="Data set">
                  <select className={inputCls} value={datasetId} onChange={(e) => selectDataset(datasets.find((d) => d.id === e.target.value))}>
                    {datasets.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </Field>
                {dataset?.description && <p className="-mt-1 text-xs text-slate-400">{dataset.description}</p>}

                <Field label="Date range">
                  <select className={inputCls} value={datePreset} onChange={(e) => setDatePreset(e.target.value)} disabled={!dataset?.dateField}>
                    {(meta?.datePresets || []).map((p) => <option key={p} value={p}>{DATE_PRESET_LABELS[p] || p}</option>)}
                  </select>
                </Field>
                {datePreset === "custom" && (
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="From"><input type="date" className={inputCls} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} /></Field>
                    <Field label="To"><input type="date" className={inputCls} value={dateTo} onChange={(e) => setDateTo(e.target.value)} /></Field>
                  </div>
                )}
              </CardBody>
            </Card>

            {/* Summarize */}
            <Card>
              <CardBody className="space-y-3">
                <div className="flex items-center gap-2"><Layers size={14} className="text-indigo-500" />
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Summarize</h3></div>
                <Field label="Group by" hint={groupBy ? "Showing one row per group." : "Leave blank to list individual records."}>
                  <select className={inputCls} value={groupBy} onChange={(e) => { setGroupBy(e.target.value); setSort(null); }}>
                    <option value="">No grouping (list rows)</option>
                    {groupableFields.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
                  </select>
                </Field>
                {groupBy && (
                  <div className="space-y-2">
                    {aggs.map((a, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <select className={cls(inputCls, "w-28")} value={a.fn}
                          onChange={(e) => setAggs(aggs.map((x, j) => j === i ? { ...x, fn: e.target.value } : x))}>
                          {(meta?.aggregations || []).map((fn) => <option key={fn} value={fn}>{fn.toUpperCase()}</option>)}
                        </select>
                        {a.fn !== "count" && (
                          <select className={inputCls} value={a.field}
                            onChange={(e) => setAggs(aggs.map((x, j) => j === i ? { ...x, field: e.target.value } : x))}>
                            <option value="">Choose field…</option>
                            {aggregatableFields.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
                          </select>
                        )}
                        {aggs.length > 1 && (
                          <button onClick={() => setAggs(aggs.filter((_, j) => j !== i))} className="rounded p-1 text-slate-400 hover:text-red-500"><X size={14} /></button>
                        )}
                      </div>
                    ))}
                    <button onClick={() => setAggs([...aggs, { fn: "sum", field: "" }])}
                      className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400">
                      <Plus size={12} /> Add measure
                    </button>
                  </div>
                )}
              </CardBody>
            </Card>

            {/* Columns (list mode only) */}
            {!groupBy && (
              <Card>
                <CardBody className="space-y-2">
                  <div className="flex items-center gap-2"><Table2 size={14} className="text-indigo-500" />
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Columns</h3></div>
                  <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
                    {(dataset?.fields || []).map((f) => (
                      <label key={f.key} className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800">
                        <input type="checkbox" checked={fields.includes(f.key)}
                          onChange={(e) => setFields(e.target.checked ? [...fields, f.key] : fields.filter((k) => k !== f.key))} />
                        <span className="text-slate-700 dark:text-slate-300">{f.label}</span>
                        <span className="ml-auto text-[10px] uppercase text-slate-400">{f.type}</span>
                      </label>
                    ))}
                  </div>
                </CardBody>
              </Card>
            )}

            {/* Filters */}
            <Card>
              <CardBody className="space-y-2">
                <div className="flex items-center gap-2"><Filter size={14} className="text-indigo-500" />
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Filters</h3></div>
                {filters.map((f, i) => {
                  const meta2 = fieldMap[f.field];
                  const needsValue = !["is_empty", "not_empty"].includes(f.op);
                  return (
                    <div key={i} className="space-y-1.5 rounded-lg border border-slate-200 p-2 dark:border-slate-700">
                      <div className="flex items-center gap-1.5">
                        <select className={inputCls} value={f.field}
                          onChange={(e) => {
                            const nf = fieldMap[e.target.value];
                            setFilters(filters.map((x, j) => j === i ? { field: e.target.value, op: nf?.operators?.[0] || "eq", value: "" } : x));
                          }}>
                          {(dataset?.fields || []).map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}
                        </select>
                        <button onClick={() => setFilters(filters.filter((_, j) => j !== i))} className="rounded p-1 text-slate-400 hover:text-red-500"><X size={14} /></button>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <select className={cls(inputCls, "w-32")} value={f.op}
                          onChange={(e) => setFilters(filters.map((x, j) => j === i ? { ...x, op: e.target.value } : x))}>
                          {(meta2?.operators || []).map((op) => <option key={op} value={op}>{OP_LABELS[op] || op}</option>)}
                        </select>
                        {needsValue && (
                          <input className={inputCls} placeholder={f.op === "between" || f.op === "in" ? "comma,separated" : "value"}
                            value={f.value} onChange={(e) => setFilters(filters.map((x, j) => j === i ? { ...x, value: e.target.value } : x))} />
                        )}
                      </div>
                    </div>
                  );
                })}
                <button onClick={() => setFilters([...filters, { field: dataset?.fields?.[0]?.key || "", op: dataset?.fields?.[0]?.operators?.[0] || "eq", value: "" }])}
                  className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400">
                  <Plus size={12} /> Add filter
                </button>
              </CardBody>
            </Card>
          </div>

          {/* ── Preview ────────────────────────────────────────────────── */}
          <div className="lg:col-span-2">
            <Card>
              <CardBody>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <button onClick={run} disabled={running}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-60">
                    {running ? <RefreshCw size={13} className="animate-spin" /> : <Play size={13} />} {running ? "Running…" : "Run"}
                  </button>
                  <div className="ml-auto flex items-center gap-1.5">
                    {["csv", "xlsx", "pdf"].map((f) => {
                      const Icon = FMT_ICON[f];
                      return (
                        <button key={f} onClick={() => download(f)} title={`Export ${f.toUpperCase()}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-300">
                          <Icon size={13} /> {f.toUpperCase()}
                        </button>
                      );
                    })}
                    <button onClick={save}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-300">
                      <Save size={13} /> {editingId ? "Update" : "Save"}
                    </button>
                    {editingId && (
                      <button onClick={() => setScheduleFor(saved?.find((s) => s.id === editingId) || null)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-300">
                        <CalendarClock size={13} /> Schedule
                      </button>
                    )}
                  </div>
                </div>

                {runError && (
                  <div className="mb-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
                    <AlertCircle size={14} /> {runError}
                  </div>
                )}

                {!result && !runError && (
                  <div className="py-16 text-center text-sm text-slate-400">
                    <Table2 size={26} className="mx-auto mb-2 opacity-40" />
                    Choose your fields and press <strong>Run</strong> to see the data.
                  </div>
                )}

                {result && (
                  <>
                    <div className="mb-2 flex items-center gap-2 text-xs text-slate-500">
                      <span><strong className="text-slate-800 dark:text-slate-200">{result.rows.length.toLocaleString()}</strong> of {result.totalRows.toLocaleString()} row(s)</span>
                      <span>· {result.durationMs}ms</span>
                      {result.truncated && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">Preview limited — exports include up to {(meta?.maxRows || 10000).toLocaleString()} rows</span>}
                    </div>
                    <div className="max-h-[26rem] overflow-auto rounded-lg border border-slate-200 dark:border-slate-700">
                      <table className="w-full text-left text-sm">
                        <thead className="sticky top-0 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800">
                          <tr>{result.columns.map((c) => <th key={c.key} className="whitespace-nowrap px-3 py-2 font-medium">{c.label}</th>)}</tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {result.rows.map((r, i) => (
                            <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                              {result.columns.map((c) => (
                                <td key={c.key} className={cls("whitespace-nowrap px-3 py-1.5", c.type === "number" ? "tabular-nums text-slate-800 dark:text-slate-200" : "text-slate-600 dark:text-slate-400")}>
                                  {fmtCell(r[c.key], c)}
                                </td>
                              ))}
                            </tr>
                          ))}
                          {!result.rows.length && (
                            <tr><td colSpan={result.columns.length} className="px-3 py-10 text-center text-slate-400">No rows matched.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </CardBody>
            </Card>
          </div>
        </div>
      )}

      {tab === "saved" && (
        <SavedReports saved={saved} onOpen={loadSaved} onDelete={removeReport} onSchedule={setScheduleFor} />
      )}

      {tab === "schedules" && (
        <Schedules schedules={schedules} refetch={refetchSchedules} toast={toast} />
      )}

      {scheduleFor && (
        <ScheduleDialog report={scheduleFor} meta={meta} onClose={() => setScheduleFor(null)}
          onSaved={() => { setScheduleFor(null); refetchSchedules(); setTab("schedules"); }} toast={toast} />
      )}
    </div>
  );
}

// ── Saved reports ────────────────────────────────────────────────────────────
function SavedReports({ saved, onOpen, onDelete, onSchedule }) {
  if (!saved?.length) {
    return (
      <Card><CardBody>
        <div className="py-14 text-center text-sm text-slate-400">
          <Save size={26} className="mx-auto mb-2 opacity-40" />
          No saved reports yet — build one and press <strong>Save</strong>.
        </div>
      </CardBody></Card>
    );
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {saved.map((r) => (
        <Card key={r.id}>
          <CardBody className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-900 dark:text-white">{r.name}</p>
                <p className="text-xs text-slate-400">{r.datasetName}{r.createdBy ? ` · ${r.createdBy}` : ""}</p>
              </div>
              {r.scheduleCount > 0 && (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                  <Clock size={10} /> {r.scheduleCount}
                </span>
              )}
            </div>
            {r.description && <p className="line-clamp-2 text-xs text-slate-500">{r.description}</p>}
            <div className="flex items-center gap-1.5 pt-1">
              <button onClick={() => onOpen(r)} className="rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-indigo-500">Open</button>
              <button onClick={() => onSchedule(r)} className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-300">Schedule</button>
              <button onClick={() => onDelete(r)} className="ml-auto rounded p-1 text-slate-400 hover:text-red-500"><Trash2 size={14} /></button>
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}

// ── Schedules ────────────────────────────────────────────────────────────────
const STATUS_STYLE = {
  sent: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  skipped: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  failed: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
};

function cadenceLabel(s) {
  const at = `${String(s.hour).padStart(2, "0")}:${String(s.minute).padStart(2, "0")}`;
  if (s.frequency === "daily") return `Daily at ${at}`;
  if (s.frequency === "weekly") return `Every ${WEEKDAYS[s.weekday ?? 1]} at ${at}`;
  return `Day ${s.dayOfMonth ?? 1} monthly at ${at}`;
}

function Schedules({ schedules, refetch, toast }) {
  const [busy, setBusy] = useState(null);

  const act = async (id, fn, okMsg) => {
    setBusy(id);
    try { const r = await fn(); toast.success?.(r?.message || okMsg); refetch(); }
    catch (e) { toast.error?.(e.message); }
    finally { setBusy(null); }
  };

  if (!schedules?.length) {
    return (
      <Card><CardBody>
        <div className="py-14 text-center text-sm text-slate-400">
          <CalendarClock size={26} className="mx-auto mb-2 opacity-40" />
          No schedules yet — save a report, then press <strong>Schedule</strong> to have it emailed automatically.
        </div>
      </CardBody></Card>
    );
  }

  return (
    <div className="space-y-3">
      {schedules.map((s) => (
        <Card key={s.id}>
          <CardBody>
            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-semibold text-slate-900 dark:text-white">{s.reportName || "Report"}</p>
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-500 dark:bg-slate-800">{s.format}</span>
                  {!s.active && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500 dark:bg-slate-800">Paused</span>}
                  {s.lastStatus && <span className={cls("rounded-full px-2 py-0.5 text-[10px] font-medium", STATUS_STYLE[s.lastStatus])}>{s.lastStatus}</span>}
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  {cadenceLabel(s)} ({s.timezone}) · <Mail size={10} className="inline" /> {s.recipients.join(", ")}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  {s.active && s.nextRunAt ? `Next: ${new Date(s.nextRunAt).toLocaleString()}` : "Not scheduled"}
                  {s.lastRunAt ? ` · Last: ${new Date(s.lastRunAt).toLocaleString()}` : ""}
                  {s.runCount ? ` · ${s.runCount} run(s)` : ""}
                </p>
                {s.lastError && <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">{s.lastError}</p>}
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <button disabled={busy === s.id} onClick={() => act(s.id, () => reports.schedules.runNow(s.id), "Sent.")}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300">
                  {busy === s.id ? <RefreshCw size={12} className="animate-spin" /> : <Play size={12} />} Send now
                </button>
                <button disabled={busy === s.id} onClick={() => act(s.id, () => reports.schedules.update(s.id, { active: !s.active }), s.active ? "Paused." : "Resumed.")}
                  className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:text-indigo-600 disabled:opacity-50 dark:border-slate-700">
                  {s.active ? <Pause size={13} /> : <Play size={13} />}
                </button>
                <button disabled={busy === s.id} onClick={() => window.confirm("Delete this schedule?") && act(s.id, () => reports.schedules.remove(s.id), "Schedule deleted.")}
                  className="rounded-lg border border-slate-200 p-1.5 text-slate-400 hover:text-red-500 disabled:opacity-50 dark:border-slate-700">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}

// ── Schedule dialog ──────────────────────────────────────────────────────────
function ScheduleDialog({ report, meta, onClose, onSaved, toast }) {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const [form, setForm] = useState({
    frequency: "weekly", format: "csv", hour: 7, minute: 0, weekday: 1, dayOfMonth: 1,
    timezone: tz, recipients: "",
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setSaving(true);
    try {
      await reports.schedules.create({
        reportId: report.id,
        ...form,
        recipients: form.recipients.split(",").map((s) => s.trim()).filter(Boolean),
      });
      toast.success?.("Schedule created.");
      onSaved();
    } catch (e) {
      toast.error?.(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white">Schedule delivery</h3>
            <p className="text-xs text-slate-400">{report.name}</p>
          </div>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:text-slate-700"><X size={16} /></button>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Frequency">
              <select className={inputCls} value={form.frequency} onChange={(e) => set("frequency", e.target.value)}>
                {(meta?.frequencies || ["daily", "weekly", "monthly"]).map((f) => <option key={f} value={f}>{f[0].toUpperCase() + f.slice(1)}</option>)}
              </select>
            </Field>
            <Field label="Format">
              <select className={inputCls} value={form.format} onChange={(e) => set("format", e.target.value)}>
                {(meta?.formats || ["csv", "xlsx", "pdf"]).map((f) => <option key={f} value={f}>{f.toUpperCase()}</option>)}
              </select>
            </Field>
          </div>

          {form.frequency === "weekly" && (
            <Field label="Day of week">
              <select className={inputCls} value={form.weekday} onChange={(e) => set("weekday", Number(e.target.value))}>
                {WEEKDAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
              </select>
            </Field>
          )}
          {form.frequency === "monthly" && (
            <Field label="Day of month" hint="1–28, so every month can fire.">
              <input type="number" min="1" max="28" className={inputCls} value={form.dayOfMonth} onChange={(e) => set("dayOfMonth", Number(e.target.value))} />
            </Field>
          )}

          <div className="grid grid-cols-3 gap-2">
            <Field label="Hour"><input type="number" min="0" max="23" className={inputCls} value={form.hour} onChange={(e) => set("hour", Number(e.target.value))} /></Field>
            <Field label="Minute"><input type="number" min="0" max="59" className={inputCls} value={form.minute} onChange={(e) => set("minute", Number(e.target.value))} /></Field>
            <Field label="Timezone"><input className={inputCls} value={form.timezone} onChange={(e) => set("timezone", e.target.value)} /></Field>
          </div>

          <Field label="Recipients" hint="Comma-separated email addresses.">
            <input className={inputCls} placeholder="cfo@acme.com, ops@acme.com" value={form.recipients} onChange={(e) => set("recipients", e.target.value)} />
          </Field>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">Cancel</button>
          <button onClick={submit} disabled={saving || !form.recipients.trim()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
            <Check size={14} /> {saving ? "Saving…" : "Create schedule"}
          </button>
        </div>
      </div>
    </div>
  );
}
