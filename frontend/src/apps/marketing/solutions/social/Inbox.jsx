import { useState } from "react";
import { RefreshCw, Reply, Archive, Wand2, Send, Smile, Meh, Frown, MessageCircle } from "lucide-react";
import { marketing } from "../../../../services/api";
import { useApi } from "../../../../hooks/useApi";
import { useToast } from "../../../../components/ui/Toast";
import { SolutionShell, MetricGrid, PrimaryBtn, GhostBtn, Pill, Loading, ErrorNote, fmtNum } from "../../components/mkt-ui";
import { platformMeta } from "./platformMeta";

const FILTERS = [
  { id: "", label: "All" },
  { id: "new", label: "New" },
  { id: "replied", label: "Replied" },
  { id: "archived", label: "Archived" },
];
const SENTIMENT = {
  positive: { color: "emerald", Icon: Smile },
  neutral: { color: "slate", Icon: Meh },
  negative: { color: "rose", Icon: Frown },
};
const ago = (d) => {
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

function Row({ e, onReplied, onArchived, toast }) {
  const m = platformMeta(e.platform);
  const sent = SENTIMENT[e.sentiment] ?? SENTIMENT.neutral;
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(e.replyText || "");
  const [busy, setBusy] = useState(false);
  const [drafting, setDrafting] = useState(false);

  const draft = async () => {
    setDrafting(true);
    try { const r = await marketing.social.draftReply(e.id); setText(r.reply); }
    catch (err) { toast.error(err.message || "Couldn't draft"); }
    finally { setDrafting(false); }
  };
  const send = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      const r = await marketing.social.reply(e.id, text);
      toast.success(r.delivery?.mode === "live" ? "Reply sent" : "Reply sent (simulated — connect the API to reply for real)");
      onReplied();
    } catch (err) { toast.error(err.message || "Couldn't send"); }
    finally { setBusy(false); }
  };
  const archive = async () => {
    try { await marketing.social.archive(e.id); onArchived(); }
    catch (err) { toast.error(err.message || "Couldn't archive"); }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          <div className="h-9 w-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-semibold text-slate-500">
            {e.authorName.split(" ").map((n) => n[0]).slice(0, 2).join("")}
          </div>
          <m.Icon size={13} className={`absolute -bottom-1 -right-1 ${m.color}`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-slate-900 dark:text-white">{e.authorName}</span>
            {e.authorHandle && <span className="text-xs text-slate-400">@{e.authorHandle}</span>}
            <span className="text-xs text-slate-300 dark:text-slate-600">· {e.kind}</span>
            <Pill color={sent.color}><sent.Icon size={11} className="inline -mt-0.5 mr-0.5" />{e.sentiment}</Pill>
            {e.simulated && <span className="text-[10px] text-amber-500">sim</span>}
            <span className="ml-auto text-[11px] text-slate-400">{ago(e.createdAt)}</span>
          </div>
          <p className="text-sm text-slate-700 dark:text-slate-200 mt-1 whitespace-pre-wrap">{e.text}</p>

          {e.status === "replied" && e.replyText && (
            <div className="mt-2 pl-3 border-l-2 border-emerald-300 dark:border-emerald-700">
              <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">Your reply</p>
              <p className="text-sm text-slate-600 dark:text-slate-300">{e.replyText}</p>
            </div>
          )}

          {open && e.status !== "replied" && (
            <div className="mt-3">
              <textarea
                value={text} onChange={(ev) => setText(ev.target.value)} rows={2}
                placeholder="Write a reply…"
                className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              <div className="flex items-center gap-2 mt-2">
                <PrimaryBtn onClick={send} disabled={busy || !text.trim()}><Send size={13} /> {busy ? "Sending…" : "Send reply"}</PrimaryBtn>
                <GhostBtn onClick={draft} disabled={drafting}><Wand2 size={13} /> {drafting ? "Drafting…" : "Draft with AI"}</GhostBtn>
              </div>
            </div>
          )}

          {e.status === "new" && !open && (
            <div className="flex items-center gap-1 mt-2">
              <button onClick={() => setOpen(true)} className="text-xs flex items-center gap-1 px-2.5 py-1 rounded-lg text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-500/10"><Reply size={13} /> Reply</button>
              <button onClick={archive} className="text-xs flex items-center gap-1 px-2.5 py-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"><Archive size={13} /> Archive</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Inbox() {
  const toast = useToast();
  const [filter, setFilter] = useState("");
  const { data: stats, refresh: refreshStats } = useApi(() => marketing.social.engagementStats(), []);
  const { data, loading, error, refresh } = useApi(() => marketing.social.engagements(filter ? { status: filter } : {}), [filter]);
  const items = data ?? [];
  const [syncing, setSyncing] = useState(false);

  const refreshAll = () => { refresh(); refreshStats(); };
  const sync = async () => {
    setSyncing(true);
    try { const r = await marketing.social.syncEngagements(); toast.success(`${r.synced} new ${r.synced === 1 ? "message" : "messages"}${r.live ? "" : " (sample)"}`); refreshAll(); }
    catch (e) { toast.error(e.message || "Couldn't sync"); }
    finally { setSyncing(false); }
  };

  const s = stats ?? {};
  const metrics = [
    { label: "New", value: fmtNum(s.new ?? 0), icon: MessageCircle, color: "violet" },
    { label: "Response rate", value: `${s.responseRate ?? 0}%`, icon: Reply, color: "emerald" },
    { label: "Positive", value: fmtNum(s.positive ?? 0), icon: Smile, color: "sky" },
    { label: "Needs care", value: fmtNum(s.negative ?? 0), icon: Frown, color: "amber" },
  ];

  return (
    <SolutionShell
      solutionId="social"
      title="Engagement Inbox"
      subtitle="Reply to comments, mentions and DMs to grow engagement."
      actions={<PrimaryBtn onClick={sync} disabled={syncing}><RefreshCw size={14} className={syncing ? "animate-spin" : ""} /> {syncing ? "Syncing…" : "Sync"}</PrimaryBtn>}
    >
      <MetricGrid items={metrics} cols={4} />

      <div className="flex items-center gap-1.5 flex-wrap">
        {FILTERS.map((f) => {
          const n = f.id === "" ? s.total : s[f.id];
          return (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={`text-sm px-3 py-1.5 rounded-lg transition ${filter === f.id ? "bg-violet-600 text-white" : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"}`}>
              {f.label} {n != null && <span className="opacity-60">{n}</span>}
            </button>
          );
        })}
      </div>

      {error && <ErrorNote error={error} />}
      {loading && !data ? <Loading /> : items.length === 0 ? (
        <div className="text-center py-12">
          <MessageCircle size={28} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
          <p className="text-sm text-slate-500 dark:text-slate-400">No messages here yet.</p>
          <button onClick={sync} className="mt-3 text-sm text-violet-600 dark:text-violet-400 font-medium">Sync your inbox →</button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {items.map((e) => <Row key={e.id} e={e} toast={toast} onReplied={refreshAll} onArchived={refreshAll} />)}
        </div>
      )}
    </SolutionShell>
  );
}
