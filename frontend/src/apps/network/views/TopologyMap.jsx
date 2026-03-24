import { useRef, useState } from "react";
import { useApi } from "../../../hooks/useApi";
import { network } from "../../../services/api";
import { ZoomIn, ZoomOut, Maximize, RefreshCw, AlertTriangle, Loader2 } from "lucide-react";

export default function TopologyMap() {
  const containerRef = useRef(null);
  const [scale,    setScale]    = useState(0.6);
  const [offset,   setOffset]   = useState({ x: -300, y: -200 });
  const [dragging, setDragging] = useState(false);
  const [start,    setStart]    = useState({ x: 0, y: 0 });

  const {
    data: regions,
    loading: regionsLoading,
    error: regionsError,
    refetch: refetchRegions,
  } = useApi(() => network.topology.regions(), [], { pollingInterval: 60000 });

  const {
    data: nodes,
    loading: nodesLoading,
    error: nodesError,
    refetch: refetchNodes,
  } = useApi(() => network.topology.nodes(), [], { pollingInterval: 30000 });

  const {
    data: links,
    loading: linksLoading,
    error: linksError,
    refetch: refetchLinks,
  } = useApi(() => network.topology.links(), [], { pollingInterval: 60000 });

  const loading = regionsLoading || nodesLoading || linksLoading;
  const error   = regionsError ?? nodesError ?? linksError;

  // Pan handlers
  const onMouseDown = (e) => {
    setDragging(true);
    setStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };
  const onMouseMove = (e) => {
    if (!dragging) return;
    setOffset({ x: e.clientX - start.x, y: e.clientY - start.y });
  };
  const onMouseUp = () => setDragging(false);

  const zoomIn       = () => setScale((s) => Math.min(2,   s + 0.1));
  const zoomOut      = () => setScale((s) => Math.max(0.3, s - 0.1));
  const fitToNetwork = () => { setScale(0.6); setOffset({ x: -300, y: -200 }); };
  const handleRefresh= () => { refetchRegions(); refetchNodes(); refetchLinks(); };

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 border-b bg-white dark:bg-slate-900">
        <button onClick={zoomIn}  className="px-2 py-1 rounded border"><ZoomIn size={16} /></button>
        <button onClick={zoomOut} className="px-2 py-1 rounded border"><ZoomOut size={16} /></button>
        <button onClick={fitToNetwork} className="px-2 py-1 rounded border flex items-center gap-1">
          <Maximize size={16} /> Fit
        </button>
        <span className="ml-2 text-sm text-slate-500">Zoom: {(scale * 100).toFixed(0)}%</span>

        <div className="ml-auto flex items-center gap-2">
          {nodes && (
            <span className="text-xs text-slate-400">
              {nodes.length} nodes · {(links ?? []).length} links
            </span>
          )}
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg transition"
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300">
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      {/* Canvas */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-2 text-slate-400">
            <Loader2 size={20} className="animate-spin" />
            <span className="text-sm">Loading topology…</span>
          </div>
        </div>
      ) : (regions?.length > 0 || nodes?.length > 0) ? (
        <div
          ref={containerRef}
          className="flex-1 overflow-hidden bg-slate-50 dark:bg-slate-950 cursor-grab"
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        >
          <div
            className="relative"
            style={{
              width: 3000,
              height: 2000,
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
              transformOrigin: "0 0",
            }}
          >
            {/* Regions */}
            {(regions ?? []).map((r) => (
              <div
                key={r.id}
                className="absolute rounded-xl border border-dashed border-slate-400/40 bg-slate-200/30 dark:bg-slate-800/30"
                style={{ left: r.x, top: r.y, width: r.w, height: r.h }}
              >
                <div className="absolute -top-6 left-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                  {r.name}
                </div>
              </div>
            ))}

            {/* Links */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {(links ?? []).map((link, i) => {
                const nodeList = nodes ?? [];
                const na = nodeList.find((n) => n.id === (link[0] ?? link.source));
                const nb = nodeList.find((n) => n.id === (link[1] ?? link.target));
                if (!na || !nb) return null;
                return (
                  <line
                    key={i}
                    x1={na.x} y1={na.y}
                    x2={nb.x} y2={nb.y}
                    stroke="#64748b"
                    strokeWidth="2"
                    strokeDasharray="6 4"
                  />
                );
              })}
            </svg>

            {/* Nodes */}
            {(nodes ?? []).map((n) => (
              <div
                key={n.id}
                title={`${n.label ?? n.id} — ${n.status ?? "unknown"}`}
                className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full px-3 py-2 text-xs font-semibold shadow cursor-pointer transition hover:opacity-80 ${
                  n.status === "ok" || n.status === "online"
                    ? "bg-emerald-500 text-white"
                    : n.status === "warn" || n.status === "warning"
                    ? "bg-amber-500 text-white"
                    : "bg-red-500 text-white"
                }`}
                style={{ left: n.x, top: n.y }}
              >
                {n.label ?? n.name ?? n.id}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-sm text-slate-500">
          No topology data available. Ensure network discovery is configured.
        </div>
      )}
    </div>
  );
}
