import { useState, useMemo } from "react";
import { Building2, Map, Search, RefreshCw, AlertCircle, Plus, X, TrendingUp, DollarSign } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import { Stat, Card, CardHeader, CardBody } from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import { SkeletonCard, SkeletonTable } from "../../components/ui/Skeleton";
import { useToast } from "../../components/ui/Toast";
import { useApi, useMutation } from "../../hooks/useApi";
import { marketing } from "../../services/api";

const STATUS_VARIANT = { active: "success", planned: "info", completed: "neutral", paused: "warning" };

function NewJourneyModal({ onClose, onCreated }) {
  const toast = useToast();
  const [form, setForm] = useState({ name: "", targetAccount: "", stage: "awareness" });
  const [err, setErr] = useState(null);
  const { mutate, loading } = useMutation((d) => marketing.b2b.journeys.create(d), {
    onSuccess: () => { toast({ message: "Journey created", type: "success" }); onCreated(); onClose(); },
    onError: (e) => setErr(e?.message ?? "Failed"),
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="font-semibold text-slate-900 dark:text-white">New ABM Journey</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); setErr(null); if (!form.name.trim()) { setErr("Name required"); return; } mutate(form); }} className="px-6 py-5 space-y-4">
          {err && <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{err}</p>}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Journey Name *</label>
            <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Enterprise Q4 ABM" className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Target Account</label>
            <input value={form.targetAccount} onChange={e => set("targetAccount", e.target.value)} placeholder="Account name or segment" className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Buying Stage</label>
            <select value={form.stage} onChange={e => set("stage", e.target.value)} className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500">
              {["awareness", "consideration", "decision", "retention"].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="text-sm px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition">Cancel</button>
            <button type="submit" disabled={loading} className="text-sm px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white transition">{loading ? "Creating…" : "Create"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function B2B() {
  const toast = useToast();
  const [tab, setTab] = useState("accounts");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const { data: accounts, loading: accLoading, error } = useApi(() => marketing.b2b.accounts.list({ limit: 200 }), [], { pollingInterval: 60000 });
  const { data: journeys, loading: jLoading, refetch: refetchJourneys } = useApi(() => marketing.b2b.journeys.list(), [], { pollingInterval: 60000 });
  const allAcc = accounts ?? [];
  const allJourneys = journeys ?? [];
  const filtered = useMemo(() => allAcc.filter(a => !search || a.name?.toLowerCase().includes(search.toLowerCase())), [allAcc, search]);
  const totalArr = allAcc.reduce((s, a) => s + (a.rawArr ?? 0), 0);
  return (
    <div className="space-y-6">
      {showModal && <NewJourneyModal onClose={() => setShowModal(false)} onCreated={refetchJourneys} />}
      <PageHeader title="B2B Marketing" subtitle="Account-based marketing, journeys, and enterprise targeting"
        actions={<button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm px-4 py-2 rounded-lg transition"><Plus size={15} /> New Journey</button>}
      />
      {accLoading && allAcc.length === 0 ? (
        <div className="grid grid-cols-3 gap-4">{[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          <Stat label="Target Accounts" value={allAcc.length} icon={Building2} color="violet" />
          <Stat label="Active Journeys" value={allJourneys.filter(j => j.status === "active").length} icon={Map} color="sky" />
          <Stat label="Engaged ARR" value={totalArr ? `$${(totalArr / 1000000).toFixed(1)}M` : "—"} icon={DollarSign} color="emerald" />
        </div>
      )}
      {error && <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"><AlertCircle size={15} />{error}</div>}
      <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden w-fit">
        {["accounts", "journeys"].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-1.5 text-sm font-medium capitalize transition ${tab === t ? "bg-violet-600 text-white" : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>{t}</button>
        ))}
      </div>
      {tab === "accounts" && (
        <>
          <div className="flex items-center gap-2 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-900 max-w-72">
            <Search size={14} className="text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search accounts…" className="flex-1 text-sm bg-transparent outline-none text-slate-900 dark:text-white" />
          </div>
          <Card>
            {accLoading && allAcc.length === 0 ? <div className="p-5"><SkeletonTable rows={8} /></div> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800">
                      {["Account", "Industry", "Employees", "ARR", "Engagement", "Stage"].map(h => (
                        <th key={h} className="text-left p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filtered.length === 0 ? (
                      <tr><td colSpan={6} className="py-10 text-center text-sm text-slate-500">No accounts found.</td></tr>
                    ) : filtered.map((a, i) => (
                      <tr key={a.id ?? i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                        <td className="p-4 font-medium text-slate-900 dark:text-white">{a.name}</td>
                        <td className="p-4 text-slate-600 dark:text-slate-300">{a.industry ?? "—"}</td>
                        <td className="p-4 text-slate-600 dark:text-slate-300">{a.employees?.toLocaleString() ?? "—"}</td>
                        <td className="p-4 font-semibold text-slate-900 dark:text-white">{a.arr ?? "—"}</td>
                        <td className="p-4">
                          {a.engagement != null ? (
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-violet-500 rounded-full" style={{ width: `${Math.min(100, a.engagement)}%` }} />
                              </div>
                              <span className="text-xs text-slate-500">{a.engagement}%</span>
                            </div>
                          ) : "—"}
                        </td>
                        <td className="p-4">{a.stage ? <StatusBadge label={a.stage} variant={STATUS_VARIANT[a.stage] ?? "neutral"} /> : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
      {tab === "journeys" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {jLoading ? [...Array(4)].map((_, i) => <SkeletonCard key={i} />) : allJourneys.length === 0 ? (
            <div className="col-span-2 text-center py-12 text-slate-500">No journeys created yet.</div>
          ) : allJourneys.map((j, i) => (
            <div key={j.id ?? i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 hover:border-violet-300 dark:hover:border-violet-700 transition">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">{j.name}</h3>
                  {j.targetAccount && <div className="text-xs text-slate-400 mt-0.5">Target: {j.targetAccount}</div>}
                </div>
                <StatusBadge label={j.status ?? "planned"} variant={STATUS_VARIANT[j.status] ?? "info"} />
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                {[["Stage", j.stage], ["Touches", j.touches ?? j.interactions], ["Accounts", j.accountCount ?? j.accounts]].map(([l, v]) => v != null ? (
                  <div key={l} className="bg-slate-50 dark:bg-slate-800 rounded-lg py-2">
                    <div className="text-xs text-slate-400 capitalize">{l}</div>
                    <div className="font-semibold text-xs text-slate-900 dark:text-white mt-0.5">{v}</div>
                  </div>
                ) : null)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
