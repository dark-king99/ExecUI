import { useState } from "react";
import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody, CardHeader, Stat } from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import { Crosshair, Users, Plus, TrendingUp } from "lucide-react";

const segments = [
  { name: "High-Value Enterprise",  size: "4,210",  type: "Behavioral",  source: "CRM",      status: "active",  match: 92 },
  { name: "Trial → Conversion",     size: "1,840",  type: "Event-based", source: "Product",  status: "active",  match: 88 },
  { name: "At-Risk Churners",       size: "642",    type: "Predictive",  source: "AI Model", status: "active",  match: 79 },
  { name: "Q1 Upsell Candidates",   size: "2,103",  type: "Behavioral",  source: "CRM+CDP",  status: "active",  match: 85 },
  { name: "EMEA Mid-Market",        size: "8,340",  type: "Demographic", source: "CRM",      status: "active",  match: 95 },
  { name: "Lookalike – Top 100",    size: "12,500", type: "Lookalike",   source: "AI Model", status: "draft",   match: 71 },
];

const typeVariant = { Behavioral: "indigo", "Event-based": "sky", Predictive: "warning", Demographic: "neutral", Lookalike: "success" };

export default function AudienceStudio() {
  const [active, setActive] = useState(segments[0]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audience Studio"
        subtitle="Segment creation, lookalike modeling and overlap analysis"
        actions={
          <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg transition">
            <Plus size={15} /> Build Segment
          </button>
        }
      />

      <div className="grid grid-cols-3 gap-4">
        <Stat label="Total Segments"  value={segments.length}     icon={Crosshair} color="indigo" />
        <Stat label="Addressable"     value="29.6k"               icon={Users}     color="sky" />
        <Stat label="AI-Powered"      value="2"                   icon={TrendingUp} color="emerald" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-3">
          {segments.map(seg => (
            <button
              key={seg.name}
              onClick={() => setActive(seg)}
              className={`w-full text-left p-4 rounded-xl border transition ${
                active?.name === seg.name
                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                  : "border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{seg.name}</p>
                <div className="flex items-center gap-2">
                  <StatusBadge label={seg.type} variant={typeVariant[seg.type]} />
                  <StatusBadge label={seg.status} variant={seg.status === "active" ? "success" : "neutral"} dot />
                </div>
              </div>
              <div className="flex gap-4 text-xs text-slate-500">
                <span>Size: <strong className="text-slate-800 dark:text-slate-200">{seg.size}</strong></span>
                <span>Source: {seg.source}</span>
                <span>Match Quality: <strong className={seg.match >= 90 ? "text-emerald-600" : seg.match >= 75 ? "text-amber-600" : "text-slate-600"}>{seg.match}%</strong></span>
              </div>
            </button>
          ))}
        </div>

        {/* Segment detail */}
        {active && (
          <Card>
            <CardHeader title={active.name} icon={Crosshair} />
            <CardBody className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ["Size", active.size],
                  ["Type", active.type],
                  ["Source", active.source],
                  ["Match Quality", `${active.match}%`],
                ].map(([k, v]) => (
                  <div key={k} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                    <p className="text-xs text-slate-400 mb-0.5">{k}</p>
                    <p className="font-semibold text-slate-900 dark:text-white">{v}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</p>
                <button className="w-full py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700 transition">Activate in Campaign</button>
                <button className="w-full py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-300 hover:border-indigo-400 transition">Create Lookalike</button>
                <button className="w-full py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-300 hover:border-indigo-400 transition">Analyze Overlap</button>
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
