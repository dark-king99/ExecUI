import { useState } from "react";
import { Plug, RefreshCw, AlertCircle, CheckCircle, XCircle, Clock } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import { Stat, Card, CardHeader, CardBody } from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import { SkeletonCard, SkeletonTable } from "../../components/ui/Skeleton";
import { useToast } from "../../components/ui/Toast";
import { useApi, useMutation } from "../../hooks/useApi";
import { crm } from "../../services/api";

const STATUS_VARIANT = { connected: "success", disconnected: "danger", syncing: "info", error: "danger", warning: "warning", healthy: "success" };
const STATUS_ICON = { connected: CheckCircle, disconnected: XCircle, syncing: RefreshCw, error: XCircle, healthy: CheckCircle };

export default function ServicesIntegration() {
  const toast = useToast();
  const [tab, setTab] = useState("integrations");
  const { data: integrations, loading, error, refetch } = useApi(() => crm.integrations.list(), [], { pollingInterval: 60000 });
  const { data: syncHealth } = useApi(() => crm.integrations.syncHealth(), [], { pollingInterval: 30000 });
  const { data: leadSources } = useApi(() => crm.integrations.leadSources(), [], { pollingInterval: 120000 });
  const { data: timeline } = useApi(() => crm.integrations.timeline({ limit: 20 }), [], { pollingInterval: 60000 });
  const { mutate: sync, loading: syncing } = useMutation(() => crm.integrations.sync(), {
    onSuccess: () => { toast({ message: "Sync triggered", type: "success" }); refetch(); },
    onError: (e) => toast({ message: e?.message ?? "Sync failed", type: "error" }),
  });

  const all = integrations ?? [];
  const health = syncHealth ?? {};
  const sources = leadSources ?? [];
  const events = timeline ?? [];
  const connected = all.filter(i => i.status === "connected" || i.status === "healthy").length;
  const errors = all.filter(i => i.status === "error" || i.status === "disconnected").length;

  return (
    <div className="space-y-6">
      <PageHeader title="Services & Integrations" subtitle="Connect your CRM to third-party tools and data sources"
        actions={
          <button onClick={() => sync()} disabled={syncing} className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white text-sm px-4 py-2 rounded-lg transition">
            <RefreshCw size={15} className={syncing ? "animate-spin" : ""} /> {syncing ? "Syncing…" : "Sync All"}
          </button>
        }
      />

      {loading && all.length === 0 ? (
        <div className="grid grid-cols-3 gap-4">{[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          <Stat label="Connected" value={connected} icon={CheckCircle} color="emerald" />
          <Stat label="Errors" value={errors} icon={XCircle} color="orange" />
          <Stat label="Lead Sources" value={sources.length} icon={Plug} color="sky" />
        </div>
      )}

      {error && <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"><AlertCircle size={15} />{error}</div>}

      <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden w-fit">
        {["integrations", "sync-health", "lead-sources", "timeline"].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-1.5 text-sm font-medium capitalize transition ${tab === t ? "bg-orange-600 text-white" : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>{t.replace("-", " ")}</button>
        ))}
      </div>

      {tab === "integrations" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {loading && all.length === 0 ? [...Array(4)].map((_, i) => <SkeletonCard key={i} />) : all.length === 0 ? (
            <div className="col-span-2 text-center py-12 text-slate-500">No integrations configured.</div>
          ) : all.map((int, i) => {
            const Icon = STATUS_ICON[int.status] ?? Plug;
            return (
              <div key={int.id ?? i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                      <Plug size={20} className="text-slate-600 dark:text-slate-400" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">{int.name ?? int.service}</div>
                      <div className="text-xs text-slate-400">{int.category ?? int.type ?? ""}</div>
                    </div>
                  </div>
                  <StatusBadge label={int.status ?? "unknown"} variant={STATUS_VARIANT[int.status] ?? "neutral"} />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                  {int.lastSync && <span>Last sync: {int.lastSync}</span>}
                  {int.recordsSync != null && <span>{int.recordsSync.toLocaleString()} records</span>}
                  {int.errorCount != null && int.errorCount > 0 && <span className="text-red-500">{int.errorCount} errors</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "sync-health" && (
        <Card>
          <CardHeader title="Sync Health Dashboard" icon={CheckCircle} />
          <CardBody>
            {Object.keys(health).length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">No sync health data available.</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Object.entries(health).filter(([, v]) => v != null).map(([key, val]) => (
                  <div key={key} className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                    <div className="text-xs text-slate-500 mb-1 capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</div>
                    <div className="font-bold text-slate-900 dark:text-white">{typeof val === "boolean" ? (val ? "✓ OK" : "✗ Issue") : String(val)}</div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {tab === "lead-sources" && (
        <Card>
          <CardHeader title="Lead Sources" icon={Plug} />
          <CardBody>
            {sources.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">No lead source data available.</p>
            ) : (
              <div className="space-y-3">
                {sources.map((s, i) => {
                  const max = Math.max(...sources.map(x => x.count ?? x.leads ?? 0));
                  const pct = max ? Math.round(((s.count ?? s.leads ?? 0) / max) * 100) : 0;
                  return (
                    <div key={s.source ?? i} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-slate-700 dark:text-slate-300">{s.source ?? s.name}</span>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-slate-500">{s.count ?? s.leads ?? 0} leads</span>
                          {s.conversion != null && <span className="text-orange-600 font-medium">{s.conversion}% conv.</span>}
                        </div>
                      </div>
                      <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-orange-500 rounded-full transition-all" style={{ width: `${Math.max(4, pct)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {tab === "timeline" && (
        <Card>
          <CardHeader title="Integration Timeline" icon={Clock} />
          <CardBody>
            {events.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">No timeline events.</p>
            ) : (
              <div className="space-y-3">
                {events.map((e, i) => (
                  <div key={e.id ?? i} className="flex gap-4 items-start">
                    <div className={`mt-0.5 h-2.5 w-2.5 rounded-full shrink-0 ${e.type === "error" ? "bg-red-500" : e.type === "success" ? "bg-emerald-500" : "bg-sky-500"}`} />
                    <div className="flex-1">
                      <div className="text-sm text-slate-900 dark:text-white">{e.text ?? e.description ?? e.action}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{e.service ?? e.integration ?? ""}{e.at ? ` • ${e.at}` : e.date ? ` • ${e.date}` : ""}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
