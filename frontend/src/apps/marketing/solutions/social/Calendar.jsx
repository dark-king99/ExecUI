import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Send, Trash2, Plus, Clock, CheckCircle2, FileEdit, AlertCircle } from "lucide-react";
import { marketing } from "../../../../services/api";
import { useApi } from "../../../../hooks/useApi";
import { useToast } from "../../../../components/ui/Toast";
import { SolutionShell, PrimaryBtn, Pill, Loading, ErrorNote } from "../../components/mkt-ui";
import { platformMeta } from "./platformMeta";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "draft", label: "Drafts" },
  { id: "scheduled", label: "Scheduled" },
  { id: "published", label: "Published" },
  { id: "failed", label: "Failed" },
];
const STATUS = {
  draft:     { color: "slate",   Icon: FileEdit },
  scheduled: { color: "amber",   Icon: Clock },
  published: { color: "emerald", Icon: CheckCircle2 },
  publishing:{ color: "sky",     Icon: Clock },
  failed:    { color: "rose",    Icon: AlertCircle },
};
const when = (d) => (d ? new Date(d).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "");

export default function Calendar() {
  const navigate = useNavigate();
  const toast = useToast();
  const [filter, setFilter] = useState("all");
  const { data, loading, error, refresh } = useApi(() => marketing.social.posts({ limit: 200 }), []);
  const posts = data ?? [];
  const shown = filter === "all" ? posts : posts.filter((p) => p.status === filter);

  const publish = async (id) => {
    try { const r = await marketing.social.publish(id); toast.success(r.status === "published" ? "Published" : "Publish failed"); refresh(); }
    catch (e) { toast.error(e.message || "Could not publish"); }
  };
  const remove = async (id) => {
    try { await marketing.social.deletePost(id); toast.success("Deleted"); refresh(); }
    catch (e) { toast.error(e.message || "Could not delete"); }
  };

  return (
    <SolutionShell
      solutionId="social"
      title="Calendar & Queue"
      subtitle="Everything drafted, scheduled and published."
      actions={<PrimaryBtn onClick={() => navigate("/marketing/social")}><Plus size={14} /> New post</PrimaryBtn>}
    >
      <div className="flex items-center gap-1.5 flex-wrap">
        {FILTERS.map((f) => {
          const n = f.id === "all" ? posts.length : posts.filter((p) => p.status === f.id).length;
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`text-sm px-3 py-1.5 rounded-lg transition ${filter === f.id ? "bg-violet-600 text-white" : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"}`}
            >
              {f.label} <span className="opacity-60">{n}</span>
            </button>
          );
        })}
      </div>

      {error && <ErrorNote error={error} />}
      {loading && !data ? <Loading table /> : (
        <div className="space-y-2.5">
          {shown.map((p) => {
            const s = STATUS[p.status] ?? STATUS.draft;
            return (
              <div key={p.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-800 dark:text-slate-100 line-clamp-2 whitespace-pre-wrap">{p.content}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="inline-flex items-center gap-1"><Pill color={s.color}><s.Icon size={11} className="inline -mt-0.5 mr-0.5" />{p.status}</Pill></span>
                      {p.platforms.map((pl) => { const m = platformMeta(pl); return <m.Icon key={pl} size={14} className={m.color} title={m.name} />; })}
                      {p.source !== "manual" && <span className="text-[11px] text-slate-400">via {p.source}</span>}
                      {p.scheduledAt && p.status === "scheduled" && <span className="text-[11px] text-amber-500">⏰ {when(p.scheduledAt)}</span>}
                      {p.publishedAt && <span className="text-[11px] text-slate-400">{when(p.publishedAt)}</span>}
                    </div>
                    {p.status === "published" && Object.keys(p.metrics || {}).length > 0 && (
                      <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                        {["reach", "likes", "comments", "shares"].map((k) => {
                          const total = Object.values(p.metrics).reduce((a, m) => a + (m[k] || 0), 0);
                          return <span key={k}>{k}: <strong>{total.toLocaleString()}</strong></span>;
                        })}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {["draft", "scheduled", "failed"].includes(p.status) && (
                      <button onClick={() => publish(p.id)} title="Publish now" className="p-2 rounded-lg text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-500/10"><Send size={15} /></button>
                    )}
                    <button onClick={() => remove(p.id)} title="Delete" className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20"><Trash2 size={15} /></button>
                  </div>
                </div>
              </div>
            );
          })}
          {shown.length === 0 && <p className="text-center text-sm text-slate-400 py-12">Nothing here yet.</p>}
        </div>
      )}
    </SolutionShell>
  );
}
