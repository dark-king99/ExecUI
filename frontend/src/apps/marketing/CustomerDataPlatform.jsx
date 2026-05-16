import { useState } from "react";
import { DatabaseBackup, Plus, RefreshCw, AlertCircle, X, CheckCircle, Users, Link } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import { Stat, Card, CardHeader, CardBody } from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import { SkeletonCard, SkeletonTable } from "../../components/ui/Skeleton";
import { useToast } from "../../components/ui/Toast";
import { useApi, useMutation } from "../../hooks/useApi";
import { marketing } from "../../services/api";

const SOURCE_STATUS = { connected: "success", error: "danger", pending: "warning", paused: "neutral" };

function NewSourceModal({ onClose, onCreated }) {
  const toast = useToast();
  const [form, setForm] = useState({ name: "", type: "crm", connectionString: "" });
  const [err, setErr] = useState(null);
  const { mutate, loading } = useMutation((d) => marketing.cdp.addSource(d), {
    onSuccess: () => { toast({ message: "Source added", type: "success" }); onCreated(); onClose(); },
    onError: (e) => setErr(e?.message ?? "Failed"),
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="font-semibold text-slate-900 dark:text-white">Add Data Source</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); setErr(null); if (!form.name.trim()) { setErr("Name required"); return; } mutate(form); }} className="px-6 py-5 space-y-4">
          {err && <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{err}</p>}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Source Name *</label>
            <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Salesforce CRM" className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Type</label>
            <select value={form.type} onChange={e => set("type", e.target.value)} className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500">
              {["crm", "analytics", "email", "ads", "ecommerce", "database", "webhook"].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="text-sm px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition">Cancel</button>
            <button type="submit" disabled={loading} className="text-sm px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white transition">{loading ? "Adding…" : "Add Source"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function NewSegmentModal({ onClose, onCreated }) {
  const toast = useToast();
  const [form, setForm] = useState({ name: "", criteria: "", description: "" });
  const [err, setErr] = useState(null);
  const { mutate, loading } = useMutation((d) => marketing.cdp.createSegment(d), {
    onSuccess: () => { toast({ message: "Segment created", type: "success" }); onCreated(); onClose(); },
    onError: (e) => setErr(e?.message ?? "Failed"),
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="font-semibold text-slate-900 dark:text-white">Create Segment</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); setErr(null); if (!form.name.trim()) { setErr("Name required"); return; } mutate(form); }} className="px-6 py-5 space-y-4">
          {err && <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{err}</p>}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Segment Name *</label>
            <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="High-value churned users" className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Criteria / Description</label>
            <textarea rows={3} value={form.description} onChange={e => set("description", e.target.value)} placeholder="Define what makes this segment unique…" className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none" />
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

export default function CustomerDataPlatform() {
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [showSegmentModal, setShowSegmentModal] = useState(false);
  const [tab, setTab] = useState("overview");
  const { data: metrics, loading: metLoading, error, refetch } = useApi(() => marketing.cdp.metrics(), [], { pollingInterval: 120000 });
  const { data: sources, loading: srcLoading, refetch: refetchSources } = useApi(() => marketing.cdp.sources(), [], { pollingInterval: 60000 });
  const m = metrics ?? {};
  const allSources = sources ?? [];
  const connected = allSources.filter(s => s.status === "connected").length;
  return (
    <div className="space-y-6">
      {showSourceModal && <NewSourceModal onClose={() => setShowSourceModal(false)} onCreated={() => { refetchSources(); refetch(); }} />}
      {showSegmentModal && <NewSegmentModal onClose={() => setShowSegmentModal(false)} onCreated={refetch} />}
      <PageHeader title="Customer Data Platform" subtitle="Unify, enrich, and activate your customer data"
        actions={
          <div className="flex gap-2">
            <button onClick={() => setShowSourceModal(true)} className="flex items-center gap-2 border border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-400 text-sm px-3 py-2 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-900/20 transition"><Link size={14} /> Add Source</button>
            <button onClick={() => setShowSegmentModal(true)} className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm px-4 py-2 rounded-lg transition"><Plus size={15} /> New Segment</button>
          </div>
        }
      />
      {metLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Unified Profiles" value={m.totalProfiles?.toLocaleString() ?? "—"} icon={Users} color="violet" />
          <Stat label="Data Sources" value={allSources.length || m.totalSources} icon={DatabaseBackup} color="sky" />
          <Stat label="Connected Sources" value={connected || m.connectedSources} icon={CheckCircle} color="emerald" />
          <Stat label="Active Segments" value={m.activeSegments ?? "—"} icon={Plus} color="amber" />
        </div>
      )}
      {error && <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"><AlertCircle size={15} />{error}</div>}
      <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden w-fit">
        {["overview", "sources", "segments"].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-1.5 text-sm font-medium capitalize transition ${tab === t ? "bg-violet-600 text-white" : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>{t}</button>
        ))}
      </div>
      {tab === "overview" && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Object.entries(m).filter(([, v]) => v != null && typeof v !== "object").map(([key, val]) => (
            <div key={key} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
              <div className="text-xs text-slate-500 mb-1 capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</div>
              <div className="text-xl font-bold text-slate-900 dark:text-white">{String(val)}</div>
            </div>
          ))}
          {Object.keys(m).length === 0 && <p className="col-span-3 text-sm text-slate-500 text-center py-8">No CDP metrics available.</p>}
        </div>
      )}
      {tab === "sources" && (
        <Card>
          <CardHeader title="Data Sources" icon={DatabaseBackup} actions={<button onClick={refetchSources} className="text-slate-400 hover:text-violet-600 transition"><RefreshCw size={14} /></button>} />
          {srcLoading ? <div className="p-4"><SkeletonTable rows={5} /></div> : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {allSources.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">No sources configured.</p> : allSources.map((s, i) => (
                <div key={s.id ?? i} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-violet-50 dark:bg-violet-900/30 flex items-center justify-center">
                      <DatabaseBackup size={16} className="text-violet-600" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-slate-900 dark:text-white">{s.name}</div>
                      <div className="text-xs text-slate-400">{s.type ?? ""}{s.lastSync ? ` • Last sync: ${s.lastSync}` : ""}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {s.records != null && <span className="text-xs text-slate-400">{s.records.toLocaleString()} records</span>}
                    <StatusBadge label={s.status ?? "unknown"} variant={SOURCE_STATUS[s.status] ?? "neutral"} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
      {tab === "segments" && (
        <Card>
          <CardHeader title="Audience Segments" icon={Users} />
          <CardBody>
            <p className="text-sm text-slate-500 text-center py-6">Segments created via the form above will appear here.</p>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
