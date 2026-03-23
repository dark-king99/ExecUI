import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody, CardHeader, Stat } from "../../components/ui/Card";
import { BarChart3, TrendingUp, Users, DollarSign, Mail, Globe } from "lucide-react";

const monthlyData = [
  { month: "Oct", leads: 840,  revenue: 310, spend: 48 },
  { month: "Nov", leads: 920,  revenue: 380, spend: 52 },
  { month: "Dec", leads: 760,  revenue: 290, spend: 44 },
  { month: "Jan", leads: 1040, revenue: 420, spend: 58 },
  { month: "Feb", leads: 1180, revenue: 490, spend: 61 },
  { month: "Mar", leads: 1320, revenue: 580, spend: 65 },
];

const channelPerf = [
  { channel: "Email",         openRate: "32%",  clickRate: "4.8%", convRate: "2.1%", color: "bg-indigo-500" },
  { channel: "LinkedIn Ads",  openRate: "—",    clickRate: "1.2%", convRate: "0.8%", color: "bg-sky-500" },
  { channel: "Content/SEO",   openRate: "—",    clickRate: "—",    convRate: "3.4%", color: "bg-emerald-500" },
  { channel: "Google Ads",    openRate: "—",    clickRate: "3.1%", convRate: "1.9%", color: "bg-amber-500" },
  { channel: "Paid Social",   openRate: "—",    clickRate: "1.8%", convRate: "0.6%", color: "bg-rose-500" },
];

const maxLeads = Math.max(...monthlyData.map(d => d.leads));

export default function MarketingAnalytics() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Marketing Analytics"
        subtitle="Executive and operator views — leads, revenue, channel performance and ROI drill-down"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Leads (MTD)"     value="1,320" icon={Users}     color="indigo" delta={12} />
        <Stat label="Pipeline (MTD)"  value="$580k" icon={DollarSign} color="sky"   delta={18} />
        <Stat label="Email Open Rate" value="32%"   icon={Mail}      color="emerald" delta={3} />
        <Stat label="MQL → SQL"       value="38%"   icon={TrendingUp} color="amber" delta={-2} />
      </div>

      {/* Lead & Revenue trend */}
      <Card>
        <CardHeader title="Lead & Revenue Trend (6 months)" icon={BarChart3} />
        <CardBody>
          <div className="flex items-end gap-3 h-40">
            {monthlyData.map(d => (
              <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex items-end gap-0.5 h-32">
                  <div
                    className="flex-1 bg-indigo-500 rounded-t"
                    style={{ height: `${(d.leads / maxLeads) * 100}%` }}
                    title={`Leads: ${d.leads}`}
                  />
                  <div
                    className="flex-1 bg-emerald-400 rounded-t opacity-70"
                    style={{ height: `${(d.revenue / 580) * 100}%` }}
                    title={`Revenue: $${d.revenue}k`}
                  />
                </div>
                <span className="text-xs text-slate-400">{d.month}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-indigo-500" />Leads</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-emerald-400" />Revenue ($k)</span>
          </div>
        </CardBody>
      </Card>

      {/* Channel Performance */}
      <Card>
        <CardHeader title="Channel Performance" icon={Globe} />
        <CardBody className="space-y-3">
          {channelPerf.map(ch => (
            <div key={ch.channel} className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
              <div className={`h-3 w-3 rounded-full ${ch.color} shrink-0`} />
              <span className="w-32 text-sm font-medium text-slate-700 dark:text-slate-300">{ch.channel}</span>
              <div className="flex gap-6 text-xs text-slate-500 flex-1">
                {ch.openRate !== "—" && <span>Open: <strong className="text-slate-800 dark:text-slate-200">{ch.openRate}</strong></span>}
                <span>CTR: <strong className="text-slate-800 dark:text-slate-200">{ch.clickRate}</strong></span>
                <span>Conv: <strong className="text-emerald-600 dark:text-emerald-400">{ch.convRate}</strong></span>
              </div>
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}
