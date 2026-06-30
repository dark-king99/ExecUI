import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader";
import { useToast } from "../../components/ui/Toast";
import { useApi } from "../../hooks/useApi";
import { messaging } from "../../services/api";
import { Send, Megaphone, Plus, Search, Loader2, MessagesSquare, ArrowLeft } from "lucide-react";

const initials = (n) => (n || "").split(" ").filter(Boolean).slice(0, 2).map((s) => s[0]).join("").toUpperCase() || "?";
const timeLabel = (t) => (t ? new Date(t).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "");

export default function Messaging() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const { data: conv, refetch: refetchConv } = useApi(() => messaging.conversations(), [], { cacheKey: "msg:conversations", pollingInterval: 20000 });
  const { data: directory } = useApi(() => messaging.directory(), []);

  const [sel, setSel] = useState(null);          // { kind: "dm"|"dept", id, name }
  const [thread, setThread] = useState(null);
  const [loadingThread, setLoadingThread] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [picker, setPicker] = useState(false);
  const [pickerQ, setPickerQ] = useState("");
  const [deptTo, setDeptTo] = useState("all");
  const scrollRef = useRef(null);

  // Initialise selection from URL or the first conversation.
  useEffect(() => {
    const u = params.get("u"), c = params.get("c");
    if (u) setSel({ kind: "dm", id: u });
    else if (c === "dept") setSel({ kind: "dept", id: "dept", name: "Department channel" });
    else if (!sel && conv?.conversations?.length) setSel(conv.conversations[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conv, params]);

  const loadThread = useCallback(async () => {
    if (!sel) return;
    setLoadingThread(true);
    try {
      if (sel.kind === "dept") setThread({ kind: "dept", ...(await messaging.deptThread()) });
      else setThread({ kind: "dm", ...(await messaging.dmThread(sel.id)) });
    } catch (e) {
      toast({ message: e?.message ?? "Couldn't load conversation", type: "error" });
    } finally { setLoadingThread(false); }
  }, [sel, toast]);

  useEffect(() => { loadThread(); }, [loadThread]);
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [thread]);

  const send = async () => {
    if (!draft.trim() || !sel) return;
    setSending(true);
    try {
      if (sel.kind === "dept") await messaging.sendDept({ body: draft, toDept: deptTo });
      else await messaging.sendDm({ toUserId: sel.id, body: draft });
      setDraft("");
      await loadThread();
      refetchConv();
    } catch (e) {
      toast({ message: e?.message ?? "Couldn't send", type: "error" });
    } finally { setSending(false); }
  };

  const startDm = (person) => {
    setPicker(false); setPickerQ("");
    setParams({ u: person.id });
    setSel({ kind: "dm", id: person.id, name: person.name });
  };

  const conversations = conv?.conversations ?? [];
  const peerName = thread?.kind === "dm" ? thread?.peer?.name : "Department channel";
  const deptLabels = thread?.kind === "dept" ? thread.departments : null;
  const filteredDir = (directory ?? []).filter((p) => p.name.toLowerCase().includes(pickerQ.toLowerCase()));

  return (
    <div className="space-y-5">
      <PageHeader title="Messaging" subtitle="Direct messages and your department channel — all in-app" />

      <div className="grid h-[68vh] grid-cols-1 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 md:grid-cols-[300px_1fr]">
        {/* ── Conversation list ── */}
        <div className={`flex flex-col border-r border-slate-200 dark:border-slate-800 ${sel ? "hidden md:flex" : "flex"}`}>
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <span className="text-sm font-semibold text-slate-900 dark:text-white">Conversations</span>
            <button onClick={() => setPicker((v) => !v)} className="flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-indigo-500">
              <Plus size={13} /> New
            </button>
          </div>

          {picker && (
            <div className="border-b border-slate-100 p-3 dark:border-slate-800">
              <div className="relative mb-2">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={pickerQ} onChange={(e) => setPickerQ(e.target.value)} placeholder="Find someone…"
                  className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
              </div>
              <div className="max-h-44 space-y-0.5 overflow-y-auto">
                {filteredDir.length === 0 && <p className="py-3 text-center text-xs text-slate-400">No teammates found</p>}
                {filteredDir.map((p) => (
                  <button key={p.id} onClick={() => startDm(p)} className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800">
                    <Avatar name={p.name} url={p.avatarUrl} sm />
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm text-slate-800 dark:text-slate-100">{p.name}</span>
                      <span className="block truncate text-[11px] capitalize text-slate-400">{(p.role || "").replace(/_/g, " ")}{p.department ? ` · ${p.department}` : ""}</span></span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            {conversations.map((c) => {
              const active = sel && sel.kind === c.kind && (c.kind === "dept" || sel.id === c.id);
              return (
                <button key={`${c.kind}-${c.id}`} onClick={() => { setSel(c); setParams(c.kind === "dept" ? { c: "dept" } : { u: c.id }); }}
                  className={`flex w-full items-center gap-3 border-b border-slate-50 px-4 py-3 text-left transition dark:border-slate-800/60 ${active ? "bg-indigo-50/60 dark:bg-indigo-500/5" : "hover:bg-slate-50 dark:hover:bg-slate-800/60"}`}>
                  {c.kind === "dept"
                    ? <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400"><Megaphone size={16} /></span>
                    : <Avatar name={c.name} url={c.avatarUrl} />}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium text-slate-900 dark:text-white">{c.name}</span>
                      {c.lastTime && <span className="shrink-0 text-[10px] text-slate-400">{timeLabel(c.lastTime).split(",")[0]}</span>}
                    </div>
                    <p className="truncate text-xs text-slate-400">{c.lastMessage || (c.kind === "dept" ? c.subtitle : "No messages yet")}</p>
                  </div>
                  {c.unread > 0 && <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-indigo-600 px-1 text-[10px] font-semibold text-white">{c.unread}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Thread ── */}
        <div className={`flex flex-col ${sel ? "flex" : "hidden md:flex"}`}>
          {!sel ? (
            <div className="flex flex-1 flex-col items-center justify-center text-slate-400">
              <MessagesSquare size={28} className="mb-2" /><p className="text-sm">Select a conversation</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                <button className="md:hidden text-slate-400" onClick={() => { setSel(null); setParams({}); }}><ArrowLeft size={16} /></button>
                {thread?.kind === "dept"
                  ? <span className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400"><Megaphone size={16} /></span>
                  : <Avatar name={peerName} url={thread?.peer?.avatarUrl} />}
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{peerName}</p>
                  <p className="text-xs text-slate-400">{thread?.kind === "dept" ? "Department channel · in-app only" : (thread?.peer?.role || "").replace(/_/g, " ")}</p>
                </div>
              </div>

              <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-slate-50/50 p-4 dark:bg-slate-900/30">
                {loadingThread && !thread ? (
                  <div className="flex h-full items-center justify-center"><Loader2 size={18} className="animate-spin text-slate-400" /></div>
                ) : thread?.messages?.length ? (
                  thread.messages.map((m) => (
                    <div key={m.id} className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-sm ${m.mine ? "bg-indigo-600 text-white" : "bg-white text-slate-800 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700"}`}>
                        {!m.mine && (thread.kind === "dept") && <p className="mb-0.5 text-[11px] font-medium text-violet-500">{m.authorName}{m.fromDept ? ` · ${m.fromDept}` : ""}</p>}
                        <p className="whitespace-pre-wrap break-words">{m.body}</p>
                        <p className={`mt-1 text-[10px] ${m.mine ? "text-indigo-200" : "text-slate-400"}`}>{timeLabel(m.time)}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-slate-400">No messages yet — say hello 👋</div>
                )}
              </div>

              <div className="border-t border-slate-100 p-3 dark:border-slate-800">
                {thread?.kind === "dept" && (
                  <div className="mb-2 flex items-center gap-2 text-xs text-slate-500">
                    <span>Post to:</span>
                    <select value={deptTo} onChange={(e) => setDeptTo(e.target.value)} className="rounded-md border border-slate-200 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-800">
                      <option value="all">Everyone</option>
                      {Object.entries(deptLabels || {}).filter(([k]) => k !== "general").map(([k, label]) => <option key={k} value={k}>{label}</option>)}
                    </select>
                  </div>
                )}
                <div className="flex items-end gap-2">
                  <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={1}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                    placeholder="Write a message…"
                    className="max-h-32 flex-1 resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                  <button onClick={send} disabled={sending || !draft.trim()}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white transition hover:bg-indigo-500 disabled:opacity-50">
                    {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Avatar({ name, url, sm }) {
  const cls = sm ? "h-7 w-7 text-[10px]" : "h-9 w-9 text-xs";
  return url
    ? <img src={url} alt={name} className={`${cls} shrink-0 rounded-full object-cover`} />
    : <span className={`${cls} flex shrink-0 items-center justify-center rounded-full bg-indigo-100 font-semibold text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400`}>{initials(name)}</span>;
}
