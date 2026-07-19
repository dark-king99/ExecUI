import { useMemo, useState } from "react";
import { useParams, NavLink, useLocation } from "react-router-dom";
import { Plus, Trash2, Search, Pencil } from "lucide-react";
import { crm } from "../../services/api";
import { useApi } from "../../hooks/useApi";
import { useToast } from "../../components/ui/Toast";
import { useIndustry } from "../../context/IndustryContext";
import { schemaFor, industrySolutionFor } from "./industries.config";
import { colorOf } from "./solutions.config";
import {
  Modal, Field, TextInput, SelectInput, PrimaryBtn, GhostBtn, Pill, Loading, ErrorNote, fmtNum, fmtDate,
} from "./components/crm-ui";

const titleCase = (s) => String(s || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const BUILTINS = new Set(["name", "status", "amount", "currency", "stage", "ownerName"]);

// Split a flat form-values object into the API shape { ...builtins, data:{…} }.
function toPayload(values) {
  const out = { data: {} };
  for (const [k, v] of Object.entries(values)) {
    if (BUILTINS.has(k)) out[k] = v;
    else out.data[k] = v;
  }
  return out;
}
// Flatten a record back into form values.
function toValues(record, fields) {
  const v = {};
  for (const f of fields) {
    if (BUILTINS.has(f.key)) v[f.key] = record[f.key] ?? "";
    else v[f.key] = record.data?.[f.key] ?? "";
  }
  if (record.stage) v.stage = record.stage;
  return v;
}

// ── Create / edit form ───────────────────────────────────────────────────────
function RecordForm({ schema, kind, stages, initial, onSubmit, onClose, onDelete, color, busy }) {
  const [values, setValues] = useState(initial ?? {});
  const set = (k, v) => setValues((s) => ({ ...s, [k]: v }));

  const fields = schema.fields;
  const submit = () => {
    if (!String(values.name ?? "").trim()) return;
    onSubmit(values);
  };

  return (
    <Modal
      title={initial?.name ? `Edit ${initial.name}` : "New record"}
      onClose={onClose}
      footer={
        <>
          {onDelete && (
            <button onClick={onDelete} className="mr-auto text-sm px-3 py-2 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition flex items-center gap-1.5">
              <Trash2 size={14} /> Delete
            </button>
          )}
          <GhostBtn onClick={onClose}>Cancel</GhostBtn>
          <PrimaryBtn onClick={submit} color={color} disabled={busy}>{busy ? "Saving…" : "Save"}</PrimaryBtn>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {kind === "pipeline" && stages?.length > 0 && (
          <Field label="Stage">
            <SelectInput value={values.stage ?? stages[0]} onChange={(e) => set("stage", e.target.value)}>
              {stages.map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}
            </SelectInput>
          </Field>
        )}
        {fields.map((f) => (
          <Field key={f.key} label={f.label + (f.required ? " *" : "")}>
            {f.type === "select" ? (
              <SelectInput value={values[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)}>
                <option value="">Select…</option>
                {f.options.map((o) => <option key={o} value={o}>{titleCase(o)}</option>)}
              </SelectInput>
            ) : f.type === "textarea" ? (
              <textarea
                value={values[f.key] ?? ""}
                onChange={(e) => set(f.key, e.target.value)}
                rows={3}
                className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            ) : (
              <TextInput
                type={f.type === "number" ? "number" : f.type === "date" ? "date" : f.type === "tel" ? "tel" : f.type === "email" ? "email" : "text"}
                value={values[f.key] ?? ""}
                onChange={(e) => set(f.key, e.target.value)}
              />
            )}
          </Field>
        ))}
      </div>
    </Modal>
  );
}

// ── Pipeline (Kanban) view ───────────────────────────────────────────────────
function Pipeline({ records, stages, color, onOpen }) {
  const c = colorOf(color);
  const byStage = useMemo(() => {
    const m = Object.fromEntries(stages.map((s) => [s, []]));
    for (const r of records) (m[r.stage] ??= []).push(r);
    return m;
  }, [records, stages]);

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {stages.map((s) => {
        const items = byStage[s] ?? [];
        const total = items.reduce((sum, r) => sum + (r.amount || 0), 0);
        return (
          <div key={s} className="w-64 shrink-0">
            <div className="flex items-center justify-between px-1 mb-2">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{titleCase(s)}</span>
              <span className="text-[11px] text-slate-400">{items.length}</span>
            </div>
            <div className="space-y-2">
              {items.map((r) => (
                <button
                  key={r.id}
                  onClick={() => onOpen(r)}
                  className="w-full text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 hover:shadow-sm hover:-translate-y-0.5 transition"
                >
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{r.name}</p>
                  <div className="flex items-center justify-between mt-1.5">
                    {r.amount != null ? <span className={`text-xs font-semibold ${c.text}`}>{r.currency} {fmtNum(r.amount)}</span> : <span />}
                    {r.ownerName && <span className="text-[11px] text-slate-400 truncate">{r.ownerName}</span>}
                  </div>
                </button>
              ))}
              {items.length === 0 && <p className="text-[11px] text-slate-300 dark:text-slate-600 px-1 py-3 text-center">—</p>}
            </div>
            {total > 0 && <p className="text-[11px] text-slate-400 px-1 mt-2">Σ {fmtNum(total)}</p>}
          </div>
        );
      })}
    </div>
  );
}

// ── List (table) view ────────────────────────────────────────────────────────
function ListTable({ records, columns, onOpen }) {
  const cell = (r, key) => {
    if (key === "amount") return r.amount != null ? `${r.currency} ${fmtNum(r.amount)}` : "—";
    if (key === "status") return <Pill>{titleCase(r.status)}</Pill>;
    if (key === "stage") return r.stage ? <Pill color="sky">{titleCase(r.stage)}</Pill> : "—";
    if (BUILTINS.has(key)) return r[key] ?? "—";
    return r.data?.[key] ?? "—";
  };
  return (
    <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400">
          <tr>
            <th className="text-left font-medium px-4 py-2.5">Name</th>
            {columns.map((col) => <th key={col.key} className="text-left font-medium px-4 py-2.5 hidden sm:table-cell">{col.label}</th>)}
            <th className="text-left font-medium px-4 py-2.5 hidden md:table-cell">Updated</th>
            <th className="px-4 py-2.5" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {records.map((r) => (
            <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer" onClick={() => onOpen(r)}>
              <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-white">{r.name}</td>
              {columns.map((col) => <td key={col.key} className="px-4 py-2.5 text-slate-600 dark:text-slate-300 hidden sm:table-cell">{cell(r, col.key)}</td>)}
              <td className="px-4 py-2.5 text-slate-400 hidden md:table-cell">{fmtDate(r.updatedAt)}</td>
              <td className="px-4 py-2.5 text-right"><Pencil size={13} className="text-slate-300" /></td>
            </tr>
          ))}
        </tbody>
      </table>
      {records.length === 0 && <p className="text-center text-sm text-slate-400 py-10">No records yet. Click “New” to add one.</p>}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function IndustryObjectPage() {
  const { industryId, objectType } = useParams();
  const { pathname } = useLocation();
  const { currentEntry, loading: indLoading } = useIndustry();
  const toast = useToast();

  // The same page serves both the CRM and Marketing surfaces.
  const surface = pathname.startsWith("/marketing") ? "marketing" : "crm";
  const industrySolution = industrySolutionFor(industryId, currentEntry, surface);

  const obj = currentEntry?.objects?.find((o) => o.id === objectType) ?? null;
  const kind = obj?.kind ?? "list";
  const stages = obj?.stages ?? [];
  const schema = schemaFor(industryId, objectType, kind);
  const color = industrySolution?.color ?? "sky";
  const label = obj?.name ?? titleCase(objectType);

  const [q, setQ] = useState("");
  const { data, loading, error, refresh } = useApi(() => crm.industry.records(objectType, { limit: 500 }), [objectType]);
  const records = data?.records ?? [];
  const filtered = q ? records.filter((r) => r.name.toLowerCase().includes(q.toLowerCase())) : records;

  const [editing, setEditing] = useState(null);   // record | { __new: true } | null
  const [busy, setBusy] = useState(false);

  const save = async (values) => {
    setBusy(true);
    try {
      const payload = toPayload(values);
      if (editing?.__new) await crm.industry.create(objectType, payload);
      else await crm.industry.update(editing.id, payload);
      toast.success(editing?.__new ? "Record created" : "Record updated");
      setEditing(null);
      refresh();
    } catch (e) {
      toast.error(e.message || "Could not save");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!editing?.id) return;
    setBusy(true);
    try {
      await crm.industry.remove(editing.id);
      toast.success("Record deleted");
      setEditing(null);
      refresh();
    } catch (e) {
      toast.error(e.message || "Could not delete");
    } finally {
      setBusy(false);
    }
  };

  const c = colorOf(color);

  return (
    <div className="space-y-5">
      {/* Industry solution header + tabs */}
      {industrySolution && (
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${c.grad} flex items-center justify-center shadow-sm`}>
              <industrySolution.icon size={17} className="text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white truncate">{industrySolution.name}</h2>
                <span className={`hidden sm:inline text-[10px] font-medium px-1.5 py-0.5 rounded ${c.chip}`}>Industry</span>
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{industrySolution.tagline}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-200 dark:border-slate-800 -mx-1 px-1">
            {industrySolution.pages.map((p) => {
              const PageIcon = p.icon;
              return (
                <NavLink
                  key={p.id}
                  to={p.path}
                  end
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition ${
                      isActive ? `${c.text} border-current` : "text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-800 dark:hover:text-slate-200"
                    }`
                  }
                >
                  <PageIcon size={14} />
                  {p.label}
                </NavLink>
              );
            })}
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">{label}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{records.length} {records.length === 1 ? "record" : "records"}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative hidden sm:block">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search…"
              className="text-sm border border-slate-200 dark:border-slate-700 rounded-lg pl-8 pr-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 w-44"
            />
          </div>
          <PrimaryBtn color={color} onClick={() => setEditing({ __new: true })}><Plus size={15} /> New</PrimaryBtn>
        </div>
      </div>

      {error && <ErrorNote error={error} />}
      {(loading || indLoading) && !data ? (
        <Loading table />
      ) : kind === "pipeline" ? (
        <Pipeline records={filtered} stages={stages} color={color} onOpen={setEditing} />
      ) : (
        <ListTable records={filtered} columns={schema.columns} onOpen={setEditing} />
      )}

      {editing && (
        <RecordForm
          schema={schema}
          kind={kind}
          stages={stages}
          color={color}
          busy={busy}
          initial={editing.__new ? {} : toValues(editing, schema.fields)}
          onSubmit={save}
          onClose={() => setEditing(null)}
          onDelete={editing.__new ? null : remove}
        />
      )}
    </div>
  );
}
