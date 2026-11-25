/**
 * The visual journey editor shared by Journey Tab and Automation Studio.
 *
 * The canvas draws the saved graph top to bottom from the trigger; every empty
 * exit has a "+" to add a step there. Selecting a step opens its settings on
 * the right. Edits change the draft only. "Publish" validates everything on
 * the server and freezes the draft as the next version; people already inside
 * stay on the version they entered. Numbers on steps come from the engine's
 * history rows, never estimates.
 */
import { useEffect, useMemo, useState } from "react";
import {
  Zap, Mail, Clock, Hourglass, GitBranch, Split, UserPlus, UserMinus, ClipboardList, Bell, MessageSquare, Webhook,
  Plus, Trash2, Play, Pause, Archive, Copy, FlaskConical, Users, CheckCircle2, AlertTriangle, Flag, LogOut, X, CornerDownRight,
} from "lucide-react";
import StatusBadge from "../../../../../components/ui/StatusBadge";
import { useToast } from "../../../../../components/ui/Toast";
import { useApi } from "../../../../../hooks/useApi";
import { marketing } from "../../../../../services/api";
import { Section, Loading, Field, TextInput, SelectInput, PrimaryBtn, GhostBtn, fmtNum } from "../../../components/mkt-ui";
import RuleBuilder, { blankTree, normalizeTree } from "../../../components/RuleBuilder";

export const JOURNEY_STATUS = { draft: "neutral", active: "success", paused: "warning", archived: "neutral" };
const when = (d) => (d ? new Date(d).toLocaleString() : "—");

const TYPES = {
  send_email: { label: "Send email", icon: Mail, exits: [["next", null]] },
  wait: { label: "Wait", icon: Clock, exits: [["next", null]] },
  wait_for_event: { label: "Wait for an event", icon: Hourglass, exits: [["next", "Happened"], ["timeout", "Timed out"]] },
  condition: { label: "If / else", icon: GitBranch, exits: [["yes", "Yes"], ["no", "No"]] },
  split: { label: "A/B split", icon: Split, exits: [["a", "A"], ["b", "B"]] },
  add_to_audience: { label: "Add to audience", icon: UserPlus, exits: [["next", null]] },
  remove_from_audience: { label: "Remove from audience", icon: UserMinus, exits: [["next", null]] },
  create_task: { label: "Create CRM task", icon: ClipboardList, exits: [["next", null]] },
  notify: { label: "Notify the team", icon: Bell, exits: [["next", null]] },
  post_chat: { label: "Post to a channel", icon: MessageSquare, exits: [["next", null]] },
  webhook: { label: "Call a webhook", icon: Webhook, exits: [["next", null]] },
};
const EVENT_LABEL = { "email.sent": "email sent", "email.delivered": "email delivered", "email.opened": "email opened", "email.clicked": "email link clicked", "email.bounced": "email bounced", "email.complained": "marked as spam", "email.unsubscribed": "unsubscribed", "consent.changed": "consent changed" };

function defaults(type) {
  switch (type) {
    case "wait": return { amount: 1, unit: "days" };
    case "wait_for_event": return { event: "email.opened", days: 3, timeout: null };
    case "condition": return { rules: blankTree(), no: null };
    case "split": return { percent: 50, b: null };
    case "create_task": return { title: "Follow up with {{name}}", taskType: "follow_up", assigneeId: "", dueInDays: 1 };
    case "notify": return { audience: { type: "admins", value: null }, title: "{{name}} reached a journey step", body: "" };
    case "post_chat": return { routeId: "", text: "{{name}} reached a journey step" };
    case "webhook": return { url: "https://" };
    case "send_email": return { campaignId: "" };
    default: return { audienceId: "" };
  }
}

function summary(n, pick) {
  switch (n.type) {
    case "send_email": return pick.emails.find((e) => e.id === n.campaignId)?.name ?? "Choose an email";
    case "wait": return `${n.amount} ${n.unit}`;
    case "wait_for_event": return `Up to ${n.days} day(s) for ${EVENT_LABEL[n.event] ?? n.event}`;
    case "condition": return `${n.rules?.rules?.length ?? 0} rule(s), ${n.rules?.op === "or" ? "any" : "all"}`;
    case "split": return `${n.percent}% A · ${100 - n.percent}% B`;
    case "add_to_audience": case "remove_from_audience": return pick.audiences.find((a) => a.id === n.audienceId)?.name ?? "Choose an audience";
    case "create_task": return `${n.title} → ${pick.members.find((m) => m.id === n.assigneeId)?.name ?? "choose someone"}`;
    case "notify": return n.title;
    case "post_chat": return pick.routes.find((r) => r.id === n.routeId)?.label ?? "Choose a channel";
    case "webhook": return n.url;
    default: return "";
  }
}

function useRun(toast, after) {
  const [busy, setBusy] = useState(null);
  const run = async (key, fn, ok) => {
    setBusy(key);
    try { const r = await fn(); if (ok) toast({ message: typeof ok === "function" ? ok(r) : ok, type: "success" }); await after?.(); return r; }
    catch (e) { toast({ message: e.message, type: "error" }); return null; }
    finally { setBusy(null); }
  };
  return [busy, run];
}

// ── Canvas ───────────────────────────────────────────────────────────────────
function AddSlot({ onAdd, label }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col items-center">
      {label && <span className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</span>}
      {open ? (
        <div className="grid w-60 grid-cols-1 gap-0.5 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg dark:border-slate-700 dark:bg-slate-900">
          {Object.entries(TYPES).map(([k, t]) => (
            <button key={k} type="button" onClick={() => { setOpen(false); onAdd(k); }} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">
              <t.icon size={13} className="text-violet-500" /> {t.label}
            </button>
          ))}
          <button type="button" onClick={() => setOpen(false)} className="mt-1 rounded-md px-2 py-1 text-[11px] text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">Cancel</button>
        </div>
      ) : (
        <button type="button" onClick={() => setOpen(true)} aria-label="Add a step" className="flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-slate-300 text-slate-400 hover:border-violet-400 hover:text-violet-500 dark:border-slate-600">
          <Plus size={14} />
        </button>
      )}
      {!open && <span className="mt-1 text-[10px] text-slate-400">end</span>}
    </div>
  );
}

const Line = () => <div className="mx-auto h-5 w-px bg-slate-300 dark:bg-slate-600" />;

function NodeCard({ id, node, pick, selected, onSelect, stat }) {
  const t = TYPES[node.type];
  return (
    <button type="button" onClick={() => onSelect(id)}
      className={`w-60 rounded-xl border bg-white p-3 text-left shadow-sm transition dark:bg-slate-900 ${selected ? "border-violet-500 ring-2 ring-violet-500/20" : "border-slate-200 hover:border-violet-300 dark:border-slate-700"}`}>
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-50 dark:bg-violet-500/10"><t.icon size={14} className="text-violet-600 dark:text-violet-400" /></span>
        <span className="text-xs font-semibold text-slate-900 dark:text-white">{node.label || t.label}</span>
      </div>
      <p className="mt-1.5 truncate text-[11px] text-slate-500">{summary(node, pick)}</p>
      {stat && (stat.done || stat.here || stat.skipped || stat.failed) ? (
        <p className="mt-1 text-[10px] text-slate-400">
          {fmtNum(stat.done)} passed{stat.here ? ` · ${fmtNum(stat.here)} here now` : ""}{stat.skipped ? ` · ${fmtNum(stat.skipped)} skipped` : ""}{stat.failed ? ` · ${fmtNum(stat.failed)} failed` : ""}
        </p>
      ) : null}
    </button>
  );
}

function Branch({ nodeId, ctx, seen, slot, label }) {
  if (!nodeId) return <AddSlot label={label} onAdd={(type) => ctx.add(slot, type)} />;
  const node = ctx.def.nodes[nodeId];
  if (!node) return null;
  if (seen.has(nodeId)) {
    return (
      <div className="flex flex-col items-center">
        {label && <span className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</span>}
        <button type="button" onClick={() => ctx.select(nodeId)} className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          <CornerDownRight size={11} /> continues at {node.label || TYPES[node.type].label}
        </button>
      </div>
    );
  }
  const nextSeen = new Set(seen).add(nodeId);
  const exits = TYPES[node.type].exits;
  return (
    <div className="flex flex-col items-center">
      {label && <span className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</span>}
      <NodeCard id={nodeId} node={node} pick={ctx.pick} selected={ctx.selected === nodeId} onSelect={ctx.select} stat={ctx.stats?.nodes?.[nodeId]} />
      <Line />
      {exits.length === 1 ? (
        <Branch nodeId={node[exits[0][0]]} ctx={ctx} seen={nextSeen} slot={{ from: nodeId, key: exits[0][0] }} />
      ) : (
        <div className="flex items-start gap-6">
          {exits.map(([k, l]) => (
            <Branch key={k} nodeId={node[k]} ctx={ctx} seen={nextSeen} slot={{ from: nodeId, key: k }} label={l} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Inspector ────────────────────────────────────────────────────────────────
function NodeSettings({ node, pick, onChange, onDelete }) {
  const set = (patch) => onChange({ ...node, ...patch });
  const num = (v) => (v === "" ? "" : Number(v));
  const t = TYPES[node.type];
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2"><t.icon size={15} className="text-violet-500" /><span className="text-sm font-semibold text-slate-900 dark:text-white">{t.label}</span></div>
      <Field label="Label (optional)"><TextInput value={node.label ?? ""} onChange={(e) => set({ label: e.target.value })} placeholder={t.label} /></Field>
      {node.type === "send_email" && (
        <>
          <Field label="Journey email"><SelectInput value={node.campaignId} onChange={(e) => set({ campaignId: e.target.value })}>
            <option value="">Choose…</option>
            {pick.emails.map((e) => <option key={e.id} value={e.id}>{e.name}{e.status !== "active" ? ` (${e.status})` : ""}</option>)}
          </SelectInput></Field>
          <p className="text-[11px] text-slate-500">Create journey emails in Email Studio and activate them. Contacts without email consent skip this step and carry on.</p>
        </>
      )}
      {node.type === "wait" && (
        <div className="grid grid-cols-2 gap-2">
          <Field label="Wait"><TextInput type="number" min={1} value={node.amount} onChange={(e) => set({ amount: num(e.target.value) })} /></Field>
          <Field label="Unit"><SelectInput value={node.unit} onChange={(e) => set({ unit: e.target.value })}>{["minutes", "hours", "days"].map((u) => <option key={u} value={u}>{u}</option>)}</SelectInput></Field>
        </div>
      )}
      {node.type === "wait_for_event" && (
        <>
          <Field label="Wait until the contact"><SelectInput value={node.event} onChange={(e) => set({ event: e.target.value })}>{pick.events.map((ev) => <option key={ev} value={ev}>{EVENT_LABEL[ev] ?? ev}</option>)}</SelectInput></Field>
          <Field label="Only for this email (optional)"><SelectInput value={node.campaignId ?? ""} onChange={(e) => set({ campaignId: e.target.value || undefined })}>
            <option value="">Any email</option>
            {pick.emails.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </SelectInput></Field>
          <Field label="Give up after (days)"><TextInput type="number" min={1} max={90} value={node.days} onChange={(e) => set({ days: num(e.target.value) })} /></Field>
        </>
      )}
      {node.type === "condition" && <RuleBuilder tree={node.rules ?? blankTree()} onChange={(rules) => set({ rules })} />}
      {node.type === "split" && <Field label="Share going to A (%)"><TextInput type="number" min={1} max={99} value={node.percent} onChange={(e) => set({ percent: num(e.target.value) })} /></Field>}
      {(node.type === "add_to_audience" || node.type === "remove_from_audience") && (
        <Field label="Static audience"><SelectInput value={node.audienceId} onChange={(e) => set({ audienceId: e.target.value })}>
          <option value="">Choose…</option>
          {pick.audiences.filter((a) => a.kind === "static").map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </SelectInput></Field>
      )}
      {node.type === "create_task" && (
        <>
          <Field label="Task title — {{name}} {{first_name}} {{email}}"><TextInput value={node.title} onChange={(e) => set({ title: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Type"><SelectInput value={node.taskType} onChange={(e) => set({ taskType: e.target.value })}>{["call", "email", "meeting", "follow_up", "review"].map((x) => <option key={x} value={x}>{x.replace("_", " ")}</option>)}</SelectInput></Field>
            <Field label="Due in (days)"><TextInput type="number" min={0} max={90} value={node.dueInDays} onChange={(e) => set({ dueInDays: num(e.target.value) })} /></Field>
          </div>
          <Field label="Assign to"><SelectInput value={node.assigneeId} onChange={(e) => set({ assigneeId: e.target.value })}>
            <option value="">Choose…</option>
            {pick.members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </SelectInput></Field>
        </>
      )}
      {node.type === "notify" && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Notify"><SelectInput value={node.audience?.type} onChange={(e) => set({ audience: { type: e.target.value, value: null } })}>
              {[["admins", "Admins"], ["user", "A person"], ["department", "A department"], ["role", "A role"]].map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </SelectInput></Field>
            {node.audience?.type === "user" ? (
              <Field label="Who"><SelectInput value={node.audience.value ?? ""} onChange={(e) => set({ audience: { type: "user", value: e.target.value } })}><option value="">Choose…</option>{pick.members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</SelectInput></Field>
            ) : node.audience?.type !== "admins" ? (
              <Field label={node.audience?.type === "role" ? "Role name" : "Department"}><TextInput value={node.audience?.value ?? ""} onChange={(e) => set({ audience: { ...node.audience, value: e.target.value } })} /></Field>
            ) : null}
          </div>
          <Field label="Title"><TextInput value={node.title} onChange={(e) => set({ title: e.target.value })} /></Field>
          <Field label="Message (optional)"><TextInput value={node.body ?? ""} onChange={(e) => set({ body: e.target.value })} /></Field>
        </>
      )}
      {node.type === "post_chat" && (
        <>
          <Field label="Channel"><SelectInput value={node.routeId} onChange={(e) => set({ routeId: e.target.value })}>
            <option value="">Choose…</option>
            {pick.routes.map((r) => <option key={r.id} value={r.id}>{r.label} ({r.provider})</option>)}
          </SelectInput></Field>
          {!pick.routes.length && <p className="text-[11px] text-amber-600">No Slack or Teams channel routes yet — an admin adds them under Account › Integrations.</p>}
          <Field label="Message"><TextInput value={node.text} onChange={(e) => set({ text: e.target.value })} /></Field>
        </>
      )}
      {node.type === "webhook" && (
        <>
          <Field label="HTTPS URL"><TextInput value={node.url} onChange={(e) => set({ url: e.target.value })} placeholder="https://hooks.example.com/journey" /></Field>
          <p className="text-[11px] text-slate-500">ExecUI POSTs the contact's id, name and email as JSON with an Idempotency-Key header. Private-network addresses are refused; failures retry after 1, 5 and 30 minutes.</p>
        </>
      )}
      <GhostBtn onClick={onDelete}><Trash2 size={13} /> Delete step</GhostBtn>
    </div>
  );
}

function TriggerSettings({ def, setDef, pick, kind }) {
  const t = def.trigger;
  const set = (patch) => setDef({ ...def, trigger: { ...t, ...patch } });
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2"><Zap size={15} className="text-violet-500" /><span className="text-sm font-semibold text-slate-900 dark:text-white">Who enters</span></div>
      <Field label="Trigger"><SelectInput value={t.type} onChange={(e) => setDef({ ...def, trigger: e.target.value === "audience" ? { type: "audience", audienceId: null, every: "day" } : e.target.value === "event" ? { type: "event", event: "email.clicked" } : { type: e.target.value } })}>
        <option value="manual">Added by hand</option>
        <option value="contact_created">A contact is added to the CRM</option>
        <option value="event">A contact does something</option>
        <option value="audience">{kind === "automation" ? "Everyone in an audience, on a schedule" : "On a schedule, from an audience"}</option>
      </SelectInput></Field>
      {t.type === "event" && (
        <>
          <Field label="When the contact"><SelectInput value={t.event} onChange={(e) => set({ event: e.target.value })}>{pick.events.map((ev) => <option key={ev} value={ev}>{EVENT_LABEL[ev] ?? ev}</option>)}</SelectInput></Field>
          <Field label="From this email (optional)"><SelectInput value={t.campaignId ?? ""} onChange={(e) => set({ campaignId: e.target.value || undefined })}><option value="">Any email</option>{pick.allEmails.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</SelectInput></Field>
        </>
      )}
      {t.type === "audience" && (
        <div className="grid grid-cols-2 gap-2">
          <Field label="Audience"><SelectInput value={t.audienceId ?? ""} onChange={(e) => set({ audienceId: e.target.value || null })}><option value="">Choose…</option>{pick.audiences.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</SelectInput></Field>
          <Field label="Check every"><SelectInput value={t.every} onChange={(e) => set({ every: e.target.value })}>{["hour", "day", "week"].map((x) => <option key={x} value={x}>{x}</option>)}</SelectInput></Field>
        </div>
      )}
      <Field label="Can someone go through it again?"><SelectInput value={def.reentry} onChange={(e) => setDef({ ...def, reentry: e.target.value })}>
        <option value="never">No — once per contact, ever</option>
        <option value="after_finish">Yes, after they finish</option>
      </SelectInput></Field>
      <p className="text-[11px] text-slate-500">A contact is never in the same journey twice at the same time.</p>
    </div>
  );
}

function RulesSettings({ which, def, setDef }) {
  const tree = def[which];
  const Icon = which === "goal" ? Flag : LogOut;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2"><Icon size={15} className="text-violet-500" /><span className="text-sm font-semibold text-slate-900 dark:text-white">{which === "goal" ? "Goal" : "Exit rules"}</span></div>
      <p className="text-[11px] text-slate-500">{which === "goal" ? "Contacts who meet the goal finish as converted, wherever they are. Checked before every step." : "Contacts who match these rules leave the journey. Checked before every step."}</p>
      {tree ? (
        <>
          <RuleBuilder tree={tree} onChange={(t) => setDef({ ...def, [which]: t })} />
          <GhostBtn onClick={() => setDef({ ...def, [which]: null })}><X size={13} /> Remove {which === "goal" ? "goal" : "exit rules"}</GhostBtn>
        </>
      ) : (
        <GhostBtn onClick={() => setDef({ ...def, [which]: which === "exit" ? { op: "and", rules: [{ field: "consent", cmp: "is", value: "unsubscribed" }] } : blankTree() })}><Plus size={13} /> Add {which === "goal" ? "a goal" : "exit rules"}</GhostBtn>
      )}
    </div>
  );
}

// ── People inside ────────────────────────────────────────────────────────────
function ContactPicker({ onPick, placeholder = "Search contacts by name or email" }) {
  const [q, setQ] = useState("");
  const { data } = useApi(() => (q.trim().length >= 2 ? marketing.journeys.contacts(q) : Promise.resolve([])), [q]);
  return (
    <div className="relative">
      <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} />
      {q.trim().length >= 2 && (data ?? []).length > 0 && (
        <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
          {data.map((c) => (
            <button key={c.id} type="button" onClick={() => { onPick(c); setQ(""); }} className="block w-full px-3 py-1.5 text-left text-xs hover:bg-slate-100 dark:hover:bg-slate-800">
              <span className="font-medium text-slate-900 dark:text-white">{c.name}</span> <span className="text-slate-500">{c.email}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function People({ j, refetchAll }) {
  const toast = useToast();
  const [status, setStatus] = useState("");
  const [open, setOpen] = useState(null);
  const [picked, setPicked] = useState([]);
  const { data: rows, refetch } = useApi(() => marketing.journeys.enrollments(j.id, status ? { status } : undefined), [j.id, status], { pollingInterval: j.status === "active" ? 10000 : null });
  const { data: hist } = useApi(() => (open ? marketing.journeys.history(j.id, open) : Promise.resolve(null)), [open]);
  const [busy, run] = useRun(toast, async () => { await refetch(); await refetchAll(); });
  return (
    <Section title="People in this journey" subtitle="Every enrollment, where it is, and what happened at each step" icon={Users}>
      {j.status === "active" && (
        <div className="mb-3 space-y-2 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
          <p className="text-xs font-medium text-slate-700 dark:text-slate-200">Enroll contacts by hand</p>
          <ContactPicker onPick={(c) => setPicked((p) => (p.some((x) => x.id === c.id) ? p : [...p, c]))} />
          {picked.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {picked.map((c) => <span key={c.id} className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[11px] dark:bg-slate-900">{c.name}<button type="button" aria-label="Remove" onClick={() => setPicked((p) => p.filter((x) => x.id !== c.id))}><X size={10} /></button></span>)}
              <PrimaryBtn disabled={busy === "enroll"} onClick={() => run("enroll", () => marketing.journeys.enroll(j.id, picked.map((c) => c.id)), (r) => `Enrolled ${r.enrolled}${r.skipped ? ` · ${r.skipped} already in or not allowed back` : ""}`).then((r) => r && setPicked([]))}>Enroll {picked.length}</PrimaryBtn>
            </div>
          )}
        </div>
      )}
      <div className="mb-2 flex items-center gap-2">
        <SelectInput value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter">
          <option value="">Everyone</option>
          {["active", "waiting", "completed", "exited", "failed"].map((s) => <option key={s} value={s}>{s}</option>)}
        </SelectInput>
      </div>
      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-100 dark:border-slate-800">{["Contact", "Status", "Step", "Until", "Version", "Entered", ""].map((h) => <th key={h} className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {(rows ?? []).map((e) => (
              <tr key={e.id} className={open === e.id ? "bg-violet-50/50 dark:bg-violet-500/5" : ""}>
                <td className="px-3 py-2"><button type="button" onClick={() => setOpen(open === e.id ? null : e.id)} className="text-left"><span className="font-medium text-slate-900 dark:text-white">{e.contact.name}</span><br /><span className="text-xs text-slate-500">{e.contact.email}</span></button></td>
                <td className="px-3 py-2"><StatusBadge label={e.exitReason === "goal" ? "converted" : e.status} variant={{ active: "info", waiting: "indigo", completed: "success", exited: "neutral", failed: "danger" }[e.status] ?? "neutral"} />{e.lastError && <p className="mt-0.5 max-w-xs truncate text-[11px] text-rose-600">{e.lastError}</p>}</td>
                <td className="px-3 py-2 text-xs text-slate-500">{e.nodeId ? (j.draft.nodes[e.nodeId]?.label || TYPES[j.draft.nodes[e.nodeId]?.type]?.label || e.nodeId) : "—"}{e.waitEvent ? ` · for ${EVENT_LABEL[e.waitEvent] ?? e.waitEvent}` : ""}</td>
                <td className="px-3 py-2 text-xs text-slate-500">{["active", "waiting"].includes(e.status) && e.waitUntil ? when(e.waitUntil) : "—"}</td>
                <td className="px-3 py-2 text-xs text-slate-500">v{e.version}</td>
                <td className="px-3 py-2 text-xs text-slate-500">{when(e.enteredAt)}</td>
                <td className="px-3 py-2 text-right">{["active", "waiting"].includes(e.status) && <GhostBtn onClick={() => window.confirm(`Remove ${e.contact.name} from this journey?`) && run("rm", () => marketing.journeys.removeEnrollment(j.id, e.id), "Removed")}>Remove</GhostBtn>}</td>
              </tr>
            ))}
            {!rows?.length && <tr><td colSpan={7} className="px-3 py-6 text-center text-sm text-slate-400">No one has entered yet.</td></tr>}
          </tbody>
        </table>
      </div>
      {open && hist && (
        <ol className="mt-3 space-y-1 rounded-lg border border-slate-200 p-3 text-xs dark:border-slate-700">
          {hist.map((h) => (
            <li key={h.seq} className="flex flex-wrap gap-2">
              <span className="w-36 text-slate-400">{when(h.at)}</span>
              <span className="font-medium text-slate-800 dark:text-slate-100">{TYPES[h.type]?.label ?? h.type}</span>
              <span className={h.outcome === "failed" ? "text-rose-600" : h.outcome === "retry" ? "text-amber-600" : "text-slate-500"}>{h.outcome}</span>
              <span className="text-slate-500">{h.error ?? Object.entries(h.detail ?? {}).filter(([k]) => !k.endsWith("Id")).map(([k, v]) => `${k}: ${v}`).join(" · ")}</span>
            </li>
          ))}
          {!hist.length && <li className="text-slate-400">No steps yet.</li>}
        </ol>
      )}
    </Section>
  );
}

// ── Editor ───────────────────────────────────────────────────────────────────
export default function JourneyEditor({ id, kind, onClose, onChanged }) {
  const toast = useToast();
  const { data: j, refetch } = useApi(() => marketing.journeys.get(id), [id]);
  const { data: catalog } = useApi(() => marketing.journeys.catalog(), []);
  const { data: pickers } = useApi(() => marketing.journeys.pickers(), [id]);
  const { data: stats, refetch: restat } = useApi(() => marketing.journeys.stats(id), [id, j?.status], { pollingInterval: j?.status === "active" ? 10000 : null });
  const [def, setDefState] = useState(null);
  const [name, setName] = useState("");
  const [dirty, setDirty] = useState(false);
  const [selected, setSelected] = useState("trigger");
  const [problems, setProblems] = useState(null);
  const [sim, setSim] = useState(null);
  const [busy, run] = useRun(toast, async () => { await refetch(); await restat(); onChanged?.(); });

  useEffect(() => { if (j && !dirty) { setDefState(j.draft); setName(j.name); } }, [j, dirty]);
  const setDef = (d) => { setDefState(d); setDirty(true); setProblems(null); };

  const pick = useMemo(() => ({
    emails: pickers?.emails ?? [],
    allEmails: pickers?.emails ?? [],
    audiences: pickers?.audiences ?? [], members: pickers?.members ?? [], routes: pickers?.routes ?? [],
    events: catalog?.events ?? Object.keys(EVENT_LABEL),
  }), [pickers, catalog]);

  if (!j || !def) return <Loading rows={6} />;
  const readOnly = j.status === "archived";

  const ctx = {
    def, pick, stats, selected, select: setSelected,
    add: (slot, type) => {
      const nid = `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
      const prev = slot.from === "entry" ? def.entry : def.nodes[slot.from][slot.key];
      const firstExit = TYPES[type].exits[0][0];
      const node = { type, ...defaults(type), [firstExit]: prev ?? null };
      for (const [k] of TYPES[type].exits) if (node[k] === undefined) node[k] = null;
      const nodes = { ...def.nodes, [nid]: node };
      if (slot.from !== "entry") nodes[slot.from] = { ...nodes[slot.from], [slot.key]: nid };
      setDef({ ...def, nodes, entry: slot.from === "entry" ? nid : def.entry });
      setSelected(nid);
    },
  };

  const updateNode = (nid, n) => setDef({ ...def, nodes: { ...def.nodes, [nid]: n } });
  const deleteNode = (nid) => {
    const n = def.nodes[nid];
    const exits = TYPES[n.type].exits.map(([k]) => k);
    const heir = exits.length === 1 ? n[exits[0]] : null;
    const nodes = {};
    for (const [k, v] of Object.entries(def.nodes)) {
      if (k === nid) continue;
      const copy = { ...v };
      for (const [e] of TYPES[v.type].exits) if (copy[e] === nid) copy[e] = heir;
      nodes[k] = copy;
    }
    setDef({ ...def, nodes, entry: def.entry === nid ? heir : def.entry });
    setSelected("trigger");
  };

  const normalized = () => ({
    ...def, goal: def.goal && normalizeTree(def.goal), exit: def.exit && normalizeTree(def.exit),
    nodes: Object.fromEntries(Object.entries(def.nodes).map(([k, n]) => [k, n.type === "condition" ? { ...n, rules: normalizeTree(n.rules) } : n])),
  });
  const save = () => run("save", () => marketing.journeys.update(id, { name, draft: normalized() }), "Draft saved").then((r) => { if (r) setDirty(false); return r; });
  const publish = async () => {
    if (dirty && !(await save())) return;
    const chk = await marketing.journeys.check(id).catch((e) => ({ ready: false, problems: [e.message] }));
    setProblems(chk.problems);
    if (!chk.ready) return;
    const note = window.prompt(j.version ? `Publish version ${j.version + 1}? People already inside stay on version ${j.version}. Optional note:` : "Publish and start this journey? Optional note:", "");
    if (note === null) return;
    run("pub", () => marketing.journeys.publish(id, note), (r) => `Version ${r.version} is live`);
  };
  const test = async (contact) => {
    if (dirty && !(await save())) return;
    const r = await run("sim", () => marketing.journeys.simulate(id, { contactId: contact.id }));
    if (r) setSim(r);
  };

  const inspector = selected === "trigger" ? <TriggerSettings def={def} setDef={setDef} pick={pick} kind={kind} />
    : selected === "goal" || selected === "exit" ? <RulesSettings which={selected} def={def} setDef={setDef} />
      : def.nodes[selected] ? <NodeSettings key={selected} node={def.nodes[selected]} pick={pick} onChange={(n) => updateNode(selected, n)} onDelete={() => deleteNode(selected)} />
        : null;
  const triggerText = { manual: "Added by hand", contact_created: "A contact is added to the CRM", event: `Contact: ${EVENT_LABEL[def.trigger.event] ?? def.trigger.event}`, audience: `${pick.audiences.find((a) => a.id === def.trigger.audienceId)?.name ?? "Choose an audience"}, every ${def.trigger.every}` }[def.trigger.type];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input value={name} disabled={readOnly} onChange={(e) => { setName(e.target.value); setDirty(true); }} aria-label="Name"
          className="min-w-0 flex-1 rounded-md bg-transparent px-1 text-lg font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-violet-500/30 dark:text-white" />
        <StatusBadge label={j.status} variant={JOURNEY_STATUS[j.status] ?? "neutral"} dot />
        {j.version && <span className="text-xs text-slate-500">live: v{j.version}</span>}
        {dirty && <span className="text-xs text-amber-600">unsaved changes</span>}
      </div>
      <div className="flex flex-wrap gap-2">
        {!readOnly && <GhostBtn disabled={busy === "save" || !dirty} onClick={save}>Save draft</GhostBtn>}
        {!readOnly && <PrimaryBtn disabled={busy === "pub"} onClick={publish}><CheckCircle2 size={13} /> {j.version ? "Publish changes" : "Publish"}</PrimaryBtn>}
        {j.status === "active" && <GhostBtn onClick={() => run("pause", () => marketing.journeys.pause(id), "Paused — nobody moves until you resume")}><Pause size={13} /> Pause</GhostBtn>}
        {j.status === "paused" && <GhostBtn onClick={() => run("resume", () => marketing.journeys.resume(id), "Resumed")}><Play size={13} /> Resume</GhostBtn>}
        <GhostBtn onClick={() => run("dup", () => marketing.journeys.duplicate(id), "Copied as a new draft")}><Copy size={13} /> Duplicate</GhostBtn>
        {!readOnly && j.version && <GhostBtn onClick={() => window.confirm(`Archive? ${stats?.inside ?? 0} contact(s) inside will leave, and it can't be restarted.`) && run("arch", () => marketing.journeys.archive(id), (r) => `Archived · ${r.removed} removed`)}><Archive size={13} /> Archive</GhostBtn>}
        {j.status !== "active" && <GhostBtn onClick={() => window.confirm("Delete this journey and its history?") && run("del", () => marketing.journeys.remove(id), "Deleted").then((r) => r && onClose())}><Trash2 size={13} /> Delete</GhostBtn>}
        <GhostBtn onClick={onClose}>Close</GhostBtn>
      </div>
      {j.lastError && <p className="flex items-start gap-2 rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"><AlertTriangle size={15} className="mt-0.5 shrink-0" /> {j.lastError}</p>}
      {problems?.length > 0 && <ul className="list-disc space-y-0.5 rounded-lg bg-amber-50 p-3 pl-8 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">{problems.map((p) => <li key={p}>{p}</li>)}</ul>}
      {j.version && j.status !== "archived" && <p className="text-[11px] text-slate-500">Editing changes the draft only. Version {j.version} keeps running until you publish.</p>}

      {stats && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {[["Entered", stats.entered], ["Inside now", stats.inside], ["Completed", stats.completed], ["Converted", stats.converted], ["Exited", stats.exited], ["Failed", stats.failed]].map(([l, v]) => (
            <div key={l} className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60"><p className="text-lg font-semibold text-slate-900 dark:text-white">{fmtNum(v)}</p><p className="text-[11px] text-slate-500">{l}</p></div>
          ))}
        </div>
      )}
      {stats?.runs?.length > 0 && <p className="text-[11px] text-slate-500">Scheduled runs: {stats.runs.slice(0, 5).map((r) => `${when(r.at)} (${fmtNum(r.enrolled)} enrolled)`).join(" · ")}{j.nextRunAt && j.status === "active" ? ` · next ${when(j.nextRunAt)}` : ""}</p>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-50/60 p-4 lg:col-span-2 dark:border-slate-700 dark:bg-slate-900/40">
          <div className="flex min-w-max flex-col items-center">
            <button type="button" onClick={() => setSelected("trigger")}
              className={`w-60 rounded-xl border bg-white p-3 text-left shadow-sm dark:bg-slate-900 ${selected === "trigger" ? "border-violet-500 ring-2 ring-violet-500/20" : "border-slate-200 dark:border-slate-700"}`}>
              <div className="flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-500/10"><Zap size={14} className="text-amber-600" /></span><span className="text-xs font-semibold text-slate-900 dark:text-white">Trigger</span></div>
              <p className="mt-1.5 truncate text-[11px] text-slate-500">{triggerText}</p>
            </button>
            <Line />
            <Branch nodeId={def.entry} ctx={readOnly ? { ...ctx, add: () => {} } : ctx} seen={new Set()} slot={{ from: "entry", key: "entry" }} />
            <div className="mt-6 flex gap-2">
              <button type="button" onClick={() => setSelected("goal")} className={`flex items-center gap-1 rounded-full px-3 py-1 text-[11px] ${def.goal ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" : "bg-slate-100 text-slate-500 dark:bg-slate-800"}`}><Flag size={11} /> Goal{def.goal ? "" : ": none"}</button>
              <button type="button" onClick={() => setSelected("exit")} className={`flex items-center gap-1 rounded-full px-3 py-1 text-[11px] ${def.exit ? "bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300" : "bg-slate-100 text-slate-500 dark:bg-slate-800"}`}><LogOut size={11} /> Exit rules{def.exit ? "" : ": none"}</button>
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <div className={`rounded-xl border border-slate-200 p-4 dark:border-slate-700 ${readOnly ? "pointer-events-none opacity-60" : ""}`}>{inspector}</div>
          <div className="space-y-2 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
            <div className="flex items-center gap-2"><FlaskConical size={15} className="text-violet-500" /><span className="text-sm font-semibold text-slate-900 dark:text-white">Test with a contact</span></div>
            <p className="text-[11px] text-slate-500">Walks the saved draft for one real contact. Nothing is sent or changed.</p>
            <ContactPicker onPick={test} placeholder="Pick a contact to test" />
            {sim && (
              <div className="space-y-1 text-xs">
                <p className="font-medium text-slate-800 dark:text-slate-100">{sim.contact.name}</p>
                <ol className="list-decimal space-y-0.5 pl-5 text-slate-600 dark:text-slate-300">
                  {sim.path.map((s, i) => <li key={i}>{s.label}{s.note ? <span className="text-slate-400"> — {s.note}</span> : null}</li>)}
                </ol>
                <p className="text-slate-500">{sim.outcome}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {j.version && <People j={j} refetchAll={restat} />}
    </div>
  );
}
