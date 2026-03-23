import { useState } from "react";
import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import EmptyState from "../../components/ui/EmptyState";
import { BookOpen, Play, Plus, Zap } from "lucide-react";

const playbooks = [
  { name: "New Enterprise Onboarding",  type: "Onboarding",  steps: 8,  trigger: "Deal: Closed Won",      uses: 34,  status: "active" },
  { name: "At-Risk Customer Recovery",  type: "Retention",   steps: 6,  trigger: "Health: Red",           uses: 12,  status: "active" },
  { name: "Upsell Discovery Sequence",  type: "Expansion",   steps: 5,  trigger: "Health: Green + 90d",   uses: 19,  status: "active" },
  { name: "Churn Prevention",           type: "Retention",   steps: 7,  trigger: "Manual",                uses: 8,   status: "active" },
  { name: "New SMB Onboarding",         type: "Onboarding",  steps: 5,  trigger: "Deal: Closed Won",      uses: 58,  status: "active" },
  { name: "Win-Back Campaign",          type: "Re-engage",   steps: 4,  trigger: "Churned: 30d+",         uses: 3,   status: "draft" },
];

const typeVariant = { Onboarding: "indigo", Retention: "warning", Expansion: "success", "Re-engage": "info" };
const statusVariant = { active: "success", draft: "neutral" };

export default function PlaybooksLibrary() {
  const [filter, setFilter] = useState("all");
  const types = ["all", "Onboarding", "Retention", "Expansion", "Re-engage"];
  const filtered = filter === "all" ? playbooks : playbooks.filter(p => p.type === filter);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Playbooks Library"
        subtitle="Reusable sales and service playbooks with automation triggers"
        actions={
          <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg transition">
            <Plus size={15} /> New Playbook
          </button>
        }
      />

      {/* Filter bar */}
      <div className="flex gap-2 flex-wrap">
        {types.map(t => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              filter === t
                ? "bg-indigo-600 text-white"
                : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-indigo-400"
            }`}
          >
            {t === "all" ? "All" : t}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(pb => (
          <Card key={pb.name}>
            <CardBody>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
                    <BookOpen size={16} className="text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white leading-tight">{pb.name}</p>
                    <StatusBadge label={pb.type} variant={typeVariant[pb.type]} />
                  </div>
                </div>
                <StatusBadge label={pb.status} variant={statusVariant[pb.status]} dot />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 mb-3">
                <div className="flex items-center gap-1">
                  <Zap size={12} className="text-amber-500" />
                  {pb.trigger}
                </div>
                <div>{pb.steps} steps · Used {pb.uses}×</div>
              </div>

              <div className="flex gap-2 mt-3">
                <button className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400 hover:border-indigo-400 transition">
                  <BookOpen size={13} /> View
                </button>
                <button className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-indigo-600 text-white text-xs hover:bg-indigo-700 transition">
                  <Play size={13} /> Run
                </button>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
