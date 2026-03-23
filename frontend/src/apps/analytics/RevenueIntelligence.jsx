import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody, CardHeader, Stat } from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import { DollarSign, TrendingUp, Users, RefreshCw } from "lucide-react";

const segments = [
  { name: "Enterprise",  arr: "$2.1M",  growth: 22,  churn: "0.8%",  nrr: "124%",  health: "green" },
  { name: "Mid-Market",  arr: "$1.4M",  growth: 16,  churn: "2.1%",  nrr: "112%",  health: "green" },
  { name: "SMB",         arr: "$0.7M",  growth: 8,   churn: "4.4%",  nrr: "96%",   health: "yellow" },
  { name: "Trial Conv.", arr: "$420k",  growth: 34,  churn: "—",     nrr: "—",     health: "green" },
];

const healthColor = { green: "text-emerald-500", yellow: "text-amber-500", red: "text-red-500" };

const expansionOpp = [
  { account: "Solstice Energy",  arr: "$240k", upside: "$60k",  product: "Analytics Add-on",   probability: 82 },
  { account: "Meridian Labs",    arr: "$320k", upside: "$80k",  product: "Network Expansion",   probability: 71 },
  { account: "CapitalGroup",     arr: "$520k", upside: "$150k", product: "Enterprise Suite",    probability: 64 },
  { account: "Atlas Retail",     arr: "$180k", upside: "$40k",  product: "Marketing Module",    probability: 55 },
];

export default function RevenueIntelligence() {
  return (
    <div className="space-y-6">
      <PageHeader title="Revenue Intelligence" subtitle="ARR breakdown, NRR, expansion pipeline and upsell signals" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Total ARR"      value="$4.2M"  icon={DollarSign}  color="indigo" delta={18} />
        <Stat label="NRR"            value="114%"   icon={TrendingUp}  color="emerald" delta={4} />
        <Stat label="Expansion ARR"  value="$330k"  icon={RefreshCw}   color="sky" />
        <Stat label="Gross Churn"    value="1.9%"   icon={Users}       color="amber" delta={-3} />
      </div>

      <Card>
        <CardHeader title="ARR by Segment" icon={DollarSign} />
        <CardBody className="space-y-4">
          {segments.map(seg => (
            <div key={seg.name} className="p-4 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${
                    seg.health === "green" ? "bg-emerald-500" : seg.health === "yellow" ? "bg-amber-500" : "bg-red-500"
                  }`} />
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{seg.name}</p>
                </div>
                <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{seg.arr}</span>
              </div>
              <div className="grid grid-cols-4 gap-3 text-xs text-slate-500">
                <div><p className="font-semibold text-slate-800 dark:text-slate-200">+{seg.growth}%</p>YoY Growth</div>
                <div><p className="font-semibold text-slate-800 dark:text-slate-200">{seg.churn}</p>Gross Churn</div>
                <div><p className={`font-semibold ${seg.nrr !== "—" && parseFloat(seg.nrr) >= 100 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>{seg.nrr}</p>NRR</div>
              </div>
            </div>
          ))}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Expansion Pipeline" icon={TrendingUp} />
        <CardBody className="space-y-3">
          {expansionOpp.map(exp => (
            <div key={exp.account} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{exp.account}</p>
                <p className="text-xs text-slate-400 mt-0.5">{exp.product} · Current ARR: {exp.arr}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{exp.upside}</p>
                <p className="text-xs text-slate-400">{exp.probability}% probability</p>
              </div>
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}
