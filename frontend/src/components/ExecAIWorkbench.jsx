import { useEffect, useMemo, useState } from "react";
import {
  Activity, AlertCircle, ArrowRight, Bot, CheckCircle2, ChevronRight, Circle,
  Code2, Layers3, Loader2, Maximize2, Minimize2, Network, Play, Search,
  ShieldCheck, Sparkles, Terminal, X,
} from "lucide-react";
import { assistant } from "../services/api";
import { useSidebar } from "./SidebarContext";

const QUICK_ACTIONS = [
  { label: "Workspace overview", icon: Layers3, prompt: "Give me an overview of my authorized workspace modules." },
  { label: "Find open work", icon: Search, prompt: "Find open tasks and tickets that need attention." },
  { label: "Review network", icon: Network, prompt: "Summarize current network devices and open alerts." },
];

function runKey() {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    return `execai:last-run:${user?.userId || user?.id || user?.email || "workspace"}`;
  } catch {
    return "execai:last-run:workspace";
  }
}

function loadLastRun() {
  try {
    const value = JSON.parse(localStorage.getItem(runKey()) || "null");
    return value && typeof value === "object" ? value : null;
  } catch {
    return null;
  }
}

function saveLastRun(run) {
  const safeRun = {
    label: run.label,
    status: run.status,
    completedAt: run.completedAt,
    summary: run.summary,
    steps: run.steps,
  };
  try {
    localStorage.setItem(runKey(), JSON.stringify(safeRun));
  } catch {
    // The active run remains available in component state if storage is unavailable.
  }
}

function label(value) {
  return String(value || "").replaceAll("-", " ").replaceAll("_", " ");
}

function shortSummary(reply) {
  return String(reply || "").split("\n").find((line) => line.trim())?.replaceAll("**", "").slice(0, 140)
    || "ExecAI finished the workspace task.";
}

function StatusMark({ status }) {
  if (status === "completed") return <CheckCircle2 size={16} className="text-emerald-500" />;
  if (status === "running") return <Loader2 size={16} className="animate-spin text-sky-500" />;
  if (status === "failed" || status === "blocked" || status === "needs_attention" || status === "incomplete") {
    return <AlertCircle size={16} className="text-amber-500" />;
  }
  return <Circle size={16} className="text-slate-400" />;
}

function OverviewCanvas({ modules }) {
  const entries = Object.entries(modules || {});
  if (!entries.length) return <EmptyCanvas />;

  return (
    <div className="space-y-5">
      {entries.map(([module, resources]) => (
        <section key={module} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="font-semibold capitalize">{label(module)}</h4>
            <span className="text-xs text-slate-500">{Object.keys(resources).length} tracked resources</span>
          </div>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {Object.entries(resources).map(([resource, count]) => (
              <article key={resource} className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
                <p className="truncate text-xs capitalize text-slate-500">{label(resource)}</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">{Number(count).toLocaleString()}</p>
                <p className="mt-1 text-[11px] text-slate-500">records in workspace</p>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function RecordsCanvas({ view }) {
  const rows = useMemo(() => view.rows || [], [view.rows]);
  const columns = useMemo(() => {
    const fields = [...new Set(rows.flatMap((row) => Object.keys(row)))];
    return fields.filter((field) => !["object", "id", "createdAt", "updatedAt"].includes(field)).slice(0, 5);
  }, [rows]);

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
        <div>
          <h4 className="font-semibold">{view.title || label(view.resource)}</h4>
          <p className="text-xs text-slate-500">{view.total ?? rows.length} matching records</p>
        </div>
        <Search size={16} className="text-slate-400" />
      </div>
      {rows.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800">
              <tr>{columns.map((column) => <th key={column} className="px-4 py-2 font-medium">{label(column)}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {rows.map((row, index) => (
                <tr key={row.id || index}>
                  {columns.map((column) => (
                    <td key={column} className="max-w-64 truncate px-4 py-3">{String(row[column] ?? "—")}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="p-5 text-sm text-slate-500">No matching records were found.</p>}
    </section>
  );
}

const isScalar = (value) => value === null || ["string", "number", "boolean"].includes(typeof value);
const formatScalar = (value) =>
  typeof value === "number" ? value.toLocaleString() : value === null || value === "" ? "—" : String(value);

function StatTiles({ entries }) {
  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {entries.map(([key, value]) => (
        <article key={key} className="min-w-0 rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
          <p className="truncate text-xs capitalize text-slate-500">{label(key)}</p>
          <p className="mt-1 truncate text-xl font-semibold tabular-nums">{formatScalar(value)}</p>
        </article>
      ))}
    </div>
  );
}

/**
 * A read-only solution view that returns a summary object rather than a list —
 * pipeline by stage, capacity, the services dashboard. Scalars become tiles,
 * one level of nested objects becomes its own group of tiles, and lists of rows
 * reuse the records table.
 */
function SummaryCanvas({ view }) {
  const entries = Object.entries(view.data || {});
  if (!entries.length) return <EmptyCanvas />;
  const scalars = entries.filter(([, value]) => isScalar(value));
  const groups = entries.filter(([, value]) => value && typeof value === "object" && !Array.isArray(value));
  const tables = entries.filter(([, value]) => Array.isArray(value) && value.some((row) => row && typeof row === "object"));

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <h4 className="mb-3 font-semibold">{view.title}</h4>
        {scalars.length ? <StatTiles entries={scalars} /> : null}
        {groups.map(([key, value]) => {
          const inner = Object.entries(value).filter(([, item]) => isScalar(item));
          return inner.length ? (
            <div key={key} className="mt-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">{label(key)}</p>
              <StatTiles entries={inner} />
            </div>
          ) : null;
        })}
      </section>
      {tables.map(([key, rows]) => (
        <RecordsCanvas key={key} view={{ title: label(key), rows, total: rows.length }} />
      ))}
    </div>
  );
}

function RecordCanvas({ view }) {
  const record = view.record || {};
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <h4 className="mb-3 font-semibold">{view.title || "Record"} {view.action === "create" ? "created" : "updated"}</h4>
      <dl className="grid gap-3 sm:grid-cols-2">
        {Object.entries(record)
          .filter(([key]) => !["object", "id", "createdAt", "updatedAt"].includes(key))
          .map(([key, value]) => (
            <div key={key} className="min-w-0 rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
              <dt className="text-xs capitalize text-slate-500">{label(key)}</dt>
              <dd className="mt-1 break-words text-sm font-medium">{String(value ?? "—")}</dd>
            </div>
          ))}
      </dl>
    </section>
  );
}

function PythonCanvas({ view }) {
  const output = typeof view.output === "string" ? view.output : JSON.stringify(view.output, null, 2);
  return (
    <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950 text-slate-100">
      <div className="flex items-center gap-2 border-b border-slate-800 px-4 py-3 text-xs">
        <Code2 size={15} className="text-sky-400" />
        <span className="font-medium">Isolated Python result</span>
        <span className="ml-auto rounded-full bg-emerald-950 px-2 py-0.5 text-[10px] text-emerald-300">completed</span>
      </div>
      <pre className="max-h-80 overflow-auto p-4 text-xs leading-5">{output || "No output returned."}</pre>
    </section>
  );
}

function PoliciesCanvas({ documents = [] }) {
  if (!documents.length) return <EmptyCanvas />;
  return (
    <section className="space-y-3">
      {documents.map((document) => (
        <article key={`${document.id}-${document.section}`} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h4 className="font-semibold">{document.title}</h4>
            <a className="text-xs text-slate-500 underline underline-offset-2" href={document.source} target="_blank" rel="noreferrer">
              {document.source}
            </a>
          </div>
          <p className="mt-1 text-xs font-medium text-slate-500">{document.section}</p>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-300">{document.content}</p>
        </article>
      ))}
    </section>
  );
}

function WorkflowsCanvas({ rows = [] }) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
      <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-700">
        <h4 className="font-semibold">Automation workflows</h4>
        <p className="text-xs text-slate-500">Read-only workflow summaries</p>
      </div>
      {rows.length ? rows.map((workflow) => (
        <article key={workflow.id} className="border-b border-slate-100 px-4 py-3 last:border-0 dark:border-slate-800">
          <div className="flex items-center justify-between gap-3">
            <h5 className="truncate text-sm font-medium">{workflow.name}</h5>
            <span className="text-xs text-slate-500">{workflow.active ? "Active" : "Paused"}</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">{workflow.triggerEvent} · {workflow.runCount} runs</p>
          {workflow.description && <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{workflow.description}</p>}
        </article>
      )) : <p className="px-4 py-5 text-sm text-slate-500">No automation workflows found.</p>}
    </section>
  );
}

function EmptyCanvas() {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white/70 px-6 text-center dark:border-slate-700 dark:bg-slate-900/50">
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300">
        <Activity size={26} />
      </span>
      <h3 className="text-lg font-semibold">Your workspace canvas is ready</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
        Describe an outcome. ExecAI will map the authorized tools it uses, show each step, and render the records or workspace metrics here.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {["Live task steps", "Workspace data views", "Audited changes"].map((item) => (
          <span key={item} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">{item}</span>
        ))}
      </div>
    </div>
  );
}

export default function ExecAIWorkbench() {
  const { theme } = useSidebar();
  const isDark = theme === "dark";
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeRun, setActiveRun] = useState(null);
  const [lastRun, setLastRun] = useState(loadLastRun);
  const [runHistory, setRunHistory] = useState([]);

  const shell = isDark
    ? "border-slate-700 bg-slate-950 text-slate-100"
    : "border-slate-200 bg-slate-50 text-slate-900";

  useEffect(() => {
    if (!open || minimized) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
        setMinimized(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, minimized]);

  useEffect(() => {
    if (!open || minimized) return undefined;
    let active = true;
    assistant.runs({ limit: 8 })
      .then(({ runs = [] }) => {
        if (active) setRunHistory(runs);
      })
      .catch((historyError) => {
        if (active) setError(`Could not load saved ExecAI runs: ${historyError.message}`);
      });
    return () => { active = false; };
  }, [open, minimized]);

  async function submit(prompt = input) {
    const command = prompt.trim();
    if (!command || loading) return;

    setInput("");
    setError("");
    setLoading(true);
    setActiveRun({
      request: command,
      startedAt: new Date().toISOString(),
      status: "running",
      steps: [],
      reply: "",
      visualization: [],
    });

    let streamRunId = null;
    const streamedSteps = [];
    try {
      const data = await assistant.stream({ message: command, history: [] }, (event) => {
        if (event.type === "started") {
          streamRunId = event.runId;
          setActiveRun((current) => ({ ...current, runId: event.runId }));
        }
        if (event.type === "step") {
          const nextSteps = [...streamedSteps.filter((step) => step.id !== event.step.id), event.step];
          streamedSteps.splice(0, streamedSteps.length, ...nextSteps);
          setActiveRun((current) => ({
            ...current,
            steps: nextSteps,
          }));
        }
      });
      const run = {
        runId: data.task?.runId,
        request: command,
        label: data.task?.label || "Workspace automation",
        status: data.task?.status || "unknown",
        completedAt: data.task?.completedAt || new Date().toISOString(),
        summary: shortSummary(data.reply),
        reply: data.reply || "",
        steps: data.task?.steps || [],
        visualization: data.task?.visualization || [],
        modules: data.task?.modules || [],
        pythonRuntime: data.task?.pythonRuntime || "not_configured",
      };
      setActiveRun(run);
      setLastRun(run);
      saveLastRun(run);
      setRunHistory((current) => [
        {
          id: run.runId,
          request: command,
          status: run.status,
          summary: run.summary,
          startedAt: run.completedAt,
          completedAt: run.completedAt,
        },
        ...current.filter(({ id }) => id !== run.runId),
      ].slice(0, 8));
    } catch (requestError) {
      const failedRun = {
        runId: streamRunId,
        request: command,
        label: "Workspace automation",
        status: "failed",
        completedAt: new Date().toISOString(),
        summary: requestError.message || "ExecAI could not complete this request.",
        reply: "",
        steps: streamedSteps,
        visualization: [],
      };
      setActiveRun(failedRun);
      setLastRun(failedRun);
      setError(failedRun.summary);
      saveLastRun(failedRun);
      if (streamRunId) {
        setRunHistory((current) => [{
          id: streamRunId,
          request: command,
          status: "failed",
          summary: failedRun.summary,
          startedAt: failedRun.completedAt,
          completedAt: failedRun.completedAt,
        }, ...current.filter(({ id }) => id !== streamRunId)].slice(0, 8));
      }
    } finally {
      setLoading(false);
    }
  }

  function close() {
    setOpen(false);
    setMinimized(false);
  }

  const views = activeRun?.visualization || [];
  const hasCompletedRun = !!activeRun && activeRun.status !== "running";

  return (
    <>
      {open && !minimized && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/30 p-2 backdrop-blur-[1px] sm:p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) close();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="execai-title"
            className={`flex h-[min(58rem,calc(100dvh-1rem))] w-[min(96rem,calc(100vw-1rem))] flex-col overflow-hidden rounded-2xl border shadow-2xl ${shell}`}
          >
            <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900 sm:px-5">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900">
                  <Bot size={21} />
                </span>
                <div className="min-w-0">
                  <h2 id="execai-title" className="font-semibold">ExecAI Workbench</h2>
                  <p className="text-xs text-slate-500">Workspace automation · visual run canvas</p>
                </div>
                <span className="hidden items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 sm:flex">
                  <ShieldCheck size={13} /> Role &amp; tenant scoped
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="hidden rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 md:inline-flex">
                  Python runtime not connected
                </span>
                <button type="button" onClick={() => setMinimized(true)} className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Minimize ExecAI">
                  <Minimize2 size={17} />
                </button>
                <button type="button" onClick={close} className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close ExecAI">
                  <X size={18} />
                </button>
              </div>
            </header>

            <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[13rem_minmax(0,1fr)_18rem]">
              <aside className="hidden min-h-0 flex-col border-r border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 lg:flex">
                <div>
                  <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Workbench</p>
                  <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2.5 text-sm font-medium dark:bg-slate-800">
                    <Activity size={16} className="text-sky-600 dark:text-sky-400" /> Current run
                  </div>
                </div>
                <div className="mt-6">
                  <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Available tools</p>
                  <div className="space-y-1">
                    {["Workspace metrics", "Record search", "Create & update when permitted", "ExecUI policy search", "Workflow summaries (admins)"].map((tool) => (
                      <div key={tool} className="flex items-center gap-2 rounded-lg px-2 py-2 text-xs text-slate-600 dark:text-slate-300">
                        <CheckCircle2 size={14} className="text-emerald-500" /> {tool}
                      </div>
                    ))}
                    <div className="flex items-center gap-2 rounded-lg px-2 py-2 text-xs text-slate-400">
                      <Circle size={14} /> Python sandbox
                    </div>
                  </div>
                </div>
                <div className="mt-5 min-h-0 flex-1 overflow-y-auto">
                  <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Saved runs</p>
                  <div className="space-y-1">
                    {runHistory.map((run) => (
                      <button
                        key={run.id}
                        type="button"
                        onClick={async () => {
                          try {
                            const saved = await assistant.run(run.id);
                            const result = saved.result;
                            setActiveRun({
                              ...(result?.task || {}),
                              request: saved.request,
                              reply: saved.response || result?.reply || "",
                              summary: saved.summary || shortSummary(result?.reply),
                              label: result?.task?.label || "Workspace automation",
                              status: saved.status,
                              steps: saved.steps || result?.task?.steps || [],
                              visualization: result?.task?.visualization || [],
                              completedAt: saved.completedAt || saved.startedAt,
                            });
                            setError("");
                          } catch (loadError) {
                            setError(`Could not load saved run: ${loadError.message}`);
                          }
                        }}
                        className="w-full truncate rounded-lg px-2 py-2 text-left text-xs text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                        title={run.request}
                      >
                        <span className="block truncate">{run.request}</span>
                        <span className="mt-1 block text-[10px] text-slate-400">{label(run.status)} · {new Date(run.startedAt).toLocaleString()}</span>
                      </button>
                    ))}
                    {!runHistory.length && <p className="px-2 text-xs text-slate-400">No saved runs yet.</p>}
                  </div>
                </div>
                <div className="mt-auto rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                  <div className="flex items-center gap-2 text-xs font-medium">
                    <Code2 size={14} /> Execution policy
                  </div>
                  <p className="mt-2 text-[11px] leading-5 text-slate-500">Autonomous within your existing module access. Record changes use validated fields and are audited. Deletes and external messages are unavailable.</p>
                </div>
              </aside>

              <main className="min-h-0 overflow-y-auto p-3 sm:p-5">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Workspace canvas</p>
                    <h3 className="mt-1 truncate text-lg font-semibold">
                      {activeRun?.request || "Live workspace view"}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {loading ? "ExecAI is executing the requested workflow…" : hasCompletedRun ? activeRun.summary : "Choose a task or describe what you want done."}
                    </p>
                  </div>
                  {activeRun && (
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${activeRun.status === "completed" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300" : activeRun.status === "running" ? "bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300" : "bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"}`}>
                      <StatusMark status={activeRun.status} /> {label(activeRun.status)}
                    </span>
                  )}
                </div>

                {loading && (
                  <div className="mb-4 flex items-center gap-3 rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-100" role="status">
                    <Loader2 size={18} className="animate-spin" />
                    <span>Planning and running authorized workspace tools. Results will appear here.</span>
                  </div>
                )}

                {error && <p role="alert" className="mb-4 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">{error}</p>}

                {views.length ? (
                  <div className="space-y-4">
                    {views.map((view, index) => (
                      <div key={`${view.kind}-${view.resource || index}`}>
                        {view.kind === "overview" && <OverviewCanvas modules={view.data?.modules} />}
                        {view.kind === "records" && <RecordsCanvas view={view} />}
                        {view.kind === "summary" && <SummaryCanvas view={view} />}
                        {view.kind === "record" && <RecordCanvas view={view} />}
                        {view.kind === "python" && <PythonCanvas view={view} />}
                        {view.kind === "policies" && <PoliciesCanvas documents={view.documents} />}
                        {view.kind === "workflows" && <WorkflowsCanvas rows={view.rows} />}
                      </div>
                    ))}
                  </div>
                ) : <EmptyCanvas />}

                <section className="mt-5 rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                  <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                      <Activity size={16} className="text-sky-600 dark:text-sky-400" />
                      <h4 className="text-sm font-semibold">Workflow steps</h4>
                    </div>
                    <span className="text-xs text-slate-500">{activeRun?.steps?.length || 0} actions</span>
                  </div>
                  {activeRun?.steps?.length ? (
                    <ol className="divide-y divide-slate-100 dark:divide-slate-800">
                      {activeRun.steps.map((step, index) => (
                        <li key={step.id || index} className="flex items-start gap-3 px-4 py-3">
                          <span className="mt-0.5"><StatusMark status={step.status} /></span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium">{label(step.action)} {step.resource ? label(step.resource) : "workspace"}</p>
                            <p className="mt-0.5 text-xs text-slate-500">{step.summary}</p>
                          </div>
                          <span className="shrink-0 text-[11px] tabular-nums text-slate-400">{step.durationMs} ms</span>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <div className="flex items-center gap-2 px-4 py-4 text-xs text-slate-500">
                      <ChevronRight size={14} /> Run a task to inspect its authorized actions and results.
                    </div>
                  )}
                </section>
              </main>

              <aside className="flex min-h-0 flex-col border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:border-l lg:border-t-0">
                <div className="border-b border-slate-200 p-4 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-sky-600 dark:text-sky-400" />
                    <h3 className="text-sm font-semibold">Give ExecAI a goal</h3>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-500">The command is translated into visible, permission-scoped workspace actions.</p>
                </div>

                <div className="space-y-2 border-b border-slate-200 p-4 dark:border-slate-800">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Quick actions</p>
                  {QUICK_ACTIONS.map(({ label: actionLabel, icon: Icon, prompt }) => (
                    <button
                      key={actionLabel}
                      type="button"
                      disabled={loading}
                      onClick={() => submit(prompt)}
                      className="flex w-full items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-left text-xs font-medium transition hover:border-sky-300 hover:bg-sky-50 disabled:opacity-50 dark:border-slate-700 dark:hover:border-sky-800 dark:hover:bg-sky-950/30"
                    >
                      <Icon size={15} className="text-sky-600 dark:text-sky-400" />
                      <span className="flex-1">{actionLabel}</span>
                      <ArrowRight size={13} className="text-slate-400" />
                    </button>
                  ))}
                </div>

                <form
                  className="flex min-h-0 flex-1 flex-col p-4"
                  onSubmit={(event) => { event.preventDefault(); submit(); }}
                >
                  <label htmlFor="execai-command" className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Command</label>
                  <textarea
                    id="execai-command"
                    rows={4}
                    maxLength={1200}
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder="Example: Find high-priority open tickets and summarize them"
                    className="min-h-28 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-sky-950"
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || loading}
                    className="mt-3 flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Play size={15} />}
                    {loading ? "Running…" : "Run workflow"}
                  </button>
                  <p className="mt-2 text-[10px] leading-4 text-slate-400">Do not include passwords, payment credentials, or sensitive personal data.</p>
                </form>

                <div className="border-t border-slate-200 p-4 dark:border-slate-800">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Activity log</p>
                  {activeRun?.steps?.length ? (
                    <div className="max-h-28 space-y-2 overflow-y-auto">
                      {activeRun.steps.map((step, index) => (
                        <div key={step.id || index} className="flex items-start gap-2 text-[11px]">
                          <StatusMark status={step.status} />
                          <p className="min-w-0 flex-1 text-slate-600 dark:text-slate-300">{step.summary || `${label(step.action)} ${label(step.resource)}`}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="flex items-center gap-2 text-[11px] text-slate-500"><Terminal size={13} /> No actions run yet.</p>
                  )}
                  {activeRun?.pythonRuntime !== "configured" && (
                    <p className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3 text-[11px] text-amber-700 dark:border-slate-800 dark:text-amber-300">
                      <Code2 size={13} /> Isolated Python service is not configured; data tools remain available.
                    </p>
                  )}
                </div>
              </aside>
            </div>
          </section>
        </div>
      )}

      {open && minimized && (
        <div className={`fixed bottom-5 right-5 z-[100] flex w-80 max-w-[calc(100vw-2.5rem)] items-center gap-3 rounded-xl border p-3 shadow-xl ${shell}`}>
          <Bot size={20} className="shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{loading ? "ExecAI is running" : "ExecAI workbench minimized"}</p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">{activeRun?.summary || activeRun?.request || lastRun?.summary || "Your workspace is ready."}</p>
          </div>
          <button type="button" onClick={() => setMinimized(false)} className="rounded-lg p-2 hover:bg-slate-200 dark:hover:bg-slate-700" aria-label="Restore ExecAI">
            <Maximize2 size={16} />
          </button>
          <button type="button" onClick={close} className="rounded-lg p-2 hover:bg-slate-200 dark:hover:bg-slate-700" aria-label="Close ExecAI">
            <X size={16} />
          </button>
        </div>
      )}

      {!open && (
        <div className="fixed bottom-5 right-5 z-50 flex max-w-[calc(100vw-2.5rem)] flex-col items-end gap-3">
          {lastRun && (
            <button type="button" onClick={() => { if (!activeRun) setActiveRun(lastRun); setOpen(true); }} className={`flex w-80 max-w-full items-start gap-3 rounded-xl border p-3 text-left shadow-lg ${shell}`}>
              <StatusMark status={lastRun.status} />
              <span className="min-w-0">
                <span className="block text-xs font-semibold">{lastRun.label} · {label(lastRun.status)}</span>
                <span className="mt-1 block truncate text-xs text-slate-500 dark:text-slate-400">{lastRun.summary}</span>
                {lastRun.steps?.length > 0 && (
                  <span className="mt-2 block space-y-1 border-t border-slate-200 pt-2 text-[10px] dark:border-slate-700">
                    {lastRun.steps.slice(0, 2).map((step) => (
                      <span key={step.id} className="flex items-center gap-1.5">
                        <StatusMark status={step.status} />
                        <span className="truncate">{step.summary}</span>
                      </span>
                    ))}
                    {lastRun.steps.length > 2 && <span className="block text-slate-500">+{lastRun.steps.length - 2} more workflow steps</span>}
                  </span>
                )}
              </span>
            </button>
          )}
          <button type="button" onClick={() => { if (!activeRun) setActiveRun(lastRun); setOpen(true); setMinimized(false); }} className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-white shadow-xl transition hover:scale-105 active:scale-95 dark:bg-slate-100 dark:text-slate-900" aria-label="Open ExecAI workspace agent">
            <Bot size={23} />
          </button>
        </div>
      )}
    </>
  );
}
