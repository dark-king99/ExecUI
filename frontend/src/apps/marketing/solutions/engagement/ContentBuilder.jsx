import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Image as ImageIcon, Video, FileText, Plus, Trash2, FolderOpen, CheckCircle2, Share2 } from "lucide-react";
import StatusBadge from "../../../../components/ui/StatusBadge";
import { useToast } from "../../../../components/ui/Toast";
import { useApi, useMutation } from "../../../../hooks/useApi";
import { marketing } from "../../../../services/api";
import { SolutionShell, MetricGrid, Section, Loading, Modal, Field, TextInput, SelectInput, PrimaryBtn, GhostBtn, Pill, fmtNum } from "../../components/mkt-ui";

const TYPE_ICON = { image: ImageIcon, video: Video, document: FileText };
const TYPE_COLOR = { image: "violet", video: "sky", document: "amber" };

export default function ContentBuilder() {
  const navigate = useNavigate();
  const toast = useToast();
  const [filter, setFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", type: "image" });
  const { data: assets, loading, refetch } = useApi(() => marketing.content.assets.list(), [], { pollingInterval: 120000 });
  const { mutate: upload, loading: uploading } = useMutation((d) => marketing.content.assets.upload(d), {
    onSuccess: () => { toast({ message: "Asset added", type: "success" }); setShowModal(false); setForm({ name: "", type: "image" }); refetch(); },
  });
  const { mutate: remove } = useMutation((id) => marketing.content.assets.delete(id), {
    onSuccess: () => { toast({ message: "Asset removed", type: "success" }); refetch(); },
  });

  const all = assets ?? [];
  const filtered = useMemo(() => (filter === "all" ? all : all.filter((a) => a.type === filter)), [all, filter]);

  const metrics = [
    { label: "Total Assets", value: fmtNum(all.length), icon: FolderOpen, color: "violet" },
    { label: "Approved", value: fmtNum(all.filter((a) => a.status === "approved").length), icon: CheckCircle2, color: "emerald" },
    { label: "Images", value: fmtNum(all.filter((a) => a.type === "image").length), icon: ImageIcon, color: "sky" },
    { label: "Videos", value: fmtNum(all.filter((a) => a.type === "video").length), icon: Video, color: "amber" },
  ];

  return (
    <SolutionShell solutionId="engagement" title="Content Builder" subtitle="Centralized library for every marketing asset"
      actions={<PrimaryBtn onClick={() => setShowModal(true)}><Plus size={15} /> Add Asset</PrimaryBtn>}>
      {showModal && (
        <Modal title="Add Content Asset" onClose={() => setShowModal(false)}
          footer={<><GhostBtn onClick={() => setShowModal(false)}>Cancel</GhostBtn><PrimaryBtn disabled={uploading || !form.name.trim()} onClick={() => upload({ ...form, size: "—" })}>{uploading ? "Adding…" : "Add"}</PrimaryBtn></>}>
          <Field label="Asset Name *"><TextInput value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Summer Campaign Banner" /></Field>
          <Field label="Type">
            <SelectInput value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}>
              {["image", "video", "document"].map((t) => <option key={t}>{t}</option>)}
            </SelectInput>
          </Field>
        </Modal>
      )}

      <MetricGrid items={metrics} cols={4} loading={loading && all.length === 0} />

      <div className="flex gap-1.5">
        {["all", "image", "video", "document"].map((t) => (
          <button key={t} onClick={() => setFilter(t)}
            className={`text-xs px-3 py-1 rounded-full border capitalize transition ${filter === t ? "bg-violet-600 text-white border-violet-600" : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-violet-400"}`}>
            {t}
          </button>
        ))}
      </div>

      {loading && all.length === 0 ? <Loading rows={6} /> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((a) => {
            const Icon = TYPE_ICON[a.type] ?? FileText;
            return (
              <div key={a.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm group">
                <div className="flex items-start justify-between mb-3">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center bg-slate-100 dark:bg-slate-800`}>
                    <Icon size={18} className="text-slate-500 dark:text-slate-400" />
                  </div>
                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition">
                    <button onClick={() => navigate("/marketing/social", { state: { content: a.name, mediaUrl: a.url, source: "engagement" } })} title="Send to Social" className="text-slate-300 hover:text-sky-500"><Share2 size={15} /></button>
                    <button onClick={() => remove(a.id)} title="Delete" className="text-slate-300 hover:text-red-500"><Trash2 size={15} /></button>
                  </div>
                </div>
                <h3 className="text-sm font-medium text-slate-900 dark:text-white leading-snug">{a.name}</h3>
                <div className="flex items-center gap-2 mt-3">
                  <Pill color={TYPE_COLOR[a.type]}>{a.type}</Pill>
                  <span className="text-xs text-slate-400">{a.size}</span>
                  <span className="ml-auto"><StatusBadge label={a.status} variant={a.status === "approved" ? "success" : "neutral"} /></span>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && <div className="col-span-full py-10 text-center text-sm text-slate-400">No assets in this category.</div>}
        </div>
      )}
    </SolutionShell>
  );
}
