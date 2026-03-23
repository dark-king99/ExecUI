import { useRef, useState, useEffect } from "react";
import { ZoomIn, ZoomOut, Maximize } from "lucide-react";

const regions = [
  { id: "cloud", name: "Cloud Region", x: 2000, y: 200, w: 700, h: 500 },
  { id: "dc1", name: "Data Center A", x: 200, y: 200, w: 700, h: 500 },
  { id: "dc2", name: "Data Center B", x: 200, y: 900, w: 700, h: 500 },
  { id: "hq", name: "Headquarters", x: 1200, y: 900, w: 700, h: 500 },
  { id: "branch", name: "Branch Office", x: 1200, y: 200, w: 600, h: 400 },
];

// Generate lots of fake nodes per region
function generateNodes() {
  const nodes = [];
  let id = 1;

  regions.forEach((r) => {
    // Core router
    nodes.push({
      id: `core-${r.id}`,
      label: `${r.name} Core`,
      x: r.x + r.w / 2,
      y: r.y + 60,
      status: "ok",
      region: r.id,
      type: "core",
    });

    // Switches + servers + endpoints
    for (let i = 0; i < 10; i++) {
      nodes.push({
        id: `n-${id++}`,
        label: `Device ${id}`,
        x: r.x + 80 + (i % 5) * 110,
        y: r.y + 150 + Math.floor(i / 5) * 120,
        status: Math.random() > 0.85 ? "warn" : "ok",
        region: r.id,
        type: i < 4 ? "server" : "endpoint",
      });
    }
  });

  return nodes;
}

const nodes = generateNodes();

// Backbone links between regions
const links = [
  ["core-dc1", "core-dc2"],
  ["core-dc1", "core-branch"],
  ["core-dc2", "core-hq"],
  ["core-hq", "core-cloud"],
  ["core-dc1", "core-cloud"],
];

export default function TopologyMap() {
  const containerRef = useRef(null);
  const [scale, setScale] = useState(0.6);
  const [offset, setOffset] = useState({ x: -300, y: -200 });
  const [dragging, setDragging] = useState(false);
  const [start, setStart] = useState({ x: 0, y: 0 });

  // Pan handlers
  const onMouseDown = (e) => {
    setDragging(true);
    setStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const onMouseMove = (e) => {
    if (!dragging) return;
    setOffset({
      x: e.clientX - start.x,
      y: e.clientY - start.y,
    });
  };

  const onMouseUp = () => setDragging(false);

  // Zoom
  const zoomIn = () => setScale((s) => Math.min(2, s + 0.1));
  const zoomOut = () => setScale((s) => Math.max(0.3, s - 0.1));

  const fitToNetwork = () => {
    setScale(0.6);
    setOffset({ x: -300, y: -200 });
  };

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 border-b bg-white dark:bg-slate-900">
        <button onClick={zoomIn} className="px-2 py-1 rounded border"> <ZoomIn size={16} /> </button>
        <button onClick={zoomOut} className="px-2 py-1 rounded border"> <ZoomOut size={16} /> </button>
        <button onClick={fitToNetwork} className="px-2 py-1 rounded border flex items-center gap-1">
          <Maximize size={16} /> Fit
        </button>
        <span className="ml-4 text-sm text-slate-500">Zoom: {(scale * 100).toFixed(0)}%</span>
      </div>

      {/* Canvas */}
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
          {regions.map((r) => (
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
            {links.map(([a, b], i) => {
              const na = nodes.find((n) => n.id === a);
              const nb = nodes.find((n) => n.id === b);
              if (!na || !nb) return null;
              return (
                <line
                  key={i}
                  x1={na.x}
                  y1={na.y}
                  x2={nb.x}
                  y2={nb.y}
                  stroke="#64748b"
                  strokeWidth="2"
                  strokeDasharray="6 4"
                />
              );
            })}
          </svg>

          {/* Nodes */}
          {nodes.map((n) => (
            <div
              key={n.id}
              className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full px-3 py-2 text-xs font-semibold shadow
                ${n.status === "ok" ? "bg-emerald-500 text-white" : "bg-amber-500 text-white"}`}
              style={{ left: n.x, top: n.y }}
            >
              {n.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
