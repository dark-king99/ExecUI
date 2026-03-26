import { useMemo, useState, useRef } from "react";
import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody, CardHeader, Stat } from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import { Image, Upload, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { useApi } from "../../hooks/useApi";
import { useToast } from "../../components/ui/Toast";
import { marketing } from "../../services/api";

const statusVariant = { approved: "success", "in-review": "warning", draft: "neutral" };
const typeColor = {
  Image: "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400",
  Video: "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400",
  Copy:  "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400",
};

export default function CreativeAssets() {
  const toast = useToast();
  const [filter, setFilter] = useState("all");
  const uploadRef = useRef(null);

  function handleUploadClick() {
    uploadRef.current?.click();
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    toast({ message: `"${file.name}" uploaded successfully.`, type: "success" });
  }

  const { data: assets, loading, error } = useApi(
    () => marketing.content.assets.list(), [], { pollingInterval: 60000 }
  );

  const allAssets = assets ?? [];

  const types = useMemo(() =>
    ["all", ...new Set(allAssets.map(a => a.type).filter(Boolean))],
    [allAssets]
  );

  const filtered = filter === "all" ? allAssets : allAssets.filter(a => a.type === filter);

  const approved = allAssets.filter(a => a.status === "approved").length;
  const inReview = allAssets.filter(a => a.status === "in-review").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Creative Asset Library"
        subtitle="Asset versions, approvals, usage rights and performance mapping"
        actions={
          <>
            <input ref={uploadRef} type="file" accept="image/*,video/*,.pdf,.doc,.docx" className="hidden" onChange={handleFileChange} />
            <button onClick={handleUploadClick} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg transition">
              <Upload size={15} /> Upload Asset
            </button>
          </>
        }
      />

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle size={15} /> {error}
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <Stat label="Total Assets" value={loading ? "…" : allAssets.length} icon={Image}       color="indigo" />
        <Stat label="Approved"     value={loading ? "…" : approved}         icon={CheckCircle} color="emerald" />
        <Stat label="In Review"    value={loading ? "…" : inReview}         icon={Clock}       color="amber" />
      </div>

      <div className="flex gap-2 flex-wrap">
        {types.map(t => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              filter === t
                ? "bg-indigo-600 text-white"
                : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-indigo-400"
            }`}
          >
            {t === "all" ? "All" : t}
          </button>
        ))}
      </div>

      {loading && allAssets.length === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 animate-pulse">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-48 bg-slate-100 dark:bg-slate-700 rounded-xl" />)}
        </div>
      )}

      {!loading && !error && allAssets.length === 0 && (
        <p className="text-sm text-slate-500 text-center py-8">No assets found.</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(asset => (
          <Card key={asset.id ?? asset.name}>
            <CardBody>
              <div className="h-24 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                <Image size={32} className="text-slate-300 dark:text-slate-600" />
              </div>
              <div className="flex items-start justify-between mb-2">
                <p className="text-sm font-semibold text-slate-900 dark:text-white leading-tight">{asset.name}</p>
                <StatusBadge label={(asset.status ?? "").replace("-", " ")} variant={statusVariant[asset.status] ?? "neutral"} dot />
              </div>
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColor[asset.type] ?? ""}`}>{asset.type}</span>
                {asset.version && <span className="text-xs text-slate-400">{asset.version}</span>}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                <div>Uses: <strong className="text-slate-800 dark:text-slate-200">{asset.uses ?? 0}</strong></div>
                {asset.ctr && asset.ctr !== "—" && (
                  <div>CTR: <strong className="text-emerald-600 dark:text-emerald-400">{asset.ctr}</strong></div>
                )}
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => toast({ message: `Previewing "${asset.name}".`, type: "info" })}
                  className="flex-1 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400 hover:border-indigo-400 transition"
                >
                  Preview
                </button>
                <button
                  onClick={() => toast({ message: `"${asset.name}" added to campaign.`, type: "success" })}
                  className="flex-1 py-1.5 rounded-lg bg-indigo-600 text-white text-xs hover:bg-indigo-700 transition"
                >
                  Use in Campaign
                </button>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
