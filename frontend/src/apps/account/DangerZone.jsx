/**
 * Deleting the organization.
 *
 * The UI's job is to make the consequence impossible to miss before the action
 * is possible at all — so it leads with the real row counts from the server,
 * offers the export, and only then accepts the typed name. It never claims to
 * have deleted anything: the request schedules a purge, and the panel switches
 * to showing the deadline and a way out.
 *
 * The server enforces all of this independently. Nothing here is the guard.
 */
import { useState } from "react";
import { AlertTriangle, Download, Trash2, Undo2, Scale, Clock } from "lucide-react";
import { Card, CardHeader, CardBody } from "../../components/ui/Card";
import { useToast } from "../../components/ui/Toast";
import { useApi, useMutation } from "../../hooks/useApi";
import { enterprise } from "../../services/api";

const when = (d) =>
  d ? new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }) : "—";
const daysLeft = (d) => Math.max(0, Math.ceil((new Date(d) - Date.now()) / 86_400_000));

export default function DangerZone({ orgName }) {
  const toast = useToast();
  const { data: status, refetch } = useApi(() => enterprise.deletion.status(), []);
  const { data: preview } = useApi(() => enterprise.deletion.preview(), []);
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [reason, setReason] = useState("");
  const [downloading, setDownloading] = useState(false);

  const { mutate: request, loading: requesting } = useMutation(
    (d) => enterprise.deletion.request(d),
    {
      onSuccess: () => { toast({ message: "Deletion scheduled", type: "success" }); setOpen(false); setTyped(""); refetch(); },
      onError: (e) => toast({ message: e?.message ?? "Failed", type: "error" }),
    },
  );
  const { mutate: cancel, loading: cancelling } = useMutation(() => enterprise.deletion.cancel(), {
    onSuccess: () => { toast({ message: "Deletion cancelled", type: "success" }); refetch(); },
    onError: (e) => toast({ message: e?.message ?? "Failed", type: "error" }),
  });

  const download = async () => {
    setDownloading(true);
    try {
      const { filename } = await enterprise.deletion.download();
      toast({ message: `Downloaded ${filename}`, type: "success" });
    } catch (e) {
      toast({ message: e?.message ?? "Export failed", type: "error" });
    } finally {
      setDownloading(false);
    }
  };

  const holds = status?.blockingHolds ?? [];
  const name = orgName ?? status?.name ?? "";

  // ── Already scheduled ──────────────────────────────────────────────────────
  if (status?.pending) {
    return (
      <Card className="border-red-300 dark:border-red-500/40">
        <CardHeader title="Deletion scheduled" icon={Clock} />
        <CardBody className="space-y-3">
          <div className="rounded-xl border border-red-300 bg-red-50 p-4 dark:border-red-500/40 dark:bg-red-500/10">
            <p className="text-sm font-semibold text-red-700 dark:text-red-300">
              This organization is scheduled for deletion on {when(status.scheduledFor)}.
            </p>
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
              {daysLeft(status.scheduledFor)} day{daysLeft(status.scheduledFor) === 1 ? "" : "s"} left. Everything is
              still here until then, and cancelling costs nothing.
              {status.reason ? ` Reason given: “${status.reason}”.` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => cancel()} disabled={cancelling}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-2 text-sm text-white transition hover:bg-slate-900 disabled:opacity-50 dark:bg-slate-200 dark:text-slate-900">
              <Undo2 size={14} /> {cancelling ? "Cancelling…" : "Cancel deletion"}
            </button>
            <button onClick={download} disabled={downloading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
              <Download size={14} /> {downloading ? "Preparing…" : "Download a copy first"}
            </button>
          </div>
        </CardBody>
      </Card>
    );
  }

  // ── Not scheduled ──────────────────────────────────────────────────────────
  return (
    <Card className="border-red-200 dark:border-red-500/30">
      <CardHeader title="Delete this organization" subtitle="Removes every record belonging to it" icon={AlertTriangle} />
      <CardBody className="space-y-4">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          This deletes the whole organization — every employee account, and every record in every module.
          It runs after a {status?.graceDays ?? 30}-day grace period, during which any admin can cancel.
          After that it cannot be undone.
        </p>

        {preview?.total > 0 && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              {preview.total.toLocaleString()} records across {preview.tables} tables would be destroyed
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
              {Object.entries(preview.counts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 8)
                .map(([m, n]) => `${m} (${n})`)
                .join(" · ")}
              {Object.keys(preview.counts).length > 8 ? " …" : ""}
            </p>
          </div>
        )}

        {holds.length > 0 && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
            <Scale size={14} className="mt-0.5 shrink-0" />
            <span>
              A legal hold is in force ({holds.map((h) => h.name).join(", ")}). Deletion is refused until it&apos;s
              released — that is what a hold is for.
            </span>
          </div>
        )}

        <button onClick={download} disabled={downloading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
          <Download size={14} /> {downloading ? "Preparing…" : "Download a copy of everything first"}
        </button>

        {!open ? (
          <div>
            <button onClick={() => setOpen(true)} disabled={holds.length > 0}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-500/40 dark:text-red-400 dark:hover:bg-red-500/10">
              <Trash2 size={14} /> Delete this organization
            </button>
          </div>
        ) : (
          <div className="space-y-3 rounded-xl border border-red-300 bg-red-50/50 p-4 dark:border-red-500/40 dark:bg-red-500/5">
            <div>
              <label htmlFor="confirm-org" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Type <span className="font-mono font-semibold">{name}</span> to confirm
              </label>
              <input id="confirm-org" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off"
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white" />
            </div>
            <div>
              <label htmlFor="del-reason" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Reason (optional, recorded in the audit log)
              </label>
              <input id="del-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white" />
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <button onClick={() => { setOpen(false); setTyped(""); }}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                Cancel
              </button>
              <button
                onClick={() => request({ confirmName: typed, reason })}
                disabled={requesting || typed.trim().toLowerCase() !== name.trim().toLowerCase()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                <Trash2 size={14} /> {requesting ? "Scheduling…" : `Schedule deletion in ${status?.graceDays ?? 30} days`}
              </button>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
