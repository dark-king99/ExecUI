/**
 * Approvals inbox — what's waiting on me, what I've raised, and the full
 * history with every decision and comment.
 *
 * Authorization is the server's job: it only accepts a decision from an
 * approver on the *current* step. This page reflects that state rather than
 * deciding it, so what you can click always matches what will be allowed.
 */
import { useState, useEffect } from "react";
import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody } from "../../components/ui/Card";
import { useApi } from "../../hooks/useApi";
import { useToast } from "../../components/ui/Toast";
import { useUser } from "../../context/UserContext";
import { approvals } from "../../services/api";
import { Link } from "react-router-dom";
import useRecordParam from "../../hooks/useRecordParam";
import { linkToSubject } from "../../lib/recordLinks";
import {
  CheckCircle2, XCircle, Clock, ChevronRight, MessageSquare, RefreshCw,
  Inbox, ShieldCheck, Ban, User, FileText, ExternalLink,
} from "lucide-react";

const cls = (...a) => a.filter(Boolean).join(" ");
const when = (d) => (d ? new Date(d).toLocaleString() : "—");

const STATUS_STYLE = {
  pending:  "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  approved: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  rejected: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  cancelled:"bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
};
const STEP_STYLE = {
  approved: "border-emerald-400 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  pending:  "border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  rejected: "border-red-400 bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  waiting:  "border-slate-200 text-slate-400 dark:border-slate-700",
};

function Steps({ steps, currentStep }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {steps.map((s, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <span className={cls("rounded-full border px-2.5 py-1 text-[11px] font-medium", STEP_STYLE[s.status] || STEP_STYLE.waiting)}>
            {s.status === "approved" && <CheckCircle2 size={10} className="mr-1 inline" />}
            {s.status === "rejected" && <XCircle size={10} className="mr-1 inline" />}
            {s.status === "pending" && i === currentStep && <Clock size={10} className="mr-1 inline" />}
            {s.name}
            {s.approverNames?.length > 0 && (
              <span className="ml-1 opacity-70">· {s.approverNames.slice(0, 2).join(", ")}{s.approverNames.length > 2 ? ` +${s.approverNames.length - 2}` : ""}</span>
            )}
          </span>
          {i < steps.length - 1 && <ChevronRight size={12} className="text-slate-300" />}
        </div>
      ))}
    </div>
  );
}

function RequestCard({ r, meId, onDecide, onCancel, busy, highlighted = false }) {
  const [comment, setComment] = useState("");
  const [expanded, setExpanded] = useState(false);
  const subjectLink = linkToSubject(r.resource, r.recordId);
  const step = r.steps[r.currentStep];
  const canDecide =
    r.status === "pending" &&
    step?.approverIds?.includes(meId) &&
    !r.decisions.some((d) => d.stepIndex === r.currentStep && d.userId === meId);
  const isMine = r.requestedById === meId;

  useEffect(() => {
    if (highlighted) {
      document.getElementById(`approval-${r.id}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [highlighted, r.id]);

  return (
    <Card id={`approval-${r.id}`}
      className={highlighted ? "ring-2 ring-indigo-400/70 dark:ring-indigo-400/50" : undefined}>
      <CardBody className="space-y-3">
        <div className="flex flex-wrap items-start gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate font-semibold text-slate-900 dark:text-white">{r.title}</p>
              <span className={cls("rounded-full px-2 py-0.5 text-[10px] font-medium", STATUS_STYLE[r.status])}>{r.status}</span>
              {canDecide && <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">Awaiting you</span>}
            </div>
            {r.summary && <p className="mt-0.5 text-xs text-slate-500">{r.summary}</p>}
            <p className="mt-0.5 text-[11px] text-slate-400">
              {r.recordLabel && !subjectLink ? `${r.recordLabel} · ` : ""}Raised {when(r.createdAt)}
              {r.decidedAt ? ` · Decided ${when(r.decidedAt)}` : ""}
            </p>
            {/* You cannot sensibly approve what you cannot read. When the request
                is about a record, the record is one click away. */}
            {subjectLink && (
              <Link to={subjectLink}
                className="mt-1 inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-600 hover:text-indigo-500 dark:bg-indigo-500/10 dark:text-indigo-400">
                <FileText size={10} /> {r.recordLabel || "Open the record"}
                <ExternalLink size={9} className="opacity-60" />
              </Link>
            )}
          </div>
          {isMine && r.status === "pending" && (
            <button onClick={() => onCancel(r.id)} disabled={busy}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-500 hover:border-red-300 hover:text-red-600 disabled:opacity-50 dark:border-slate-700">
              <Ban size={12} /> Withdraw
            </button>
          )}
        </div>

        <Steps steps={r.steps} currentStep={r.currentStep} />

        {canDecide && (
          <div className="space-y-2 rounded-xl border border-indigo-200 bg-indigo-50/50 p-3 dark:border-indigo-500/30 dark:bg-indigo-500/5">
            <input
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              placeholder="Add a comment (optional)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <div className="flex gap-2">
              <button onClick={() => onDecide(r.id, "approve", comment)} disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50">
                <CheckCircle2 size={13} /> Approve
              </button>
              <button onClick={() => onDecide(r.id, "reject", comment)} disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-50">
                <XCircle size={13} /> Reject
              </button>
            </div>
          </div>
        )}

        {r.decisions.length > 0 && (
          <div>
            <button onClick={() => setExpanded(!expanded)} className="text-[11px] font-medium text-indigo-600 hover:underline dark:text-indigo-400">
              {expanded ? "Hide" : "Show"} {r.decisions.length} decision{r.decisions.length > 1 ? "s" : ""}
            </button>
            {expanded && (
              <ul className="mt-1.5 space-y-1">
                {r.decisions.map((d) => (
                  <li key={d.id} className="flex items-start gap-2 text-xs">
                    {d.decision === "approve"
                      ? <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-emerald-500" />
                      : <XCircle size={13} className="mt-0.5 shrink-0 text-red-500" />}
                    <span className="text-slate-600 dark:text-slate-300">
                      <strong>{d.userName || "Someone"}</strong> {d.decision}d
                      <span className="text-slate-400"> · {when(d.createdAt)}</span>
                      {d.comment && <span className="block text-slate-500"><MessageSquare size={10} className="mr-1 inline" />{d.comment}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

export default function Approvals() {
  const toast = useToast();
  const { user } = useUser();
  const [busy, setBusy] = useState(false);

  // A record links here to show its own sign-off. That request may well not be
  // one of *mine*, so the deep link switches to the full list — otherwise the
  // link would land on an inbox that legitimately doesn't contain it.
  const [requestId] = useRecordParam("request");
  // Followed from a workflow: show only what that rule raised.
  const [workflowId, setWorkflowId] = useRecordParam("workflow");
  const [tab, setTab] = useState(requestId || workflowId ? "all" : "mine");

  const { data: mine, refetch: refetchMine } = useApi(() => approvals.list({ mine: true }), [], { cacheKey: "approvals:mine", pollingInterval: 60000 });
  const { data: all, refetch: refetchAll } = useApi(
    () => approvals.list({ limit: 100, workflowId: workflowId || undefined }), [workflowId],
  );

  const refresh = () => { refetchMine(); refetchAll(); };

  const decide = async (id, decision, comment) => {
    setBusy(true);
    try {
      const r = await approvals.decide(id, { decision, comment: comment || undefined });
      toast.success?.(r.status === "pending" ? "Recorded — moved to the next step." : `Request ${r.status}.`);
      refresh();
    } catch (e) { toast.error?.(e.message); } finally { setBusy(false); }
  };

  const cancel = async (id) => {
    if (!window.confirm("Withdraw this approval request?")) return;
    setBusy(true);
    try { await approvals.cancel(id); toast.success?.("Withdrawn."); refresh(); }
    catch (e) { toast.error?.(e.message); } finally { setBusy(false); }
  };

  const list = tab === "mine" ? mine : all;
  const meId = user?.id;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Approvals"
        subtitle="Sign-off requests raised by automations or by your colleagues."
        actions={
          <button onClick={refresh} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-800 dark:border-slate-700">
            <RefreshCw size={13} /> Refresh
          </button>
        }
      />

      <div className="mb-4 flex rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
        {[["mine", `Awaiting me${mine?.length ? ` (${mine.length})` : ""}`, Inbox], ["all", "All requests", ShieldCheck]].map(([id, label, Icon]) => (
          <button key={id} onClick={() => setTab(id)}
            className={cls("inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition",
              tab === id ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300")}>
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {!list?.length ? (
        <Card><CardBody>
          <div className="py-14 text-center text-sm text-slate-400">
            <CheckCircle2 size={26} className="mx-auto mb-2 opacity-40" />
            {tab === "mine" ? "Nothing is waiting on you right now." : "No approval requests yet."}
          </div>
        </CardBody></Card>
      ) : (
        <div className="space-y-3">
          {workflowId && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-indigo-300 bg-indigo-50 p-2.5 text-[11px] text-indigo-800 dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-indigo-200">
              <span>Showing only the approvals raised by one workflow.</span>
              <button onClick={() => setWorkflowId(null)}
                className="rounded-lg border border-indigo-400 px-2 py-1 font-medium hover:bg-indigo-100 dark:border-indigo-500/50 dark:hover:bg-indigo-500/20">
                Show everything
              </button>
            </div>
          )}
          {list.map((r) => (
            <RequestCard key={r.id} r={r} meId={meId} onDecide={decide} onCancel={cancel} busy={busy}
              highlighted={r.id === requestId} />
          ))}
        </div>
      )}

      <p className="mt-4 flex items-start gap-2 text-[11px] text-slate-400">
        <User size={12} className="mt-0.5 shrink-0" />
        Approvers are locked in when a request is raised, so a later change of role or department never rewrites an in-flight approval.
      </p>
    </div>
  );
}
