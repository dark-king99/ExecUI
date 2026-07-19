import { useState, useMemo } from "react";
import { Gauge, Server, Cpu, AlertTriangle, Search } from "lucide-react";
import { useApi } from "../../../../hooks/useApi";
import { network } from "../../../../services/api";
import { SolutionShell, MetricGrid, Section, Loading, UtilBar, fmtNum } from "../../components/net-ui";

const STATUS_DOT = { online: "bg-emerald-500", up: "bg-emerald-500", warning: "bg-amber-500", degraded: "bg-amber-500", offline: "bg-red-500", down: "bg-red-500" };

export default function Monitor() {
  const [search, setSearch] = useState("");
  const { data, loading } = useApi(() => network.monitor.overview(), [], { pollingInterval: 20000 });

  const nodes = data?.nodes ?? [];
  const sum = data?.summary ?? {};
  const filtered = useMemo(() => nodes.filter((n) => !search || n.label?.toLowerCase().includes(search.toLowerCase())), [nodes, search]);

  const metrics = [
    { label: "Nodes", value: fmtNum(sum.total ?? nodes.length), icon: Server, color: "emerald" },
    { label: "Online", value: fmtNum(sum.online ?? 0), icon: Gauge, color: "emerald" },
    { label: "Warning", value: fmtNum(sum.warning ?? 0), icon: AlertTriangle, color: "amber" },
    { label: "Offline", value: fmtNum(sum.offline ?? 0), icon: Cpu, color: "red" },
  ];

  return (
    <SolutionShell solutionId="performance" title="Visual Monitor" subtitle="Real-time health and utilization for every node">
      <MetricGrid items={metrics} cols={4} loading={loading && nodes.length === 0} />

      <Section title="Live Nodes" subtitle={`${fmtNum(filtered.length)} monitored`} icon={Gauge} pad={false}
        actions={
          <div className="flex items-center gap-1.5 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 bg-white dark:bg-slate-900">
            <Search size={13} className="text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="text-sm bg-transparent outline-none text-slate-900 dark:text-white w-28" />
          </div>
        }>
        {loading && nodes.length === 0 ? <div className="p-3"><Loading rows={6} /></div> : (
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.length === 0 ? <div className="col-span-full py-10 text-center text-sm text-slate-400">No nodes.</div> : filtered.map((n) => (
              <div key={n.id} className="border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${STATUS_DOT[n.status] ?? "bg-slate-400"}`} />
                  <span className="text-sm font-medium text-slate-900 dark:text-white truncate flex-1">{n.label}</span>
                  <span className="text-[10px] uppercase tracking-wide text-slate-400">{n.type}</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between"><span className="text-xs text-slate-500">CPU</span><UtilBar value={n.cpu} /></div>
                  <div className="flex items-center justify-between"><span className="text-xs text-slate-500">Mem</span><UtilBar value={n.mem} /></div>
                  {n.disk != null && <div className="flex items-center justify-between"><span className="text-xs text-slate-500">Disk</span><UtilBar value={n.disk} /></div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </SolutionShell>
  );
}
