import { useRef, useState } from "react";
import { ZoomIn, ZoomOut, Maximize, RefreshCw, AlertTriangle, Loader2, Server, Wifi, Router } from "lucide-react";
import { useApi } from "../../../hooks/useApi";
import { network } from "../../../services/api";

const NODE_COLORS = {
  ok: "bg-emerald-500", online: "bg-emerald-500",
  warn: "bg-amber-500", warning: "bg-amber-500",
  down: "bg-red-500", error: "bg-red-500",
  unknown: "bg-slate-400",
};

function NodeIcon({ type }) {
  if (type === "router" || type === "switch") return <Router size={10} className="text-white opacity-80" />;
  if (type === "wireless" || type === "ap") return <Wifi size={10} className="text-white opacity-80" />;
  return <Server size={10} className="text-white opacity-80" />;
}

export default function TopologyMap() {
  const containerRef = useRef(null);
  const [scale, setScale] = useState(0.65);
  const [offset, setOffset] = useState({ x: -250, y: -150 });
  const [dragging, setDragging] = useState(false);
  const [start, setStart] = useState({ x: 0, y: 0 });
  const [hoveredNode, setHoveredNode] = useState(null);

  const { data: regions, loading: regLoading, refetch: refetchReg } = useApi(() => network.topology.regions(), [], { pollingInterval: 60000 });
  const { data: nodes, loading: nodesLoading, refetch: refetchNodes } = useApi(() => network.topology.nodes(), [], { pollingInterval: 30000 });
  const { data: links, loading: linksLoading, refetch: refetchLinks } = useApi(() => network.topology.links(), [], { pollingInterval: 60000 });

  const loading = regLoading || nodesLoading || linksLoading;
  const allNodes = nodes ?? [];
  const allLinks = links ?? [];
  const allRegions = regions ?? [];

  const onMouseDown = (e) => { setDragging(true); setStart({ x: e.clientX - offset.x, y: e.clientY - offset.y }); };
  const onMouseMove = (e) => { if (dragging) setOffset({ x: e.clientX - start.x, y: e.clientY - start.y }); };
  const onMouseUp = () => setDragging(false);
  const zoomIn = () => setScale(s => Math.min(2.5, s + 0.15));
  const zoomOut = () => setScale(s => Math.max(0.25, s - 0.15));
  const fitView = () => { setScale(0.65); setOffset({ x: -250, y: -150 }); };
  const handleRefresh = () => { refetchReg(); refetchNodes(); refetchLinks(); };

  const statusCounts = {
    online: allNodes.filter(n => n.status === "ok" || n.status === "online").length,
    warning: allNodes.filter(n => n.status === "warn" || n.status === "warning").length,
    down: allNodes.filter(n => n.status === "down" || n.status === "error").length,
  };

  return (
    <div className="h-full w-full flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 rounded-xl">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
        <button onClick={zoomIn} title="Zoom In" className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition"><ZoomIn size={14} /></button>
        <button onClick={zoomOut} title="Zoom Out" className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition"><ZoomOut size={14} /></button>
        <button onClick={fitView} title="Fit to screen" className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition"><Maximize size={13} />Fit</button>
        <span className="text-xs text-slate-400">{(scale * 100).toFixed(0)}%</span>

        <div className="ml-3 flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" /><span className="text-slate-500">{statusCounts.online} online</span></div>
          <div className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500 inline-block" /><span className="text-slate-500">{statusCounts.warning} warn</span></div>
          <div className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500 inline-block" /><span className="text-slate-500">{statusCounts.down} down</span></div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {!loading && <span className="text-xs text-slate-400">{allNodes.length} nodes · {allLinks.length} links</span>}
          <button onClick={handleRefresh} className="flex items-center gap-1.5 text-xs border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"><RefreshCw size={12} />Refresh</button>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-2 text-slate-400">
            <Loader2 size={20} className="animate-spin" />
            <span className="text-sm">Loading topology…</span>
          </div>
        </div>
      ) : allNodes.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-400">
          <Server size={40} className="mb-3 text-slate-300 dark:text-slate-600" />
          <p className="text-sm">No topology data available.</p>
          <p className="text-xs mt-1">Ensure network discovery is configured.</p>
        </div>
      ) : (
        <div
          ref={containerRef}
          className="flex-1 overflow-hidden bg-slate-50 dark:bg-slate-950 cursor-grab active:cursor-grabbing relative"
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        >
          <div
            className="absolute"
            style={{
              width: 3000,
              height: 2000,
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
              transformOrigin: "0 0",
            }}
          >
            {allRegions.map((r) => (
              <div
                key={r.id}
                className="absolute rounded-2xl border-2 border-dashed border-slate-300/50 dark:border-slate-600/40 bg-slate-200/20 dark:bg-slate-800/20"
                style={{ left: r.x, top: r.y, width: r.w, height: r.h }}
              >
                <div className="absolute -top-6 left-3 text-sm font-semibold text-slate-500 dark:text-slate-400">{r.name}</div>
              </div>
            ))}

            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {allLinks.map((link, i) => {
                const na = allNodes.find(n => n.id === (link[0] ?? link.source ?? link.from));
                const nb = allNodes.find(n => n.id === (link[1] ?? link.target ?? link.to));
                if (!na || !nb) return null;
                const isHighPkt = (link.utilization ?? 0) > 80;
                return (
                  <line
                    key={i}
                    x1={na.x} y1={na.y}
                    x2={nb.x} y2={nb.y}
                    stroke={isHighPkt ? "#f59e0b" : "#94a3b8"}
                    strokeWidth={isHighPkt ? "2.5" : "1.5"}
                    strokeDasharray={link.type === "wireless" ? "8 4" : "none"}
                    opacity="0.6"
                  />
                );
              })}
            </svg>

            {allNodes.map((n) => {
              const colorClass = NODE_COLORS[n.status] ?? NODE_COLORS.unknown;
              const isHovered = hoveredNode === n.id;
              return (
                <div
                  key={n.id}
                  title={`${n.label ?? n.name ?? n.id} · ${n.status ?? "unknown"}`}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all ${isHovered ? "scale-125 z-10" : ""}`}
                  style={{ left: n.x, top: n.y }}
                  onMouseEnter={() => setHoveredNode(n.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                >
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shadow-md ${colorClass} text-white`}>
                    <NodeIcon type={n.type} />
                    {n.label ?? n.name ?? n.id}
                  </div>
                  {isHovered && (n.ip || n.type) && (
                    <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs shadow-lg whitespace-nowrap z-20">
                      {n.type && <div className="text-slate-500 capitalize">{n.type}</div>}
                      {n.ip && <div className="font-mono text-slate-700 dark:text-slate-300">{n.ip}</div>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
