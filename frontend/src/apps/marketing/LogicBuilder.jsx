import { Plus, GitBranch } from "lucide-react";

export default function LogicBuilder() {
  return (
    <div className="w-full min-h-[680px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 shadow-sm flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <GitBranch size={18} /> Segment Logic Builder
        </h2>

        <button className="px-3 py-1 text-xs bg-indigo-600 text-white rounded-md flex items-center gap-1">
          <Plus size={12} />
          Add Condition Group
        </button>
      </div>

      {/* RULE GROUP */}
      <div className="flex-1 space-y-6">

        <RuleGroup />

      </div>

      <div className="mt-6 text-xs text-slate-500 dark:text-slate-400">
        Logical Mode: AND between groups • Nested OR supported • Real-time diff tracking enabled
      </div>
    </div>
  );
}

function RuleGroup() {
  return (
    <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-12 bg-slate-50 dark:bg-slate-800 space-y-4 w-full">

      <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
        Group 1 (AND)
      </div>

      <ConditionRow
        field="Lifecycle Stage"
        operator="equals"
        value="High Intent"
      />

      <ConditionRow
        field="Last Activity"
        operator="<"
        value="7 days"
      />

      <button className="text-xs text-indigo-600 dark:text-indigo-400">
        + Add Condition
      </button>
    </div>
  );
}

function ConditionRow({ field, operator, value }) {
  return (
    <div className="grid grid-cols-3 gap-4 text-sm w-full">

      <div className="border border-slate-200 dark:border-slate-700 rounded px-6 py-5 bg-white dark:bg-slate-900">
        {field}
      </div>

      <div className="border border-slate-200 dark:border-slate-700 rounded px-6 py-5 bg-white dark:bg-slate-900">
        {operator}
      </div>

      <div className="border border-slate-200 dark:border-slate-700 rounded px-6 py-5 bg-white dark:bg-slate-900">
        {value}
      </div>

    </div>
  );
}