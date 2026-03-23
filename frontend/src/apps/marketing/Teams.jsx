import { useState } from "react";
import {
  Users,
  Briefcase,
  CheckCircle,
  Activity,
  BarChart3,
  Plus,
} from "lucide-react";

export default function Teams() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="min-h-full w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-8 space-y-8">

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Users size={20} /> Marketing Team Command Center
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Workforce management, task tracking, and performance intelligence.
          </p>
        </div>

        <div className="flex gap-4">
          <button className="px-4 py-2 text-sm bg-slate-200 dark:bg-slate-800 rounded-md">
            Invite Member
          </button>
          <button className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center gap-2">
            <Plus size={14} /> Create Task
          </button>
        </div>
      </div>

      {/* KPI GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard icon={Users} label="Active Agents" value="12" />
        <StatCard icon={Briefcase} label="Open Tasks" value="38" />
        <StatCard icon={CheckCircle} label="SLA Compliance" value="96%" />
        <StatCard icon={Activity} label="Campaign Velocity" value="+14%" />
      </div>

      {/* MAIN GRID */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* TEAM DIRECTORY */}
        <div className="xl:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
          <h2 className="font-semibold text-lg mb-4">Team Members</h2>

          <div className="space-y-4">
            <TeamMember name="Sarah Lee" role="Team Manager" workload={70} status="Available" />
            <TeamMember name="Daniel Brooks" role="Media Buyer" workload={85} status="Busy" />
            <TeamMember name="Ava Johnson" role="Content Strategist" workload={55} status="Available" />
            <TeamMember name="Michael Chen" role="Marketing Analyst" workload={92} status="Busy" />
          </div>
        </div>

        {/* TASK BOARD */}
        <div className="xl:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
          <h2 className="font-semibold text-lg mb-6">Task Board</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            <TaskColumn title="Backlog">
              <TaskCard title="Launch Q3 Campaign" priority="High" />
              <TaskCard title="Email Automation Audit" priority="Medium" />
            </TaskColumn>

            <TaskColumn title="In Progress">
              <TaskCard title="SEO Optimization Sprint" priority="High" />
            </TaskColumn>

            <TaskColumn title="Completed">
              <TaskCard title="Paid Ads Performance Review" priority="Low" />
            </TaskColumn>

          </div>
        </div>
      </div>

      {/* PERFORMANCE SECTION */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
        <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <BarChart3 size={18} /> Performance Overview
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
          <PerformanceMetric label="Top Performer" value="Sarah Lee" />
          <PerformanceMetric label="Campaign Contribution" value="+22% Revenue Impact" />
          <PerformanceMetric label="Average Task Completion" value="2.4 Days" />
        </div>
      </div>
    </div>
  );
}

/* ===================== COMPONENTS ===================== */

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
      <div className="flex justify-between items-center">
        <Icon size={18} />
        <span className="text-xs text-slate-500 dark:text-slate-400">Live</span>
      </div>
      <div className="mt-4 text-xl font-semibold">{value}</div>
      <div className="text-sm text-slate-600 dark:text-slate-400">{label}</div>
    </div>
  );
}

function TeamMember({ name, role, workload, status }) {
  return (
    <div className="border border-slate-200 dark:border-slate-800 rounded-md p-4">
      <div className="font-medium">{name}</div>
      <div className="text-xs text-slate-500 dark:text-slate-400">{role}</div>

      <div className="mt-2 text-xs">
        Workload: {workload}%
        <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded mt-1">
          <div
            className="h-2 bg-indigo-600 rounded"
            style={{ width: `${workload}%` }}
          />
        </div>
      </div>

      <div className={`mt-2 text-xs ${status === "Busy" ? "text-red-500" : "text-green-500"}`}>
        {status}
      </div>
    </div>
  );
}

function TaskColumn({ title, children }) {
  return (
    <div>
      <h3 className="font-medium mb-3">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function TaskCard({ title, priority }) {
  return (
    <div className="border border-slate-200 dark:border-slate-800 rounded-md p-4 text-sm bg-slate-100 dark:bg-slate-800">
      <div className="font-medium">{title}</div>
      <div className={`mt-1 text-xs ${
        priority === "High"
          ? "text-red-500"
          : priority === "Medium"
          ? "text-yellow-500"
          : "text-green-500"
      }`}>
        {priority} Priority
      </div>
    </div>
  );
}

function PerformanceMetric({ label, value }) {
  return (
    <div>
      <div className="text-slate-500 dark:text-slate-400 text-xs">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}