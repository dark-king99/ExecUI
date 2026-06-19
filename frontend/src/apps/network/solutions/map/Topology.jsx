import { useMemo } from "react";
import { Network, Server, Router, Cloud, Cpu, RefreshCw } from "lucide-react";
import { useApi } from "../../../../hooks/useApi";
import { network } from "../../../../services/api";
import { SolutionShell, MetricGrid, Section, Loading, fmtNum } from "../../components/net-ui";

const NODE_STYLE = {
  ok:   { ring: "stroke-emerald-400", fill: "fill-emerald-500", text: "text-emerald-600" },
  warn: { ring: "stroke-amber-400",   fill: "fill-amber-500",   text: "text-amber-600" },
  down: { ring: "stroke-red-400",     fill: "fill-red-500",     text: "text-red-600" },
};
const TYPE_ICON = { router: Router, switch: Network, server: Server, cloud: Cloud };

export default function Topology() {
  const { data: nodes, loading, refetch } = useApi(() => network.topology.nodes(), [], { pollingInterval: 60000 });
  const { data: links } = useApi(() => network.topology.links(), [], { pollingInterval: 60000 });

  const ns = nodes ?? [];
  const ls = links ?? [];
  const nodeById = useMemo(() => Object.fromEntries(ns.map((n) => [n.id, n])), [ns]);

  const metrics = [
    { label: "Nodes", value: fmtNum(ns.length), icon: Network, color: "indigo" },
    { label: "Links", value: fmtNum(ls.length), icon: Cpu, color: "sky" },
    { label: "Healthy", value: fmtNum(ns.filter((n) => n.status === "ok").length), icon: Server, color: "emerald" },
    { label: "Degraded / Down", value: fmtNum(ns.filter((n) => n.status !== "ok").length), icon: Router, color: "red" },
  ];

  const linkColor = (u) => (u >= 80 ? "#ef4444" : u >= 70 ? "#f59e0b" : "#10b981");

  return (
    <SolutionShell solutionId="map" title="Topology" subtitle="Auto-discovered map of your network devices and links"
      actions={<button onClick={refetch} className="flex items-center gap-1.5 text-xs border border-slate-200 dark:border-slate-700 text-slate-500 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"><RefreshCw size={13} /> Refresh</button>}>
      <MetricGrid items={metrics} cols={4} loading={loading && ns.length === 0} />

      <Section title="Network Map" subtitle="Live topology — node color is health, link color is utilization" icon={Network}>
        {loading && ns.length === 0 ? <Loading rows={3} /> : (
          <div className="overflow-auto rounded-lg bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800">
            <svg viewBox="0 0 680 520" className="w-full" style={{ minWidth: 560, height: 460 }}>
              {ls.map((l, i) => {
                const s = nodeById[l.source];
                const t = nodeById[l.target];
                if (!s || !t) return null;
                return (
                  <g key={i}>
                    <line x1={s.x} y1={s.y} x2={t.x} y2={t.y} stroke={linkColor(l.utilization)} strokeWidth={l.utilization >= 80 ? 2.5 : 1.5} strokeOpacity={0.6} strokeDasharray={l.type === "wireless" ? "5 4" : undefined} />
                    <text x={(s.x + t.x) / 2} y={(s.y + t.y) / 2 - 4} className="fill-slate-400" fontSize="9" textAnchor="middle">{l.utilization}%</text>
                  </g>
                );
              })}
              {ns.map((n) => {
                const st = NODE_STYLE[n.status] ?? NODE_STYLE.ok;
                return (
                  <g key={n.id} className="cursor-pointer">
                    <circle cx={n.x} cy={n.y} r={16} className={`${st.fill} opacity-90`} />
                    <circle cx={n.x} cy={n.y} r={16} className={`${st.ring} fill-none`} strokeWidth={3} />
                    <text x={n.x} y={n.y + 30} className="fill-slate-600 dark:fill-slate-300" fontSize="10" textAnchor="middle">{n.label}</text>
                    <text x={n.x} y={n.y + 42} className="fill-slate-400" fontSize="8" textAnchor="middle">{n.ip}</text>
                  </g>
                );
              })}
            </svg>
          </div>
        )}
        <div className="flex items-center gap-4 mt-4 text-xs text-slate-500">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Healthy</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Warning</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-red-500" /> Down</span>
          <span className="flex items-center gap-1.5 ml-auto"><span className="h-0.5 w-5 bg-red-500" /> Link &gt;80% util</span>
        </div>
      </Section>
    </SolutionShell>
  );
}
