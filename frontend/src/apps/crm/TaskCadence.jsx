import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody, CardHeader, Stat } from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import { CalendarSync, CheckCircle, Clock, AlertTriangle, Plus } from "lucide-react";

const tasks = [
  { title: "Follow up with Priya Nair",       due: "Today 15:00",  type: "Call",    priority: "high",   status: "pending",   owner: "J. Torres" },
  { title: "Send proposal to Atlas Retail",    due: "Today 17:00",  type: "Email",   priority: "high",   status: "pending",   owner: "M. Patel" },
  { title: "Demo prep – NordVentures",         due: "Tomorrow 10:00",type:"Meeting", priority: "medium", status: "pending",   owner: "J. Torres" },
  { title: "Quarterly review – Meridian",      due: "Mar 21 09:00", type: "Meeting", priority: "medium", status: "scheduled", owner: "S. Lee" },
  { title: "Contract review – Solstice",       due: "Mar 22 14:00", type: "Task",    priority: "high",   status: "scheduled", owner: "J. Torres" },
  { title: "Check in – CapitalGroup",          due: "Mar 25 11:00", type: "Call",    priority: "low",    status: "scheduled", owner: "A. Kim" },
];

const sequences = [
  { name: "New Lead Cadence (7-step)",     enrolled: 24, active: 18, step: "Email → Call → LinkedIn" },
  { name: "Renewal Nudge (4-step)",        enrolled: 11, active: 9,  step: "Email → Email → Call" },
  { name: "Re-engagement (6-step)",        enrolled: 8,  active: 5,  step: "Email → Task → LinkedIn" },
];

const priorityVariant = { high: "danger", medium: "warning", low: "neutral" };
const statusVariant   = { pending: "warning", scheduled: "info", done: "success" };
const typeColors      = { Call: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400", Email: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400", Meeting: "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400", Task: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400" };

export default function TaskCadence() {
  const overdue = tasks.filter(t => t.due.startsWith("Today") && t.status === "pending").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Task & Cadence Center"
        subtitle="Personal and team task queue, SLA due dates, reminders and sequence automation"
        actions={
          <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg transition">
            <Plus size={15} /> New Task
          </button>
        }
      />

      <div className="grid grid-cols-3 gap-4">
        <Stat label="Due Today"  value={overdue} icon={AlertTriangle} color="amber" />
        <Stat label="This Week"  value="14"       icon={Clock}        color="sky" />
        <Stat label="Completed"  value="38"       icon={CheckCircle}  color="emerald" delta={5} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Task Queue" icon={CalendarSync} />
          <CardBody className="space-y-2">
            {tasks.map((t, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 transition">
                <input type="checkbox" className="rounded border-slate-300 dark:border-slate-600 text-indigo-600" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{t.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColors[t.type]}`}>{t.type}</span>
                    <span className="text-xs text-slate-400">{t.due}</span>
                    <span className="text-xs text-slate-400">{t.owner}</span>
                  </div>
                </div>
                <StatusBadge label={t.priority} variant={priorityVariant[t.priority]} />
              </div>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Active Sequences" icon={CalendarSync} />
          <CardBody className="space-y-4">
            {sequences.map((s, i) => (
              <div key={i} className="p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-start justify-between mb-2">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{s.name}</p>
                  <StatusBadge label="Active" variant="success" dot />
                </div>
                <p className="text-xs text-slate-400 mb-3">{s.step}</p>
                <div className="flex gap-4 text-xs">
                  <span className="text-slate-500">Enrolled: <strong className="text-slate-800 dark:text-slate-200">{s.enrolled}</strong></span>
                  <span className="text-slate-500">Active: <strong className="text-indigo-600 dark:text-indigo-400">{s.active}</strong></span>
                </div>
              </div>
            ))}
            <button className="w-full py-2 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 text-sm text-slate-500 hover:border-indigo-400 hover:text-indigo-600 transition">
              + Create New Sequence
            </button>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
