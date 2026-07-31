/**
 * Customer support portal — the public face of the helpdesk.
 *
 * Rendered before the login gate, and outside the app shell: the people here are
 * customers, and none of ExecUI's navigation means anything to them.
 *
 * How it's built for someone who has never seen this product:
 *  • The **help centre is readable with no sign-in at all**. A help centre you
 *    have to log into is one nobody reads.
 *  • Signing in is an **email link, not a password** — nothing to remember, and
 *    nothing for us to leak.
 *  • Starting a request **suggests articles first**. Answering the question
 *    immediately is better for everyone than opening a ticket about it.
 *  • The session token lives in this page's own storage key, deliberately
 *    separate from any employee session in the same browser.
 */
import { useState, useEffect, useCallback } from "react";
import { portal as api } from "../../services/api";
import {
  LifeBuoy, BookOpen, Search, Send, ArrowLeft, Mail, CheckCircle2, Clock,
  AlertTriangle, ThumbsUp, ThumbsDown, Star, Plus, LogOut, ChevronRight,
} from "lucide-react";

const cls = (...a) => a.filter(Boolean).join(" ");
const field = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white";
const when = (d) => (d ? new Date(d).toLocaleString() : "—");
const day = (d) => (d ? new Date(d).toLocaleDateString() : "—");

const sessionKey = (slug) => `portal_session_${slug}`;

const STATUS_LABEL = {
  open: "Open", in_progress: "Being looked at", pending: "Waiting on you",
  resolved: "Resolved", closed: "Closed",
};
const STATUS_TONE = {
  open: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
  in_progress: "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300",
  pending: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  resolved: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  closed: "bg-slate-100 text-slate-500 dark:bg-slate-800",
};

function Shell({ org, branding, email, onSignOut, children }) {
  // This page belongs to the organization, not to us. Where they've set a logo
  // or a colour we use theirs; otherwise the neutral default is unchanged.
  const accent = branding?.primaryColor || null;
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-3 px-4 py-4">
          {branding?.logoUrl
            ? <img src={branding.logoUrl} alt={org ?? "Support"} className="h-7 max-w-[150px] shrink-0 object-contain" />
            : <LifeBuoy size={20} style={accent ? { color: accent } : undefined}
                className={accent ? "" : "text-indigo-600 dark:text-indigo-400"} />}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{org ?? "Support"}</p>
            <p className="text-[11px] text-slate-400">Help centre &amp; support requests</p>
          </div>
          {email && (
            <div className="flex items-center gap-2">
              <span className="hidden text-[11px] text-slate-400 sm:inline">{email}</span>
              <button onClick={onSignOut}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300">
                <LogOut size={11} /> Sign out
              </button>
            </div>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-3xl space-y-4 px-4 py-6">{children}</main>
      <footer className="mx-auto max-w-3xl px-4 pb-8 text-center text-[11px] text-slate-400">
        {branding?.supportEmail && (
          <p className="mb-1">
            Need more help? <a href={`mailto:${branding.supportEmail}`} className="underline">{branding.supportEmail}</a>
          </p>
        )}
        {!branding?.hidePoweredBy && `Powered by ${branding?.productName ?? "ExecUI"}`}
      </footer>
    </div>
  );
}

function Panel({ children, className = "" }) {
  return (
    <div className={cls("rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900", className)}>
      {children}
    </div>
  );
}

function Pill({ children, tone }) {
  return <span className={cls("rounded-full px-2 py-0.5 text-[11px] font-medium", tone ?? STATUS_TONE.closed)}>{children}</span>;
}

// ── Help centre ──────────────────────────────────────────────────────────────
function HelpCentre({ slug, help, onOpenArticle, onAsk }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setResults(null); return undefined; }
    let live = true;
    setSearching(true);
    const timer = setTimeout(() => {
      api.helpSearch(slug, q)
        .then((r) => { if (live) setResults(r.results ?? []); })
        .catch(() => { if (live) setResults([]); })
        .finally(() => { if (live) setSearching(false); });
    }, 200);
    return () => { live = false; clearTimeout(timer); };
  }, [query, slug]);

  const hasArticles = (help?.categories?.length ?? 0) > 0 || (help?.uncategorised?.length ?? 0) > 0;

  return (
    <>
      <Panel>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className={cls(field, "pl-10")} placeholder="Search for an answer…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        {searching && <p className="mt-2 text-[11px] text-slate-400">Searching…</p>}
        {results && (
          <div className="mt-3 space-y-1">
            {!results.length && <p className="text-sm text-slate-500">Nothing matched. You can ask us below.</p>}
            {results.map((a) => (
              <button key={a.id} onClick={() => onOpenArticle(a.slug)}
                className="flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60">
                <BookOpen size={14} className="mt-0.5 shrink-0 text-slate-400" />
                <span className="min-w-0">
                  <span className="block truncate text-sm text-slate-800 dark:text-slate-100">{a.title}</span>
                  {a.excerpt && <span className="block truncate text-[11px] text-slate-400">{a.excerpt}</span>}
                </span>
              </button>
            ))}
          </div>
        )}
      </Panel>

      {help?.popular?.length > 0 && !results && (
        <Panel>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Most read</p>
          <div className="space-y-1">
            {help.popular.map((a) => (
              <button key={a.id} onClick={() => onOpenArticle(a.slug)}
                className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800/60">
                <span className="truncate">{a.title}</span>
                <ChevronRight size={14} className="shrink-0 text-slate-300" />
              </button>
            ))}
          </div>
        </Panel>
      )}

      {!results && (help?.categories ?? []).map((c) => (
        <Panel key={c.id}>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">{c.name}</p>
          {c.description && <p className="mt-0.5 text-xs text-slate-500">{c.description}</p>}
          <div className="mt-2 space-y-1">
            {c.articles.map((a) => (
              <button key={a.id} onClick={() => onOpenArticle(a.slug)}
                className="flex w-full items-start justify-between gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60">
                <span className="min-w-0">
                  <span className="block truncate text-sm text-slate-800 dark:text-slate-100">{a.title}</span>
                  {a.excerpt && <span className="block truncate text-[11px] text-slate-400">{a.excerpt}</span>}
                </span>
                <span className="shrink-0 text-[10px] text-slate-400">{a.readingMinutes} min</span>
              </button>
            ))}
          </div>
        </Panel>
      ))}

      {!results && help?.uncategorised?.length > 0 && (
        <Panel>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Other articles</p>
          <div className="mt-2 space-y-1">
            {help.uncategorised.map((a) => (
              <button key={a.id} onClick={() => onOpenArticle(a.slug)}
                className="block w-full truncate rounded-lg px-2 py-1.5 text-left text-sm text-slate-800 hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800/60">
                {a.title}
              </button>
            ))}
          </div>
        </Panel>
      )}

      {!hasArticles && !results && (
        <Panel>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            There aren't any help articles here yet — but you can still send us a request and we'll get back to you.
          </p>
        </Panel>
      )}

      <Panel className="text-center">
        <p className="text-sm text-slate-600 dark:text-slate-300">Still stuck?</p>
        <button onClick={onAsk}
          className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500">
          <Plus size={14} /> Contact support
        </button>
      </Panel>
    </>
  );
}

function Article({ slug, articleKey, onBack, onOpenArticle }) {
  const [article, setArticle] = useState(null);
  const [error, setError] = useState(null);
  const [voted, setVoted] = useState(null);
  const [comment, setComment] = useState("");

  useEffect(() => {
    let live = true;
    api.article(slug, articleKey)
      .then((a) => { if (live) setArticle(a); })
      .catch((e) => { if (live) setError(e.message); });
    return () => { live = false; };
  }, [slug, articleKey]);

  const vote = async (helpful) => {
    setVoted(helpful ? "yes" : "no");
    try { await api.feedback(slug, article.id, { helpful, comment: helpful ? undefined : comment || undefined }); }
    catch { /* the thank-you already showed; a lost vote isn't worth an error */ }
  };

  if (error) {
    return (
      <Panel>
        <p className="text-sm text-slate-600 dark:text-slate-300">{error}</p>
        <button onClick={onBack} className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-indigo-600">
          <ArrowLeft size={14} /> Back to the help centre
        </button>
      </Panel>
    );
  }
  if (!article) return <Panel><p className="text-sm text-slate-400">Loading…</p></Panel>;

  return (
    <>
      <button onClick={onBack} className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 dark:text-indigo-400">
        <ArrowLeft size={14} /> Help centre
      </button>
      <Panel>
        {article.categoryName && <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">{article.categoryName}</p>}
        <h1 className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">{article.title}</h1>
        <p className="mt-1 text-[11px] text-slate-400">
          {article.readingMinutes} min read · updated {day(article.updatedAt)}
        </p>
        <div className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-200">{article.body}</div>
      </Panel>

      <Panel>
        {voted ? (
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {voted === "yes" ? "Thanks — glad it helped." : "Thanks — we'll use this to improve the article."}
          </p>
        ) : (
          <>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-100">Was this helpful?</p>
            <input className={cls(field, "mt-2")} placeholder="Anything we could make clearer? (optional)"
              value={comment} onChange={(e) => setComment(e.target.value)} />
            <div className="mt-2 flex gap-2">
              <button onClick={() => vote(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500/40 dark:text-emerald-400">
                <ThumbsUp size={14} /> Yes
              </button>
              <button onClick={() => vote(false)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300">
                <ThumbsDown size={14} /> Not really
              </button>
            </div>
          </>
        )}
      </Panel>

      {article.related?.length > 0 && (
        <Panel>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Related</p>
          {article.related.map((r) => (
            <button key={r.id} onClick={() => onOpenArticle(r.slug)}
              className="block w-full truncate rounded-lg px-2 py-1.5 text-left text-sm text-slate-800 hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800/60">
              {r.title}
            </button>
          ))}
        </Panel>
      )}
    </>
  );
}

// ── Sign-in ──────────────────────────────────────────────────────────────────
function SignIn({ slug, onBack, emailConfigured }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try { setSent(await api.requestLink(slug, email.trim())); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  if (sent) {
    return (
      <Panel>
        <div className="flex items-start gap-3">
          {sent.delivered
            ? <Mail size={18} className="mt-0.5 shrink-0 text-indigo-500" />
            : <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-500" />}
          <div>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
              {sent.delivered ? "Check your email" : "We couldn't send the email"}
            </p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{sent.message}</p>
          </div>
        </div>
        <button onClick={onBack} className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-indigo-600">
          <ArrowLeft size={14} /> Back
        </button>
      </Panel>
    );
  }

  return (
    <Panel>
      <button onClick={onBack} className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-indigo-600 dark:text-indigo-400">
        <ArrowLeft size={14} /> Help centre
      </button>
      <h1 className="text-lg font-semibold text-slate-900 dark:text-white">View your requests</h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
        Enter your email and we'll send you a sign-in link. There's no password to remember.
      </p>
      {!emailConfigured && (
        <p className="mt-3 flex items-start gap-1.5 rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-[11px] text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
          <AlertTriangle size={12} className="mt-0.5 shrink-0" />
          This portal can't send email yet. Ask the support team to send you a link directly.
        </p>
      )}
      <form onSubmit={submit} className="mt-4 space-y-2">
        <input className={field} type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
        <button type="submit" disabled={busy || !email.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
          <Mail size={14} /> {busy ? "Sending…" : "Email me a link"}
        </button>
      </form>
    </Panel>
  );
}

// ── My requests ──────────────────────────────────────────────────────────────
function MyRequests({ slug, session, onOpen, onNew }) {
  const [tickets, setTickets] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let live = true;
    api.tickets(slug, session)
      .then((r) => { if (live) setTickets(r); })
      .catch((e) => { if (live) setError(e.message); });
    return () => { live = false; };
  }, [slug, session]);

  if (error) return <Panel><p className="text-sm text-slate-600 dark:text-slate-300">{error}</p></Panel>;

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-lg font-semibold text-slate-900 dark:text-white">Your requests</h1>
        <button onClick={onNew}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500">
          <Plus size={13} /> New request
        </button>
      </div>

      {tickets && !tickets.length && (
        <Panel>
          <p className="text-sm text-slate-600 dark:text-slate-300">You haven't raised anything yet.</p>
        </Panel>
      )}

      {(tickets ?? []).map((t) => (
        <button key={t.id} onClick={() => onOpen(t.id)} className="block w-full text-left">
          <Panel className="transition hover:border-indigo-300">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[11px] text-slate-400">{t.ticketNumber}</span>
              <p className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900 dark:text-white">{t.subject}</p>
              <Pill tone={STATUS_TONE[t.status]}>{STATUS_LABEL[t.status] ?? t.status}</Pill>
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Raised {day(t.createdAt)}
              {t.messageCount ? ` · ${t.messageCount} message${t.messageCount === 1 ? "" : "s"}` : ""}
              {t.canRate ? " · you can rate this" : ""}
              {t.satisfaction ? ` · you rated ${t.satisfaction}/5` : ""}
            </p>
          </Panel>
        </button>
      ))}
    </>
  );
}

function RequestThread({ slug, session, id, onBack }) {
  const [ticket, setTicket] = useState(null);
  const [error, setError] = useState(null);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [rating, setRating] = useState(0);
  const [ratingComment, setRatingComment] = useState("");

  const load = useCallback(() => {
    api.ticket(slug, session, id).then(setTicket).catch((e) => setError(e.message));
  }, [slug, session, id]);

  useEffect(() => { load(); }, [load]);

  const send = async () => {
    setBusy(true);
    try { await api.reply(slug, session, id, { body: reply }); setReply(""); load(); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  const rate = async () => {
    setBusy(true);
    try { await api.rate(slug, session, id, { score: rating, comment: ratingComment }); load(); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  if (error && !ticket) return <Panel><p className="text-sm text-slate-600 dark:text-slate-300">{error}</p></Panel>;
  if (!ticket) return <Panel><p className="text-sm text-slate-400">Loading…</p></Panel>;

  return (
    <>
      <button onClick={onBack} className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 dark:text-indigo-400">
        <ArrowLeft size={14} /> Your requests
      </button>

      <Panel>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[11px] text-slate-400">{ticket.ticketNumber}</span>
          <Pill tone={STATUS_TONE[ticket.status]}>{STATUS_LABEL[ticket.status] ?? ticket.status}</Pill>
        </div>
        <h1 className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{ticket.subject}</h1>
        <p className="mt-0.5 text-[11px] text-slate-400">Raised {when(ticket.createdAt)}</p>
      </Panel>

      <div className="space-y-3">
        {ticket.messages.map((m) => (
          <Panel key={m.id} className={m.authorType === "customer" ? "" : "border-indigo-200 bg-indigo-50/40 dark:border-indigo-500/30 dark:bg-indigo-500/5"}>
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">{m.authorName}</span>
              <span className="ml-auto text-[10px] text-slate-400">{when(m.createdAt)}</span>
            </div>
            <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">{m.body}</p>
          </Panel>
        ))}
      </div>

      {ticket.canRate && (
        <Panel>
          <p className="text-sm font-medium text-slate-800 dark:text-slate-100">How did we do?</p>
          <div className="mt-2 flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => setRating(n)} aria-label={`${n} of 5`}
                className={cls("rounded p-1", n <= rating ? "text-amber-500" : "text-slate-300 dark:text-slate-600")}>
                <Star size={20} className={n <= rating ? "fill-current" : ""} />
              </button>
            ))}
          </div>
          <input className={cls(field, "mt-2")} placeholder="Anything you'd like to add? (optional)"
            value={ratingComment} onChange={(e) => setRatingComment(e.target.value)} />
          <button onClick={rate} disabled={busy || !rating}
            className="mt-2 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
            Send rating
          </button>
        </Panel>
      )}

      {ticket.satisfaction && (
        <Panel><p className="text-sm text-slate-600 dark:text-slate-300">Thanks for rating this {ticket.satisfaction}/5.</p></Panel>
      )}

      <Panel>
        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">Add to this request</p>
        {["resolved", "closed"].includes(ticket.status) && (
          <p className="mt-1 text-[11px] text-slate-400">Replying will reopen it.</p>
        )}
        <textarea className={cls(field, "mt-2 h-24")} value={reply} onChange={(e) => setReply(e.target.value)}
          placeholder="Anything to add?" />
        {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
        <button onClick={send} disabled={busy || !reply.trim()}
          className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
          <Send size={14} /> Send
        </button>
      </Panel>
    </>
  );
}

function NewRequest({ slug, session, onDone, onCancel }) {
  const [form, setForm] = useState({ subject: "", description: "", priority: "medium", name: "" });
  const [suggestions, setSuggestions] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  // Suggest an answer while they type the subject — the best support request is
  // the one nobody had to send.
  useEffect(() => {
    const text = form.subject.trim();
    if (text.length < 5) { setSuggestions([]); return undefined; }
    let live = true;
    const timer = setTimeout(() => {
      api.suggest(slug, text)
        .then((r) => { if (live) setSuggestions(r.suggestions ?? []); })
        .catch(() => { if (live) setSuggestions([]); });
    }, 400);
    return () => { live = false; clearTimeout(timer); };
  }, [form.subject, slug]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const t = await api.submit(slug, session, form);
      onDone(t.id);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  return (
    <>
      <button onClick={onCancel} className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 dark:text-indigo-400">
        <ArrowLeft size={14} /> Cancel
      </button>
      <Panel>
        <h1 className="text-lg font-semibold text-slate-900 dark:text-white">Contact support</h1>
        <form onSubmit={submit} className="mt-3 space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-500">What do you need help with?</label>
            <input className={cls(field, "mt-1")} value={form.subject} required
              onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="A short summary" />
          </div>

          {suggestions.length > 0 && (
            <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-2.5 dark:border-indigo-500/30 dark:bg-indigo-500/5">
              <p className="mb-1 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">
                These might answer it straight away
              </p>
              {suggestions.map((a) => (
                <a key={a.id} href={`?article=${encodeURIComponent(a.slug)}`}
                  className="block truncate text-xs text-indigo-700 underline decoration-indigo-300 hover:text-indigo-900 dark:text-indigo-300">
                  {a.title}
                </a>
              ))}
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-slate-500">Tell us more</label>
            <textarea className={cls(field, "mt-1 h-32")} value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="What happened, and what you expected instead. Anything you've already tried helps." />
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="flex-1 min-w-[140px]">
              <label className="text-xs font-medium text-slate-500">Your name</label>
              <input className={cls(field, "mt-1")} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="optional" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500">How urgent?</label>
              <select className={cls(field, "mt-1 w-auto")} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                <option value="low">Not urgent</option>
                <option value="medium">Normal</option>
                <option value="high">Urgent — I'm blocked</option>
              </select>
            </div>
          </div>

          {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
          <button type="submit" disabled={busy || !form.subject.trim()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
            <Send size={14} /> {busy ? "Sending…" : "Send request"}
          </button>
        </form>
      </Panel>
    </>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function Portal({ slug }) {
  const [landing, setLanding] = useState(null);
  const [fatal, setFatal] = useState(null);
  const [session, setSession] = useState(() => { try { return localStorage.getItem(sessionKey(slug)); } catch { return null; } });
  const [email, setEmail] = useState(null);
  const [view, setView] = useState("help");
  const [articleKey, setArticleKey] = useState(null);
  const [ticketId, setTicketId] = useState(null);
  const [notice, setNotice] = useState(null);

  const saveSession = useCallback((token, address) => {
    try { if (token) localStorage.setItem(sessionKey(slug), token); else localStorage.removeItem(sessionKey(slug)); } catch { /* private mode */ }
    setSession(token); setEmail(address ?? null);
  }, [slug]);

  // Deep links: ?t= is a magic-link token, ?article= opens an article directly.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const magic = params.get("t");
    const article = params.get("article");
    if (article) { setArticleKey(article); setView("article"); }

    if (magic) {
      api.verifyLink(slug, magic)
        .then((r) => {
          saveSession(r.token, r.email);
          setView("tickets");
          setNotice(`Signed in as ${r.email}.`);
        })
        .catch((e) => setNotice(e.message))
        .finally(() => {
          // Don't leave a used token sitting in the address bar or in history.
          window.history.replaceState({}, "", window.location.pathname);
        });
    }
  }, [slug, saveSession]);

  useEffect(() => {
    let live = true;
    api.landing(slug)
      .then((r) => { if (live) setLanding(r); })
      .catch((e) => { if (live) setFatal(e.message); });
    return () => { live = false; };
  }, [slug]);

  // Confirm a stored session is still good, and learn the address it belongs to.
  useEffect(() => {
    if (!session) return undefined;
    let live = true;
    api.me(slug, session)
      .then((r) => { if (live) setEmail(r.email); })
      .catch(() => { if (live) saveSession(null); });
    return () => { live = false; };
  }, [session, slug, saveSession]);

  const signOut = async () => {
    if (session) await api.signOut(slug, session).catch(() => {});
    saveSession(null);
    setView("help");
    setNotice("Signed out.");
  };

  if (fatal) {
    return (
      <Shell>
        <Panel>
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-500" />
            <div>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100">This support portal isn't available</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{fatal}</p>
            </div>
          </div>
        </Panel>
      </Shell>
    );
  }

  const openArticle = (key) => { setArticleKey(key); setView("article"); };

  return (
    <Shell org={landing?.organization?.name} branding={landing?.branding} email={email} onSignOut={signOut}>
      {notice && (
        <div className="flex items-start gap-2 rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-800 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-200">
          <CheckCircle2 size={15} className="mt-0.5 shrink-0" />
          <span className="flex-1">{notice}</span>
          <button onClick={() => setNotice(null)} className="text-indigo-400">×</button>
        </div>
      )}

      {/* Signed-in customers get a way back to their requests from anywhere. */}
      {session && view === "help" && (
        <button onClick={() => setView("tickets")}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          <Clock size={13} /> Your requests
        </button>
      )}

      {view === "help" && landing && (
        <HelpCentre
          slug={slug} help={landing.help}
          onOpenArticle={openArticle}
          onAsk={() => setView(session ? "new" : "signin")}
        />
      )}

      {view === "article" && (
        <Article slug={slug} articleKey={articleKey} onOpenArticle={openArticle} onBack={() => setView("help")} />
      )}

      {view === "signin" && (
        <SignIn slug={slug} emailConfigured={landing?.emailConfigured !== false} onBack={() => setView("help")} />
      )}

      {view === "tickets" && session && (
        <MyRequests slug={slug} session={session} onOpen={(id) => { setTicketId(id); setView("thread"); }} onNew={() => setView("new")} />
      )}

      {view === "thread" && session && (
        <RequestThread slug={slug} session={session} id={ticketId} onBack={() => setView("tickets")} />
      )}

      {view === "new" && session && (
        <NewRequest slug={slug} session={session}
          onDone={(id) => { setTicketId(id); setView("thread"); setNotice("Thanks — we've got your request."); }}
          onCancel={() => setView(session ? "tickets" : "help")} />
      )}

      {["tickets", "thread", "new"].includes(view) && !session && (
        <SignIn slug={slug} emailConfigured={landing?.emailConfigured !== false} onBack={() => setView("help")} />
      )}

      {view === "help" && !session && (
        <p className="text-center text-[11px] text-slate-400">
          Already contacted us?{" "}
          <button onClick={() => setView("signin")} className="font-medium text-indigo-600 underline dark:text-indigo-400">
            Sign in to see your requests
          </button>
        </p>
      )}
    </Shell>
  );
}
