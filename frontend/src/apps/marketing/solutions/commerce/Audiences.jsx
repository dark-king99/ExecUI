import { Crosshair, Users, Zap, ShoppingBag } from "lucide-react";
import StatusBadge from "../../../../components/ui/StatusBadge";
import { useToast } from "../../../../components/ui/Toast";
import { useApi, useMutation } from "../../../../hooks/useApi";
import { marketing } from "../../../../services/api";
import { SolutionShell, MetricGrid, Section, Loading, Pill, fmtNum } from "../../components/mkt-ui";

const STATUS_VARIANT = { active: "success", draft: "neutral", building: "warning" };

export default function Audiences() {
  const toast = useToast();
  const { data: audiences, loading, refetch } = useApi(() => marketing.audiences.list(), [], { pollingInterval: 60000 });
  const { mutate: activate } = useMutation((id) => marketing.audiences.activate(id), { onSuccess: () => { toast({ message: "Audience activated for commerce", type: "success" }); refetch(); } });

  const all = audiences ?? [];
  const metrics = [
    { label: "Shopper Audiences", value: all.length, icon: Crosshair, color: "rose" },
    { label: "Active", value: all.filter((a) => a.status === "active").length, icon: Zap, color: "emerald" },
    { label: "Total Reach", value: fmtNum(all.reduce((s, a) => s + (a.size ?? 0), 0)), icon: Users, color: "violet" },
  ];

  return (
    <SolutionShell solutionId="commerce" title="Audiences" subtitle="Target shoppers with high-intent commerce audiences">
      <MetricGrid items={metrics} cols={3} loading={loading && all.length === 0} />

      {loading && all.length === 0 ? <Loading rows={6} /> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {all.map((a) => (
            <div key={a.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm flex flex-col">
              <div className="flex items-start justify-between mb-2">
                <div className="h-10 w-10 rounded-lg bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center"><ShoppingBag size={18} className="text-rose-600 dark:text-rose-400" /></div>
                <StatusBadge label={a.status} variant={STATUS_VARIANT[a.status] ?? "neutral"} />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{a.name}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed flex-1">{a.description}</p>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Pill color="violet">{a.type}</Pill>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">{fmtNum(a.size)}</span>
                </div>
                {a.status !== "active" && <button onClick={() => activate(a.id)} className="text-xs px-2.5 py-1 bg-rose-600 text-white hover:bg-rose-700 rounded-lg transition">Activate</button>}
              </div>
            </div>
          ))}
          {all.length === 0 && <div className="col-span-full py-10 text-center text-sm text-slate-400">No audiences yet.</div>}
        </div>
      )}
    </SolutionShell>
  );
}
