import { useState } from "react";
import { ShieldCheck, RefreshCw, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import StatusBadge from "../../../../components/ui/StatusBadge";
import { useToast } from "../../../../components/ui/Toast";
import { useApi, useMutation } from "../../../../hooks/useApi";
import { network } from "../../../../services/api";
import { SolutionShell, MetricGrid, Section, Loading, Pill, fmtNum } from "../../components/net-ui";

const STATUS_VARIANT = { pass: "success", warn: "warning", fail: "danger" };

export default function Policies() {
  const toast = useToast();
  const [selected, setSelected] = useState(null);
  const { data: policies, loading, refetch } = useApi(() => network.policies.list(), [], { pollingInterval: 120000 });
  const { mutate: check } = useMutation((id) => network.policies.check(id), { onSuccess: () => { toast({ message: "Compliance check complete", type: "success" }); refetch(); } });

  const all = policies ?? [];
  const sel = all.find((p) => p.id === selected) ?? all[0];

  const metrics = [
    { label: "Policies", value: fmtNum(all.length), icon: ShieldCheck, color: "red" },
    { label: "Passing", value: fmtNum(all.filter((p) => p.status === "pass").length), icon: CheckCircle2, color: "emerald" },
    { label: "Warnings", value: fmtNum(all.filter((p) => p.status === "warn").length), icon: AlertTriangle, color: "amber" },
    { label: "Failing", value: fmtNum(all.filter((p) => p.status === "fail").length), icon: XCircle, color: "red" },
  ];

  return (
    <SolutionShell solutionId="security" title="Compliance Policies" subtitle="Run policy checks against CIS, NIST, PCI, and custom baselines">
      <MetricGrid items={metrics} cols={4} loading={loading && all.length === 0} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Section title="Policies" className="lg:col-span-1" pad={false}>
          {loading && all.length === 0 ? <div className="p-4"><Loading rows={3} /></div> : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {all.map((p) => (
                <button key={p.id} onClick={() => setSelected(p.id)} className={`w-full text-left px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition ${(selected ?? all[0]?.id) === p.id ? "bg-red-50/40 dark:bg-red-500/5" : ""}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-slate-900 dark:text-white truncate">{p.name}</span>
                    <span className={`text-xs font-bold ${p.score >= 90 ? "text-emerald-600" : p.score >= 75 ? "text-amber-600" : "text-red-600"}`}>{p.score}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Pill color="slate">{p.standard}</Pill>
                    <StatusBadge label={p.status} variant={STATUS_VARIANT[p.status] ?? "neutral"} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </Section>

        <Section title={sel?.name ?? "Policy"} subtitle={sel?.description} icon={ShieldCheck} className="lg:col-span-2"
          actions={sel && <button onClick={() => check(sel.id)} className="flex items-center gap-1.5 text-xs border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"><RefreshCw size={13} /> Check Now</button>}>
          {!sel ? <Loading rows={2} /> : (
            <>
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[["Score", `${sel.score}%`], ["Owner", sel.owner], ["Exceptions", sel.exceptions]].map(([l, v]) => (
                  <div key={l} className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 text-center">
                    <div className="text-base font-bold text-slate-900 dark:text-white truncate">{v}</div>
                    <div className="text-[11px] text-slate-500">{l}</div>
                  </div>
                ))}
              </div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Controls</h4>
              <div className="space-y-1.5">
                {(sel.controls ?? []).map((c) => (
                  <div key={c.id} className="flex items-center gap-2 text-sm py-1.5 border-b border-slate-50 dark:border-slate-800 last:border-0">
                    {c.passing ? <CheckCircle2 size={15} className="text-emerald-500 shrink-0" /> : <XCircle size={15} className="text-red-500 shrink-0" />}
                    <span className="font-mono text-xs text-slate-400 shrink-0">{c.id}</span>
                    <span className="text-slate-700 dark:text-slate-200">{c.name}</span>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-slate-400 mt-3">Last checked {sel.lastCheck ?? sel.last_check}</p>
            </>
          )}
        </Section>
      </div>
    </SolutionShell>
  );
}
