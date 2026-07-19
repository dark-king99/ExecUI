import { useMemo } from "react";
import { MapPinned, Server, Cloud, Activity } from "lucide-react";
import { useApi } from "../../../../hooks/useApi";
import { network } from "../../../../services/api";
import { SolutionShell, MetricGrid, Section, Loading, fmtNum } from "../../components/net-ui";

export default function Sites() {
  const { data: devices, loading } = useApi(() => network.devices.list({ limit: 500 }), [], { pollingInterval: 60000 });
  const all = devices ?? [];

  const sites = useMemo(() => {
    const map = {};
    all.forEach((d) => {
      const key = d.location && d.location !== "—" ? d.location : "Unassigned";
      if (!map[key]) map[key] = { name: key, total: 0, online: 0, offline: 0 };
      map[key].total++;
      if (d.status === "Online") map[key].online++;
      else if (d.status === "Offline") map[key].offline++;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [all]);

  const metrics = [
    { label: "Sites", value: fmtNum(sites.length), icon: MapPinned, color: "indigo" },
    { label: "Total Devices", value: fmtNum(all.length), icon: Server, color: "sky" },
    { label: "Online", value: fmtNum(all.filter((d) => d.status === "Online").length), icon: Activity, color: "emerald" },
    { label: "Cloud Devices", value: fmtNum(all.filter((d) => d.type === "cloud").length), icon: Cloud, color: "violet" },
  ];

  return (
    <SolutionShell solutionId="map" title="Sites" subtitle="Devices grouped by location and cloud region">
      <MetricGrid items={metrics} cols={4} loading={loading && all.length === 0} />

      {loading && all.length === 0 ? <Loading rows={6} /> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sites.map((s) => {
            const pct = s.total ? Math.round((s.online / s.total) * 100) : 0;
            return (
              <div key={s.name} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="h-9 w-9 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center"><MapPinned size={17} className="text-indigo-600 dark:text-indigo-400" /></div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate">{s.name}</h3>
                    <p className="text-xs text-slate-400">{fmtNum(s.total)} devices</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-500">Health</span>
                  <span className={`font-semibold ${pct >= 95 ? "text-emerald-600" : pct >= 80 ? "text-amber-600" : "text-red-600"}`}>{pct}% online</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div className={`h-full rounded-full ${pct >= 95 ? "bg-emerald-500" : pct >= 80 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${pct}%` }} />
                </div>
                <div className="flex items-center gap-3 mt-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> {s.online} up</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" /> {s.offline} down</span>
                </div>
              </div>
            );
          })}
          {sites.length === 0 && <div className="col-span-full py-10 text-center text-sm text-slate-400">No sites found.</div>}
        </div>
      )}
    </SolutionShell>
  );
}
