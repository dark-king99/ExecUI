import { useState } from "react";
import { Globe, Router, Wifi, Gauge, Server, Bell, Plus, Pencil, Trash2, ArrowDown, ArrowUp } from "lucide-react";
import { network } from "../../../../services/api";
import { useApi } from "../../../../hooks/useApi";
import { useToast } from "../../../../components/ui/Toast";
import {
  SolutionShell, MetricGrid, Section, Modal, Field, TextInput, SelectInput,
  PrimaryBtn, GhostBtn, Pill, Loading, ErrorNote, fmtNum,
} from "../../components/net-ui";

const LINK_TYPES = ["fiber", "dsl", "lte", "fixed_wireless", "satellite", "other"];
const STATUS_COLOR = { up: "emerald", degraded: "amber", down: "rose" };
const titleCase = (s) => String(s || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

function ConnForm({ initial, onClose, onSubmit, busy }) {
  const [v, setV] = useState(initial ?? { linkType: "fiber", role: "primary", status: "up", currency: "LRD" });
  const set = (k, val) => setV((s) => ({ ...s, [k]: val }));
  return (
    <Modal
      title={initial?.id ? `Edit ${initial.name}` : "Add internet link"}
      onClose={onClose}
      footer={<><GhostBtn onClick={onClose}>Cancel</GhostBtn><PrimaryBtn onClick={() => onSubmit(v)} disabled={busy}>{busy ? "Saving…" : "Save"}</PrimaryBtn></>}
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Name *"><TextInput value={v.name ?? ""} onChange={(e) => set("name", e.target.value)} placeholder="Primary Fiber" /></Field>
        <Field label="Provider (ISP)"><TextInput value={v.provider ?? ""} onChange={(e) => set("provider", e.target.value)} placeholder="Orange Liberia" /></Field>
        <Field label="Link type"><SelectInput value={v.linkType} onChange={(e) => set("linkType", e.target.value)}>{LINK_TYPES.map((t) => <option key={t} value={t}>{titleCase(t)}</option>)}</SelectInput></Field>
        <Field label="Role"><SelectInput value={v.role} onChange={(e) => set("role", e.target.value)}><option value="primary">Primary</option><option value="backup">Backup</option></SelectInput></Field>
        <Field label="Download (Mbps)"><TextInput type="number" value={v.downMbps ?? ""} onChange={(e) => set("downMbps", e.target.value)} /></Field>
        <Field label="Upload (Mbps)"><TextInput type="number" value={v.upMbps ?? ""} onChange={(e) => set("upMbps", e.target.value)} /></Field>
        <Field label="Public IP"><TextInput value={v.ipAddress ?? ""} onChange={(e) => set("ipAddress", e.target.value)} placeholder="102.x.x.x" /></Field>
        <Field label="Gateway / router IP"><TextInput value={v.gateway ?? ""} onChange={(e) => set("gateway", e.target.value)} placeholder="192.168.1.1" /></Field>
        <Field label="Status"><SelectInput value={v.status} onChange={(e) => set("status", e.target.value)}><option value="up">Up</option><option value="degraded">Degraded</option><option value="down">Down</option></SelectInput></Field>
        <Field label="Monthly cost"><TextInput type="number" value={v.monthlyCost ?? ""} onChange={(e) => set("monthlyCost", e.target.value)} /></Field>
        <Field label="Data used this month (GB)"><TextInput type="number" value={v.monthlyUsageGb ?? ""} onChange={(e) => set("monthlyUsageGb", e.target.value)} /></Field>
        <Field label="Data cap (GB, blank = unlimited)"><TextInput type="number" value={v.dataCapGb ?? ""} onChange={(e) => set("dataCapGb", e.target.value)} /></Field>
      </div>
    </Modal>
  );
}

function UsageBar({ pct }) {
  if (pct == null) return <span className="text-[11px] text-slate-400">Unlimited</span>;
  const color = pct >= 90 ? "bg-rose-500" : pct >= 70 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="w-full">
      <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[11px] text-slate-400">{pct}% of cap</span>
    </div>
  );
}

export default function Internet() {
  const toast = useToast();
  const { data: summary, refresh: refreshSummary } = useApi(() => network.connectivity.summary(), []);
  const { data: conns, loading, error, refresh } = useApi(() => network.connections.list(), []);
  const [editing, setEditing] = useState(null); // conn | {__new:true} | null
  const [busy, setBusy] = useState(false);

  const s = summary ?? {};
  const list = conns ?? [];

  const metrics = [
    { label: "Internet links", value: `${s.linksUp ?? 0}/${s.links ?? 0} up`, icon: Globe, color: "sky" },
    { label: "Total bandwidth", value: s.totalDownMbps ? `${fmtNum(s.totalDownMbps)}↓ / ${fmtNum(s.totalUpMbps)}↑` : "—", icon: Gauge, color: "violet" },
    { label: "Data used", value: s.capGb ? `${fmtNum(s.usageGb)}/${fmtNum(s.capGb)} GB` : `${fmtNum(s.usageGb ?? 0)} GB`, icon: Wifi, color: "emerald", delta: s.usagePct != null ? `${s.usagePct}%` : undefined },
    { label: "Devices online", value: `${s.devicesUp ?? 0}/${s.devicesTotal ?? 0}`, icon: Server, color: "amber" },
  ];

  const save = async (v) => {
    if (!String(v.name ?? "").trim()) return toast.error("Name is required");
    setBusy(true);
    try {
      if (v.__new || !v.id) await network.connections.create(v);
      else await network.connections.update(v.id, v);
      toast.success("Saved");
      setEditing(null); refresh(); refreshSummary();
    } catch (e) { toast.error(e.message || "Could not save"); }
    finally { setBusy(false); }
  };
  const remove = async (id) => {
    try { await network.connections.remove(id); toast.success("Removed"); refresh(); refreshSummary(); }
    catch (e) { toast.error(e.message || "Could not remove"); }
  };

  return (
    <SolutionShell
      solutionId="connectivity"
      title="Internet Links"
      subtitle="Your ISP connections, bandwidth and data usage."
      actions={<PrimaryBtn onClick={() => setEditing({ __new: true })}><Plus size={14} /> Add link</PrimaryBtn>}
    >
      <MetricGrid items={metrics} cols={4} />

      {error && <ErrorNote error={error} />}
      {loading && !conns ? <Loading table /> : (
        <Section title="Connections" subtitle={`${s.routers ?? 0} router/gateway devices · ${s.alertsActive ?? 0} active alerts`}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {list.map((c) => (
              <div key={c.id} className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-white dark:bg-slate-900">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0"><Router size={17} className="text-slate-500 dark:text-slate-400" /></div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 dark:text-white text-sm truncate">{c.name}</p>
                      <p className="text-[11px] text-slate-400 truncate">{c.provider || titleCase(c.linkType)} · {titleCase(c.role)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Pill color={STATUS_COLOR[c.status] ?? "slate"}>{c.status}</Pill>
                    <button onClick={() => setEditing(c)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"><Pencil size={14} /></button>
                    <button onClick={() => remove(c.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600"><Trash2 size={14} /></button>
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-3 text-xs text-slate-600 dark:text-slate-300">
                  <span className="flex items-center gap-1"><ArrowDown size={12} className="text-emerald-500" />{c.downMbps ? `${fmtNum(c.downMbps)} Mbps` : "—"}</span>
                  <span className="flex items-center gap-1"><ArrowUp size={12} className="text-sky-500" />{c.upMbps ? `${fmtNum(c.upMbps)} Mbps` : "—"}</span>
                  {c.ipAddress && <span className="text-slate-400">IP {c.ipAddress}</span>}
                  {c.gateway && <span className="text-slate-400">GW {c.gateway}</span>}
                </div>
                <div className="mt-3">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                    <span>{fmtNum(c.monthlyUsageGb)} GB used{c.dataCapGb ? ` of ${fmtNum(c.dataCapGb)} GB` : ""}</span>
                    {c.monthlyCost != null && <span>{c.currency} {fmtNum(c.monthlyCost)}/mo</span>}
                  </div>
                  <UsageBar pct={c.usagePct} />
                </div>
              </div>
            ))}
          </div>
          {list.length === 0 && <p className="text-center text-sm text-slate-400 py-10">No internet links yet. Click “Add link” to register your office connection.</p>}
        </Section>
      )}

      {editing && (
        <ConnForm
          initial={editing.__new ? undefined : editing}
          busy={busy}
          onClose={() => setEditing(null)}
          onSubmit={save}
        />
      )}
    </SolutionShell>
  );
}
