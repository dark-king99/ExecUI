/**
 * Public signing portal — what a counterparty sees.
 *
 * Rendered *before* the login gate: the people who use this page have no
 * account, and requiring one would defeat the purpose. The token in the URL is
 * the entire credential.
 *
 * The page is written for someone who has never seen this product and is being
 * asked to commit their organization to something. So it:
 *   • names who sent it and what they're being asked to do,
 *   • lets them read the actual file before anything else,
 *   • asks for a typed name and an explicit consent tick — the two things that
 *     make an electronic signature an act of intent rather than a click,
 *   • tells them plainly what is recorded (name, time, IP address),
 *   • and offers declining as a first-class option, not fine print.
 */
import { useEffect, useState } from "react";
import { signing } from "../../services/api";
import {
  FileText, ShieldCheck, AlertTriangle, CheckCircle2, Clock, Download, XCircle,
} from "lucide-react";

const cls = (...a) => a.filter(Boolean).join(" ");
const bytes = (n) => (!n ? "" : n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(1)} MB`);

function Shell({ children }) {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 dark:bg-slate-950">
      <div className="mx-auto w-full max-w-2xl space-y-4">{children}</div>
    </div>
  );
}

function Panel({ children, className = "" }) {
  return (
    <div className={cls("rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900", className)}>
      {children}
    </div>
  );
}

export default function SignPortal({ token }) {
  const [state, setState] = useState({ loading: true });
  const [name, setName] = useState("");
  const [consent, setConsent] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let live = true;
    signing.view(token)
      .then((data) => { if (live) { setState({ loading: false, data }); setName(data.me?.name ?? ""); } })
      .catch((e) => { if (live) setState({ loading: false, error: e.message }); });
    return () => { live = false; };
  }, [token]);

  const submit = async () => {
    setBusy(true); setError(null);
    try {
      const r = await signing.sign(token, { signatureName: name, consent });
      setDone({ kind: "signed", ...r });
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  const doDecline = async () => {
    setBusy(true); setError(null);
    try {
      const r = await signing.decline(token, reason);
      setDone({ kind: "declined", ...r });
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  if (state.loading) {
    return <Shell><Panel><p className="text-sm text-slate-500">Opening your document…</p></Panel></Shell>;
  }

  if (state.error) {
    return (
      <Shell>
        <Panel>
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="mt-0.5 shrink-0 text-amber-500" />
            <div>
              <h1 className="text-base font-semibold text-slate-900 dark:text-white">This link can't be opened</h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{state.error}</p>
              <p className="mt-3 text-xs text-slate-400">
                If you were expecting to sign something, ask the sender to issue a new link.
              </p>
            </div>
          </div>
        </Panel>
      </Shell>
    );
  }

  if (done) {
    const signed = done.kind === "signed";
    return (
      <Shell>
        <Panel>
          <div className="flex items-start gap-3">
            {signed
              ? <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-emerald-500" />
              : <XCircle size={20} className="mt-0.5 shrink-0 text-slate-400" />}
            <div>
              <h1 className="text-base font-semibold text-slate-900 dark:text-white">
                {signed ? "Signed" : "Declined"}
              </h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{done.message}</p>
              {signed && done.complete && (
                <p className="mt-2 text-xs text-slate-500">
                  Every party has now signed. A completion certificate — including the document's
                  fingerprint — has been emailed to everyone involved.
                </p>
              )}
              <p className="mt-3 text-xs text-slate-400">You can close this page.</p>
            </div>
          </div>
        </Panel>
      </Shell>
    );
  }

  const { request, document: doc, me, parties } = state.data;
  const alreadyActed = ["signed", "declined"].includes(me.status);
  const isViewer = me.role === "viewer";

  return (
    <Shell>
      <Panel>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
          {request.organization ? `${request.organization} · ` : ""}Signature request
        </p>
        <h1 className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">{request.title}</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Hello {me.name} — you've been asked to {isViewer ? "review" : me.role === "approver" ? "approve" : "sign"} this document.
        </p>
        {request.message && (
          <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700 dark:bg-slate-800/60 dark:text-slate-200">{request.message}</p>
        )}
        {request.expiresAt && (
          <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
            <Clock size={12} /> This link expires on {new Date(request.expiresAt).toLocaleString()}
          </p>
        )}
      </Panel>

      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-500/10">
              <FileText size={18} className="text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{doc.title}</p>
              <p className="truncate text-xs text-slate-500">
                {doc.fileName}{doc.size ? ` · ${bytes(doc.size)}` : ""}{doc.version ? ` · version ${doc.version}` : ""}
              </p>
            </div>
          </div>
          {doc.url && (
            <a href={doc.url} target="_blank" rel="noreferrer"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900">
              <Download size={13} /> Read the document
            </a>
          )}
        </div>
        {doc.checksum && (
          <p className="mt-3 break-all text-[11px] text-slate-400">
            Document fingerprint (SHA-256): {doc.checksum} — your signature is bound to this exact file.
          </p>
        )}
      </Panel>

      {parties?.length > 1 && (
        <Panel>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Parties</p>
          <div className="space-y-1">
            {parties.map((p, i) => (
              <div key={i} className="flex items-center justify-between gap-2 text-xs">
                <span className="text-slate-700 dark:text-slate-200">{p.name} <span className="text-slate-400">· {p.role}</span></span>
                <span className={cls(
                  "rounded-full px-2 py-0.5 text-[11px] font-medium",
                  p.status === "signed"
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                    : p.status === "declined"
                      ? "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400"
                      : "bg-slate-100 text-slate-500 dark:bg-slate-800",
                )}>{p.status}</span>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {isViewer ? (
        <Panel>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            You've been sent a copy of this document for your records. There's nothing for you to sign.
          </p>
        </Panel>
      ) : alreadyActed ? (
        <Panel>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            You have already {me.status} this document. Nothing further is needed from you.
          </p>
        </Panel>
      ) : !me.myTurn ? (
        <Panel>
          <div className="flex items-start gap-3">
            <Clock size={18} className="mt-0.5 shrink-0 text-slate-400" />
            <div>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100">It isn't your turn yet</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                This document is being signed in order, and it's currently with {me.waitingOn ?? "another party"}.
                You'll be emailed when it reaches you.
              </p>
            </div>
          </div>
        </Panel>
      ) : declining ? (
        <Panel>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Decline to sign</p>
          <p className="mt-1 text-xs text-slate-500">
            The sender will be told you declined. This closes the request for everybody.
          </p>
          <textarea
            className="mt-3 h-20 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            placeholder="Reason (optional, but helpful)" value={reason} onChange={(e) => setReason(e.target.value)} />
          {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
          <div className="mt-3 flex gap-2">
            <button onClick={doDecline} disabled={busy}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50">
              {busy ? "Sending…" : "Confirm decline"}
            </button>
            <button onClick={() => setDeclining(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300">Back</button>
          </div>
        </Panel>
      ) : (
        <Panel>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            {me.role === "approver" ? "Approve this document" : "Sign this document"}
          </p>
          <label className="mt-3 block text-xs font-medium text-slate-500">Type your full legal name</label>
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-lg text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
            placeholder="Your full name" value={name} onChange={(e) => setName(e.target.value)} />

          <label className="mt-4 flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
            <input type="checkbox" className="mt-0.5" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>
              I agree to sign this document electronically, and I intend my typed name above to be my
              signature and to have the same effect as a handwritten one.
            </span>
          </label>

          <div className="mt-3 flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-[11px] text-slate-500 dark:bg-slate-800/60">
            <ShieldCheck size={13} className="mt-0.5 shrink-0 text-slate-400" />
            <p>
              For evidence, we record your name, the date and time, your IP address and browser, and the
              fingerprint of the file above. Everyone on the request receives a copy of the completion
              certificate.
            </p>
          </div>

          {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}

          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={submit} disabled={busy || name.trim().length < 2 || !consent}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
              {busy ? "Signing…" : me.role === "approver" ? "Approve" : "Sign document"}
            </button>
            <button onClick={() => setDeclining(true)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:border-red-300 hover:text-red-600 dark:border-slate-700 dark:text-slate-300">
              Decline
            </button>
          </div>
        </Panel>
      )}
    </Shell>
  );
}
