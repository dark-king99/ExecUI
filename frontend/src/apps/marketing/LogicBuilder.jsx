import { useState } from "react";
import { Plus, GitBranch, Trash2 } from "lucide-react";

const DEFAULT_FIELDS = ["Lifecycle Stage", "Last Activity", "Industry", "Country", "Plan", "LTV Score"];
const DEFAULT_OPERATORS = ["equals", "not equals", "<", ">", "contains", "not contains"];

function ConditionRow({ condition, onChange, onRemove }) {
  return (
    <div className="grid grid-cols-3 gap-4 text-sm w-full">
      <select
        value={condition.field}
        onChange={e => onChange({ ...condition, field: e.target.value })}
        className="border border-slate-200 dark:border-slate-700 rounded px-3 py-2 bg-white dark:bg-slate-900"
      >
        <option value="">Select field…</option>
        {DEFAULT_FIELDS.map(f => <option key={f} value={f}>{f}</option>)}
      </select>

      <select
        value={condition.operator}
        onChange={e => onChange({ ...condition, operator: e.target.value })}
        className="border border-slate-200 dark:border-slate-700 rounded px-3 py-2 bg-white dark:bg-slate-900"
      >
        <option value="">Select operator…</option>
        {DEFAULT_OPERATORS.map(op => <option key={op} value={op}>{op}</option>)}
      </select>

      <div className="flex gap-2">
        <input
          value={condition.value}
          onChange={e => onChange({ ...condition, value: e.target.value })}
          placeholder="Value…"
          className="flex-1 border border-slate-200 dark:border-slate-700 rounded px-3 py-2 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          onClick={onRemove}
          className="text-slate-400 hover:text-red-500 transition"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

function RuleGroup({ group, onUpdate, onRemove }) {
  const addCondition = () =>
    onUpdate({ ...group, conditions: [...group.conditions, { field: "", operator: "", value: "" }] });

  const updateCondition = (i, cond) =>
    onUpdate({ ...group, conditions: group.conditions.map((c, idx) => idx === i ? cond : c) });

  const removeCondition = (i) =>
    onUpdate({ ...group, conditions: group.conditions.filter((_, idx) => idx !== i) });

  return (
    <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-6 bg-slate-50 dark:bg-slate-800 space-y-4 w-full">
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {group.label} (AND)
        </div>
        <button onClick={onRemove} className="text-xs text-red-400 hover:text-red-600">
          Remove Group
        </button>
      </div>

      {group.conditions.length === 0 && (
        <p className="text-xs text-slate-400">No conditions. Add one below.</p>
      )}

      {group.conditions.map((c, i) => (
        <ConditionRow
          key={i}
          condition={c}
          onChange={cond => updateCondition(i, cond)}
          onRemove={() => removeCondition(i)}
        />
      ))}

      <button onClick={addCondition} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
        + Add Condition
      </button>
    </div>
  );
}

export default function LogicBuilder() {
  const [groups, setGroups] = useState([
    { id: 1, label: "Group 1", conditions: [] },
  ]);

  const addGroup = () =>
    setGroups(prev => [...prev, { id: Date.now(), label: `Group ${prev.length + 1}`, conditions: [] }]);

  const updateGroup = (id, grp) =>
    setGroups(prev => prev.map(g => g.id === id ? grp : g));

  const removeGroup = (id) =>
    setGroups(prev => prev.filter(g => g.id !== id));

  return (
    <div className="w-full min-h-[680px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 shadow-sm flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <GitBranch size={18} /> Segment Logic Builder
        </h2>

        <button
          onClick={addGroup}
          className="px-3 py-1 text-xs bg-indigo-600 text-white rounded-md flex items-center gap-1"
        >
          <Plus size={12} />
          Add Condition Group
        </button>
      </div>

      <div className="flex-1 space-y-6">
        {groups.map(g => (
          <RuleGroup
            key={g.id}
            group={g}
            onUpdate={grp => updateGroup(g.id, grp)}
            onRemove={() => removeGroup(g.id)}
          />
        ))}
      </div>

      <div className="mt-6 text-xs text-slate-500 dark:text-slate-400">
        Logical Mode: AND between groups • Nested OR supported • Real-time diff tracking enabled
      </div>
    </div>
  );
}
