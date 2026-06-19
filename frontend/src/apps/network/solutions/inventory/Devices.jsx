import { useState, useMemo } from "react";
import { Boxes, Search, RefreshCw, Wifi, WifiOff, AlertTriangle } from "lucide-react";
import StatusBadge from "../../../../components/ui/StatusBadge";
import { useApi } from "../../../../hooks/useApi";
import { network } from "../../../../services/api";
import { SolutionShell, MetricGrid, Section, Loading, ErrorNote, UtilBar, Pill, fmtNum } from "../../components/net-ui";

const STATUS_VARIANT = { Online: "success", Offline: "danger", Warning: "warning" };
const TYPES = ["all", "server", "endpoint", "cloud", "router", "switch", "firewall"];

export default function Devices() {
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const { data: devices, loading, error, refetch } = useApi(() => network.devices.list({ limit: 500 }), [], { pollingInterval: 60000 });

  const all = devices ?? [];
  const filtered = useMemo(() => all.filter((d) => {
    const mt = type === "all" || d.type === type;
    const mq = !search || d.name?.toLowerCase().includes(search.toLowerCase()) || d.ip?.includes(search);
    return mt && mq;
  }), [all, search, type]);

  const metrics = [
    { label: "Devices", value: fmtNum(all.length), icon: Boxes, color: "sky" },
    { label: "Online", value: fmtNum(all.filter((d) => d.status === "Online").length), icon: Wifi, color: "emerald" },
    { label: "Warning", value: fmtNum(all.filter((d) => d.status === "Warning").length), icon: AlertTriangle, color: "amber" },
    { label: "Offline", value: fmtNum(all.filter((d) => d.status === "Offline").length), icon: WifiOff, color: "red" },
  ];

  return (
    <SolutionShell solutionId="inventory" title="Devices" subtitle="Every managed device auto-discovered on your network"
      actions={<button onClick={refetch} className="flex items-center gap-1.5 text-xs border border-slate-200 dark:border-slate-700 text-slate-500 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"><RefreshCw size={13} /> Rescan</button>}>
      <ErrorNote error={error} />
      <MetricGrid items={metrics} cols={4} loading={loading && all.length === 0} />

      <Section title={`${fmtNum(filtered.length)} Devices`} pad={false}
        actions={
          <div className="flex items-center gap-1.5 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 bg-white dark:bg-slate-900">
            <Search size={13} className="text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="text-sm bg-transparent outline-none text-slate-900 dark:text-white w-28" />
          </div>
        }>
        <div className="px-5 pt-3 flex gap-1.5 flex-wrap">
          {TYPES.map((t) => (
            <button key={t} onClick={() => setType(t)} className={`text-xs px-2.5 py-1 rounded-full border capitalize transition ${type === t ? "bg-sky-600 text-white border-sky-600" : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-sky-400"}`}>{t}</button>
          ))}
        </div>
        {loading && all.length === 0 ? <div className="p-3"><Loading table /></div> : (
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  {["Device", "Type", "Location", "CPU", "Memory", "Status"].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="py-10 text-center text-sm text-slate-500">No devices found.</td></tr>
                ) : filtered.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="px-5 py-3">
                      <div className="font-medium text-slate-900 dark:text-white">{d.name}</div>
                      <div className="text-xs text-slate-400">{d.ip}{d.os ? ` · ${d.os}` : ""}</div>
                    </td>
                    <td className="px-5 py-3"><Pill color="sky">{d.type}</Pill></td>
                    <td className="px-5 py-3 text-slate-500">{d.location}</td>
                    <td className="px-5 py-3">{d.cpu_util != null ? <UtilBar value={d.cpu_util} /> : "—"}</td>
                    <td className="px-5 py-3">{d.mem_util != null ? <UtilBar value={d.mem_util} /> : "—"}</td>
                    <td className="px-5 py-3"><StatusBadge label={d.status} variant={STATUS_VARIANT[d.status] ?? "neutral"} dot /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </SolutionShell>
  );
}
