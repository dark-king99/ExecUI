/**
 * Edits a segment rule tree ({ op, rules }) — the same rules the backend's
 * segmentation engine compiles. Used by audiences and by journey conditions,
 * goals and exit rules.
 */
import { Plus, Trash2 } from "lucide-react";
import { TextInput, SelectInput, GhostBtn } from "./mkt-ui";
import { useApi } from "../../../hooks/useApi";
import { marketing } from "../../../services/api";

export const RULE_FIELDS = [
  ["email", "Email", ["contains", "ends_with", "equals", "not_contains"]],
  ["name", "Name", ["contains", "equals", "not_contains"]],
  ["created", "Added to CRM", ["within_days", "after", "before"]],
  ["consent", "Email consent", ["is", "is_not"]],
  ["event", "Activity", ["within_days", "never"]],
];
const CMP = { contains: "contains", ends_with: "ends with", equals: "is", not_contains: "doesn't contain", within_days: "in the last (days)", after: "after", before: "before", is: "is", is_not: "is not", never: "never" };
const EVENTS = ["email.opened", "email.clicked", "email.delivered", "email.bounced", "email.unsubscribed", "form.submitted"];
const eventLabel = (v) => (v.startsWith("custom:") ? v.slice(7).replace(/_/g, " ") : v.replace("email.", "email "));

export const blankTree = () => ({ op: "and", rules: [{ field: "email", cmp: "contains", value: "" }] });

/** Fill defaults the selects show but the state may not hold yet. */
export function normalizeTree(tree) {
  return { ...tree, rules: tree.rules.map((r) => (r.field === "consent" && !r.value ? { ...r, value: "subscribed" } : r.field === "event" && !r.type ? { ...r, type: "email.opened" } : r)) };
}

export default function RuleBuilder({ tree, onChange }) {
  // Custom events received through Data Streams are usable in rules too.
  const { data: custom } = useApi(() => marketing.streams.customEvents().catch(() => []), []);
  const events = [...EVENTS, ...(custom ?? []).map((c) => c.type)];
  const setRule = (i, patch) => onChange({ ...tree, rules: tree.rules.map((r, j) => (j === i ? { ...r, ...patch } : r)) });
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        Contacts who
        <SelectInput value={tree.op} onChange={(e) => onChange({ ...tree, op: e.target.value })} aria-label="Match"><option value="and">match all</option><option value="or">match any</option></SelectInput>
        of these
      </div>
      {tree.rules.map((r, i) => {
        const def = RULE_FIELDS.find(([k]) => k === r.field) ?? RULE_FIELDS[0];
        return (
          <div key={i} className="flex flex-wrap items-center gap-2">
            <SelectInput value={r.field} onChange={(e) => setRule(i, { field: e.target.value, cmp: RULE_FIELDS.find(([k]) => k === e.target.value)[2][0], value: "" })}>{RULE_FIELDS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</SelectInput>
            <SelectInput value={r.cmp} onChange={(e) => setRule(i, { cmp: e.target.value })}>{def[2].map((c) => <option key={c} value={c}>{CMP[c]}</option>)}</SelectInput>
            {r.field === "consent" ? (
              <SelectInput value={r.value || "subscribed"} onChange={(e) => setRule(i, { value: e.target.value })}>{["subscribed", "unsubscribed", "bounced", "complained", "none"].map((v) => <option key={v} value={v}>{v === "none" ? "not recorded" : v}</option>)}</SelectInput>
            ) : r.field === "event" ? (
              <>
                <SelectInput value={r.type || "email.opened"} onChange={(e) => setRule(i, { type: e.target.value })}>{events.map((v) => <option key={v} value={v}>{eventLabel(v)}</option>)}</SelectInput>
                {r.cmp === "within_days" && <TextInput type="number" min={1} value={r.value} onChange={(e) => setRule(i, { value: Number(e.target.value) })} />}
              </>
            ) : (
              <TextInput type={["after", "before"].includes(r.cmp) ? "date" : r.cmp === "within_days" ? "number" : "text"} value={r.value} onChange={(e) => setRule(i, { value: r.cmp === "within_days" ? Number(e.target.value) : e.target.value })} />
            )}
            <button type="button" aria-label="Remove rule" onClick={() => onChange({ ...tree, rules: tree.rules.filter((_, j) => j !== i) })} className="text-slate-400 hover:text-red-500"><Trash2 size={13} /></button>
          </div>
        );
      })}
      <GhostBtn onClick={() => onChange({ ...tree, rules: [...tree.rules, { field: "email", cmp: "contains", value: "" }] })}><Plus size={13} /> Rule</GhostBtn>
    </div>
  );
}
