import { useState } from "react";
import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody, CardHeader, Stat } from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import { Crosshair, Users, Plus, TrendingUp, AlertCircle, Loader2 } from "lucide-react";
import { useApi, useMutation } from "../../hooks/useApi";
import { marketing } from "../../services/api";
import { useToast } from "../../components/ui/Toast";

const typeVariant = { Behavioral: "indigo", "Event-based": "sky", Predictive: "warning", Demographic: "neutral", Lookalike: "success" };

export default function AudienceStudio() {
  const toast = useToast();
  const [active, setActive] = useState(null);

  const { data: segments, loading, error, refetch } = useApi(
    () => marketing.audiences.list(), [], { pollingInterval: 60000 }
  );

  const { mutate: activate, loading: activating } = useMutation(
    (id) => marketing.audiences.activate(id, {}),
    {
      onSuccess: () => toast({ message: "Audience activated", type: "success" }),
      onError: (err) => toast({ message: err?.message ?? "Activation failed", type: "error" }),
    }
  );

  const { mutate: createLookalike, loading: creatingLookalike } = useMutation(
    (id) => marketing.audiences.createLookalike(id),
    {
      onSuccess: () => { toast({ message: "Lookalike created", type: "success" }); refetch(); },
      onError: (err) => toast({ message: err?.message ?? "Failed to create lookalike", type: "error" }),
    }
  );

  const allSegments = segments ?? [];
  const activeCount = allSegments.filter(s => s.status === "active").length;
  const totalAddressable = allSegments.reduce((sum, s) => sum + (s.sizeRaw ?? s.size ?? 0), 0);
  const aiPowered = allSegments.filter(s => s.type === "Predictive" || s.type === "Lookalike").length;

  const selectedSeg = active ?? allSegments[0] ?? null;

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

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle size={15} /> {error}
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <Stat label="Total Segments"  value={loading ? "…" : allSegments.length} icon={Crosshair} color="indigo" />
        <Stat label="Addressable"     value={loading ? "…" : totalAddressable.toLocaleString()} icon={Users} color="sky" />
        <Stat label="AI-Powered"      value={loading ? "…" : aiPowered} icon={TrendingUp} color="emerald" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-3">
          {loading && allSegments.length === 0 && (
            <div className="space-y-3 animate-pulse">
              {[1,2,3,4].map(i => <div key={i} className="h-20 bg-slate-100 dark:bg-slate-700 rounded-xl" />)}
            </div>
          )}
          {!loading && allSegments.length === 0 && !error && (
            <p className="text-sm text-slate-500">No audience segments found.</p>
          )}
          {allSegments.map(seg => (
            <button
              key={seg.id ?? seg.name}
              onClick={() => setActive(seg)}
              className={`w-full text-left p-4 rounded-xl border transition ${
                selectedSeg?.id === seg.id || selectedSeg?.name === seg.name
                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                  : "border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{seg.name}</p>
                <div className="flex items-center gap-2">
                  <StatusBadge label={seg.type} variant={typeVariant[seg.type] ?? "neutral"} />
                  <StatusBadge label={seg.status} variant={seg.status === "active" ? "success" : "neutral"} dot />
                </div>
              </div>
              <div className="flex gap-4 text-xs text-slate-500">
                <span>Size: <strong className="text-slate-800 dark:text-slate-200">{(seg.sizeRaw ?? seg.size ?? 0).toLocaleString()}</strong></span>
                <span>Source: {seg.source}</span>
                <span>Match Quality: <strong className={
                  (seg.match ?? 0) >= 90 ? "text-emerald-600" : (seg.match ?? 0) >= 75 ? "text-amber-600" : "text-slate-600"
                }>{seg.match ?? "—"}%</strong></span>
              </div>
            </button>
          ))}
        </div>

        {selectedSeg && (
          <Card>
            <CardHeader title={selectedSeg.name} icon={Crosshair} />
            <CardBody className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ["Size", (selectedSeg.sizeRaw ?? selectedSeg.size ?? 0).toLocaleString()],
                  ["Type", selectedSeg.type],
                  ["Source", selectedSeg.source],
                  ["Match Quality", `${selectedSeg.match ?? "—"}%`],
                ].map(([k, v]) => (
                  <div key={k} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                    <p className="text-xs text-slate-400 mb-0.5">{k}</p>
                    <p className="font-semibold text-slate-900 dark:text-white">{v}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</p>
                <button
                  onClick={() => activate(selectedSeg.id)}
                  disabled={activating}
                  className="w-full py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700 transition disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {activating && <Loader2 size={13} className="animate-spin" />} Activate in Campaign
                </button>
                <button
                  onClick={() => createLookalike(selectedSeg.id)}
                  disabled={creatingLookalike}
                  className="w-full py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-300 hover:border-indigo-400 transition disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {creatingLookalike && <Loader2 size={13} className="animate-spin" />} Create Lookalike
                </button>
                <button
                  onClick={async () => {
                    if (!selectedSeg?.id) return;
                    try {
                      await marketing.audiences.overlap(selectedSeg.id);
                      toast({ message: "Overlap analysis complete.", type: "success" });
                    } catch (err) {
                      toast({ message: err?.message ?? "Overlap analysis failed.", type: "error" });
                    }
                  }}
                  className="w-full py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-300 hover:border-indigo-400 transition"
                >
                  Analyze Overlap
                </button>
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
