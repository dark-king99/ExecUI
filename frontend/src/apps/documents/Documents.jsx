/**
 * Document hub — versioned documents, templates and signature envelopes.
 *
 * Three deliberate choices in this UI:
 *  • Version history is always visible, never behind a menu. The reason to have
 *    versioning at all is being able to see what changed and when.
 *  • Sending for signature shows the signing links back to you. When no email
 *    provider is configured that's the only way the envelope reaches anybody, so
 *    the page says so plainly instead of pretending mail was sent.
 *  • The document fingerprint (SHA-256) is shown next to each version, because
 *    it's what a completion certificate binds to.
 */
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody } from "../../components/ui/Card";
import { useApi } from "../../hooks/useApi";
import useRecordParam from "../../hooks/useRecordParam";
import { useToast } from "../../components/ui/Toast";
import { useUser } from "../../context/UserContext";
import { isAdminUser } from "../../lib/access";
import { linkTo } from "../../lib/recordLinks";
import { documents } from "../../services/api";
import {
  FileText, Upload, Plus, Search, Archive, Trash2, PenLine, Send, X, Clock,
  ShieldCheck, Copy, FileSignature, Layers, CheckCircle2, AlertTriangle, Download,
  ExternalLink,
} from "lucide-react";

const cls = (...a) => a.filter(Boolean).join(" ");
const input = "w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white";
const when = (d) => (d ? new Date(d).toLocaleString() : "—");
const bytes = (n) => (!n ? "—" : n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(1)} MB`);

const ENVELOPE_TONE = {
  completed: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  sent:      "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
  draft:     "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  declined:  "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  cancelled: "bg-slate-100 text-slate-500 dark:bg-slate-800",
  expired:   "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
};

function Pill({ children, tone = "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" }) {
  return <span className={cls("rounded-full px-2 py-0.5 text-[11px] font-medium", tone)}>{children}</span>;
}

/**
 * A link to a related record in another view. Deliberately looks like a link
 * rather than a badge: the whole point is that it goes somewhere.
 */
function RelatedLink({ to, children, tone = "text-indigo-600 hover:text-indigo-500 dark:text-indigo-400" }) {
  return (
    <Link to={to} onClick={(e) => e.stopPropagation()}
      className={cls("inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium dark:bg-indigo-500/10", tone)}>
      {children}<ExternalLink size={9} className="opacity-60" />
    </Link>
  );
}

function Empty({ icon: Icon, title, hint }) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center">
      <Icon size={22} className="text-slate-300 dark:text-slate-600" />
      <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{title}</p>
      {hint && <p className="max-w-md text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

// ── Signature composer ───────────────────────────────────────────────────────
function SendForSignature({ doc, catalog, onClose, toast }) {
  const [signers, setSigners] = useState([{ name: "", email: "", role: "signer" }]);
  const [sequential, setSequential] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const setSigner = (i, patch) =>
    setSigners((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

  const submit = async () => {
    setBusy(true);
    try {
      const envelope = await documents.signatures.create({
        documentId: doc.id, message: message || undefined, sequential, signers,
      });
      const sent = await documents.signatures.send(envelope.id);
      setResult(sent);
      toast.success?.(sent.delivery === "emailed" ? "Sent for signature." : "Envelope created — copy the links below.");
    } catch (e) {
      toast.error?.(e.message);
    } finally { setBusy(false); }
  };

  if (result) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-500" />
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Envelope sent</p>
        </div>
        {result.delivery !== "emailed" && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <p>
              No email provider is configured, so nothing was emailed. Send each person their own
              link below — a link is that person's signature, so don't share one with anybody else.
            </p>
          </div>
        )}
        <div className="space-y-2">
          {result.links?.map((l) => (
            <div key={l.email} className="rounded-lg border border-slate-200 p-2.5 dark:border-slate-700">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-slate-800 dark:text-slate-200">{l.name} · {l.email}</p>
                  <p className="truncate text-[11px] text-slate-400">{l.url}</p>
                </div>
                <button
                  onClick={() => { navigator.clipboard?.writeText(l.url); toast.success?.("Link copied."); }}
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-600 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-300">
                  <Copy size={11} /> Copy
                </button>
              </div>
            </div>
          ))}
        </div>
        <button onClick={onClose} className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white dark:bg-white dark:text-slate-900">Done</button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">
        Sending version {doc.currentVersion} of <strong className="text-slate-700 dark:text-slate-200">{doc.title}</strong>.
        Each party gets a private link; the signature is bound to this exact file.
      </p>

      <div className="space-y-2">
        {signers.map((s, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2">
            <input className={cls(input, "flex-1 min-w-[120px]")} placeholder="Full name"
              value={s.name} onChange={(e) => setSigner(i, { name: e.target.value })} />
            <input className={cls(input, "flex-1 min-w-[160px]")} placeholder="email@company.com"
              value={s.email} onChange={(e) => setSigner(i, { email: e.target.value })} />
            <select className={cls(input, "w-auto")} value={s.role} onChange={(e) => setSigner(i, { role: e.target.value })}>
              {(catalog?.signerRoles ?? []).map((r) => <option key={r.id} value={r.id}>{r.id}</option>)}
            </select>
            {signers.length > 1 && (
              <button onClick={() => setSigners((p) => p.filter((_, idx) => idx !== i))}
                className="rounded-lg p-1.5 text-slate-400 hover:text-red-500" title="Remove">
                <X size={14} />
              </button>
            )}
          </div>
        ))}
      </div>

      <button onClick={() => setSigners((p) => [...p, { name: "", email: "", role: "signer" }])}
        className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-500">
        <Plus size={12} /> Add another party
      </button>

      <textarea className={cls(input, "h-20")} placeholder="Message to the signers (optional)"
        value={message} onChange={(e) => setMessage(e.target.value)} />

      <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
        <input type="checkbox" checked={sequential} onChange={(e) => setSequential(e.target.checked)} />
        Sign in order — each party is only invited once the previous one has signed
      </label>

      <div className="flex gap-2">
        <button onClick={submit} disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
          <Send size={13} /> {busy ? "Sending…" : "Send for signature"}
        </button>
        <button onClick={onClose} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300">Cancel</button>
      </div>
    </div>
  );
}

// ── Documents tab ────────────────────────────────────────────────────────────
function DocumentsTab({ catalog, isAdmin, toast }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  // A document arrived at from a link may well be archived — filtering it out
  // would answer a direct link with an empty list.
  const [openId, setOpenId] = useRecordParam("open");
  const [status, setStatus] = useState(openId ? "all" : "active");
  const { data: list, loading, refetch } = useApi(
    () => documents.list({ search: search || undefined, category: category || undefined, status }),
    [search, category, status],
  );
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ title: "", category: "general", description: "", confidential: false });
  const [signingFor, setSigningFor] = useState(null);
  const [busy, setBusy] = useState(false);

  // Scroll a linked-to document into view once the list it lives in has loaded.
  useEffect(() => {
    if (!openId || !list) return;
    document.getElementById(`doc-${openId}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [openId, list]);

  const create = async () => {
    setBusy(true);
    try {
      const d = await documents.create(draft);
      toast.success?.("Document created — upload the file to make version 1.");
      setCreating(false); setDraft({ title: "", category: "general", description: "", confidential: false });
      setOpenId(d.id); refetch();
    } catch (e) { toast.error?.(e.message); } finally { setBusy(false); }
  };

  const upload = async (docId, file) => {
    if (!file) return;
    setBusy(true);
    try {
      await documents.addVersion(docId, file);
      toast.success?.("New version filed.");
      refetch();
    } catch (e) { toast.error?.(e.message); } finally { setBusy(false); }
  };

  const archive = async (docId) => {
    try { await documents.archive(docId); toast.success?.("Archived."); refetch(); }
    catch (e) { toast.error?.(e.message); }
  };

  // Both destructive actions are refused by the API while a contract depends on
  // the document. Saying so on the button — and pointing at the contract — beats
  // letting someone click and read an error.
  const blockedBy = (d) => (d.contracts ?? []).find((c) => c.live) ?? (d.contracts ?? [])[0] ?? null;

  const remove = async (docId) => {
    try { await documents.remove(docId); toast.success?.("Deleted."); refetch(); }
    catch (e) { toast.error?.(e.message); }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardBody className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] flex-1">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className={cls(input, "pl-8")} placeholder="Search documents…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className={cls(input, "w-auto")} value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All categories</option>
            {(catalog?.documentCategories ?? []).map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          <select className={cls(input, "w-auto")} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
            <option value="all">All</option>
          </select>
          <button onClick={() => setCreating((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500">
            <Plus size={13} /> New document
          </button>
        </CardBody>
      </Card>

      {creating && (
        <Card>
          <CardBody className="space-y-2">
            <input className={input} placeholder="Title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            <div className="flex flex-wrap gap-2">
              <select className={cls(input, "w-auto")} value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>
                {(catalog?.documentCategories ?? []).map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
              <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                <input type="checkbox" checked={draft.confidential} onChange={(e) => setDraft({ ...draft, confidential: e.target.checked })} />
                Confidential
              </label>
            </div>
            <textarea className={cls(input, "h-16")} placeholder="What is this document? (optional)"
              value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
            <div className="flex gap-2">
              <button onClick={create} disabled={busy || !draft.title.trim()}
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">Create</button>
              <button onClick={() => setCreating(false)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300">Cancel</button>
            </div>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardBody className="space-y-2">
          {loading && !list && <p className="text-sm text-slate-400">Loading…</p>}
          {list && !list.length && (
            <Empty icon={FileText} title="No documents yet"
              hint="Create one and upload a file, or generate it from a template." />
          )}
          {(list ?? []).map((d) => (
            <div key={d.id} id={`doc-${d.id}`}
              className={cls("rounded-xl border dark:border-slate-700",
                openId === d.id ? "border-indigo-300 ring-1 ring-indigo-200 dark:border-indigo-500/50 dark:ring-indigo-500/20" : "border-slate-200")}>
              <div className="flex flex-wrap items-start justify-between gap-2 p-3">
                <button className="min-w-0 flex-1 text-left" onClick={() => setOpenId(openId === d.id ? null : d.id)}>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{d.title}</p>
                    <Pill>{d.categoryLabel}</Pill>
                    {d.confidential && <Pill tone="bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">Confidential</Pill>}
                    {d.status === "archived" && <Pill>Archived</Pill>}
                    <Pill tone="bg-slate-100 text-slate-500 dark:bg-slate-800">v{d.currentVersion}</Pill>
                    {d.signatureCount > 0 && (
                      <Pill tone="bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
                        {d.signatureCount} envelope{d.signatureCount === 1 ? "" : "s"}
                      </Pill>
                    )}
                    {/* This document is somebody's contract. Say which, and go there. */}
                    {isAdmin && (d.contracts ?? []).map((c) => (
                      <RelatedLink key={c.id} to={linkTo("contract", c.id)}>
                        <FileSignature size={9} /> {c.title} · {c.statusLabel}
                      </RelatedLink>
                    ))}
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {d.ownerName ? `${d.ownerName} · ` : ""}updated {when(d.updatedAt)}
                    {d.latest ? ` · ${d.latest.fileName} (${bytes(d.latest.size)})` : " · no file yet"}
                  </p>
                </button>

                <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                  <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-600 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-300">
                    <Upload size={11} /> {d.currentVersion ? "New version" : "Upload file"}
                    <input type="file" className="hidden" onChange={(e) => { upload(d.id, e.target.files?.[0]); e.target.value = ""; }} />
                  </label>
                  {isAdmin && d.currentVersion > 0 && (
                    <button onClick={() => setSigningFor(signingFor === d.id ? null : d.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-600 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-300">
                      <FileSignature size={11} /> Sign
                    </button>
                  )}
                  {d.status !== "archived" && (
                    <button onClick={() => archive(d.id)} disabled={!!blockedBy(d)?.live}
                      title={blockedBy(d)?.live
                        ? `Can't archive — "${blockedBy(d).title}" is still in force`
                        : "Archive"}
                      className="rounded-lg p-1.5 text-slate-400 hover:text-amber-500 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-slate-400">
                      <Archive size={13} />
                    </button>
                  )}
                  {isAdmin && (
                    <button onClick={() => remove(d.id)} disabled={!!blockedBy(d) || d.signatureCount > 0}
                      title={blockedBy(d)
                        ? `Can't delete — attached to "${blockedBy(d).title}"`
                        : d.signatureCount > 0
                          ? "Can't delete — this document carries signature evidence"
                          : "Delete permanently"}
                      className="rounded-lg p-1.5 text-slate-400 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-slate-400">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>

              {signingFor === d.id && (
                <div className="border-t border-slate-200 p-3 dark:border-slate-700">
                  <SendForSignature doc={d} catalog={catalog} toast={toast} onClose={() => { setSigningFor(null); refetch(); }} />
                </div>
              )}

              {openId === d.id && <VersionHistory documentId={d.id} />}
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}

function VersionHistory({ documentId }) {
  const { data: doc } = useApi(() => documents.get(documentId), [documentId]);
  if (!doc) return <div className="border-t border-slate-200 p-3 text-xs text-slate-400 dark:border-slate-700">Loading history…</div>;

  return (
    <div className="border-t border-slate-200 p-3 dark:border-slate-700">
      {doc.description && <p className="mb-2 text-xs text-slate-500">{doc.description}</p>}
      <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        <Layers size={11} /> Version history
      </div>
      {!doc.versions?.length && <p className="text-xs text-slate-400">No file has been uploaded yet.</p>}
      <div className="space-y-1.5">
        {(doc.versions ?? []).map((v) => (
          <div key={v.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5 dark:bg-slate-800/60">
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-slate-700 dark:text-slate-200">
                v{v.version} · {v.fileName} <span className="font-normal text-slate-400">({bytes(v.size)})</span>
              </p>
              <p className="truncate text-[11px] text-slate-400">
                {v.uploaderName ? `${v.uploaderName} · ` : ""}{when(v.createdAt)}
                {v.checksum ? ` · sha256 ${v.checksum.slice(0, 16)}…` : ""}
              </p>
            </div>
            <a href={v.url} target="_blank" rel="noreferrer"
              className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-600 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-300">
              <Download size={11} /> Open
            </a>
          </div>
        ))}
      </div>

      {/* Where else this document appears. A document hub that can't answer
          "what is this being used for?" makes every deletion a guess. */}
      {((doc.contracts ?? []).length > 0 || (doc.envelopes ?? []).length > 0) && (
        <div className="mt-3 border-t border-slate-100 pt-2.5 dark:border-slate-800">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Used by</p>
          <div className="flex flex-wrap gap-1.5">
            {(doc.contracts ?? []).map((c) => (
              <RelatedLink key={c.id} to={linkTo("contract", c.id)}>
                <FileSignature size={9} /> {c.title} · {c.statusLabel}
              </RelatedLink>
            ))}
            {(doc.envelopes ?? []).map((e) => (
              <RelatedLink key={e.id} to={linkTo("envelope", e.id)}>
                <Send size={9} /> {e.title} · {e.status}
              </RelatedLink>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Templates tab ────────────────────────────────────────────────────────────
function TemplatesTab({ catalog, isAdmin, toast }) {
  const { data: list, refetch } = useApi(() => documents.templates.list(true), []);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [using, setUsing] = useState(null);

  const blank = { name: "", category: "contract", description: "", body: "", active: true };

  const save = async () => {
    setBusy(true);
    try {
      if (editing.id) await documents.templates.update(editing.id, editing);
      else await documents.templates.create(editing);
      toast.success?.("Template saved.");
      setEditing(null); refetch();
    } catch (e) { toast.error?.(e.message); } finally { setBusy(false); }
  };

  const remove = async (id) => {
    try { await documents.templates.remove(id); toast.success?.("Template deleted."); refetch(); }
    catch (e) { toast.error?.(e.message); }
  };

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="flex justify-end">
          <button onClick={() => setEditing(editing ? null : blank)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500">
            <Plus size={13} /> New template
          </button>
        </div>
      )}

      {editing && (
        <Card>
          <CardBody className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <input className={cls(input, "flex-1 min-w-[180px]")} placeholder="Template name"
                value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              <select className={cls(input, "w-auto")} value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })}>
                {(catalog?.documentCategories ?? []).map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
              <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                <input type="checkbox" checked={editing.active !== false} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} />
                Active
              </label>
            </div>
            <input className={input} placeholder="Description (optional)"
              value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
            <textarea className={cls(input, "h-64 font-mono text-xs")}
              placeholder={"The text of the document.\n\nUse {{placeholders}} for anything that changes per counterparty, e.g.\n\nThis agreement is made between {{company}} and {{counterparty}} on {{date}}."}
              value={editing.body} onChange={(e) => setEditing({ ...editing, body: e.target.value })} />
            <p className="text-[11px] text-slate-400">
              Placeholders are picked up from the body automatically — you'll be asked for each one when you generate a document.
            </p>
            <div className="flex gap-2">
              <button onClick={save} disabled={busy || !editing.name?.trim() || !editing.body?.trim()}
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">Save template</button>
              <button onClick={() => setEditing(null)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300">Cancel</button>
            </div>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardBody className="space-y-2">
          {list && !list.length && (
            <Empty icon={PenLine} title="No templates yet"
              hint="Write an agreement once with {{placeholders}}, then generate a filled-in PDF per counterparty." />
          )}
          {(list ?? []).map((t) => (
            <div key={t.id} className="rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex flex-wrap items-start justify-between gap-2 p-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{t.name}</p>
                    <Pill>{t.categoryLabel}</Pill>
                    {!t.active && <Pill tone="bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">Inactive</Pill>}
                    <Pill tone="bg-slate-100 text-slate-500 dark:bg-slate-800">used {t.useCount}×</Pill>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {t.variables?.length ? `Fills in: ${t.variables.map((v) => v.label).join(", ")}` : "No placeholders"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {isAdmin && (
                    <button onClick={() => setUsing(using === t.id ? null : t.id)}
                      className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white dark:bg-white dark:text-slate-900">
                      <FileText size={11} /> Generate
                    </button>
                  )}
                  {isAdmin && (
                    <>
                      <button onClick={() => setEditing(t)} title="Edit"
                        className="rounded-lg p-1.5 text-slate-400 hover:text-indigo-500"><PenLine size={13} /></button>
                      <button onClick={() => remove(t.id)} title="Delete"
                        className="rounded-lg p-1.5 text-slate-400 hover:text-red-500"><Trash2 size={13} /></button>
                    </>
                  )}
                </div>
              </div>
              {using === t.id && <GenerateFromTemplate template={t} toast={toast} onDone={() => setUsing(null)} />}
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}

function GenerateFromTemplate({ template, toast, onDone }) {
  const [values, setValues] = useState({});
  const [title, setTitle] = useState(template.name);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);

  const doPreview = async () => {
    setBusy(true);
    try { setPreview(await documents.templates.preview(template.id, values)); }
    catch (e) { toast.error?.(e.message); } finally { setBusy(false); }
  };

  const doGenerate = async () => {
    setBusy(true);
    try {
      await documents.templates.generate(template.id, { title, values });
      toast.success?.("Document generated as a PDF and filed as version 1.");
      onDone();
    } catch (e) { toast.error?.(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-2 border-t border-slate-200 p-3 dark:border-slate-700">
      <input className={input} placeholder="Document title" value={title} onChange={(e) => setTitle(e.target.value)} />
      {(template.variables ?? []).map((v) => (
        <input key={v.key} className={input} placeholder={v.label}
          value={values[v.key] ?? ""} onChange={(e) => setValues({ ...values, [v.key]: e.target.value })} />
      ))}
      <div className="flex flex-wrap gap-2">
        <button onClick={doPreview} disabled={busy}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300">Preview</button>
        <button onClick={doGenerate} disabled={busy}
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
          {busy ? "Working…" : "Generate document"}
        </button>
      </div>
      {preview && (
        <div className="space-y-1">
          {preview.missing?.length > 0 && (
            <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400">Still needed: {preview.missing.join(", ")}</p>
          )}
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-2.5 text-[11px] text-slate-700 dark:bg-slate-800/60 dark:text-slate-200">{preview.text}</pre>
        </div>
      )}
    </div>
  );
}

// ── Envelopes tab ────────────────────────────────────────────────────────────
function EnvelopesTab({ toast }) {
  const { data: list, refetch } = useApi(() => documents.signatures.list({ limit: 50 }), [], { pollingInterval: 30000 });
  const [openId, setOpenId] = useRecordParam("envelope");

  useEffect(() => {
    if (!openId || !list) return;
    document.getElementById(`env-${openId}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [openId, list]);

  const resend = async (id) => {
    try {
      const r = await documents.signatures.send(id, { resend: true });
      toast.success?.(r.delivery === "emailed" ? "Reminder sent." : "New links issued — copy them from the envelope.");
      refetch();
    } catch (e) { toast.error?.(e.message); }
  };

  const cancel = async (id) => {
    try { await documents.signatures.cancel(id); toast.success?.("Envelope cancelled — the links no longer work."); refetch(); }
    catch (e) { toast.error?.(e.message); }
  };

  return (
    <Card>
      <CardBody className="space-y-2">
        {list && !list.length && (
          <Empty icon={FileSignature} title="Nothing out for signature"
            hint="Open a document and choose Sign to send it to a counterparty." />
        )}
        {(list ?? []).map((r) => (
          <div key={r.id} id={`env-${r.id}`}
            className={cls("rounded-xl border dark:border-slate-700",
              openId === r.id ? "border-indigo-300 ring-1 ring-indigo-200 dark:border-indigo-500/50 dark:ring-indigo-500/20" : "border-slate-200")}>
            <div className="flex flex-wrap items-start justify-between gap-2 p-3">
              <button className="min-w-0 flex-1 text-left" onClick={() => setOpenId(openId === r.id ? null : r.id)}>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{r.title}</p>
                  <Pill tone={ENVELOPE_TONE[r.status]}>{r.status}</Pill>
                  <Pill tone="bg-slate-100 text-slate-500 dark:bg-slate-800">{r.progress.signed}/{r.progress.total} signed</Pill>
                  {r.sequential && <Pill>in order</Pill>}
                  {/* An envelope is usually signing a commitment — link to it. */}
                  {r.contract && (
                    <RelatedLink to={linkTo("contract", r.contract.id)}>
                      <FileSignature size={9} /> {r.contract.title}
                    </RelatedLink>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  {r.documentTitle} · sent {when(r.sentAt)}{r.expiresAt ? ` · expires ${new Date(r.expiresAt).toLocaleDateString()}` : ""}
                </p>
              </button>
              <div className="flex shrink-0 items-center gap-1.5">
                {["draft", "sent"].includes(r.status) && (
                  <>
                    <button onClick={() => resend(r.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-600 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-300">
                      <Send size={11} /> Remind
                    </button>
                    <button onClick={() => cancel(r.id)}
                      className="rounded-lg p-1.5 text-slate-400 hover:text-red-500" title="Cancel envelope"><X size={13} /></button>
                  </>
                )}
                {r.status === "completed" && (
                  <button onClick={() => documents.signatures.certificatePdf(r.id).catch((e) => toast.error?.(e.message))}
                    className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 px-2 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500/40 dark:text-emerald-400 dark:hover:bg-emerald-500/10">
                    <ShieldCheck size={11} /> Certificate
                  </button>
                )}
              </div>
            </div>

            {openId === r.id && <EnvelopeDetail id={r.id} />}
          </div>
        ))}
      </CardBody>
    </Card>
  );
}

function EnvelopeDetail({ id }) {
  const { data } = useApi(() => documents.signatures.get(id), [id]);
  if (!data) return <div className="border-t border-slate-200 p-3 text-xs text-slate-400 dark:border-slate-700">Loading…</div>;

  return (
    <div className="grid gap-4 border-t border-slate-200 p-3 md:grid-cols-2 dark:border-slate-700">
      <div>
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Parties</p>
        <div className="space-y-1.5">
          {data.signers.map((s) => (
            <div key={s.id} className="rounded-lg bg-slate-50 px-2.5 py-1.5 dark:bg-slate-800/60">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-xs font-medium text-slate-700 dark:text-slate-200">{s.name} <span className="font-normal text-slate-400">{s.email}</span></p>
                <Pill tone={s.status === "signed" ? ENVELOPE_TONE.completed : s.status === "declined" ? ENVELOPE_TONE.declined : ENVELOPE_TONE.draft}>{s.status}</Pill>
              </div>
              <p className="text-[11px] text-slate-400">
                {s.role}
                {s.signedAt ? ` · signed as "${s.signatureName}" ${when(s.signedAt)}${s.ip ? ` from ${s.ip}` : ""}` : s.viewedAt ? ` · opened ${when(s.viewedAt)}` : ""}
                {s.declineReason ? ` · reason: ${s.declineReason}` : ""}
              </p>
            </div>
          ))}
        </div>
        {data.certificate && (
          <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 dark:border-emerald-500/40 dark:bg-emerald-500/10">
            <p className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">Completion certificate issued</p>
            <p className="mt-0.5 break-all text-[11px] text-emerald-700 dark:text-emerald-400">
              document sha256 {data.certificate.document?.sha256 ?? "unavailable"}
            </p>
          </div>
        )}
      </div>

      <div>
        {data.documentId && (
          <div className="mb-3">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Signing</p>
            <RelatedLink to={linkTo("document", data.documentId)}>
              <FileText size={9} /> {data.documentTitle ?? "document"}
            </RelatedLink>
          </div>
        )}
        <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          <Clock size={11} /> Audit trail
        </p>
        <div className="max-h-64 space-y-1 overflow-auto">
          {(data.events ?? []).map((e) => (
            <div key={e.id} className="text-[11px] text-slate-500">
              <span className="font-medium text-slate-700 dark:text-slate-300">{e.type}</span>
              {e.detail ? ` — ${e.detail}` : ""}
              {e.ip ? ` · ${e.ip}` : ""}
              <span className="text-slate-400"> · {when(e.createdAt)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
const TABS = [
  { id: "documents", label: "Documents", icon: FileText },
  { id: "templates", label: "Templates", icon: PenLine },
  { id: "signatures", label: "Signatures", icon: FileSignature },
];

export default function Documents() {
  const toast = useToast();
  const { user } = useUser();
  const isAdmin = isAdminUser(user);
  // The tab lives in the URL so a link can open the right one — an envelope link
  // that lands on the Documents tab has taken you to the wrong page.
  const [tabParam, setTab] = useRecordParam("tab");
  const tab = TABS.some((t) => t.id === tabParam) ? tabParam : "documents";
  const { data: catalog } = useApi(() => documents.catalog(), [], { cacheKey: "documents:catalog" });
  const { data: stats } = useApi(() => documents.stats(), []);

  return (
    <div>
      <PageHeader
        title="Documents"
        subtitle="Versioned company documents, templates and electronic signatures."
        actions={
          stats && (
            <div className="hidden gap-3 text-right sm:flex">
              <div>
                <p className="text-lg font-semibold text-slate-900 dark:text-white">{stats.active}</p>
                <p className="text-[11px] text-slate-400">active</p>
              </div>
              <div>
                <p className="text-lg font-semibold text-slate-900 dark:text-white">{stats.signatures?.sent ?? 0}</p>
                <p className="text-[11px] text-slate-400">out for signature</p>
              </div>
              <div>
                <p className="text-lg font-semibold text-slate-900 dark:text-white">{stats.signatures?.completed ?? 0}</p>
                <p className="text-[11px] text-slate-400">signed</p>
              </div>
            </div>
          )
        }
      >
        <div className="flex flex-wrap gap-1">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id === "documents" ? null : t.id)}
              className={cls(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition",
                tab === t.id
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                  : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800",
              )}>
              <t.icon size={13} /> {t.label}
            </button>
          ))}
        </div>
      </PageHeader>

      {tab === "documents" && <DocumentsTab catalog={catalog} isAdmin={isAdmin} toast={toast} />}
      {tab === "templates" && <TemplatesTab catalog={catalog} isAdmin={isAdmin} toast={toast} />}
      {tab === "signatures" && (isAdmin
        ? <EnvelopesTab toast={toast} />
        : <Card><CardBody><Empty icon={FileSignature} title="Signature envelopes are admin-only"
            hint="Ask an administrator to send this document for signature." /></CardBody></Card>)}
    </div>
  );
}
