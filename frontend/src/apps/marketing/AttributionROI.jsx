import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody, CardHeader, Stat } from "../../components/ui/Card";
import { DollarSign, TrendingUp, Users, Target } from "lucide-react";

const channels = [
  { name: "Email",          revenue: "$420k", spend: "$28k",  roas: 15.0, cac: "$48",  touches: 1840 },
  { name: "LinkedIn Ads",   revenue: "$310k", spend: "$62k",  roas: 5.0,  cac: "$142", touches: 980 },
  { name: "Google Search",  revenue: "$280k", spend: "$41k",  roas: 6.8,  cac: "$98",  touches: 1210 },
  { name: "Content / SEO",  revenue: "$190k", spend: "$18k",  roas: 10.6, cac: "$62",  touches: 2400 },
  { name: "Events",         revenue: "$145k", spend: "$34k",  roas: 4.3,  cac: "$210", touches: 420 },
  { name: "Paid Social",    revenue: "$88k",  spend: "$22k",  roas: 4.0,  cac: "$180", touches: 760 },
];

const totalRevenue = "$1.43M";
const totalSpend   = "$205k";

export default function AttributionROI() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Attribution & ROI"
        subtitle="Multi-touch attribution, CAC / LTV dashboards and channel mix analysis"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Attributed Revenue" value={totalRevenue} icon={DollarSign}  color="indigo" delta={22} />
        <Stat label="Total Spend"        value={totalSpend}   icon={Target}      color="amber" />
        <Stat label="Blended ROAS"       value="6.97x"        icon={TrendingUp}  color="emerald" delta={11} />
        <Stat label="Blended CAC"        value="$104"         icon={Users}       color="sky" delta={-8} />
      </div>

      <Card>
        <CardHeader title="Channel Attribution (Linear Multi-Touch)" icon={TrendingUp} />
        <CardBody className="space-y-4">
          {channels.map(ch => {
            const revNum  = parseFloat(ch.revenue.replace(/[$k]/g, "")) * (ch.revenue.includes("k") ? 1000 : 1);
            const maxRev  = 420000;
            const pct     = Math.round((revNum / maxRev) * 100);
            return (
              <div key={ch.name} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700 dark:text-slate-300 w-36">{ch.name}</span>
                  <div className="flex gap-4 text-xs text-slate-500">
                    <span>Revenue: <strong className="text-slate-800 dark:text-slate-200">{ch.revenue}</strong></span>
                    <span>ROAS: <strong className="text-emerald-600 dark:text-emerald-400">{ch.roas}x</strong></span>
                    <span>CAC: <strong className="text-slate-800 dark:text-slate-200">{ch.cac}</strong></span>
                  </div>
                </div>
                <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Attribution Models" icon={Target} />
          <CardBody className="space-y-2">
            {[
              { model: "First Touch",       top: "Content / SEO",  rev: "$380k" },
              { model: "Last Touch",        top: "Email",           rev: "$490k" },
              { model: "Linear",            top: "Email",           rev: "$420k" },
              { model: "Time Decay",        top: "Email",           rev: "$440k" },
              { model: "Data-Driven (AI)",  top: "Google Search",   rev: "$310k" },
            ].map(m => (
              <div key={m.model} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                <span className="text-sm text-slate-700 dark:text-slate-300">{m.model}</span>
                <div className="text-right text-xs">
                  <p className="font-semibold text-slate-900 dark:text-white">{m.rev}</p>
                  <p className="text-slate-400">Top: {m.top}</p>
                </div>
              </div>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="LTV / CAC Ratio by Segment" icon={DollarSign} />
          <CardBody className="space-y-3">
            {[
              { segment: "Enterprise",  ltv: "$8,400",  cac: "$420", ratio: 20 },
              { segment: "Mid-Market",  ltv: "$3,200",  cac: "$210", ratio: 15 },
              { segment: "SMB",         ltv: "$1,100",  cac: "$98",  ratio: 11 },
              { segment: "Trial Conv.", ltv: "$2,400",  cac: "$142", ratio: 17 },
            ].map(s => (
              <div key={s.segment} className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{s.segment}</p>
                  <p className="text-xs text-slate-400">LTV {s.ltv} · CAC {s.cac}</p>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-bold ${s.ratio >= 15 ? "text-emerald-600 dark:text-emerald-400" : s.ratio >= 10 ? "text-amber-600 dark:text-amber-400" : "text-red-500"}`}>
                    {s.ratio}x
                  </p>
                  <p className="text-xs text-slate-400">LTV:CAC</p>
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
