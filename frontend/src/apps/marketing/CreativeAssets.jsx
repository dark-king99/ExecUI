import { useState, useRef } from "react";
import { Image, Plus, RefreshCw, AlertCircle, Search, Upload, Trash2, X } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import { Stat, Card, CardHeader, CardBody } from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import { SkeletonCard } from "../../components/ui/Skeleton";
import { useToast } from "../../components/ui/Toast";
import { useApi, useMutation } from "../../hooks/useApi";
import { marketing } from "../../services/api";

const TYPE_VARIANT = { image: "sky", video: "violet", document: "amber", template: "indigo", gif: "success" };

export default function CreativeAssets() {
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const fileInputRef = useRef(null);
  const { data: assets, loading, error, refetch } = useApi(() => marketing.content.assets.list({ limit: 200 }), [], { pollingInterval: 120000 });
  const { mutate: deleteAsset } = useMutation((id) => marketing.content.assets.delete(id), {
    onSuccess: () => { toast({ message: "Asset deleted", type: "success" }); refetch(); },
    onError: (e) => toast({ message: e?.message ?? "Failed", type: "error" }),
  });
  const { mutate: uploadAsset } = useMutation((data) => marketing.content.assets.upload(data), {
    onSuccess: () => { toast({ message: "Asset uploaded", type: "success" }); refetch(); },
    onError: (e) => toast({ message: e?.message ?? "Upload failed", type: "error" }),
  });
  const all = assets ?? [];
  const TYPES = ["all", "image", "video", "document", "template", "gif"];
  const filtered = all.filter(a => {
    const matchType = typeFilter === "all" || a.type === typeFilter || a.fileType === typeFilter;
    const matchSearch = !search || a.name?.toLowerCase().includes(search.toLowerCase()) || a.tags?.some(t => t.includes(search.toLowerCase()));
    return matchType && matchSearch;
  });
  const totalSize = all.reduce((s, a) => s + (a.sizeBytes ?? 0), 0);
  function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadAsset({ name: file.name, type: file.type, size: file.size });
  }
  return (
    <div className="space-y-6">
      <PageHeader title="Creative Assets" subtitle="Manage your brand assets, templates, and marketing materials"
        actions={
          <div className="flex gap-2">
            <button onClick={refetch} className="flex items-center gap-1.5 text-xs border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"><RefreshCw size={13} /></button>
            <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm px-4 py-2 rounded-lg transition"><Upload size={15} /> Upload Asset</button>
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} />
          </div>
        }
      />
      {loading && all.length === 0 ? (
        <div className="grid grid-cols-3 gap-4">{[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          <Stat label="Total Assets" value={all.length} icon={Image} color="violet" />
          <Stat label="Total Size" value={totalSize ? `${(totalSize / 1024 / 1024).toFixed(1)} MB` : "—"} icon={Upload} color="sky" />
          <Stat label="Types" value={new Set(all.map(a => a.type ?? a.fileType)).size} icon={Plus} color="emerald" />
        </div>
      )}
      {error && <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"><AlertCircle size={15} />{error}</div>}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-900 flex-1 max-w-64">
          <Search size={14} className="text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search assets…" className="flex-1 text-sm bg-transparent outline-none text-slate-900 dark:text-white" />
        </div>
        <div className="flex gap-1.5">
          {TYPES.map(t => (
            <button key={t} onClick={() => setTypeFilter(t)} className={`text-xs px-2.5 py-1 rounded-full border capitalize transition ${typeFilter === t ? "bg-violet-600 text-white border-violet-600" : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-violet-400"}`}>{t === "all" ? "All" : t}</button>
          ))}
        </div>
      </div>
      {loading && all.length === 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">{[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-500">
          <Image size={40} className="text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-sm">No assets found.</p>
          <button onClick={() => fileInputRef.current?.click()} className="mt-3 text-xs text-violet-600 hover:text-violet-700 font-medium transition">Upload your first asset</button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((a, i) => (
            <div key={a.id ?? i} className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden hover:border-violet-300 dark:hover:border-violet-700 transition">
              <div className="h-32 bg-slate-100 dark:bg-slate-800 flex items-center justify-center relative">
                {a.url || a.thumbnail ? (
                  <img src={a.url ?? a.thumbnail} alt={a.name} className="w-full h-full object-cover" />
                ) : (
                  <Image size={32} className="text-slate-300 dark:text-slate-600" />
                )}
                <button onClick={() => deleteAsset(a.id)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1.5 bg-red-500 text-white rounded-lg transition hover:bg-red-600">
                  <Trash2 size={12} />
                </button>
              </div>
              <div className="p-3">
                <div className="text-sm font-medium text-slate-900 dark:text-white truncate mb-1">{a.name}</div>
                <div className="flex items-center justify-between">
                  <StatusBadge label={a.type ?? a.fileType ?? "file"} variant={TYPE_VARIANT[a.type ?? a.fileType] ?? "neutral"} />
                  {a.size && <span className="text-xs text-slate-400">{a.size}</span>}
                </div>
                {a.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {a.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="text-xs px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
