/**
 * Workflow automation — "when this happens, do that".
 *
 * The builder only offers triggers, fields, operators and actions the server
 * actually accepts (it reads them from /workflows/catalog, which is generated
 * from the same registry the engine validates against). A rule you can compose
 * here is a rule that will save.
 */
import { useMemo, useState } from "react";
import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody } from "../../components/ui/Card";
import { useApi } from "../../hooks/useApi";
import { useToast } from "../../components/ui/Toast";
import { workflows } from "../../services/api";
import {
  Zap, Plus, X, Trash2, Play, Pause, FlaskConical, History, AlertCircle,
  CheckCircle2, RefreshCw, ChevronRight, Filter, Bolt,
} from "lucide-react";

const cls = (...a) => a.filter(Boolean).join(" ");
const input = "w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white";
const when = (d) => (d ? new Date(d).toLocaleString() : "—");

const blankWorkflow = () => ({
  name: "", description: "", triggerEvent: "", match: "all",
  conditions: [], actions: [], oncePerRecord: false, active: true,
});

function Field({ label, children, hint }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-slate-400">{hint}</span>}
    </label>
  );
}

// ── Action editor ────────────────────────────────────────────────────────────
function ActionEditor({ action, catalog, triggerResource, onChange, onRemove }) {
  const resources = catalog?.resources || [];
  const targetResource = resources.find((r) => r.id === (action.resource || triggerResource));
  const triggerFields = (catalog?.resourceFields?.[triggerResource] || []).filter((f) => f.writable);

  const setField = (k, v) => onChange({ ...action, [k]: v });
  const setFieldMap = (key, value) => onChange({ ...action, fields: { ...(action.fields || {}), [key]: value } });
  const dropField = (key) => {
    const next = { ...(action.fields || {}) };
    delete next[key];
    onChange({ ...action, fields: next });
  };

  return (
    <div className="space-y-2 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
      <div className="flex items-center gap-2">
        <Bolt size={13} className="text-indigo-500" />
        <select className={cls(input, "flex-1")} value={action.type} onChange={(e) => onChange({ type: e.target.value })}>
          {(catalog?.actions || []).map((a) => <option key={a.type} value={a.type}>{a.label}</option>)}
        </select>
        <button onClick={onRemove} className="rounded p-1 text-slate-400 hover:text-red-500"><X size={14} /></button>
      </div>

      {action.type === "update_record" && (
        <div className="space-y-1.5">
          <span className="text-[11px] text-slate-400">Set fields on the triggering record. Use <code>{"{{record.field}}"}</code> to reference its values.</span>
          {Object.entries(action.fields || {}).map(([k, v]) => (
            <div key={k} className="flex items-center gap-1.5">
              <span className="w-32 shrink-0 truncate text-xs text-slate-600 dark:text-slate-300">{k}</span>
              <input className={input} value={v} onChange={(e) => setFieldMap(k, e.target.value)} />
              <button onClick={() => dropField(k)} className="rounded p-1 text-slate-400 hover:text-red-500"><X size={13} /></button>
            </div>
          ))}
          <select className={input} value="" onChange={(e) => e.target.value && setFieldMap(e.target.value, "")}>
            <option value="">Add a field…</option>
            {triggerFields.filter((f) => !(action.fields || {})[f.key]).map((f) => <option key={f.key} value={f.key}>{f.key}</option>)}
          </select>
        </div>
      )}

      {action.type === "create_record" && (
        <div className="space-y-1.5">
          <select className={input} value={action.resource || ""} onChange={(e) => onChange({ ...action, resource: e.target.value, fields: {} })}>
            <option value="">Choose a record type…</option>
            {resources.filter((r) => !r.readOnly).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          {targetResource && (
            <>
              {Object.entries(action.fields || {}).map(([k, v]) => (
                <div key={k} className="flex items-center gap-1.5">
                  <span className="w-32 shrink-0 truncate text-xs text-slate-600 dark:text-slate-300">{k}</span>
                  <input className={input} value={v} onChange={(e) => setFieldMap(k, e.target.value)} />
                  <button onClick={() => dropField(k)} className="rounded p-1 text-slate-400 hover:text-red-500"><X size={13} /></button>
                </div>
              ))}
              <select className={input} value="" onChange={(e) => e.target.value && setFieldMap(e.target.value, "")}>
                <option value="">Add a field…</option>
                {targetResource.fields.filter((f) => f.writable && !(action.fields || {})[f.key])
                  .map((f) => <option key={f.key} value={f.key}>{f.key}{f.required ? " (required)" : ""}</option>)}
              </select>
            </>
          )}
        </div>
      )}

      {action.type === "notify" && (
        <div className="space-y-1.5">
          <div className="flex gap-1.5">
            <select className={cls(input, "w-36")} value={action.audience?.type || "admins"}
              onChange={(e) => setField("audience", { type: e.target.value, value: "" })}>
              {(catalog?.audiences || []).map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
            {["role", "department", "user"].includes(action.audience?.type) && (
              <input className={input} placeholder={action.audience.type === "department" ? "Finance" : action.audience.type === "role" ? "enterprise_admin" : "user id"}
                value={action.audience?.value || ""} onChange={(e) => setField("audience", { ...action.audience, value: e.target.value })} />
            )}
          </div>
          <input className={input} placeholder="Title — e.g. Big deal won: {{record.name}}" value={action.title || ""} onChange={(e) => setField("title", e.target.value)} />
          <input className={input} placeholder="Body (optional)" value={action.body || ""} onChange={(e) => setField("body", e.target.value)} />
        </div>
      )}

      {action.type === "send_email" && (
        <div className="space-y-1.5">
          <input className={input} placeholder="to@example.com, {{record.email}}" value={Array.isArray(action.to) ? action.to.join(", ") : action.to || ""}
            onChange={(e) => setField("to", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} />
          <input className={input} placeholder="Subject" value={action.subject || ""} onChange={(e) => setField("subject", e.target.value)} />
          <textarea className={cls(input, "min-h-16")} placeholder="Body" value={action.body || ""} onChange={(e) => setField("body", e.target.value)} />
        </div>
      )}

      {action.type === "request_approval" && (
        <div className="space-y-1.5">
          <input className={input} placeholder="Approval title — e.g. Approve discount on {{record.name}}" value={action.title || ""} onChange={(e) => setField("title", e.target.value)} />
          {(action.steps || []).map((s, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <input className={cls(input, "w-32")} placeholder={`Step ${i + 1}`} value={s.name || ""}
                onChange={(e) => setField("steps", action.steps.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
              <select className={cls(input, "w-32")} value={s.approvers?.type || "role"}
                onChange={(e) => setField("steps", action.steps.map((x, j) => j === i ? { ...x, approvers: { type: e.target.value, value: "" } } : x))}>
                {(catalog?.audiences || []).map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
              {["role", "department", "user"].includes(s.approvers?.type) && (
                <input className={input} placeholder="Finance / enterprise_admin" value={s.approvers?.value || ""}
                  onChange={(e) => setField("steps", action.steps.map((x, j) => j === i ? { ...x, approvers: { ...x.approvers, value: e.target.value } } : x))} />
              )}
              <button onClick={() => setField("steps", action.steps.filter((_, j) => j !== i))} className="rounded p-1 text-slate-400 hover:text-red-500"><X size={13} /></button>
            </div>
          ))}
          <button onClick={() => setField("steps", [...(action.steps || []), { name: "", approvers: { type: "role", value: "" }, requiredCount: 1 }])}
            className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400">
            <Plus size={12} /> Add approval step
          </button>
        </div>
      )}
    </div>
  );
}

// ── Builder ──────────────────────────────────────────────────────────────────
function Builder({ catalog, draft, setDraft, onSave, onCancel, saving }) {
  const triggerResource = (draft.triggerEvent || "").split(".")[0];
  const fields = catalog?.resourceFields?.[triggerResource] || [];
  const ops = catalog?.operators || [];

  return (
    <Card>
      <CardBody className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name"><input className={input} placeholder="Escalate urgent tickets" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field>
          <Field label="When this happens">
            <select className={input} value={draft.triggerEvent}
              onChange={(e) => setDraft({ ...draft, triggerEvent: e.target.value, conditions: [], actions: [] })}>
              <option value="">Choose a trigger…</option>
              {(catalog?.triggers || []).map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
        </div>

        {triggerResource && (
          <>
            {/* Conditions */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Filter size={14} className="text-indigo-500" />
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Only if</h4>
                <select className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  value={draft.match} onChange={(e) => setDraft({ ...draft, match: e.target.value })}>
                  <option value="all">all match</option>
                  <option value="any">any match</option>
                </select>
                <span className="text-[11px] text-slate-400">(leave empty to run on every event)</span>
              </div>
              {draft.conditions.map((c, i) => {
                const op = ops.find((o) => o.op === c.op);
                return (
                  <div key={i} className="flex items-center gap-1.5">
                    <select className={input} value={c.field} onChange={(e) => setDraft({ ...draft, conditions: draft.conditions.map((x, j) => j === i ? { ...x, field: e.target.value } : x) })}>
                      {fields.map((f) => <option key={f.key} value={f.key}>{f.key}</option>)}
                    </select>
                    <select className={cls(input, "w-40")} value={c.op} onChange={(e) => setDraft({ ...draft, conditions: draft.conditions.map((x, j) => j === i ? { ...x, op: e.target.value } : x) })}>
                      {ops.map((o) => <option key={o.op} value={o.op}>{o.label}</option>)}
                    </select>
                    {!op?.valueless && (
                      <input className={input} placeholder="value" value={c.value ?? ""} onChange={(e) => setDraft({ ...draft, conditions: draft.conditions.map((x, j) => j === i ? { ...x, value: e.target.value } : x) })} />
                    )}
                    <button onClick={() => setDraft({ ...draft, conditions: draft.conditions.filter((_, j) => j !== i) })} className="rounded p-1 text-slate-400 hover:text-red-500"><X size={14} /></button>
                  </div>
                );
              })}
              <button onClick={() => setDraft({ ...draft, conditions: [...draft.conditions, { field: fields[0]?.key || "", op: "eq", value: "" }] })}
                className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"><Plus size={12} /> Add condition</button>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Zap size={14} className="text-indigo-500" />
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Then do</h4>
              </div>
              {draft.actions.map((a, i) => (
                <ActionEditor key={i} action={a} catalog={catalog} triggerResource={triggerResource}
                  onChange={(next) => setDraft({ ...draft, actions: draft.actions.map((x, j) => j === i ? next : x) })}
                  onRemove={() => setDraft({ ...draft, actions: draft.actions.filter((_, j) => j !== i) })} />
              ))}
              <button onClick={() => setDraft({ ...draft, actions: [...draft.actions, { type: "notify", audience: { type: "admins" }, title: "" }] })}
                className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"><Plus size={12} /> Add action</button>
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <input type="checkbox" checked={draft.oncePerRecord} onChange={(e) => setDraft({ ...draft, oncePerRecord: e.target.checked })} />
              Only run once per record
              <span className="text-[11px] text-slate-400">— stops an "updated" rule firing on every later edit</span>
            </label>
          </>
        )}

        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-3 py-1.5 text-sm text-slate-500 hover:text-slate-800">Cancel</button>
          <button onClick={onSave} disabled={saving || !draft.name.trim() || !draft.triggerEvent || !draft.actions.length}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
            {saving ? "Saving…" : "Save workflow"}
          </button>
        </div>
      </CardBody>
    </Card>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function Workflows() {
  const toast = useToast();
  const { data: catalog } = useApi(() => workflows.catalog(), [], { cacheKey: "wf:catalog" });
  const { data: list, refetch } = useApi(() => workflows.list(), [], { cacheKey: "wf:list" });
  const { data: runs, refetch: refetchRuns } = useApi(() => workflows.runs({ limit: 40 }), [], { cacheKey: "wf:runs" });

  const [tab, setTab] = useState("rules");
  const [draft, setDraft] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const byId = useMemo(() => Object.fromEntries((list || []).map((w) => [w.id, w])), [list]);

  const save = async () => {
    setSaving(true);
    try {
      if (editingId) await workflows.update(editingId, draft);
      else await workflows.create(draft);
      toast.success?.(editingId ? "Workflow updated." : "Workflow created.");
      setDraft(null); setEditingId(null); refetch();
    } catch (e) { toast.error?.(e.message); } finally { setSaving(false); }
  };

  const act = async (fn, msg) => {
    try { await fn(); toast.success?.(msg); refetch(); } catch (e) { toast.error?.(e.message); }
  };

  const test = async (id) => {
    try { setTestResult({ id, ...(await workflows.test(id)) }); }
    catch (e) { toast.error?.(e.message); }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Workflow automation"
        subtitle="Run actions automatically when your data changes — notify people, update records, or require approval."
        actions={
          !draft && (
            <button onClick={() => { setDraft(blankWorkflow()); setEditingId(null); setTab("rules"); }}
              className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500">
              <Plus size={13} /> New workflow
            </button>
          )
        }
      />

      <div className="mb-4 flex rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
        {[["rules", `Rules${list?.length ? ` (${list.length})` : ""}`, Zap], ["runs", "Run history", History]].map(([id, label, Icon]) => (
          <button key={id} onClick={() => { setTab(id); if (id === "runs") refetchRuns(); }}
            className={cls("inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition",
              tab === id ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300")}>
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {tab === "rules" && (
        <div className="space-y-3">
          {draft && (
            <Builder catalog={catalog} draft={draft} setDraft={setDraft} onSave={save} saving={saving}
              onCancel={() => { setDraft(null); setEditingId(null); }} />
          )}

          {!draft && !list?.length && (
            <Card><CardBody>
              <div className="py-14 text-center text-sm text-slate-400">
                <Zap size={26} className="mx-auto mb-2 opacity-40" />
                No automations yet. Create one to react automatically when records change.
              </div>
            </CardBody></Card>
          )}

          {!draft && list?.map((w) => (
            <Card key={w.id}>
              <CardBody className="space-y-2">
                <div className="flex flex-wrap items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-semibold text-slate-900 dark:text-white">{w.name}</p>
                      {!w.active && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500 dark:bg-slate-800">Paused</span>}
                      {w.lastStatus && <span className={cls("rounded-full px-2 py-0.5 text-[10px]",
                        w.lastStatus === "failed" ? "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400" : "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400")}>{w.lastStatus}</span>}
                    </div>
                    {w.summary && <p className="mt-0.5 text-xs text-slate-500">{w.summary}</p>}
                    <p className="mt-1 text-[11px] text-slate-400">
                      <code>{w.triggerEvent}</code> · {w.runCount} run(s) · Last {when(w.lastRunAt)}
                      {w.oncePerRecord ? " · once per record" : ""}
                    </p>
                    {w.lastError && <p className="mt-1 text-[11px] text-red-600 dark:text-red-400">{w.lastError}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button onClick={() => test(w.id)} title="Dry run against a real record"
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-600 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-300">
                      <FlaskConical size={12} /> Test
                    </button>
                    <button onClick={() => { setDraft({ ...w }); setEditingId(w.id); }}
                      className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-600 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-300">Edit</button>
                    <button onClick={() => act(() => workflows.update(w.id, { active: !w.active }), w.active ? "Paused." : "Enabled.")}
                      className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:text-indigo-600 dark:border-slate-700">
                      {w.active ? <Pause size={13} /> : <Play size={13} />}
                    </button>
                    <button onClick={() => window.confirm(`Delete "${w.name}"?`) && act(() => workflows.remove(w.id), "Deleted.")}
                      className="rounded-lg border border-slate-200 p-1.5 text-slate-400 hover:text-red-500 dark:border-slate-700"><Trash2 size={13} /></button>
                  </div>
                </div>

                {testResult?.id === w.id && (
                  <div className={cls("rounded-lg border p-2.5 text-xs",
                    testResult.matched ? "border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10" : "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50")}>
                    <div className="flex items-start gap-2">
                      {testResult.matched ? <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-500" /> : <AlertCircle size={14} className="mt-0.5 shrink-0 text-slate-400" />}
                      <div className="min-w-0">
                        <p className="text-slate-700 dark:text-slate-200">{testResult.message}</p>
                        {testResult.record && <p className="text-[11px] text-slate-400">Tested against: {testResult.record.label}</p>}
                        {testResult.rule && <p className="text-[11px] text-slate-400">Rule: {testResult.rule}</p>}
                      </div>
                      <button onClick={() => setTestResult(null)} className="ml-auto rounded p-0.5 text-slate-400 hover:text-slate-700"><X size={13} /></button>
                    </div>
                  </div>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {tab === "runs" && (
        <Card><CardBody>
          {!runs?.length ? (
            <p className="py-10 text-center text-sm text-slate-400">No runs yet — they appear here as your automations fire.</p>
          ) : (
            <div className="space-y-1.5">
              {runs.map((r) => (
                <div key={r.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 p-2.5 text-xs dark:border-slate-700">
                  <span className={cls("rounded-full px-2 py-0.5 text-[10px] font-medium",
                    r.status === "success" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                    : r.status === "failed" ? "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400"
                    : "bg-slate-100 text-slate-500 dark:bg-slate-800")}>{r.status}</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{byId[r.workflowId]?.name || "Workflow"}</span>
                  <code className="text-slate-400">{r.event}</code>
                  <span className="text-slate-400">{when(r.createdAt)} · {r.durationMs}ms</span>
                  {!r.matched && <span className="text-slate-400">· conditions not met</span>}
                  {Array.isArray(r.results) && r.results.length > 0 && (
                    <span className="ml-auto flex items-center gap-1 text-slate-500">
                      {r.results.map((x, i) => (
                        <span key={i} className="inline-flex items-center gap-0.5">
                          {i > 0 && <ChevronRight size={10} className="text-slate-300" />}
                          {x.ok === false ? <AlertCircle size={11} className="text-red-500" /> : <CheckCircle2 size={11} className="text-emerald-500" />}
                          {x.type}
                        </span>
                      ))}
                    </span>
                  )}
                  {r.error && <p className="w-full text-[11px] text-red-600 dark:text-red-400">{r.error}</p>}
                </div>
              ))}
            </div>
          )}
          <button onClick={refetchRuns} className="mt-3 inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800"><RefreshCw size={12} /> Refresh</button>
        </CardBody></Card>
      )}
    </div>
  );
}
