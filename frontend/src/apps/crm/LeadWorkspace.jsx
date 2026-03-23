import { useState } from "react";
import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody, CardHeader, Stat } from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import DataTable from "../../components/ui/DataTable";
import { UserPlus, Mail, Phone, Calendar, Star, Plus } from "lucide-react";

const leads = [
  { name: "Priya Nair",      company: "Solstice Energy",    score: 92, stage: "Qualified",    source: "Inbound",  lastContact: "1h ago",   owner: "J. Torres" },
  { name: "Carlos Mendes",   company: "Atlas Retail",       score: 78, stage: "Contacted",    source: "LinkedIn", lastContact: "3h ago",   owner: "M. Patel" },
  { name: "Amara Osei",      company: "Meridian Labs",      score: 65, stage: "New",          source: "Referral", lastContact: "1d ago",   owner: "S. Lee" },
  { name: "Thomas Kraft",    company: "NordVentures",       score: 88, stage: "Demo Booked",  source: "Campaign", lastContact: "2h ago",   owner: "J. Torres" },
  { name: "Yuna Hayashi",    company: "Osaka Digital",      score: 45, stage: "New",          source: "Website",  lastContact: "3d ago",   owner: "A. Kim" },
  { name: "Diego Ruiz",      company: "CapitalGroup",       score: 71, stage: "Contacted",    source: "Outbound", lastContact: "2d ago",   owner: "M. Patel" },
];

const stageVariant = {
  "New": "neutral", "Contacted": "info", "Qualified": "success", "Demo Booked": "indigo",
};

function ScoreBadge({ score }) {
  const color = score >= 80 ? "text-emerald-600 dark:text-emerald-400" : score >= 60 ? "text-amber-600 dark:text-amber-400" : "text-slate-500";
  return <span className={`font-bold text-sm ${color}`}>{score}</span>;
}

const columns = [
  { key: "name",        label: "Name",    render: (v, row) => (
    <div>
      <p className="font-medium text-slate-900 dark:text-white text-sm">{v}</p>
      <p className="text-xs text-slate-400">{row.company}</p>
    </div>
  )},
  { key: "score",       label: "Score",   render: v => <ScoreBadge score={v} /> },
  { key: "stage",       label: "Stage",   render: v => <StatusBadge label={v} variant={stageVariant[v]} dot /> },
  { key: "source",      label: "Source" },
  { key: "lastContact", label: "Last Contact" },
  { key: "owner",       label: "Owner" },
];

const activity = [
  { type: "email",  text: "Sent intro email to Priya Nair",  time: "1h ago" },
  { type: "call",   text: "Call with Thomas Kraft – 18 min", time: "2h ago" },
  { type: "note",   text: "Carlos Mendes – budget confirmed Q1", time: "3h ago" },
  { type: "email",  text: "Follow-up sent to Diego Ruiz",    time: "2d ago" },
];

export default function LeadWorkspace() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Leads & Contacts"
        subtitle="Unified profiles, activity feed and communication history"
        actions={
          <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg transition">
            <Plus size={15} /> Add Lead
          </button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Total Leads"    value="284"  icon={UserPlus} color="indigo" />
        <Stat label="Qualified"      value="62"   icon={Star}     color="emerald" delta={8} />
        <Stat label="Demo Booked"    value="18"   icon={Calendar} color="sky" />
        <Stat label="Avg Lead Score" value="72"   icon={Star}     color="amber" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <Card>
            <CardHeader title="Lead List" icon={UserPlus} />
            <CardBody>
              <DataTable columns={columns} data={leads} searchable searchKeys={["name", "company", "owner"]} />
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardHeader title="Recent Activity" icon={Mail} />
          <CardBody className="space-y-4">
            {activity.map((a, i) => (
              <div key={i} className="flex gap-3">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                  a.type === "email" ? "bg-indigo-100 dark:bg-indigo-900/30" :
                  a.type === "call"  ? "bg-emerald-100 dark:bg-emerald-900/30" :
                  "bg-slate-100 dark:bg-slate-800"
                }`}>
                  {a.type === "email" ? <Mail size={14} className="text-indigo-600 dark:text-indigo-400" /> :
                   a.type === "call"  ? <Phone size={14} className="text-emerald-600 dark:text-emerald-400" /> :
                   <Star size={14} className="text-slate-400" />}
                </div>
                <div>
                  <p className="text-sm text-slate-900 dark:text-white">{a.text}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{a.time}</p>
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
