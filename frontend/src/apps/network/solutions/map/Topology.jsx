/**
 * The network map — devices and the cables between them, as discovered.
 *
 * Every line here is a real connection reported over LLDP/CDP by a collector
 * or imported from the monitoring tool; hovering one shows the ports at each
 * end. Devices with no known connection sit in their own row and are never
 * wired to anything by guesswork.
 */
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Network, Server, Router, Cpu, RefreshCw, Info } from "lucide-react";
import { useApi } from "../../../../hooks/useApi";
import { network } from "../../../../services/api";
import { SolutionShell, MetricGrid, Section, Loading, fmtNum, timeAgo } from "../../components/net-ui";

const NODE_STYLE = {
  ok:   { ring: "stroke-emerald-400", fill: "fill-emerald-500" },
  warn: { ring: "stroke-amber-400",   fill: "fill-amber-500" },
  down: { ring: "stroke-red-400",     fill: "fill-red-500" },
};
const ABBR = { router: "R", switch: "SW", firewall: "FW", server: "S", endpoint: "PC", printer: "P", wireless: "AP", storage: "NAS", cloud: "C" };

export default function Topology() {
  const { data, loading, refetch } = useApi(() => network.topology.map(), [], { pollingInterval: 60000 });
  const [hover, setHover] = useState(null);

  const ns = data?.nodes ?? [];
  const ls = data?.links ?? [];
  const nodeById = useMemo(() => Object.fromEntries(ns.map((n) => [n.id, n])), [ns]);
  const width = data?.width ?? 680;
  const height = Math.max(data?.height ?? 300, 240);
  const unconnectedY = ns.find((n) => !n.connected)?.y;

  const metrics = [
    { label: "Devices", value: fmtNum(ns.length), icon: Network, color: "indigo" },
    { label: "Discovered links", value: fmtNum(ls.length), icon: Cpu, color: "sky" },
    { label: "Healthy", value: fmtNum(ns.filter((n) => n.status === "ok").length), icon: Server, color: "emerald" },
    { label: "Degraded / Down", value: fmtNum(ns.filter((n) => n.status !== "ok").length), icon: Router, color: "red" },
  ];

  return (
    <SolutionShell solutionId="map" title="Topology" subtitle="Devices and the connections between them, as discovered"
      actions={<button onClick={refetch} className="flex items-center gap-1.5 text-xs border border-slate-200 dark:border-slate-700 text-slate-500 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"><RefreshCw size={13} /> Refresh</button>}>
      <MetricGrid items={metrics} cols={4} loading={loading && !data} />

      {data && !data.hasLinkData && (
        <div className="flex items-start gap-2 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-100">
          <Info size={16} className="mt-0.5 shrink-0" />
          <span>
            No connection data yet, so no links are drawn. Links come from LLDP/CDP on your switches and routers, read by a collector, or from a
            connected monitoring tool. <Link to="/network/config/settings" className="font-medium underline">Set one up in Settings</Link>.
          </span>
        </div>
      )}

      <Section title="Network map" subtitle="Node color is health · hover a link for its ports" icon={Network}>
        {loading && !data ? <Loading rows={3} /> : ns.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500">No devices yet.</p>
        ) : (
          <div className="overflow-auto rounded-lg border border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/40">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ minWidth: Math.min(width, 900), height: Math.min(height, 640) }}>
              {unconnectedY != null && ls.length > 0 && (
                <text x={16} y={unconnectedY - 34} className="fill-slate-400" fontSize="10">No known connection</text>
              )}
              {ls.map((l) => {
                const s = nodeById[l.source];
                const t = nodeById[l.target];
                if (!s || !t) return null;
                const active = hover === l.id;
                return (
                  <g key={l.id} onMouseEnter={() => setHover(l.id)} onMouseLeave={() => setHover(null)} className="cursor-help">
                    <line x1={s.x} y1={s.y} x2={t.x} y2={t.y} stroke="transparent" strokeWidth={12} />
                    <line x1={s.x} y1={s.y} x2={t.x} y2={t.y} stroke={active ? "#0ea5e9" : "#94a3b8"} strokeWidth={active ? 2.5 : 1.5} />
                    {active && (
                      <text x={(s.x + t.x) / 2} y={(s.y + t.y) / 2 - 6} className="fill-slate-700 dark:fill-slate-200" fontSize="10" textAnchor="middle">
                        {`${s.label}${l.sourcePort ? ` ${l.sourcePort}` : ""} ↔ ${t.label}${l.targetPort ? ` ${l.targetPort}` : ""} · ${l.protocol.toUpperCase()} · ${timeAgo(l.lastSeenAt)}`}
                      </text>
                    )}
                  </g>
                );
              })}
              {ns.map((n) => {
                const st = NODE_STYLE[n.status] ?? NODE_STYLE.ok;
                return (
                  <g key={n.id}>
                    <title>{`${n.label} · ${n.ip || "no address"} · ${n.type} · ${n.source === "manual" ? "entered by hand" : n.source === "monitoring" ? "from monitoring tool" : "discovered"}`}</title>
                    <circle cx={n.x} cy={n.y} r={16} className={`${st.fill} opacity-90`} />
                    <circle cx={n.x} cy={n.y} r={16} className={`${st.ring} fill-none`} strokeWidth={3} />
                    <text x={n.x} y={n.y + 4} className="fill-white" fontSize="9" fontWeight="600" textAnchor="middle">{ABBR[n.type] ?? "?"}</text>
                    <text x={n.x} y={n.y + 30} className="fill-slate-600 dark:fill-slate-300" fontSize="10" textAnchor="middle">{n.label.length > 16 ? `${n.label.slice(0, 15)}…` : n.label}</text>
                    <text x={n.x} y={n.y + 42} className="fill-slate-400" fontSize="8" textAnchor="middle">{n.ip}</text>
                  </g>
                );
              })}
            </svg>
          </div>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Up</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Degraded</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-red-500" /> Down</span>
          <span className="ml-auto">Links not reported for 24 hours are removed from the map.</span>
        </div>
      </Section>
    </SolutionShell>
  );
}
