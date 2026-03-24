import { useState } from "react";
import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody, CardHeader, Stat } from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import DataTable from "../../components/ui/DataTable";
import { SkeletonCard, SkeletonTable } from "../../components/ui/Skeleton";
import { useApi } from "../../hooks/useApi";
import { crm } from "../../services/api";
import { UserPlus, Mail, Phone, Calendar, Star, Plus, RefreshCw } from "lucide-react";

const STAGE_VARIANT = {
  "New": "neutral", "Contacted": "info", "Qualified": "success", "Demo Booked": "indigo",
};

function ScoreBadge({ score }) {
  const color = score >= 80
    ? "text-emerald-600 dark:text-emerald-400"
    : score >= 60
    ? "text-amber-600 dark:text-amber-400"
    : "text-slate-500";
  return <span className={`font-bold text-sm ${color}`}>{score}</span>;
}

const COLUMNS = [
  {
    key: "name",
    label: "Name",
    render: (v, row) => (
      <div>
        <p className="font-medium text-slate-900 dark:text-white text-sm">{v}</p>
        <p className="text-xs text-slate-400">{row.company}</p>
      </div>
    ),
  },
  { key: "score",       label: "Score",        render: (v) => <ScoreBadge score={v ?? 0} /> },
  { key: "stage",       label: "Stage",        render: (v) => <StatusBadge label={v} variant={STAGE_VARIANT[v] ?? "neutral"} dot /> },
  { key: "source",      label: "Source" },
  { key: "lastContact", label: "Last Contact", render: (v) => v ?? "—" },
  { key: "owner",       label: "Owner" },
];

export default function LeadWorkspace() {
  const {
    data: leadsData,
    loading: leadsLoading,
    error: leadsError,
    refetch: refetchLeads,
  } = useApi(() => crm.leads.list({ limit: 100 }), [], { pollingInterval: 60000 });

  const {
    data: activityData,
    loading: actLoading,
    error: actError,
    refetch: refetchAct,
  } = useApi(() => crm.leads.activity({ limit: 20 }), [], { pollingInterval: 30000 });

  // Derived stats from live data
  const totalLeads  = leadsData?.length ?? 0;
  const qualified   = leadsData?.filter((l) => l.stage === "Qualified").length ?? 0;
  const demoBooked  = leadsData?.filter((l) => l.stage === "Demo Booked").length ?? 0;
  const avgScore    = leadsData?.length
    ? Math.round(leadsData.reduce((s, l) => s + (l.score ?? 0), 0) / leadsData.length)
    : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leads & Contacts"
        subtitle="Unified profiles, activity feed and communication history"
        actions={
          <div className="flex gap-2">
            <button
              onClick={() => { refetchLeads(); refetchAct(); }}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg transition"
            >
              <RefreshCw size={13} /> Refresh
            </button>
            <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg transition">
              <Plus size={15} /> Add Lead
            </button>
          </div>
        }
      />

      {/* Stats */}
      {leadsLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Total Leads"    value={totalLeads} icon={UserPlus} color="indigo" />
          <Stat label="Qualified"      value={qualified}  icon={Star}     color="emerald" />
          <Stat label="Demo Booked"    value={demoBooked} icon={Calendar} color="sky" />
          <Stat label="Avg Lead Score" value={avgScore}   icon={Star}     color="amber" />
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Lead table */}
        <div className="xl:col-span-2">
          <Card>
            <CardHeader title="Lead List" icon={UserPlus} />
            <CardBody>
              {leadsError && (
                <div className="text-sm text-red-600 dark:text-red-400 mb-3">{leadsError}</div>
              )}
              {leadsLoading ? (
                <SkeletonTable rows={6} />
              ) : leadsData?.length > 0 ? (
                <DataTable
                  columns={COLUMNS}
                  data={leadsData}
                  searchable
                  searchKeys={["name", "company", "owner"]}
                />
              ) : (
                <p className="text-sm text-slate-500 text-center py-6">No leads found.</p>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Recent activity */}
        <Card>
          <CardHeader title="Recent Activity" icon={Mail} />
          <CardBody className="space-y-4">
            {actError && <p className="text-sm text-red-600 dark:text-red-400">{actError}</p>}
            {actLoading ? (
              <SkeletonTable rows={4} />
            ) : activityData?.length > 0 ? (
              activityData.map((a, i) => (
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
                    <p className="text-sm text-slate-900 dark:text-white">{a.text ?? a.description}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{a.time ?? a.timestamp}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500 text-center py-4">No recent activity.</p>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
