/**
 * Contract register (CLM).
 *
 * The page is organised around the two questions a contract register exists to
 * answer: *what are we committed to*, and *what needs attention before a date
 * passes*. Renewal exposure is therefore at the top, not buried in a filter.
 *
 * Status buttons are generated from the lifecycle map the backend enforces, so
 * the UI can only ever offer a move that will actually be allowed.
 */
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody } from "../../components/ui/Card";
import { useApi } from "../../hooks/useApi";
import useRecordParam from "../../hooks/useRecordParam";
import { useToast } from "../../components/ui/Toast";
import { linkTo } from "../../lib/recordLinks";
import { contracts, documents } from "../../services/api";
import {
  FileSignature, Plus, Search, AlertTriangle, Clock, RefreshCw, CheckCircle2,
  MessageSquare, Trash2, ArrowRight, ShieldCheck, Banknote, CalendarClock, X,
  FileText, ExternalLink, Download, Upload, PenLine,
} from "lucide-react";

const cls = (...a) => a.filter(Boolean).join(" ");
const input = "w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white";
const day = (d) => (d ? new Date(d).toLocaleDateString() : "—");
const when = (d) => (d ? new Date(d).toLocaleString() : "—");
const money = (v, cur) => `${cur} ${Number(v ?? 0).toLocaleString()}`;
const iso = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");

const TONE = {
  slate:   "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  amber:   "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  blue:    "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
  emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  indigo:  "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300",
  rose:    "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400",
};

const RENEWAL_TONE = {
  overdue: "text-red-600 dark:text-red-400",
  notice_passed: "text-red-600 dark:text-red-400",
  due_soon: "text-amber-600 dark:text-amber-400",
  notice_soon: "text-amber-600 dark:text-amber-400",
  evergreen: "text-slate-400",
  ok: "text-slate-400",
  "n/a": "text-slate-400",
};

function Pill({ children, tone = TONE.slate }) {
  return <span className={cls("rounded-full px-2 py-0.5 text-[11px] font-medium", tone)}>{children}</span>;
}

/** A link into another view for a related record. */
function RelatedLink({ to, children }) {
  return (
    <Link to={to} onClick={(e) => e.stopPropagation()}
      className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-600 hover:text-indigo-500 dark:bg-indigo-500/10 dark:text-indigo-400">
      {children}<ExternalLink size={9} className="opacity-60" />
    </Link>
  );
}

const bytes = (n) => (!n ? "—" : n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(1)} MB`);

/**
 * The paperwork behind the contract.
 *
 * A register that shows only a document *title* can't tell you whether the file
 * exists, which version is current, or whether the thing you'd download is the
 * thing that was signed. So this panel shows the version and its fingerprint,
 * opens the file, and links into the document hub for the full history — and when
 * nothing is attached it says what to do about it instead of leaving a blank.
 */
function AttachedDocument({ contract, onAttach }) {
  const doc = contract.document;

  if (!doc) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 p-3 dark:border-slate-700">
        <p className="text-xs font-medium text-slate-600 dark:text-slate-300">No document attached</p>
        <p className="mt-0.5 text-[11px] text-slate-400">
          A contract with no paperwork can't be signed and isn't evidence of anything.
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <button onClick={onAttach}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-300">
            <Upload size={11} /> Attach an existing document
          </button>
          <Link to="/documents?tab=templates"
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-300">
            <PenLine size={11} /> Generate one from a template
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <FileText size={13} className="shrink-0 text-slate-400" />
            <p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-100">{doc.title}</p>
            <Pill>{doc.categoryLabel}</Pill>
            {doc.confidential && <Pill tone={TONE.amber}>Confidential</Pill>}
            {doc.status === "archived" && <Pill tone={TONE.amber}>Archived</Pill>}
            <Pill tone={TONE.slate}>v{doc.currentVersion}</Pill>
          </div>
          {doc.latest ? (
            <p className="mt-0.5 truncate text-[11px] text-slate-400">
              {doc.latest.fileName} ({bytes(doc.latest.size)}) · {when(doc.latest.createdAt)}
              {doc.latest.checksum ? ` · sha256 ${doc.latest.checksum.slice(0, 16)}…` : ""}
            </p>
          ) : (
            <p className="mt-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
              This document has no file uploaded yet — there is nothing to sign.
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          {doc.latest && (
            <a href={doc.latest.url} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-600 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-300">
              <Download size={11} /> Open file
            </a>
          )}
          <RelatedLink to={linkTo("document", doc.id)}>Document hub</RelatedLink>
        </div>
      </div>
    </div>
  );
}

// ── New / edit form ──────────────────────────────────────────────────────────
function ContractForm({ initial, catalog, docs, onSave, onCancel, busy }) {
  const [f, setF] = useState({
    title: initial?.title ?? "",
    counterparty: initial?.counterparty ?? "",
    type: initial?.type ?? "other",
    value: initial?.value ?? 0,
    currency: initial?.currency ?? "USD",
    startDate: iso(initial?.startDate),
    endDate: iso(initial?.endDate),
    autoRenew: initial?.autoRenew ?? false,
    renewalTermMonths: initial?.renewalTermMonths ?? "",
    noticePeriodDays: initial?.noticePeriodDays ?? 30,
    documentId: initial?.documentId ?? "",
    notes: initial?.notes ?? "",
  });
  const set = (patch) => setF({ ...f, ...patch });

  return (
    <Card>
      <CardBody className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <input className={cls(input, "flex-1 min-w-[200px]")} placeholder="Contract title" value={f.title} onChange={(e) => set({ title: e.target.value })} />
          <input className={cls(input, "flex-1 min-w-[160px]")} placeholder="Counterparty" value={f.counterparty} onChange={(e) => set({ counterparty: e.target.value })} />
          <select className={cls(input, "w-auto")} value={f.type} onChange={(e) => set({ type: e.target.value })}>
            {(catalog?.contractTypes ?? []).map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </div>

        <div className="flex flex-wrap gap-2">
          <input className={cls(input, "w-28")} type="number" min="0" placeholder="Value" value={f.value} onChange={(e) => set({ value: e.target.value })} />
          <input className={cls(input, "w-20")} maxLength={3} placeholder="USD" value={f.currency} onChange={(e) => set({ currency: e.target.value.toUpperCase() })} />
          <label className="flex items-center gap-1.5 text-xs text-slate-500">
            Starts <input className={cls(input, "w-auto")} type="date" value={f.startDate} onChange={(e) => set({ startDate: e.target.value })} />
          </label>
          <label className="flex items-center gap-1.5 text-xs text-slate-500">
            Ends <input className={cls(input, "w-auto")} type="date" value={f.endDate} onChange={(e) => set({ endDate: e.target.value })} />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
            <input type="checkbox" checked={f.autoRenew} onChange={(e) => set({ autoRenew: e.target.checked })} />
            Auto-renews
          </label>
          <label className="flex items-center gap-1.5 text-xs text-slate-500">
            Term <input className={cls(input, "w-20")} type="number" min="1" max="120" placeholder="12"
              value={f.renewalTermMonths} onChange={(e) => set({ renewalTermMonths: e.target.value })} /> months
          </label>
          <label className="flex items-center gap-1.5 text-xs text-slate-500">
            Notice <input className={cls(input, "w-20")} type="number" min="0" max="730"
              value={f.noticePeriodDays} onChange={(e) => set({ noticePeriodDays: e.target.value })} /> days
          </label>
        </div>

        {/* Every active document is offered, including ones with no file yet —
            attaching first and uploading after is a normal order of work, and a
            document that silently isn't in the list looks like it wasn't saved. */}
        <select className={input} value={f.documentId} onChange={(e) => set({ documentId: e.target.value })}>
          <option value="">No document attached</option>
          {(docs ?? []).map((d) => (
            <option key={d.id} value={d.id}>
              {d.title} {d.currentVersion > 0 ? `(v${d.currentVersion})` : "— no file uploaded yet"}
            </option>
          ))}
        </select>

        <textarea className={cls(input, "h-16")} placeholder="Notes — key obligations, contacts, anything the next person needs"
          value={f.notes ?? ""} onChange={(e) => set({ notes: e.target.value })} />

        <div className="flex gap-2">
          <button onClick={() => onSave({
            ...f,
            value: Number(f.value) || 0,
            renewalTermMonths: f.renewalTermMonths === "" ? null : Number(f.renewalTermMonths),
            noticePeriodDays: Number(f.noticePeriodDays) || 0,
            documentId: f.documentId || null,
            startDate: f.startDate || null,
            endDate: f.endDate || null,
          })}
            disabled={busy || !f.title.trim() || !f.counterparty.trim()}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
            {initial?.id ? "Save changes" : "Create contract"}
          </button>
          <button onClick={onCancel} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300">Cancel</button>
        </div>
      </CardBody>
    </Card>
  );
}

// ── Signature launcher ───────────────────────────────────────────────────────
function SendContract({ contract, onClose, toast, refetch }) {
  const [signers, setSigners] = useState([{ name: "", email: "", role: "signer" }]);
  const [sequential, setSequential] = useState(false);
  const [busy, setBusy] = useState(false);
  const [links, setLinks] = useState(null);

  const setSigner = (i, patch) => setSigners((p) => p.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

  const send = async () => {
    setBusy(true);
    try {
      const r = await contracts.signature(contract.id, { signers, sequential });
      setLinks(r.envelope);
      toast.success?.(r.envelope.delivery === "emailed" ? "Sent for signature." : "Envelope created — copy the links below.");
      refetch();
    } catch (e) { toast.error?.(e.message); } finally { setBusy(false); }
  };

  if (links) {
    return (
      <div className="space-y-2">
        {links.delivery !== "emailed" && (
          <p className="rounded-lg border border-amber-300 bg-amber-50 p-2 text-[11px] text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
            No email provider is configured — send each party their own link. A link is that party's signature.
          </p>
        )}
        {links.links?.map((l) => (
          <div key={l.email} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5 dark:bg-slate-800/60">
            <p className="min-w-0 truncate text-[11px] text-slate-600 dark:text-slate-300">{l.email} — {l.url}</p>
            <button onClick={() => { navigator.clipboard?.writeText(l.url); toast.success?.("Copied."); }}
              className="shrink-0 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300">Copy</button>
          </div>
        ))}
        <button onClick={onClose} className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white dark:bg-white dark:text-slate-900">Done</button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {!contract.documentId && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 p-2 text-[11px] text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
          Attach a document to this contract first — there's nothing to sign.
        </p>
      )}
      {signers.map((s, i) => (
        <div key={i} className="flex flex-wrap items-center gap-2">
          <input className={cls(input, "flex-1 min-w-[120px]")} placeholder="Full name" value={s.name} onChange={(e) => setSigner(i, { name: e.target.value })} />
          <input className={cls(input, "flex-1 min-w-[160px]")} placeholder="email@company.com" value={s.email} onChange={(e) => setSigner(i, { email: e.target.value })} />
          <select className={cls(input, "w-auto")} value={s.role} onChange={(e) => setSigner(i, { role: e.target.value })}>
            <option value="signer">signer</option>
            <option value="approver">approver</option>
            <option value="viewer">viewer</option>
          </select>
          {signers.length > 1 && (
            <button onClick={() => setSigners((p) => p.filter((_, idx) => idx !== i))} className="rounded-lg p-1.5 text-slate-400 hover:text-red-500"><X size={14} /></button>
          )}
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={() => setSigners((p) => [...p, { name: "", email: "", role: "signer" }])}
          className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-500"><Plus size={12} /> Add party</button>
        <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
          <input type="checkbox" checked={sequential} onChange={(e) => setSequential(e.target.checked)} /> Sign in order
        </label>
      </div>
      <div className="flex gap-2">
        <button onClick={send} disabled={busy || !contract.documentId}
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
          {busy ? "Sending…" : "Send for signature"}
        </button>
        <button onClick={onClose} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300">Cancel</button>
      </div>
    </div>
  );
}

// ── Detail panel ─────────────────────────────────────────────────────────────
function ContractDetail({ id, catalog, docs, toast, refetch, onOpen }) {
  const { data: c, refetch: reload } = useApi(() => contracts.get(id), [id]);
  const [note, setNote] = useState("");
  const [editing, setEditing] = useState(false);
  const [signing, setSigning] = useState(false);
  const [renewing, setRenewing] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!c) return <div className="border-t border-slate-200 p-3 text-xs text-slate-400 dark:border-slate-700">Loading…</div>;

  const act = async (fn, message) => {
    setBusy(true);
    try { await fn(); toast.success?.(message); reload(); refetch(); }
    catch (e) { toast.error?.(e.message); } finally { setBusy(false); }
  };

  const labelFor = (id_) => catalog?.contractStates?.find((s) => s.id === id_)?.label ?? id_;

  return (
    <div className="space-y-3 border-t border-slate-200 p-3 dark:border-slate-700">
      {editing ? (
        <ContractForm initial={c} catalog={catalog} docs={docs} busy={busy}
          onCancel={() => setEditing(false)}
          onSave={(data) => act(async () => { await contracts.update(c.id, data); setEditing(false); }, "Contract updated.")} />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Value</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{money(c.value, c.currency)}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Term</p>
              <p className="text-sm text-slate-700 dark:text-slate-200">{day(c.startDate)} → {day(c.endDate)}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Notice deadline</p>
              <p className={cls("text-sm", RENEWAL_TONE[c.renewal.state])}>
                {day(c.noticeDeadline)} {c.renewal.noticeDays != null ? `(${c.renewal.noticeDays}d)` : ""}
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Renewal</p>
              <p className={cls("text-sm", RENEWAL_TONE[c.renewal.state])}>
                {c.autoRenew ? `Auto-renews${c.renewalTermMonths ? ` · ${c.renewalTermMonths}mo` : ""}` : "Manual"} · {c.renewal.label}
              </p>
            </div>
          </div>

          {c.notes && <p className="rounded-lg bg-slate-50 p-2.5 text-xs text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">{c.notes}</p>}

          {/* The paperwork, the signature envelope and the renewal chain — the
              three things this record points at. Each one is reachable from here
              rather than being an id you have to go and look up. */}
          <AttachedDocument contract={c} onAttach={() => setEditing(true)} />

          {(c.signature || c.renewedFrom || c.renewedBy) && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Related</span>
              {c.signature && (
                <RelatedLink to={linkTo("envelope", c.signature.id)}>
                  <FileSignature size={9} /> Envelope · {c.signature.status} · {c.signature.signed}/{c.signature.total} signed
                </RelatedLink>
              )}
              {c.renewedFrom && (
                <RelatedLink to={linkTo("contract", c.renewedFrom.id)}>
                  <RefreshCw size={9} /> Renews {c.renewedFrom.title}
                </RelatedLink>
              )}
              {c.renewedBy && (
                <RelatedLink to={linkTo("contract", c.renewedBy.id)}>
                  <RefreshCw size={9} /> Renewed by {c.renewedBy.title}
                </RelatedLink>
              )}
            </div>
          )}

          {/* Lifecycle — only the moves the backend will actually accept. */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Move to</span>
            {c.nextStates.length === 0 && <span className="text-xs text-slate-400">nothing — this is a closed record</span>}
            {c.nextStates.map((s) => (
              <button key={s} disabled={busy}
                onClick={() => act(() => contracts.setStatus(c.id, s), `Moved to ${labelFor(s)}.`)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-600 hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300">
                <ArrowRight size={11} /> {labelFor(s)}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button onClick={() => setEditing(true)}
              className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300">Edit</button>
            {["draft", "in_review"].includes(c.status) && (
              <button disabled={busy} onClick={() => act(() => contracts.approval(c.id), "Sent for internal approval.")}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-300">
                <CheckCircle2 size={11} /> Send for approval
              </button>
            )}
            <button onClick={() => setSigning((v) => !v)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-300">
              <FileSignature size={11} /> Send for signature
            </button>
            {["active", "expired"].includes(c.status) && (
              <button onClick={() => setRenewing((v) => !v)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-300">
                <RefreshCw size={11} /> Renew
              </button>
            )}
            {!["active", "renewed"].includes(c.status) && (
              <button disabled={busy} onClick={() => act(() => contracts.remove(c.id), "Contract deleted.")}
                className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1 text-[11px] font-medium text-red-600 hover:bg-red-50 dark:border-red-500/40 dark:hover:bg-red-500/10">
                <Trash2 size={11} /> Delete
              </button>
            )}
          </div>

          {signing && (
            <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              <SendContract contract={c} toast={toast} refetch={() => { reload(); refetch(); }} onClose={() => setSigning(false)} />
            </div>
          )}

          {renewing && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              <p className="text-xs text-slate-500">Create a successor contract; this one is marked renewed.</p>
              <button disabled={busy}
                onClick={() => act(async () => {
                  // The API answers with both sides of the chain; the successor is
                  // the record you now work on.
                  const { renewal } = await contracts.renew(c.id);
                  setRenewing(false);
                  if (renewal?.id) onOpen?.(renewal.id);
                }, "Renewal created as a draft — you're now looking at it.")}
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
                Create renewal
              </button>
            </div>
          )}

          {/* Timeline */}
          <div>
            <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              <Clock size={11} /> Timeline
            </p>
            <div className="mb-2 flex gap-2">
              <input className={input} placeholder="Add a note to the timeline…" value={note} onChange={(e) => setNote(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && note.trim() && act(async () => { await contracts.addNote(c.id, note); setNote(""); }, "Note added.")} />
              <button disabled={busy || !note.trim()}
                onClick={() => act(async () => { await contracts.addNote(c.id, note); setNote(""); }, "Note added.")}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-medium text-slate-600 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300">
                <MessageSquare size={11} /> Add
              </button>
            </div>
            <div className="max-h-56 space-y-1 overflow-auto">
              {(c.events ?? []).map((e) => (
                <div key={e.id} className="text-[11px] text-slate-500">
                  <span className="font-medium text-slate-700 dark:text-slate-300">{e.type}</span>
                  {e.fromStatus && e.toStatus ? ` — ${e.fromStatus} → ${e.toStatus}` : ""}
                  {e.detail ? ` — ${e.detail}` : ""}
                  {e.actorName ? ` · ${e.actorName}` : ""}
                  <span className="text-slate-400"> · {when(e.createdAt)}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function Contracts() {
  const toast = useToast();
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  // Which contract is open lives in the URL, so a link from a document, an
  // envelope, a notification or a search result opens that contract — and the
  // address bar stays shareable with a colleague.
  const [openId, setOpenId] = useRecordParam("open");
  const [busy, setBusy] = useState(false);

  const { data: catalog } = useApi(() => documents.catalog(), [], { cacheKey: "documents:catalog" });
  const { data: docs } = useApi(() => documents.list({ status: "active" }), [], { cacheKey: "documents:active" });
  const { data: list, refetch } = useApi(
    () => contracts.list({ status, search: search || undefined }), [status, search],
  );
  const { data: pf, refetch: reloadPf } = useApi(() => contracts.portfolio(), [], { cacheKey: "contracts:portfolio" });

  const reload = () => { refetch(); reloadPf(); };

  useEffect(() => {
    if (!openId || !list) return;
    document.getElementById(`contract-${openId}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [openId, list]);

  const create = async (data) => {
    setBusy(true);
    try {
      const c = await contracts.create(data);
      toast.success?.("Contract created.");
      setCreating(false); setOpenId(c.id); reload();
    } catch (e) { toast.error?.(e.message); } finally { setBusy(false); }
  };

  return (
    <div>
      <PageHeader
        title="Contracts"
        subtitle="The register: what you're committed to, and what needs attention before a date passes."
        actions={
          <button onClick={() => setCreating((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500">
            <Plus size={13} /> New contract
          </button>
        }
      />

      {pf && (
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card><CardBody className="flex items-center gap-3">
            <CheckCircle2 size={18} className="text-emerald-500" />
            <div><p className="text-lg font-semibold text-slate-900 dark:text-white">{pf.liveCount}</p><p className="text-[11px] text-slate-400">in force</p></div>
          </CardBody></Card>
          <Card><CardBody className="flex items-center gap-3">
            <Banknote size={18} className="text-indigo-500" />
            <div>
              <p className="text-lg font-semibold text-slate-900 dark:text-white">
                {Object.entries(pf.valueByCurrency ?? {}).map(([cur, v]) => money(v, cur)).join(" · ") || "—"}
              </p>
              <p className="text-[11px] text-slate-400">committed value</p>
            </div>
          </CardBody></Card>
          <Card><CardBody className="flex items-center gap-3">
            <CalendarClock size={18} className="text-sky-500" />
            <div><p className="text-lg font-semibold text-slate-900 dark:text-white">{pf.expiringIn90Days}</p><p className="text-[11px] text-slate-400">end within 90 days</p></div>
          </CardBody></Card>
          <Card><CardBody className="flex items-center gap-3">
            <AlertTriangle size={18} className={pf.needingAttention ? "text-amber-500" : "text-slate-300"} />
            <div><p className="text-lg font-semibold text-slate-900 dark:text-white">{pf.needingAttention}</p><p className="text-[11px] text-slate-400">need attention</p></div>
          </CardBody></Card>
        </div>
      )}

      {creating && (
        <div className="mb-4">
          <ContractForm catalog={catalog} docs={docs} busy={busy} onSave={create} onCancel={() => setCreating(false)} />
        </div>
      )}

      <Card className="mb-4">
        <CardBody className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] flex-1">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className={cls(input, "pl-8")} placeholder="Search title or counterparty…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className={cls(input, "w-auto")} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="live">In force</option>
            {(catalog?.contractStates ?? []).map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-2">
          {list && !list.length && (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <ShieldCheck size={22} className="text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">No contracts in the register</p>
              <p className="max-w-md text-xs text-slate-400">
                Add one to start tracking value, renewal dates and notice deadlines — the dates that cost money when they're missed.
              </p>
            </div>
          )}
          {(list ?? []).map((c) => (
            <div key={c.id} id={`contract-${c.id}`}
              className={cls("rounded-xl border dark:border-slate-700",
                openId === c.id ? "border-indigo-300 ring-1 ring-indigo-200 dark:border-indigo-500/50 dark:ring-indigo-500/20" : "border-slate-200")}>
              <button className="w-full p-3 text-left" onClick={() => setOpenId(openId === c.id ? null : c.id)}>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{c.title}</p>
                  <Pill tone={TONE[c.statusTone] ?? TONE.slate}>{c.statusLabel}</Pill>
                  <Pill>{c.typeLabel}</Pill>
                  {c.autoRenew && <Pill tone={TONE.indigo}>auto-renews</Pill>}
                  {c.signatureStatus && <Pill tone={TONE.blue}>signature: {c.signatureStatus}</Pill>}
                  {/* "No document" and "a document with no file in it" are
                      different problems, and both stop a signature. */}
                  {!c.documentId
                    ? <Pill tone={TONE.amber}>no document</Pill>
                    : !c.document?.currentVersion
                      ? <Pill tone={TONE.amber}>document has no file</Pill>
                      : null}
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  {c.counterparty} · {money(c.value, c.currency)} · ends {day(c.endDate)}
                  {" · "}
                  <span className={RENEWAL_TONE[c.renewal.state]}>{c.renewal.label}</span>
                  {c.ownerName ? ` · ${c.ownerName}` : ""}
                </p>
              </button>
              {openId === c.id && (
                <ContractDetail id={c.id} catalog={catalog} docs={docs} toast={toast} refetch={reload} onOpen={setOpenId} />
              )}
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}
