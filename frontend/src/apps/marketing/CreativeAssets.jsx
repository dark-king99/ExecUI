import { useState } from "react";
import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody, CardHeader, Stat } from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import { Image, Upload, CheckCircle, Clock, TrendingUp, Plus } from "lucide-react";

const assets = [
  { name: "Q1 Hero Banner",         type: "Image",   status: "approved",  uses: 12, ctr: "4.8%", version: "v3" },
  { name: "EMMA Product Video",      type: "Video",   status: "approved",  uses: 8,  ctr: "9.2%", version: "v1" },
  { name: "Enterprise Email Header", type: "Image",   status: "approved",  uses: 24, ctr: "3.1%", version: "v2" },
  { name: "LinkedIn Ad Set A",       type: "Image",   status: "in-review", uses: 0,  ctr: "—",   version: "v1" },
  { name: "Product Demo Script",     type: "Copy",    status: "approved",  uses: 6,  ctr: "—",   version: "v4" },
  { name: "Summer Campaign Teaser",  type: "Video",   status: "draft",     uses: 0,  ctr: "—",   version: "v1" },
  { name: "CTA Button – Variants",   type: "Image",   status: "approved",  uses: 38, ctr: "5.6%", version: "v5" },
];

const statusVariant = { approved: "success", "in-review": "warning", draft: "neutral" };
const typeColor = {
  Image: "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400",
  Video: "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400",
  Copy:  "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400",
};

export default function CreativeAssets() {
  const [filter, setFilter] = useState("all");
  const types = ["all", "Image", "Video", "Copy"];
  const filtered = filter === "all" ? assets : assets.filter(a => a.type === filter);
  const approved = assets.filter(a => a.status === "approved").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Creative Asset Library"
        subtitle="Asset versions, approvals, usage rights and performance mapping"
        actions={
          <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg transition">
            <Upload size={15} /> Upload Asset
          </button>
        }
      />

      <div className="grid grid-cols-3 gap-4">
        <Stat label="Total Assets"  value={assets.length} icon={Image}      color="indigo" />
        <Stat label="Approved"      value={approved}      icon={CheckCircle} color="emerald" />
        <Stat label="In Review"     value="1"             icon={Clock}      color="amber" />
      </div>

      <div className="flex gap-2">
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

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(asset => (
          <Card key={asset.name}>
            <CardBody>
              <div className="h-24 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                <Image size={32} className="text-slate-300 dark:text-slate-600" />
              </div>
              <div className="flex items-start justify-between mb-2">
                <p className="text-sm font-semibold text-slate-900 dark:text-white leading-tight">{asset.name}</p>
                <StatusBadge label={asset.status.replace("-", " ")} variant={statusVariant[asset.status]} dot />
              </div>
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColor[asset.type]}`}>{asset.type}</span>
                <span className="text-xs text-slate-400">{asset.version}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                <div>Uses: <strong className="text-slate-800 dark:text-slate-200">{asset.uses}</strong></div>
                {asset.ctr !== "—" && <div>CTR: <strong className="text-emerald-600 dark:text-emerald-400">{asset.ctr}</strong></div>}
              </div>
              <div className="flex gap-2 mt-3">
                <button className="flex-1 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400 hover:border-indigo-400 transition">
                  Preview
                </button>
                <button className="flex-1 py-1.5 rounded-lg bg-indigo-600 text-white text-xs hover:bg-indigo-700 transition">
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
