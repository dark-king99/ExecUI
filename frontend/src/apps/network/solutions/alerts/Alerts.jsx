import { useState, useMemo } from "react";
import { Bell, Check, CheckCheck, AlertOctagon, AlertTriangle } from "lucide-react";
import StatusBadge from "../../../../components/ui/StatusBadge";
import { useToast } from "../../../../components/ui/Toast";
import { useApi, useMutation } from "../../../../hooks/useApi";
import { network } from "../../../../services/api";
import { Link } from "react-router-dom";
import { linkTo } from "../../../../lib/recordLinks";
import useRecordParam from "../../../../hooks/useRecordParam";
import { SolutionShell, MetricGrid, Section, Loading, ErrorNote, Pill, fmtNum, timeAgo } from "../../components/net-ui";
import useRecordFocus from "../../../../hooks/useRecordFocus";

const SEV_COLOR = { critical: "red", warning: "amber", info: "sky" };
const STATUS_VARIANT = { open: "danger", acknowledged: "warning", resolved: "success" };
const FILTERS = ["all", "open", "acknowledged", "resolved"];

export default function Alerts() {
  // An alert followed from global search lands on its row.
  const focus = useRecordFocus();
  // Followed from a device: show only what that device is reporting.
  const [deviceId, setDeviceId] = useRecordParam("device");
  const toast = useToast();
  const [filter, setFilter] = useState("all");
  const { data: alerts, loading, error, refetch } = useApi(() => network.alerts.list({ take: 100 }), [], { pollingInterval: 30000 });
  const { mutate: ack } = useMutation((id) => network.alerts.acknowledge(id), { onSuccess: () => { toast({ message: "Alert acknowledged", type: "success" }); refetch(); } });
  const { mutate: resolve } = useMutation((id) => network.alerts.resolve(id), { onSuccess: () => { toast({ message: "Alert resolved", type: "success" }); refetch(); } });

  const all = alerts ?? [];
  const filtered = useMemo(() => {
    const byStatus = filter === "all" ? all : all.filter((a) => a.status === filter);
    return deviceId ? byStatus.filter((a) => a.deviceId === deviceId) : byStatus;
  }, [all, filter, deviceId]);
  const deviceName = filtered[0]?.device?.hostname ?? filtered[0]?.device?.ip_address ?? null;

  const metrics = [
    { label: "Total Alerts", value: fmtNum(all.length), icon: Bell, color: "rose" },
    { label: "Open", value: fmtNum(all.filter((a) => a.status === "open").length), icon: AlertTriangle, color: "amber" },
    { label: "Critical", value: fmtNum(all.filter((a) => a.severity === "critical" && a.status !== "resolved").length), icon: AlertOctagon, color: "red" },
    { label: "Resolved", value: fmtNum(all.filter((a) => a.status === "resolved").length), icon: CheckCheck, color: "emerald" },
  ];

  return (
    <SolutionShell solutionId="alerts" title="Alerts" subtitle="Real-time alerts across your monitored estate">
      <ErrorNote error={error} />
      <MetricGrid items={metrics} cols={4} loading={loading && all.length === 0} />

      <Section title="Alert Stream" icon={Bell} pad={false}
        actions={
          <div className="flex gap-1.5">
            {FILTERS.map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={`text-xs px-2.5 py-1 rounded-full border capitalize transition ${filter === f ? "bg-rose-600 text-white border-rose-600" : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-rose-400"}`}>{f}</button>
            ))}
          </div>
        }>
        {deviceId && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sky-200 bg-sky-50 px-5 py-2 text-[11px] text-sky-800 dark:border-sky-500/40 dark:bg-sky-500/10 dark:text-sky-200">
            <span>Showing only alerts from {deviceName ? <strong>{deviceName}</strong> : "one device"}.</span>
            <button onClick={() => setDeviceId(null)}
              className="rounded-lg border border-sky-400 px-2 py-0.5 font-medium hover:bg-sky-100 dark:border-sky-500/50 dark:hover:bg-sky-500/20">
              Show all alerts
            </button>
          </div>
        )}
        {loading && all.length === 0 ? <Loading table /> : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.length === 0 ? <div className="py-10 text-center text-sm text-slate-400">No alerts.</div> : filtered.map((a) => (
              <div key={a.id} data-record-id={a.id} className={focus.className(a.id, "px-5 py-3 flex items-center gap-3")}>
                <span className={`h-2 w-2 rounded-full shrink-0 ${a.severity === "critical" ? "bg-red-500" : a.severity === "warning" ? "bg-amber-500" : "bg-sky-500"}`} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-slate-900 dark:text-white truncate">{a.title ?? a.message}</div>
                  {/* An alert is about a device. Printing the hostname and making
                      the reader go and find it in the inventory is the difference
                      between a monitoring tool and a list of complaints. */}
                  <div className="text-xs text-slate-400 truncate">
                    {a.deviceId ? (
                      <Link to={linkTo("device", a.deviceId)}
                        className="text-sky-600 hover:text-sky-500 dark:text-sky-400">
                        {a.device?.hostname ?? a.device?.ip_address ?? "device"}
                      </Link>
                    ) : (a.device?.hostname ?? a.device?.ip_address ?? "—")}
                    {" · "}{timeAgo(a.createdAt)}
                  </div>
                </div>
                <Pill color={SEV_COLOR[a.severity] ?? "slate"}>{a.severity}</Pill>
                <StatusBadge label={a.status} variant={STATUS_VARIANT[a.status] ?? "neutral"} />
                <div className="flex items-center gap-1.5 shrink-0">
                  {a.status === "open" && <button onClick={() => ack(a.id)} title="Acknowledge" className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition"><Check size={14} /></button>}
                  {a.status !== "resolved" && <button onClick={() => resolve(a.id)} title="Resolve" className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition"><CheckCheck size={14} /></button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </SolutionShell>
  );
}
