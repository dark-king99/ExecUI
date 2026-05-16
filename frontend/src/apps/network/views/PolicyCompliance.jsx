import { useState } from "react";
import { ShieldCheck, RefreshCw, AlertCircle, CheckCircle, XCircle, AlertTriangle, Play } from "lucide-react";
import PageHeader from "../../../components/ui/PageHeader";
import { Stat, Card, CardHeader, CardBody } from "../../../components/ui/Card";
import StatusBadge from "../../../components/ui/StatusBadge";
import { SkeletonCard, SkeletonTable } from "../../../components/ui/Skeleton";
import { useToast } from "../../../components/ui/Toast";
import { useApi, useMutation } from "../../../hooks/useApi";
import { network } from "../../../services/api";

const STATUS_VARIANT = { pass: "success", warn: "warning", fail: "danger", passing: "success", failing: "danger" };

function ScoreBar({ score }) {
  const pct = score ?? 0;
  const color = pct >= 90 ? "bg-emerald-500" : pct >= 75 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-semibold ${pct >= 90 ? "text-emerald-600 dark:text-emerald-400" : pct >= 75 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"}`}>{pct}%</span>
    </div>
  );
}

export default function PolicyCompliance() {
  const toast = useToast();
  const [selected, setSelected] = useState(null);

  const { data: policies, loading, error, refetch } = useApi(() => network.policies.list(), [], { pollingInterval: 120000 });

  const { mutate: runCheck } = useMutation((id) => network.policies.check(id), {
    onSuccess: () => { refetch(); toast({ message: "Policy check complete", type: "success" }); },
    onError: (e) => toast({ message: e?.message ?? "Check failed", type: "error" }),
  });

  const all = policies ?? [];
  const selectedPolicy = all.find(p => p.id === selected);
  const passing = all.filter(p => p.status === "pass" || p.status === "passing").length;
  const failing = all.filter(p => p.status === "fail" || p.status === "failing").length;
  const avgScore = all.length ? Math.round(all.reduce((s, p) => s + (p.score ?? 0), 0) / all.length) : 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Policy & Compliance" subtitle="Audit, enforce, and track network security policies"
        actions={
          <div className="flex gap-2">
            <button onClick={refetch} className="flex items-center gap-1.5 text-xs border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"><RefreshCw size={13} /> Refresh</button>
          </div>
        }
      />

      {loading && all.length === 0 ? (
        <div className="grid grid-cols-3 gap-4">{[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          <Stat label="Passing Policies" value={passing} icon={CheckCircle} color="emerald" />
          <Stat label="Failing Policies" value={failing} icon={XCircle} color="red" />
          <Stat label="Avg Compliance Score" value={`${avgScore}%`} icon={ShieldCheck} color="sky" />
        </div>
      )}

      {error && <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"><AlertCircle size={15} />{error}</div>}

      <div className={`grid gap-4 ${selectedPolicy ? "grid-cols-1 lg:grid-cols-5" : "grid-cols-1"}`}>
        <div className={selectedPolicy ? "lg:col-span-3" : ""}>
          <Card>
            {loading && all.length === 0 ? <div className="p-5"><SkeletonTable rows={8} /></div> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800">
                      {["Policy Name", "Standard", "Score", "Exceptions", "Status", "Last Check", "Actions"].map(h => (
                        <th key={h} className="text-left p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {all.length === 0 ? (
                      <tr><td colSpan={7} className="py-10 text-center text-sm text-slate-500">No policies configured.</td></tr>
                    ) : all.map((p, i) => (
                      <tr key={p.id ?? i} onClick={() => setSelected(p.id === selected ? null : p.id)} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition ${selected === p.id ? "bg-emerald-50 dark:bg-emerald-900/10" : ""}`}>
                        <td className="p-4 font-medium text-slate-900 dark:text-white">{p.name}</td>
                        <td className="p-4 text-slate-500">{p.standard ?? "—"}</td>
                        <td className="p-4"><ScoreBar score={p.score} /></td>
                        <td className="p-4">
                          {(p.exceptions ?? 0) > 0
                            ? <span className="text-amber-600 dark:text-amber-400 font-semibold">{p.exceptions}</span>
                            : <span className="text-slate-400">0</span>}
                        </td>
                        <td className="p-4"><StatusBadge label={(p.status ?? "pass").toUpperCase()} variant={STATUS_VARIANT[p.status] ?? "neutral"} dot /></td>
                        <td className="p-4 text-slate-400 text-xs">{p.lastCheck ?? p.last_check ?? "—"}</td>
                        <td className="p-4">
                          <button onClick={e => { e.stopPropagation(); runCheck(p.id); }} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 transition">
                            <Play size={11} />Run
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {selectedPolicy && (
          <div className="lg:col-span-2">
            <Card>
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-semibold text-slate-900 dark:text-white truncate pr-2">{selectedPolicy.name}</h3>
                <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600 shrink-0"><XCircle size={16} /></button>
              </div>
              <CardBody className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Compliance Score</span>
                  <ScoreBar score={selectedPolicy.score} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    ["Standard", selectedPolicy.standard ?? "—"],
                    ["Status", selectedPolicy.status ?? "—"],
                    ["Exceptions", String(selectedPolicy.exceptions ?? 0)],
                    ["Last Check", selectedPolicy.lastCheck ?? selectedPolicy.last_check ?? "—"],
                    ["Category", selectedPolicy.category ?? "—"],
                    ["Owner", selectedPolicy.owner ?? "—"],
                  ].map(([label, value]) => (
                    <div key={label} className="bg-slate-50 dark:bg-slate-800 rounded-lg p-2.5">
                      <div className="text-[10px] text-slate-400 mb-0.5">{label}</div>
                      {label === "Status" ? <StatusBadge label={value.toUpperCase()} variant={STATUS_VARIANT[value] ?? "neutral"} dot /> : <div className="text-sm font-medium text-slate-900 dark:text-white">{value}</div>}
                    </div>
                  ))}
                </div>
                {selectedPolicy.description && (
                  <div>
                    <div className="text-xs font-medium text-slate-500 mb-1">Description</div>
                    <p className="text-sm text-slate-700 dark:text-slate-300">{selectedPolicy.description}</p>
                  </div>
                )}
                {selectedPolicy.controls?.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-slate-500 mb-2">Controls</div>
                    <div className="space-y-1.5">
                      {selectedPolicy.controls.map((ctrl, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          {ctrl.passing ? <CheckCircle size={13} className="text-emerald-500 shrink-0" /> : <XCircle size={13} className="text-red-500 shrink-0" />}
                          <span className="text-slate-700 dark:text-slate-300">{ctrl.name ?? ctrl.id}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <button onClick={() => runCheck(selectedPolicy.id)} className="w-full flex items-center justify-center gap-1.5 text-sm py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition">
                  <Play size={14} />Run Compliance Check
                </button>
              </CardBody>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
