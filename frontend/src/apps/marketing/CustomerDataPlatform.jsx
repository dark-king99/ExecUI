import { useState } from "react";
import {
  Database, Users, Activity, GitMerge, Layers, ShieldCheck,
  Brain, Network, AlertCircle, X, Plus, CheckCircle,
} from "lucide-react";
import { useApi, useMutation } from "../../hooks/useApi";
import { useToast } from "../../components/ui/Toast";
import { marketing } from "../../services/api";
import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody, CardHeader, Stat } from "../../components/ui/Card";

const TABS = [
  { id: "overview",      label: "Overview",         icon: Database },
  { id: "profiles",      label: "Profile Explorer", icon: Users },
  { id: "segmentation",  label: "Segmentation",     icon: Layers },
  { id: "sources",       label: "Data Sources",     icon: Network },
  { id: "governance",    label: "Governance",       icon: ShieldCheck },
  { id: "intelligence",  label: "Predictive AI",    icon: Brain },
];

function AddSourceModal({ onClose, onCreated }) {
  const toast = useToast();
  const [form, setForm] = useState({ name: "", type: "Web" });
  const [err, setErr] = useState(null);
  const { mutate, loading } = useMutation((d) => marketing.cdp.addSource(d));

  async function handleSubmit(e) {
    e.preventDefault();
    setErr(null);
    if (!form.name.trim()) { setErr("Source name is required."); return; }
    try {
      await mutate(form);
      toast({ message: `Data source "${form.name}" added.`, type: "success" });
      onCreated?.();
      onClose();
    } catch (ex) { setErr(ex?.message ?? "Failed to add data source."); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-sm mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Add Data Source</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {err && <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded px-3 py-2">{err}</p>}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Name <span className="text-red-500">*</span></label>
            <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Salesforce CRM"
              className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Type</label>
            <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
              className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500">
              {["Web","CRM","Mobile","Email","Ads","Data Warehouse","Other"].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="text-sm px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition">Cancel</button>
            <button type="submit" disabled={loading} className="text-sm px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white transition">{loading ? "Adding…" : "Add Source"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CreateSegmentModal({ onClose, onCreated }) {
  const toast = useToast();
  const [form, setForm] = useState({ name: "", description: "" });
  const [err, setErr] = useState(null);
  const { mutate, loading } = useMutation((d) => marketing.cdp.createSegment(d));

  async function handleSubmit(e) {
    e.preventDefault();
    setErr(null);
    if (!form.name.trim()) { setErr("Segment name is required."); return; }
    try {
      await mutate(form);
      toast({ message: `Segment "${form.name}" created.`, type: "success" });
      onCreated?.();
      onClose();
    } catch (ex) { setErr(ex?.message ?? "Failed to create segment."); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-sm mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Create Segment</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {err && <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded px-3 py-2">{err}</p>}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Name <span className="text-red-500">*</span></label>
            <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Segment name"
              className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
            <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} placeholder="Define this audience segment"
              className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="text-sm px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition">Cancel</button>
            <button type="submit" disabled={loading} className="text-sm px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white transition">{loading ? "Creating…" : "Create Segment"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CustomerDataPlatform() {
  const [tab, setTab] = useState("overview");
  const [showAddSource, setShowAddSource] = useState(false);
  const [showCreateSegment, setShowCreateSegment] = useState(false);
  const [profileSearch, setProfileSearch] = useState("");
  const [selectedProfile, setSelectedProfile] = useState(null);

  const { data: cdpMetrics, loading, error, refetch: refetchMetrics } = useApi(
    () => marketing.cdp.metrics(), [], { pollingInterval: 60000 }
  );
  const { data: sources, refetch: refetchSources } = useApi(
    () => marketing.cdp.sources(), [], { pollingInterval: 120000 }
  );
  const { data: profiles, loading: profilesLoading } = useApi(
    () => marketing.profiles.search({ q: profileSearch, limit: 30 }),
    [profileSearch],
    { pollingInterval: 0 }
  );
  const { data: audiences } = useApi(
    () => marketing.audiences.list(), [], { pollingInterval: 60000 }
  );

  const allSources   = sources   ?? [];
  const allProfiles  = profiles  ?? [];
  const allAudiences = audiences ?? [];

  return (
    <div className="space-y-6">
      {showAddSource    && <AddSourceModal    onClose={() => setShowAddSource(false)}    onCreated={refetchSources} />}
      {showCreateSegment && <CreateSegmentModal onClose={() => setShowCreateSegment(false)} onCreated={refetchMetrics} />}

      <PageHeader
        title="Customer Data Platform"
        subtitle="Real-time identity resolution, unified profiles, and enterprise activation engine."
        actions={
          <div className="flex gap-2">
            <button onClick={() => setShowAddSource(true)} className="text-sm px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition">
              Add Source
            </button>
            <button onClick={() => setShowCreateSegment(true)} className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm px-4 py-2 rounded-lg transition">
              <Plus size={15} /> Create Segment
            </button>
          </div>
        }
      />

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition ${
              tab === t.id
                ? "border-violet-600 text-violet-600 dark:text-violet-400"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            }`}
          >
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {loading && !cdpMetrics ? (
              Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-20 bg-slate-100 dark:bg-slate-700 rounded-xl animate-pulse" />)
            ) : cdpMetrics ? [
              { label: "Unified Profiles",       value: cdpMetrics.unifiedProfiles ?? "—" },
              { label: "Active Data Sources",    value: cdpMetrics.activeDataSources ?? allSources.length },
              { label: "Identity Matches/Day",   value: cdpMetrics.identityMatchesPerDay ?? "—" },
              { label: "Real-Time Events",       value: cdpMetrics.realTimeEvents ?? "—" },
              { label: "Segments Live",          value: cdpMetrics.segmentsLive ?? "—" },
              { label: "Predictive Models",      value: cdpMetrics.predictiveModels ?? "—" },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
                <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">{value}</p>
              </div>
            )) : null}
          </div>

          {/* Module navigation cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { id: "profiles",     icon: Users,      title: "Unified Profile Explorer", desc: "360° customer timeline, engagement score, predicted CLV, and churn risk per contact." },
              { id: "segmentation", icon: Layers,     title: "Segmentation Studio",      desc: "Build behavioral segments with dynamic rules, lookalikes, and real-time sync to all channels." },
              { id: "intelligence", icon: Brain,      title: "Predictive Intelligence",  desc: "Propensity modeling, churn prediction, LTV forecasting, and next-best-action recommendations." },
            ].map(m => (
              <button
                key={m.id}
                onClick={() => setTab(m.id)}
                className="text-left rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 hover:border-violet-400 dark:hover:border-violet-600 hover:shadow-md transition group"
              >
                <div className="h-10 w-10 rounded-lg bg-violet-50 dark:bg-violet-900/30 flex items-center justify-center mb-3">
                  <m.icon size={20} className="text-violet-600 dark:text-violet-400" />
                </div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{m.title}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{m.desc}</p>
                <p className="text-xs text-violet-600 dark:text-violet-400 mt-3 opacity-0 group-hover:opacity-100 transition font-medium">Open module →</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Profile Explorer */}
      {tab === "profiles" && (
        <div className="flex gap-4 h-[600px]">
          <div className={`flex flex-col ${selectedProfile ? "w-80 shrink-0" : "flex-1"}`}>
            <Card className="flex flex-col h-full overflow-hidden">
              <div className="p-3 border-b border-slate-200 dark:border-slate-800">
                <input
                  type="text" value={profileSearch} onChange={e => setProfileSearch(e.target.value)}
                  placeholder="Search profiles by name or email…"
                  className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                {profilesLoading ? (
                  <div className="p-4 space-y-2 animate-pulse">{[1,2,3,4].map(i => <div key={i} className="h-12 bg-slate-100 dark:bg-slate-700 rounded" />)}</div>
                ) : allProfiles.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">
                    {profileSearch ? "No profiles match your search." : "Enter a name or email to search profiles."}
                  </p>
                ) : allProfiles.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedProfile(selectedProfile?.id === p.id ? null : p)}
                    className={`w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition ${
                      selectedProfile?.id === p.id ? "bg-violet-50 dark:bg-violet-500/5 border-l-2 border-violet-500" : "border-l-2 border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-violet-700 dark:text-violet-400">
                          {(p.name ?? p.email ?? "?").charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{p.name ?? "—"}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{p.email ?? "—"}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </Card>
          </div>

          {selectedProfile && (
            <div className="flex-1">
              <Card className="h-full flex flex-col overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{selectedProfile.name ?? "Profile"}</h3>
                  <button onClick={() => setSelectedProfile(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={16} /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Email",      value: selectedProfile.email },
                      { label: "CLV",        value: selectedProfile.clv ?? selectedProfile.ltv },
                      { label: "Churn Risk", value: selectedProfile.churnRisk },
                      { label: "Segment",    value: selectedProfile.segment },
                    ].map(({ label, value }) => value && (
                      <div key={label} className="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">{label}</p>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">{value}</p>
                      </div>
                    ))}
                  </div>
                  {(selectedProfile.events ?? []).length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Recent Events</p>
                      <div className="space-y-2">
                        {selectedProfile.events.slice(0, 6).map((ev, i) => (
                          <div key={i} className="flex gap-2 text-xs">
                            <span className="shrink-0 h-1.5 w-1.5 rounded-full bg-violet-400 mt-1.5" />
                            <span className="text-slate-700 dark:text-slate-300">{ev.name ?? ev.event}</span>
                            <span className="ml-auto text-slate-400">{ev.date ?? ev.time}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Segmentation */}
      {tab === "segmentation" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowCreateSegment(true)}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm px-4 py-2 rounded-lg transition"
            >
              <Plus size={15} /> New Segment
            </button>
          </div>
          {allAudiences.length === 0 ? (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-10 text-center text-sm text-slate-500">
              No segments yet. Create your first audience segment.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allAudiences.map(seg => (
                <Card key={seg.id}>
                  <CardBody>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{seg.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{seg.type ?? "behavioral"} · {seg.source ?? "CDP"}</p>
                      </div>
                      <span className="text-xs font-semibold text-violet-600 dark:text-violet-400">{seg.size?.toLocaleString() ?? "—"}</span>
                    </div>
                    {seg.description && <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">{seg.description}</p>}
                    <div className="mt-3 flex gap-2">
                      <button className="flex-1 text-xs px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition">Activate</button>
                      <button className="flex-1 text-xs px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition">Lookalike</button>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Data Sources */}
      {tab === "sources" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowAddSource(true)} className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm px-4 py-2 rounded-lg transition">
              <Plus size={15} /> Add Source
            </button>
          </div>
          {allSources.length === 0 ? (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-10 text-center text-sm text-slate-500">No data sources configured.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allSources.map((s, i) => (
                <Card key={s.id ?? i}>
                  <CardBody>
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-violet-50 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
                        <Network size={16} className="text-violet-600 dark:text-violet-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{s.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{s.type ?? "—"}</p>
                      </div>
                      <div className="ml-auto">
                        <CheckCircle size={14} className="text-emerald-500" />
                      </div>
                    </div>
                    {s.recordsPerDay && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">{s.recordsPerDay} records/day</p>
                    )}
                  </CardBody>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Governance */}
      {tab === "governance" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { title: "Field-Level Access Controls",  desc: "Restrict PII and sensitive fields by role, team, and data classification level." },
            { title: "Consent Management",           desc: "Real-time consent status per contact, channel, and purpose tracked and enforced on every activation." },
            { title: "Audit Log",                    desc: "Immutable record of every data access, export, and segment activation with user and timestamp." },
            { title: "GDPR Right-to-Erasure",        desc: "Automated contact deletion pipeline processes erasure requests within 72 hours across all connected systems." },
            { title: "Data Retention Policies",      desc: "Configurable retention periods per data category. Automatic purge scheduling with approval workflow." },
            { title: "Data Lineage",                 desc: "Track every field from source to activation. Understand data provenance and transformation history." },
          ].map(({ title, desc }) => (
            <div key={title} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck size={14} className="text-slate-400 dark:text-slate-500 shrink-0" />
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{title}</p>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">{desc}</p>
            </div>
          ))}
        </div>
      )}

      {/* Predictive AI */}
      {tab === "intelligence" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { title: "Churn Prediction",           desc: "ML model scores every customer weekly on churn risk based on engagement, product usage, support tickets, and NPS.", color: "red" },
            { title: "LTV Forecasting",             desc: "Predicts 12-month and lifetime value per customer using historical purchase patterns and cohort analysis.", color: "indigo" },
            { title: "Propensity to Buy",           desc: "Scores likelihood of conversion per product/offer combination, enabling personalized next-best-offer recommendations.", color: "violet" },
            { title: "Lookalike Modeling",          desc: "Finds high-value prospects that match your best customers' behavioral and firmographic signatures.", color: "emerald" },
            { title: "Engagement Scoring",          desc: "Dynamic engagement index based on email opens, web visits, content consumption, and in-app behavior.", color: "amber" },
            { title: "Send-Time Optimization",      desc: "Learns the optimal communication window per contact using open/click patterns across all channels.", color: "sky" },
          ].map(({ title, desc, color }) => (
            <div key={title} className={`rounded-xl border p-4 bg-${color}-50 dark:bg-${color}-900/10 border-${color}-200 dark:border-${color}-800/50`}>
              <div className="flex items-center gap-2 mb-2">
                <Brain size={15} className={`text-${color}-600 dark:text-${color}-400`} />
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{title}</p>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">{desc}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
