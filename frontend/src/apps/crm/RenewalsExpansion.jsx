import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody, CardHeader, Stat } from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import { RefreshCw, TrendingUp, AlertTriangle, DollarSign } from "lucide-react";

const renewals = [
  { account: "Solstice Energy",  arr: "$240k", health: "green",  daysLeft: 42,  expansion: "$60k",   status: "on-track" },
  { account: "Atlas Retail",     arr: "$180k", health: "yellow", daysLeft: 18,  expansion: "$0",     status: "at-risk" },
  { account: "Meridian Labs",    arr: "$320k", health: "green",  daysLeft: 71,  expansion: "$80k",   status: "on-track" },
  { account: "NordVentures",     arr: "$95k",  health: "red",    daysLeft: 8,   expansion: "$0",     status: "critical" },
  { account: "Osaka Digital",    arr: "$48k",  health: "green",  daysLeft: 120, expansion: "$24k",   status: "on-track" },
  { account: "CapitalGroup",     arr: "$520k", health: "yellow", daysLeft: 35,  expansion: "$150k",  status: "at-risk" },
];

const healthDot = { green: "bg-emerald-500", yellow: "bg-amber-500", red: "bg-red-500" };
const statusVariant = { "on-track": "success", "at-risk": "warning", critical: "danger" };

export default function RenewalsExpansion() {
  const atRisk   = renewals.filter(r => r.status !== "on-track").length;
  const totalARR = "$1.4M";
  const expPotential = "$314k";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Renewals & Expansion"
        subtitle="Contract milestones, health scores and expansion opportunity tracking"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Renewing ARR"       value={totalARR}     icon={DollarSign}  color="indigo" />
        <Stat label="Expansion Pipeline" value={expPotential} icon={TrendingUp}  color="emerald" />
        <Stat label="At Risk"            value={atRisk}       icon={AlertTriangle} color="amber" />
        <Stat label="Avg Days to Renew"  value="49"           icon={RefreshCw}   color="sky" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {renewals.map(r => (
          <Card key={r.account}>
            <CardBody>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`h-2.5 w-2.5 rounded-full ${healthDot[r.health]}`} />
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{r.account}</p>
                </div>
                <StatusBadge label={r.status.replace("-", " ")} variant={statusVariant[r.status]} />
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800">
                  <span className="block text-slate-400">ARR</span>
                  <span className="font-bold text-slate-900 dark:text-white">{r.arr}</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800">
                  <span className="block text-slate-400">Renews in</span>
                  <span className={`font-bold ${r.daysLeft <= 14 ? "text-red-600 dark:text-red-400" : r.daysLeft <= 30 ? "text-amber-600 dark:text-amber-400" : "text-slate-900 dark:text-white"}`}>
                    {r.daysLeft}d
                  </span>
                </div>
              </div>
              {r.expansion !== "$0" && (
                <div className="mt-3 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                    Expansion opportunity: {r.expansion}
                  </p>
                </div>
              )}
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
