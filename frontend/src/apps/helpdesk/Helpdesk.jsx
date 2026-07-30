/**
 * Helpdesk console — the support queue and the knowledge base behind it.
 *
 * Choices worth naming:
 *  • The queue sorts **urgent first, then oldest**. Newest-first buries the
 *    ticket that has been waiting longest, which is the one that matters.
 *  • Replying and adding an internal note are the *same box* with a toggle, so
 *    the agent can't accidentally use the wrong one — the button text and colour
 *    change with the choice.
 *  • The thread shows whether a public reply was actually **emailed**. Implying
 *    every reply reached the customer when no provider is configured would be a
 *    lie the customer discovers later.
 */
import { useState } from "react";
import useRecordParam from "../../hooks/useRecordParam";
import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody } from "../../components/ui/Card";
import { useApi } from "../../hooks/useApi";
import { useToast } from "../../components/ui/Toast";
import { useUser } from "../../context/UserContext";
import { helpdesk } from "../../services/api";
import {
  LifeBuoy, BookOpen, Search, Plus, Send, Lock, Globe, Clock, CheckCircle2,
  AlertTriangle, Star, Copy, ExternalLink, Trash2, X, Eye, ThumbsUp, ThumbsDown, Link2,
} from "lucide-react";

const cls = (...a) => a.filter(Boolean).join(" ");
const input = "w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white";
const when = (d) => (d ? new Date(d).toLocaleString() : "—");
const day = (d) => (d ? new Date(d).toLocaleDateString() : "—");

const STATUS_TONE = {
  open: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
  in_progress: "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300",
  pending: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  resolved: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  closed: "bg-slate-100 text-slate-500 dark:bg-slate-800",
};
const PRIORITY_TONE = {
  urgent: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  high: "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300",
  medium: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  low: "bg-slate-100 text-slate-500 dark:bg-slate-800",
};
const KB_TONE = {
  published: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  draft: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  archived: "bg-slate-100 text-slate-500 dark:bg-slate-800",
};

function Pill({ children, tone }) {
  return <span className={cls("rounded-full px-2 py-0.5 text-[11px] font-medium", tone ?? PRIORITY_TONE.medium)}>{children}</span>;
}

function Empty({ icon: Icon, title, hint }) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center">
      <Icon size={20} className="text-slate-300 dark:text-slate-600" />
      <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{title}</p>
      {hint && <p className="max-w-md text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

// ── Ticket thread ────────────────────────────────────────────────────────────
function TicketDetail({ id, toast, refetch }) {
  const { data: ticket, refetch: reload } = useApi(() => helpdesk.tickets.get(id), [id]);
  const [body, setBody] = useState("");
  const [internal, setInternal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [suggestions, setSuggestions] = useState(null);

  if (!ticket) return <div className="border-t border-slate-200 p-3 text-xs text-slate-400 dark:border-slate-700">Loading…</div>;

  const act = async (fn, message) => {
    setBusy(true);
    try { await fn(); toast.success?.(message); reload(); refetch(); }
    catch (e) { toast.error?.(e.message); } finally { setBusy(false); }
  };

  const reply = (status) => act(
    () => helpdesk.tickets.reply(id, { body, visibility: internal ? "internal" : "public", status }),
    internal ? "Internal note added." : "Reply sent.",
  ).then(() => setBody(""));

  const findArticles = async () => {
    try { setSuggestions(await helpdesk.suggestArticles(`${ticket.subject} ${ticket.description ?? ""}`)); }
    catch (e) { toast.error?.(e.message); }
  };

  return (
    <div className="space-y-3 border-t border-slate-200 p-3 dark:border-slate-700">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Customer", ticket.customerName],
          ["Email", ticket.contactEmail || "— none on file"],
          ["Source", ticket.source],
          ["Assignee", ticket.assigneeName || "Unassigned"],
          ["Raised", when(ticket.createdAt)],
          ["First reply", ticket.firstResponseAt ? when(ticket.firstResponseAt) : "not yet"],
          ["Resolved", ticket.resolvedAt ? when(ticket.resolvedAt) : "—"],
          ["Rating", ticket.satisfaction ? `${ticket.satisfaction}/5` : "—"],
        ].map(([label, value]) => (
          <div key={label}>
            <p className="text-[11px] uppercase tracking-wide text-slate-400">{label}</p>
            <p className="truncate text-sm text-slate-800 dark:text-slate-100">{value}</p>
          </div>
        ))}
      </div>

      {ticket.satisfactionComment && (
        <p className="rounded-lg bg-slate-50 p-2.5 text-xs italic text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
          “{ticket.satisfactionComment}”
        </p>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        <select className={cls(input, "w-auto")} value={ticket.status} disabled={busy}
          onChange={(e) => act(() => helpdesk.tickets.update(id, { status: e.target.value }), `Moved to ${e.target.value}.`)}>
          {["open", "in_progress", "pending", "resolved", "closed"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className={cls(input, "w-auto")} value={ticket.priority} disabled={busy}
          onChange={(e) => act(() => helpdesk.tickets.update(id, { priority: e.target.value }), "Priority updated.")}>
          {["low", "medium", "high", "urgent"].map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <button onClick={findArticles}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-300">
          <Link2 size={11} /> Suggest an article
        </button>
      </div>

      {suggestions && (
        <div className="rounded-lg border border-slate-200 p-2.5 dark:border-slate-700">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Articles that might answer this</p>
          {!suggestions.length && <p className="text-xs text-slate-400">Nothing in the help centre matches yet — this might be worth writing up.</p>}
          {suggestions.map((a) => (
            <button key={a.id} onClick={() => setBody(`${body ? `${body}\n\n` : ""}This may help: ${a.title}`)}
              className="block w-full truncate rounded px-1 py-0.5 text-left text-xs text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-500/10">
              {a.title}
            </button>
          ))}
        </div>
      )}

      {/* Thread */}
      <div className="space-y-2">
        {(ticket.messages ?? []).map((m) => (
          <div key={m.id}
            className={cls("rounded-xl border p-2.5",
              m.visibility === "internal"
                ? "border-amber-200 bg-amber-50/60 dark:border-amber-500/30 dark:bg-amber-500/5"
                : m.authorType === "customer"
                  ? "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
                  : "border-indigo-200 bg-indigo-50/50 dark:border-indigo-500/30 dark:bg-indigo-500/5")}>
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                {m.authorName || (m.authorType === "system" ? "System" : m.authorType)}
              </span>
              <Pill tone={m.visibility === "internal" ? PRIORITY_TONE.high : STATUS_TONE.open}>
                {m.visibility === "internal" ? <><Lock size={9} className="mb-px inline" /> internal</> : <><Globe size={9} className="mb-px inline" /> customer-visible</>}
              </Pill>
              {m.visibility === "public" && m.authorType === "agent" && (
                <span className={cls("text-[10px]", m.emailed ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400")}>
                  {m.emailed ? "emailed" : "not emailed — no email provider configured"}
                </span>
              )}
              <span className="ml-auto text-[10px] text-slate-400">{when(m.createdAt)}</span>
            </div>
            <p className="whitespace-pre-wrap text-xs text-slate-700 dark:text-slate-200">{m.body}</p>
          </div>
        ))}
      </div>

      {/* Reply box */}
      <div className="space-y-2 rounded-xl border border-slate-200 p-2.5 dark:border-slate-700">
        <div className="flex flex-wrap gap-1">
          <button onClick={() => setInternal(false)}
            className={cls("inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-medium",
              !internal ? "bg-indigo-600 text-white" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800")}>
            <Globe size={11} /> Reply to customer
          </button>
          <button onClick={() => setInternal(true)}
            className={cls("inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-medium",
              internal ? "bg-amber-500 text-white" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800")}>
            <Lock size={11} /> Internal note
          </button>
        </div>
        <textarea className={cls(input, "h-24")} value={body} onChange={(e) => setBody(e.target.value)}
          placeholder={internal ? "A note only your team can see…" : "Your reply — the customer sees this and gets it by email."} />
        {!internal && !ticket.contactEmail && (
          <p className="flex items-start gap-1.5 text-[11px] text-amber-600 dark:text-amber-400">
            <AlertTriangle size={12} className="mt-0.5 shrink-0" />
            This ticket has no customer email address, so a public reply couldn't reach anyone. Add one above, or make this an internal note.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <button onClick={() => reply()} disabled={busy || !body.trim() || (!internal && !ticket.contactEmail)}
            className={cls("inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50",
              internal ? "bg-amber-500 hover:bg-amber-400" : "bg-indigo-600 hover:bg-indigo-500")}>
            {internal ? <Lock size={13} /> : <Send size={13} />} {internal ? "Add note" : "Send reply"}
          </button>
          {!internal && (
            <button onClick={() => reply("resolved")} disabled={busy || !body.trim() || !ticket.contactEmail}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 dark:border-emerald-500/40 dark:text-emerald-400">
              <CheckCircle2 size={13} /> Send &amp; resolve
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Queue ────────────────────────────────────────────────────────────────────
function Queue({ toast, openId, setOpenId }) {
  const [status, setStatus] = useState("open");
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ subject: "", description: "", customerName: "", contactEmail: "", priority: "medium", category: "general" });
  const [busy, setBusy] = useState(false);

  const { data: tickets, refetch } = useApi(
    () => helpdesk.tickets.list({ status, search: search || undefined, limit: 100 }),
    [status, search],
    { pollingInterval: 60000 },
  );

  const create = async () => {
    setBusy(true);
    try {
      const t = await helpdesk.tickets.create(draft);
      toast.success?.(`Raised ${t.ticketNumber}.`);
      setCreating(false);
      setDraft({ subject: "", description: "", customerName: "", contactEmail: "", priority: "medium", category: "general" });
      setOpenId(t.id); refetch();
    } catch (e) { toast.error?.(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardBody className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] flex-1">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className={cls(input, "pl-8")} placeholder="Search subject, reference, customer…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className={cls(input, "w-auto")} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="open">Needs work</option>
            <option value="all">All</option>
            {["in_progress", "pending", "resolved", "closed"].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={() => setCreating((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500">
            <Plus size={13} /> New ticket
          </button>
        </CardBody>
      </Card>

      {creating && (
        <Card><CardBody className="space-y-2">
          <input className={input} placeholder="Subject" value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} />
          <div className="flex flex-wrap gap-2">
            <input className={cls(input, "flex-1 min-w-[140px]")} placeholder="Customer name" value={draft.customerName} onChange={(e) => setDraft({ ...draft, customerName: e.target.value })} />
            <input className={cls(input, "flex-1 min-w-[160px]")} placeholder="customer@example.com" value={draft.contactEmail} onChange={(e) => setDraft({ ...draft, contactEmail: e.target.value })} />
            <select className={cls(input, "w-auto")} value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: e.target.value })}>
              {["low", "medium", "high", "urgent"].map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <textarea className={cls(input, "h-20")} placeholder="What's the issue?" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          <p className="text-[11px] text-slate-400">
            With an email address the customer can follow this in the portal and get your replies. Without one it's an internal record only.
          </p>
          <div className="flex gap-2">
            <button onClick={create} disabled={busy || !draft.subject.trim()}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">Raise ticket</button>
            <button onClick={() => setCreating(false)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300">Cancel</button>
          </div>
        </CardBody></Card>
      )}

      <Card><CardBody className="space-y-2">
        {tickets && !tickets.length && (
          <Empty icon={CheckCircle2} title={status === "open" ? "Nothing waiting" : "No tickets match"}
            hint={status === "open" ? "The queue is clear — every request has been dealt with." : "Try a different filter or search."} />
        )}
        {(tickets ?? []).map((t) => (
          <div key={t.id} className="rounded-xl border border-slate-200 dark:border-slate-700">
            <button className="w-full p-3 text-left" onClick={() => setOpenId(openId === t.id ? null : t.id)}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[11px] text-slate-400">{t.ticketNumber}</span>
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{t.subject}</p>
                <Pill tone={STATUS_TONE[t.status]}>{t.status}</Pill>
                <Pill tone={PRIORITY_TONE[t.priority]}>{t.priority}</Pill>
                {t.source === "portal" && <Pill>portal</Pill>}
                {t.awaitingFirstResponse && (
                  <Pill tone={PRIORITY_TONE.urgent}>no reply yet</Pill>
                )}
                {t.satisfaction && (
                  <span className="inline-flex items-center gap-0.5 text-[11px] text-amber-500">
                    <Star size={10} className="fill-current" /> {t.satisfaction}
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                {[t.customerName, t.contactEmail, t.assigneeName ?? "unassigned"].filter(Boolean).join(" · ")}
                {t.open && t.ageHours != null ? ` · open ${t.ageHours}h` : ""}
                {t.messageCount ? ` · ${t.messageCount} message${t.messageCount === 1 ? "" : "s"}` : ""}
              </p>
            </button>
            {openId === t.id && <TicketDetail id={t.id} toast={toast} refetch={refetch} />}
          </div>
        ))}
      </CardBody></Card>
    </div>
  );
}

// ── Knowledge base ───────────────────────────────────────────────────────────
function KnowledgeBase({ isAdmin, toast, openArticle, setOpenArticle }) {
  const { data: articles, refetch } = useApi(() => helpdesk.kb.articles({ limit: 200 }), []);
  const { data: categories, refetch: reloadCats } = useApi(() => helpdesk.kb.categories(true), []);
  const { data: stats } = useApi(() => helpdesk.kb.stats(), []);
  const [editing, setEditing] = useState(null);
  const [newCat, setNewCat] = useState(null);
  const [busy, setBusy] = useState(false);

  const blank = { title: "", body: "", excerpt: "", categoryId: "", visibility: "public", status: "draft", tags: [] };

  const save = async () => {
    setBusy(true);
    try {
      const payload = { ...editing, categoryId: editing.categoryId || null };
      if (editing.id) await helpdesk.kb.update(editing.id, payload);
      else await helpdesk.kb.create(payload);
      toast.success?.("Article saved.");
      setEditing(null); refetch();
    } catch (e) { toast.error?.(e.message); } finally { setBusy(false); }
  };

  const setStatus = async (a, status) => {
    try {
      await helpdesk.kb.update(a.id, { status });
      toast.success?.(status === "published" ? "Published — customers can read it now." : `Moved to ${status}.`);
      refetch();
    } catch (e) { toast.error?.(e.message); }
  };

  const remove = async (a) => {
    try { await helpdesk.kb.remove(a.id); toast.success?.("Article deleted."); refetch(); }
    catch (e) { toast.error?.(e.message); }
  };

  const addCategory = async () => {
    setBusy(true);
    try { await helpdesk.kb.createCategory(newCat); toast.success?.("Category added."); setNewCat(null); reloadCats(); }
    catch (e) { toast.error?.(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      {stats && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Published", stats.published, Globe],
            ["Drafts", stats.byStatus?.draft ?? 0, BookOpen],
            ["Comments to read", stats.commentsToRead, ThumbsDown],
            ["Most read", stats.mostRead?.[0]?.views ?? 0, Eye],
          ].map(([label, value, Icon]) => (
            <Card key={label}><CardBody className="flex items-center gap-3">
              <Icon size={16} className="text-indigo-500" />
              <div>
                <p className="text-lg font-semibold text-slate-900 dark:text-white">{value}</p>
                <p className="text-[11px] text-slate-400">{label}</p>
              </div>
            </CardBody></Card>
          ))}
        </div>
      )}

      {stats?.needsWork?.length > 0 && (
        <Card><CardBody>
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <ThumbsDown size={13} className="text-amber-500" /> Articles readers didn't find helpful
          </p>
          {stats.needsWork.map((a) => (
            <p key={a.id} className="text-[11px] text-slate-500">
              {a.title} — <strong>{a.helpfulRatio}%</strong> helpful ({a.helpfulYes} yes / {a.helpfulNo} no, {a.views} reads)
            </p>
          ))}
        </CardBody></Card>
      )}

      {isAdmin && (
        <div className="flex flex-wrap justify-end gap-2">
          <button onClick={() => setNewCat(newCat ? null : { name: "", description: "", visibility: "public" })}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300">
            <Plus size={13} /> New category
          </button>
          <button onClick={() => setEditing(editing ? null : blank)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500">
            <Plus size={13} /> New article
          </button>
        </div>
      )}

      {newCat && (
        <Card><CardBody className="flex flex-wrap items-end gap-2">
          <input className={cls(input, "flex-1 min-w-[160px]")} placeholder="Category name" value={newCat.name} onChange={(e) => setNewCat({ ...newCat, name: e.target.value })} />
          <input className={cls(input, "flex-1 min-w-[180px]")} placeholder="Description (optional)" value={newCat.description} onChange={(e) => setNewCat({ ...newCat, description: e.target.value })} />
          <select className={cls(input, "w-auto")} value={newCat.visibility} onChange={(e) => setNewCat({ ...newCat, visibility: e.target.value })}>
            <option value="public">Public</option>
            <option value="internal">Internal</option>
          </select>
          <button onClick={addCategory} disabled={busy || !newCat.name.trim()}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Add</button>
          <button onClick={() => setNewCat(null)} className="rounded-lg p-1.5 text-slate-400 hover:text-red-500"><X size={14} /></button>
        </CardBody></Card>
      )}

      {editing && (
        <Card><CardBody className="space-y-2">
          <input className={input} placeholder="Article title" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
          <div className="flex flex-wrap gap-2">
            <select className={cls(input, "w-auto min-w-[140px]")} value={editing.categoryId ?? ""} onChange={(e) => setEditing({ ...editing, categoryId: e.target.value })}>
              <option value="">No category</option>
              {(categories ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select className={cls(input, "w-auto")} value={editing.visibility} onChange={(e) => setEditing({ ...editing, visibility: e.target.value })}>
              <option value="public">Public — customers can read it</option>
              <option value="internal">Internal — staff only</option>
            </select>
            <select className={cls(input, "w-auto")} value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value })}>
              {["draft", "published", "archived"].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              <input type="checkbox" checked={!!editing.pinned} onChange={(e) => setEditing({ ...editing, pinned: e.target.checked })} /> Pin to top
            </label>
          </div>
          <input className={input} placeholder="Short summary (optional — generated from the body if blank)" value={editing.excerpt ?? ""} onChange={(e) => setEditing({ ...editing, excerpt: e.target.value })} />
          <textarea className={cls(input, "h-64")} placeholder="Write the answer. Plain text and blank lines for paragraphs."
            value={editing.body} onChange={(e) => setEditing({ ...editing, body: e.target.value })} />
          {editing.visibility === "public" && editing.status === "published" && (
            <p className="flex items-start gap-1.5 text-[11px] text-amber-600 dark:text-amber-400">
              <AlertTriangle size={12} className="mt-0.5 shrink-0" /> This will be visible to anyone with your portal link.
            </p>
          )}
          <div className="flex gap-2">
            <button onClick={save} disabled={busy || !editing.title?.trim() || !editing.body?.trim()}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">Save</button>
            <button onClick={() => setEditing(null)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300">Cancel</button>
          </div>
        </CardBody></Card>
      )}

      <Card><CardBody className="space-y-1.5">
        {articles && !articles.length && (
          <Empty icon={BookOpen} title="No help articles yet"
            hint="Write the answers you keep repeating in tickets. Published public articles appear in your customer portal." />
        )}
        {(articles ?? []).map((a) => (
          <div key={a.id} className="rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="flex flex-wrap items-start justify-between gap-2 p-2.5">
              <button className="min-w-0 flex-1 text-left" onClick={() => setOpenArticle(openArticle === a.id ? null : a.id)}>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{a.title}</p>
                  <Pill tone={KB_TONE[a.status]}>{a.status}</Pill>
                  {a.visibility === "internal" && <Pill tone={PRIORITY_TONE.high}><Lock size={9} className="mb-px inline" /> internal</Pill>}
                  {a.pinned && <Pill>pinned</Pill>}
                </div>
                <p className="mt-0.5 truncate text-[11px] text-slate-400">
                  {[a.categoryName, `${a.views} reads`, a.helpfulRatio != null ? `${a.helpfulRatio}% helpful` : null,
                    `${a.readingMinutes} min read`, a.authorName].filter(Boolean).join(" · ")}
                </p>
              </button>
              {isAdmin && (
                <div className="flex shrink-0 items-center gap-1.5">
                  {a.status !== "published" && (
                    <button onClick={() => setStatus(a, "published")}
                      className="rounded-lg border border-emerald-200 px-2 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500/40 dark:text-emerald-400">Publish</button>
                  )}
                  {a.status === "published" && (
                    <button onClick={() => setStatus(a, "archived")}
                      className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300">Archive</button>
                  )}
                  <button onClick={async () => setEditing(await helpdesk.kb.article(a.id))}
                    className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300">Edit</button>
                  {a.status !== "published" && (
                    <button onClick={() => remove(a)} className="rounded-lg p-1 text-slate-400 hover:text-red-500"><Trash2 size={12} /></button>
                  )}
                </div>
              )}
            </div>
            {openArticle === a.id && <ArticlePreview id={a.id} />}
          </div>
        ))}
      </CardBody></Card>
    </div>
  );
}

function ArticlePreview({ id }) {
  const { data: article } = useApi(() => helpdesk.kb.article(id), [id]);
  if (!article) return <div className="border-t border-slate-200 p-2.5 text-xs text-slate-400 dark:border-slate-700">Loading…</div>;
  return (
    <div className="space-y-2 border-t border-slate-200 p-3 dark:border-slate-700">
      <p className="whitespace-pre-wrap text-xs text-slate-700 dark:text-slate-200">{article.body}</p>
      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
        <span className="inline-flex items-center gap-1"><ThumbsUp size={11} /> {article.helpfulYes}</span>
        <span className="inline-flex items-center gap-1"><ThumbsDown size={11} /> {article.helpfulNo}</span>
        <span className="inline-flex items-center gap-1"><Eye size={11} /> {article.views}</span>
        <span>updated {day(article.updatedAt)}</span>
      </div>
      {article.feedback?.length > 0 && (
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">What readers said</p>
          {article.feedback.map((fb) => (
            <p key={fb.id} className="text-[11px] text-slate-500">
              {fb.helpful ? "👍" : "👎"} {fb.comment}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Portal settings ──────────────────────────────────────────────────────────
function PortalSettings({ toast }) {
  const { data: info } = useApi(() => helpdesk.portal.info(), []);
  const [email, setEmail] = useState("");
  const [issued, setIssued] = useState(null);
  const [busy, setBusy] = useState(false);

  const issue = async () => {
    setBusy(true);
    try { setIssued(await helpdesk.portal.issueLink(email)); }
    catch (e) { toast.error?.(e.message); } finally { setBusy(false); }
  };

  if (!info) return <Card><CardBody><p className="text-sm text-slate-400">Loading…</p></CardBody></Card>;

  return (
    <div className="space-y-4">
      <Card><CardBody className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Your customer portal</h3>
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 p-2.5 dark:bg-slate-800/60">
          <code className="min-w-0 flex-1 truncate text-xs text-slate-700 dark:text-slate-200">{info.url}</code>
          <button onClick={() => { navigator.clipboard?.writeText(info.url); toast.success?.("Link copied."); }}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300">
            <Copy size={11} /> Copy
          </button>
          <a href={info.url} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300">
            <ExternalLink size={11} /> Open
          </a>
        </div>
        <p className="text-xs text-slate-500">
          Share this with customers. They read your published help articles without signing in, and prove their
          email address to raise and follow requests — no password, nothing for them to forget.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {[["Portal tickets", info.portalTickets], ["Signed-in customers", info.activeSessions], ["Links awaiting use", info.pendingLinks]].map(([label, value]) => (
            <div key={label}>
              <p className="text-lg font-semibold text-slate-900 dark:text-white">{value}</p>
              <p className="text-[11px] text-slate-400">{label}</p>
            </div>
          ))}
        </div>
        {info.note && (
          <p className="flex items-start gap-1.5 rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-[11px] text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
            <AlertTriangle size={12} className="mt-0.5 shrink-0" /> {info.note}
          </p>
        )}
      </CardBody></Card>

      <Card><CardBody className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Send someone a sign-in link</h3>
        <p className="text-xs text-slate-500">
          For when a customer can't receive email from us, or asks you directly. The link signs that person in,
          so only send it to the address that owns it.
        </p>
        <div className="flex flex-wrap gap-2">
          <input className={cls(input, "flex-1 min-w-[200px]")} placeholder="customer@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <button onClick={issue} disabled={busy || !email.trim()}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">Create link</button>
        </div>
        {issued && (
          <div className="space-y-1 rounded-lg border border-slate-200 p-2.5 dark:border-slate-700">
            <p className="text-[11px] font-medium text-slate-700 dark:text-slate-200">{issued.email}</p>
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate text-[11px] text-slate-500">{issued.url}</code>
              <button onClick={() => { navigator.clipboard?.writeText(issued.url); toast.success?.("Copied."); }}
                className="shrink-0 rounded-lg border border-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300">Copy</button>
            </div>
            <p className="text-[11px] text-amber-600 dark:text-amber-400">{issued.note}</p>
          </div>
        )}
      </CardBody></Card>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function Helpdesk() {
  const toast = useToast();
  const { isAdmin } = useUser();

  // Deep links from search and notifications land straight on a record — and
  // stay live. Reading the parameters into state once at mount meant that
  // following a second link to this same page (a different ticket from the
  // command palette, say) changed the URL and nothing else.
  const [openId, setOpenId] = useRecordParam("ticket");
  const [openArticle, setOpenArticle] = useRecordParam("article");
  const [tabParam, setTabParam] = useRecordParam("tab");
  const tab = tabParam ?? (openArticle ? "kb" : "queue");

  const { data: stats } = useApi(() => helpdesk.stats(), [], { pollingInterval: 60000 });

  const TABS = [
    { id: "queue", label: "Queue", icon: LifeBuoy },
    { id: "kb", label: "Knowledge base", icon: BookOpen },
    ...(isAdmin ? [{ id: "portal", label: "Portal", icon: Globe }] : []),
  ];

  // Switching tab by hand clears the record the URL was pointing at, so the
  // address bar never claims to be showing something it isn't.
  const pick = (id) => {
    setOpenId(null);
    setOpenArticle(null);
    setTabParam(id === "queue" ? null : id);
  };

  return (
    <div>
      <PageHeader
        title="Helpdesk"
        subtitle="One support queue — from your team, and from customers in the portal."
        actions={stats && (
          <div className="hidden gap-3 text-right sm:flex">
            <div>
              <p className="text-lg font-semibold text-slate-900 dark:text-white">{stats.openCount}</p>
              <p className="text-[11px] text-slate-400">open</p>
            </div>
            <div>
              <p className={cls("text-lg font-semibold", stats.awaitingFirstResponse ? "text-amber-600 dark:text-amber-400" : "text-slate-900 dark:text-white")}>
                {stats.awaitingFirstResponse}
              </p>
              <p className="text-[11px] text-slate-400">no reply yet</p>
            </div>
            <div>
              <p className={cls("text-lg font-semibold", stats.unassigned ? "text-amber-600 dark:text-amber-400" : "text-slate-900 dark:text-white")}>
                {stats.unassigned}
              </p>
              <p className="text-[11px] text-slate-400">unassigned</p>
            </div>
            {stats.satisfactionAvg != null && (
              <div>
                <p className="text-lg font-semibold text-slate-900 dark:text-white">{stats.satisfactionAvg}/5</p>
                <p className="text-[11px] text-slate-400">rating</p>
              </div>
            )}
          </div>
        )}
      >
        <div className="flex flex-wrap gap-1">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => pick(t.id)}
              className={cls("inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition",
                tab === t.id
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                  : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800")}>
              <t.icon size={13} /> {t.label}
            </button>
          ))}
        </div>
      </PageHeader>

      {/* Shown whenever there's a queue at all. Averages are only meaningful once
          something has been resolved, so an absent average says so rather than
          making the whole bar disappear on a fresh queue. */}
      {tab === "queue" && stats && (stats.openCount > 0 || stats.resolvedLast30Days > 0) && (
        <Card className="mb-4"><CardBody className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
          <Clock size={14} className="text-indigo-500" />
          {stats.avgFirstResponseHours != null
            ? <span>First reply averages <strong className="text-slate-800 dark:text-slate-200">{stats.avgFirstResponseHours}h</strong></span>
            : <span>No first-reply average yet — nothing resolved in the last 30 days</span>}
          {stats.avgResolutionHours != null && <span>Resolution averages <strong className="text-slate-800 dark:text-slate-200">{stats.avgResolutionHours}h</strong></span>}
          {stats.openCount > 0 && (
            <span>Oldest open ticket: <strong className="text-slate-800 dark:text-slate-200">{stats.oldestOpenHours}h</strong></span>
          )}
          <span className="text-slate-400">Last 30 days · {stats.resolvedLast30Days} resolved</span>
        </CardBody></Card>
      )}

      {tab === "queue" && <Queue toast={toast} openId={openId} setOpenId={setOpenId} />}
      {tab === "kb" && <KnowledgeBase isAdmin={isAdmin} toast={toast} openArticle={openArticle} setOpenArticle={setOpenArticle} />}
      {tab === "portal" && isAdmin && <PortalSettings toast={toast} />}
    </div>
  );
}
