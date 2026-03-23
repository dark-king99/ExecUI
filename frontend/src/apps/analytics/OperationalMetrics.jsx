import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody, CardHeader, Stat } from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import { Activity, AlertTriangle, CheckCircle, Clock } from "lucide-react";

const services = [
  { name: "API Gateway",      latency: "42ms", uptime: "99.91%", errors: "0.04%", status: "healthy" },
  { name: "Auth Service",     latency: "18ms", uptime: "99.99%", errors: "0.01%", status: "healthy" },
  { name: "CRM Backend",      latency: "120ms",uptime: "99.80%", errors: "0.12%", status: "warning" },
  { name: "Campaign Engine",  latency: "68ms", uptime: "99.95%", errors: "0.03%", status: "healthy" },
  { name: "Analytics Store",  latency: "210ms",uptime: "99.70%", errors: "0.20%", status: "warning" },
  { name: "Notification Svc", latency: "34ms", uptime: "100%",   errors: "0.00%", status: "healthy" },
];

const statusVariant = { healthy: "success", warning: "warning", critical: "danger" };

const recentEvents = [
  { time: "14:12", svc: "CRM Backend",    msg: "Latency spike +80ms — investigating",  type: "warning" },
  { time: "13:40", svc: "Analytics Store",msg: "Query timeout × 12 — cache miss",      type: "warning" },
  { time: "11:05", svc: "API Gateway",    msg: "Deploy completed — v2.14.1",           type: "info" },
  { time: "09:30", svc: "Auth Service",   msg: "Certificate renewed successfully",      type: "info" },
];

const eventColor = { warning: "text-amber-500", info: "text-indigo-400" };

export default function OperationalMetrics() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Operational Metrics"
        subtitle="Near real-time service health, latency, uptime and error rates"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Services Healthy" value="4/6"   icon={CheckCircle}  color="emerald" />
        <Stat label="Avg Latency"      value="82ms"  icon={Activity}     color="sky" />
        <Stat label="Avg Uptime"       value="99.89%" icon={Clock}       color="indigo" />
        <Stat label="Incidents Open"   value="2"     icon={AlertTriangle} color="amber" />
      </div>

      <Card>
        <CardHeader title="Service Health" icon={Activity} />
        <CardBody>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  {["Service", "Latency", "Uptime", "Error Rate", "Status"].map(h => (
                    <th key={h} className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {services.map(svc => (
                  <tr key={svc.name} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{svc.name}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{svc.latency}</td>
                    <td className="px-4 py-3">
                      <span className={`font-semibold ${parseFloat(svc.uptime) >= 99.9 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                        {svc.uptime}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{svc.errors}</td>
                    <td className="px-4 py-3"><StatusBadge label={svc.status} variant={statusVariant[svc.status]} dot /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Recent Events" icon={AlertTriangle} />
        <CardBody className="space-y-3">
          {recentEvents.map((e, i) => (
            <div key={i} className="flex gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
              <span className="text-xs text-slate-400 w-12 shrink-0">{e.time}</span>
              <span className="text-xs font-medium text-slate-500 w-28 shrink-0">{e.svc}</span>
              <span className={`text-xs ${eventColor[e.type]}`}>{e.msg}</span>
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}
