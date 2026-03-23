import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody, CardHeader, Stat } from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import { ScreenShareIcon, DollarSign, Users, TrendingUp, Plus } from "lucide-react";

const campaigns = [
  { name: "Q1 Enterprise Push",      channel: "Email + LinkedIn", status: "active",   budget: "$45k", spent: "$28k", leads: 184, ctr: "4.2%" },
  { name: "Product Launch – EMMA v2", channel: "Multi-channel",   status: "active",   budget: "$80k", spent: "$61k", leads: 312, ctr: "6.8%" },
  { name: "Summer Retargeting",       channel: "Display + Social", status: "scheduled",budget: "$30k", spent: "$0",  leads: 0,   ctr: "—" },
  { name: "SMB Awareness Wave",       channel: "Email + Ads",     status: "paused",   budget: "$20k", spent: "$18k", leads: 94,  ctr: "2.9%" },
  { name: "Partner Co-Marketing",     channel: "Events + Email",   status: "active",   budget: "$55k", spent: "$41k", leads: 208, ctr: "5.1%" },
];

const statusVariant = { active: "success", scheduled: "info", paused: "warning", completed: "neutral" };

function BudgetPacing({ budget, spent }) {
  const bNum = parseFloat(budget.replace(/[$k]/g, "")) * (budget.includes("k") ? 1000 : 1);
  const sNum = parseFloat(spent.replace(/[$k]/g, "")) * (spent.includes("k") ? 1000 : 1);
  const pct  = spent === "$0" ? 0 : Math.round((sNum / bNum) * 100);
  const color = pct > 85 ? "bg-red-500" : pct > 65 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-slate-500">
        <span>{spent}</span><span>{budget}</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function CampaignOverview() {
  const active = campaigns.filter(c => c.status === "active").length;
  const totalLeads = campaigns.reduce((s, c) => s + c.leads, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Campaign Overview"
        subtitle="Status, budget pacing, channel mix and timeline across all campaigns"
        actions={
          <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg transition">
            <Plus size={15} /> New Campaign
          </button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Active Campaigns" value={active}     icon={ScreenShareIcon} color="indigo" />
        <Stat label="Total Leads"      value={totalLeads} icon={Users}           color="sky" delta={14} />
        <Stat label="Avg CTR"          value="4.8%"       icon={TrendingUp}      color="emerald" delta={8} />
        <Stat label="Budget Spent"     value="$148k"      icon={DollarSign}      color="amber" />
      </div>

      <Card>
        <CardHeader title="All Campaigns" icon={ScreenShareIcon} />
        <CardBody className="space-y-3">
          {campaigns.map(c => (
            <div key={c.name} className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 transition">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{c.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{c.channel}</p>
                </div>
                <StatusBadge label={c.status} variant={statusVariant[c.status]} dot />
              </div>
              <div className="grid grid-cols-3 gap-4 text-xs text-slate-500 mb-3">
                <div><span className="font-semibold text-slate-800 dark:text-slate-200 block">{c.leads}</span>Leads</div>
                <div><span className="font-semibold text-slate-800 dark:text-slate-200 block">{c.ctr}</span>CTR</div>
                <div><span className="font-semibold text-slate-800 dark:text-slate-200 block">{c.spent}</span>Spent</div>
              </div>
              <BudgetPacing budget={c.budget} spent={c.spent} />
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}
