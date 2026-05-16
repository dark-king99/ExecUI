import { useState, useMemo } from "react";
import { UserPlus, Star, Calendar, Phone, Mail, Search, RefreshCw, Plus, X, ChevronRight, Activity } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import { Stat, Card, CardHeader, CardBody } from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import { SkeletonCard, SkeletonTable } from "../../components/ui/Skeleton";
import { useToast } from "../../components/ui/Toast";
import { useApi, useMutation } from "../../hooks/useApi";
import { crm } from "../../services/api";

const STAGES = ["New", "Contacted", "Qualified", "Demo Booked"];
const stageVariant = { New: "neutral", Contacted: "info", Qualified: "warning", "Demo Booked": "success" };

function ScoreBadge({ score }) {
  const cls = score >= 80 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
    : score >= 60 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
  return <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cls}`}>{score}</span>;
}

function AddLeadModal({ onClose, onCreated }) {
  const toast = useToast();
  const [form, setForm] = useState({ name: "", email: "", company: "", phone: "", stage: "New", score: 50 });
  const [err, setErr] = useState(null);
  const { mutate, loading } = useMutation((d) => crm.leads.create(d), {
    onSuccess: () => { toast({ message: "Lead created", type: "success" }); onCreated(); onClose(); },
    onError: (e) => setErr(e?.message ?? "Failed to create lead"),
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  function submit(e) { e.preventDefault(); setErr(null); if (!form.name.trim()) { setErr("Name is required"); return; } mutate(form); }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="font-semibold text-slate-900 dark:text-white">Add Lead</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="px-6 py-5 space-y-4">
          {err && <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{err}</p>}
          {[["Name *", "name", "text", "Full name"], ["Email", "email", "email", "email@company.com"], ["Company", "company", "text", "Company name"], ["Phone", "phone", "tel", "+1 555 000 0000"]].map(([lbl, key, type, ph]) => (
            <div key={key}>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">{lbl}</label>
              <input type={type} value={form[key]} onChange={e => set(key, e.target.value)} placeholder={ph}
                className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500" />
            </div>
          ))}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Stage</label>
              <select value={form.stage} onChange={e => set("stage", e.target.value)} className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500">
                {STAGES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Score (0–100)</label>
              <input type="number" min="0" max="100" value={form.score} onChange={e => set("score", Number(e.target.value))}
                className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="text-sm px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition">Cancel</button>
            <button type="submit" disabled={loading} className="text-sm px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white transition">{loading ? "Saving…" : "Add Lead"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function LeadWorkspace() {
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("All");
  const [selected, setSelected] = useState(null);
  const [showAdd, setShowAdd] = useState(false);

  const { data: leads, loading, error, refetch } = useApi(() => crm.leads.list({ limit: 200 }), [], { pollingInterval: 60000 });
  const { data: activity, loading: actLoading } = useApi(
    () => selected ? crm.leads.activity({ limit: 10 }) : Promise.resolve([]),
    [selected?.id], { pollingInterval: 30000 }
  );

  const { mutate: advanceStage, loading: advancing } = useMutation(
    (data) => crm.leads.update(data.id, { stage: data.stage }),
    { onSuccess: () => { toast({ message: "Stage updated", type: "success" }); refetch(); }, onError: (e) => toast({ message: e?.message ?? "Failed", type: "error" }) }
  );

  const allLeads = leads ?? [];
  const filtered = useMemo(() => allLeads.filter(l => {
    const matchSearch = !search || l.name?.toLowerCase().includes(search.toLowerCase()) || l.company?.toLowerCase().includes(search.toLowerCase()) || l.email?.toLowerCase().includes(search.toLowerCase());
    const matchStage = stageFilter === "All" || l.stage === stageFilter;
    return matchSearch && matchStage;
  }), [allLeads, search, stageFilter]);

  const totalLeads = allLeads.length;
  const qualified = allLeads.filter(l => l.stage === "Qualified" || l.stage === "Demo Booked").length;
  const demoBooked = allLeads.filter(l => l.stage === "Demo Booked").length;
  const avgScore = allLeads.length ? Math.round(allLeads.reduce((s, l) => s + (l.score ?? 0), 0) / allLeads.length) : 0;

  const nextStage = (stage) => {
    const idx = STAGES.indexOf(stage);
    return idx >= 0 && idx < STAGES.length - 1 ? STAGES[idx + 1] : null;
  };

  return (
    <div className="space-y-6">
      {showAdd && <AddLeadModal onClose={() => setShowAdd(false)} onCreated={refetch} />}
      <PageHeader title="Leads & Contacts" subtitle="Manage your pipeline of prospects and contacts"
        actions={
          <div className="flex gap-2">
            <button onClick={refetch} className="flex items-center gap-1.5 text-xs text-slate-500 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"><RefreshCw size={13} /> Refresh</button>
            <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white text-sm px-4 py-2 rounded-lg transition"><Plus size={15} /> Add Lead</button>
          </div>
        }
      />

      {loading && allLeads.length === 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Total Leads" value={totalLeads} icon={UserPlus} color="orange" />
          <Stat label="Qualified" value={qualified} icon={Star} color="emerald" />
          <Stat label="Demo Booked" value={demoBooked} icon={Calendar} color="sky" />
          <Stat label="Avg Score" value={avgScore} icon={Star} color="amber" />
        </div>
      )}

      {error && <div className="text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">{error}</div>}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Lead List */}
        <div className="xl:col-span-2 flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 flex-1 min-w-48">
              <Search size={15} className="text-slate-400 shrink-0" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, company, email…" className="flex-1 text-sm bg-transparent outline-none text-slate-900 dark:text-white" />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {["All", ...STAGES].map(s => (
                <button key={s} onClick={() => setStageFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${stageFilter === s ? "bg-orange-600 text-white" : "border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-orange-400"}`}>{s}</button>
              ))}
            </div>
          </div>

          <Card>
            {loading && allLeads.length === 0 ? <div className="p-5"><SkeletonTable rows={6} /></div> : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.length === 0 ? (
                  <p className="p-8 text-center text-sm text-slate-500">No leads match current filters.</p>
                ) : filtered.map(l => (
                  <button key={l.id} onClick={() => setSelected(s => s?.id === l.id ? null : l)} className={`w-full text-left px-4 py-3 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition ${selected?.id === l.id ? "bg-orange-50 dark:bg-orange-900/20" : ""}`}>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-slate-900 dark:text-white truncate">{l.name}</span>
                        {l.score != null && <ScoreBadge score={l.score} />}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 truncate">{l.company}{l.email ? ` • ${l.email}` : ""}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge label={l.stage ?? "New"} variant={stageVariant[l.stage] ?? "neutral"} />
                      {selected?.id === l.id && <ChevronRight size={14} className="text-orange-500" />}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>
          <p className="text-xs text-slate-400">Showing {filtered.length} of {allLeads.length} leads</p>
        </div>

        {/* Detail Panel */}
        <div>
          {!selected ? (
            <Card><CardBody><div className="flex flex-col items-center justify-center py-12 text-center gap-3">
              <UserPlus size={32} className="text-slate-300 dark:text-slate-600" />
              <p className="text-sm text-slate-500">Select a lead to view details</p>
            </div></CardBody></Card>
          ) : (
            <div className="space-y-4">
              <Card>
                <CardBody className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white">{selected.name}</h3>
                      <p className="text-sm text-slate-500">{selected.company}</p>
                    </div>
                    <StatusBadge label={selected.stage ?? "New"} variant={stageVariant[selected.stage] ?? "neutral"} />
                  </div>
                  <div className="space-y-1.5 text-sm">
                    {selected.email && <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300"><Mail size={13} className="shrink-0" />{selected.email}</div>}
                    {selected.phone && <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300"><Phone size={13} className="shrink-0" />{selected.phone}</div>}
                    {selected.owner && <div className="text-slate-500 text-xs">Owner: {selected.owner}</div>}
                  </div>
                  {selected.score != null && (
                    <div>
                      <div className="flex justify-between text-xs mb-1"><span className="text-slate-500">Lead Score</span><ScoreBadge score={selected.score} /></div>
                      <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700"><div className={`h-full rounded-full ${selected.score >= 80 ? "bg-emerald-500" : selected.score >= 60 ? "bg-amber-500" : "bg-slate-400"}`} style={{ width: `${Math.min(selected.score, 100)}%` }} /></div>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button onClick={() => toast({ message: `Calling ${selected.name}…`, type: "info" })} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 hover:border-orange-400 transition"><Phone size={13} /> Call</button>
                    <button onClick={() => toast({ message: `Email drafted for ${selected.name}`, type: "info" })} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 hover:border-orange-400 transition"><Mail size={13} /> Email</button>
                  </div>
                  {nextStage(selected.stage) && (
                    <button onClick={() => advanceStage({ id: selected.id, stage: nextStage(selected.stage) })} disabled={advancing}
                      className="w-full py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-medium disabled:opacity-60 transition">
                      Advance to {nextStage(selected.stage)}
                    </button>
                  )}
                </CardBody>
              </Card>

              <Card>
                <CardHeader title="Recent Activity" icon={Activity} />
                <CardBody className="space-y-3">
                  {actLoading ? <SkeletonTable rows={3} /> : (activity ?? []).length > 0 ? (activity ?? []).slice(0, 8).map((a, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="h-1.5 w-1.5 rounded-full bg-orange-400 mt-1.5 shrink-0" />
                      <div><p className="text-xs text-slate-800 dark:text-slate-200">{a.text ?? a.description}</p><p className="text-xs text-slate-400 mt-0.5">{a.time ?? a.timestamp}</p></div>
                    </div>
                  )) : <p className="text-xs text-slate-500 text-center py-3">No activity recorded yet.</p>}
                </CardBody>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
