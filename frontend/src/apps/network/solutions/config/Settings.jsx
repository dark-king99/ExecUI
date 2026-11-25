/**
 * Network settings — what the collectors scan and how, the thresholds that
 * raise alerts, the collectors themselves, and an optional monitoring tool.
 *
 * Everything here is saved and used. Secrets (SNMP community, monitoring API
 * token) are write-only: the page only learns whether one is set. A
 * collector's token is shown once, right after it's created.
 */
import { useEffect, useState } from "react";
import { Settings as SettingsIcon, Save, Radar, Plus, Copy, Check, Ban, RefreshCw, Link2, AlertTriangle, Bell } from "lucide-react";
import { useToast } from "../../../../components/ui/Toast";
import { useApi } from "../../../../hooks/useApi";
import { network } from "../../../../services/api";
import { SolutionShell, Section, Loading, Field, TextInput, SelectInput, PrimaryBtn, GhostBtn, Pill, timeAgo } from "../../components/net-ui";

const apiOrigin = () => {
  const base = import.meta.env.VITE_API_BASE_URL;
  try { return base && /^https?:/.test(base) ? new URL(base).origin : window.location.origin; } catch { return window.location.origin; }
};

function CopyBlock({ value }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-start gap-2">
      <pre className="min-w-0 flex-1 overflow-x-auto whitespace-pre-wrap break-all rounded-lg bg-slate-900 p-3 font-mono text-[11px] text-slate-100">{value}</pre>
      <button type="button" aria-label="Copy" onClick={async () => { try { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* blocked */ } }}
        className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:text-slate-800 dark:border-slate-700">
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
    </div>
  );
}

function Collectors({ canManage, toast }) {
  const { data, loading, refetch } = useApi(() => network.collectors.list(), [], { pollingInterval: 30000 });
  const [name, setName] = useState("");
  const [issued, setIssued] = useState(null);
  const [busy, setBusy] = useState(false);

  const create = async () => {
    setBusy(true);
    try {
      const r = await network.collectors.create({ name });
      setIssued(r);
      setName("");
      refetch();
    } catch (e) { toast({ message: e.message, type: "error" }); } finally { setBusy(false); }
  };
  const revoke = async (c) => {
    if (!window.confirm(`Revoke "${c.name}"? It stops reporting immediately and its token can't be used again.`)) return;
    try { await network.collectors.revoke(c.id); toast({ message: "Collector revoked", type: "success" }); refetch(); }
    catch (e) { toast({ message: e.message, type: "error" }); }
  };
  const command = issued && `EXECUI_URL=${apiOrigin()} \\\nEXECUI_COLLECTOR_TOKEN=${issued.token} \\\nnpx --yes ./collector   # or: node collector/bin/execui-collector.js`;

  return (
    <Section title="Collectors" subtitle="Small agents you run inside your network. They find devices, poll them, and map how they connect." icon={Radar}>
      {issued && (
        <div className="mb-4 space-y-2 rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-500/40 dark:bg-amber-500/10">
          <p className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white"><AlertTriangle size={15} className="text-amber-500" /> Copy this token now — it won't be shown again</p>
          <CopyBlock value={issued.token} />
          <p className="text-xs text-slate-600 dark:text-slate-300">On a machine inside the network (Node.js 18+), from the ExecUI <code>collector</code> folder:</p>
          <CopyBlock value={command} />
          <button type="button" onClick={() => setIssued(null)} className="text-xs text-slate-500 underline">I've saved it</button>
        </div>
      )}
      {loading && !data ? <Loading rows={2} /> : (
        <div className="space-y-2">
          {(data ?? []).length === 0 && <p className="text-sm text-slate-500">No collectors yet. Without one, devices here are only what people type in.</p>}
          {(data ?? []).map((c) => (
            <div key={c.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900 dark:text-white">{c.name} <span className="font-mono text-[11px] text-slate-400">{c.tokenPrefix}…</span></p>
                <p className="text-xs text-slate-500">
                  {c.hostname ? `${c.hostname} · ${c.platform ?? ""} · v${c.version ?? "?"}` : "Never connected"}
                  {c.lastReportAt ? ` · last report ${timeAgo(c.lastReportAt)}` : ""}
                </p>
                {c.lastError && <p className="text-xs text-amber-600 dark:text-amber-400">{c.lastError}</p>}
              </div>
              {c.revoked ? <Pill color="slate">Revoked</Pill> : c.online ? <Pill color="emerald">Online</Pill> : <Pill color="amber">{c.lastSeenAt ? "Offline" : "Waiting"}</Pill>}
              {canManage && !c.revoked && <GhostBtn onClick={() => revoke(c)}><Ban size={13} /> Revoke</GhostBtn>}
            </div>
          ))}
          {canManage && (
            <div className="flex gap-2 pt-1">
              <TextInput placeholder="Name, e.g. Head office" value={name} onChange={(e) => setName(e.target.value)} />
              <PrimaryBtn color="amber" disabled={!name.trim() || busy} onClick={create}><Plus size={14} /> Add collector</PrimaryBtn>
            </div>
          )}
        </div>
      )}
    </Section>
  );
}

export default function Settings() {
  const toast = useToast();
  const { data: settings, loading, refetch } = useApi(() => network.settings.get(), [], {});
  const { data: presets } = useApi(() => network.settings.profiles.list(), [], {});
  const [form, setForm] = useState(null);
  const [secret, setSecret] = useState({ snmpCommunity: "", monitoringToken: "" });
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  // Admins and roles granted "Manage network collection" can change these. The
  // server decides; anyone else gets its explanation when they try.

  useEffect(() => {
    if (settings) setForm({ ...settings, subnetsText: (settings.subnets ?? []).join("\n"), monitoringUrl: settings.monitoring?.url ?? "", monitoringTool: settings.monitoring?.tool ?? "" });
  }, [settings]);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const f = form ?? {};

  const save = async () => {
    setSaving(true);
    try {
      const body = {
        subnets: f.subnetsText, pollingIntervalSec: Number(f.pollingIntervalSec), discoveryIntervalMin: Number(f.discoveryIntervalMin),
        snmpVersion: f.snmpVersion, cpuThreshold: Number(f.cpuThreshold), memThreshold: Number(f.memThreshold),
        autoResolveAlerts: !!f.autoResolveAlerts, alertEmail: f.alertEmail ?? "", metricRetentionDays: Number(f.metricRetentionDays),
        ...(secret.snmpCommunity ? { snmpCommunity: secret.snmpCommunity } : {}),
        monitoring: f.monitoringTool ? { tool: f.monitoringTool, url: f.monitoringUrl, ...(secret.monitoringToken ? { token: secret.monitoringToken } : {}) } : { tool: null },
      };
      await network.settings.update(body);
      setSecret({ snmpCommunity: "", monitoringToken: "" });
      toast({ message: "Settings saved — collectors pick them up on their next check-in", type: "success" });
      refetch();
    } catch (e) { toast({ message: e.message, type: "error" }); } finally { setSaving(false); }
  };
  const applyPreset = async (p) => {
    try { await network.settings.profiles.update(p.id, {}); toast({ message: `Applied “${p.name}”`, type: "success" }); refetch(); }
    catch (e) { toast({ message: e.message, type: "error" }); }
  };
  const syncNow = async () => {
    setSyncing(true);
    try { const r = await network.monitoring.sync(); toast({ message: `Imported ${r.devices} devices and ${r.links} links`, type: "success" }); refetch(); }
    catch (e) { toast({ message: e.message, type: "error" }); } finally { setSyncing(false); }
  };

  return (
    <SolutionShell solutionId="config" title="Settings" subtitle="Discovery, polling and alerting — used by your collectors"
      actions={<PrimaryBtn color="amber" disabled={saving || !form} onClick={save}>{saving ? "Saving…" : <><Save size={14} /> Save</>}</PrimaryBtn>}>
      <Collectors canManage toast={toast} />

      {loading && !settings ? <Loading rows={4} /> : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Section title="What to scan" icon={SettingsIcon}>
            <div className="space-y-3">
              <Field label="Subnets (one per line, private ranges, /20 or smaller)">
                <textarea rows={4} value={f.subnetsText ?? ""} onChange={(e) => set("subnetsText", e.target.value)} placeholder={"192.168.1.0/24\n10.0.5.0/24"}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Poll every (seconds)"><TextInput type="number" min={30} value={f.pollingIntervalSec ?? 60} onChange={(e) => set("pollingIntervalSec", e.target.value)} /></Field>
                <Field label="Discover every (minutes)"><TextInput type="number" min={15} value={f.discoveryIntervalMin ?? 60} onChange={(e) => set("discoveryIntervalMin", e.target.value)} /></Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="SNMP version"><SelectInput value={f.snmpVersion ?? "v2c"} onChange={(e) => set("snmpVersion", e.target.value)}>{["v2c", "v1"].map((v) => <option key={v}>{v}</option>)}</SelectInput></Field>
                <Field label={`SNMP community${f.hasSnmpCommunity ? " (set — type to replace)" : " (default: public)"}`}>
                  <TextInput type="password" autoComplete="off" value={secret.snmpCommunity} onChange={(e) => setSecret((s) => ({ ...s, snmpCommunity: e.target.value }))} placeholder={f.hasSnmpCommunity ? "••••••••" : "public"} />
                </Field>
              </div>
              <p className="text-[11px] text-slate-400">SNMPv3 isn't supported by the collector yet.</p>
            </div>
          </Section>

          <Section title="Alerts & history" icon={Bell}>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="CPU alert at (%)"><TextInput type="number" value={f.cpuThreshold ?? 85} onChange={(e) => set("cpuThreshold", e.target.value)} /></Field>
                <Field label="Memory alert at (%)"><TextInput type="number" value={f.memThreshold ?? 90} onChange={(e) => set("memThreshold", e.target.value)} /></Field>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                <input type="checkbox" checked={!!f.autoResolveAlerts} onChange={(e) => set("autoResolveAlerts", e.target.checked)} /> Resolve alerts automatically when the condition clears
              </label>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Alert email (optional)"><TextInput type="email" value={f.alertEmail ?? ""} onChange={(e) => set("alertEmail", e.target.value)} /></Field>
                <Field label="Keep metric history (days)"><TextInput type="number" value={f.metricRetentionDays ?? 30} onChange={(e) => set("metricRetentionDays", e.target.value)} /></Field>
              </div>
              {presets?.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {presets.map((p) => <GhostBtn key={p.id} title={p.description} onClick={() => applyPreset(p)}>Apply “{p.name}”</GhostBtn>)}
                </div>
              )}
            </div>
          </Section>

          <Section title="Existing monitoring tool" subtitle="Import devices, traffic and links from a tool you already run" icon={Link2} className="lg:col-span-2">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Field label="Tool"><SelectInput value={f.monitoringTool ?? ""} onChange={(e) => set("monitoringTool", e.target.value)}><option value="">None</option><option value="librenms">LibreNMS</option></SelectInput></Field>
              <Field label="Address"><TextInput value={f.monitoringUrl ?? ""} onChange={(e) => set("monitoringUrl", e.target.value)} placeholder="https://librenms.example.com" disabled={!f.monitoringTool} /></Field>
              <Field label={`API token${f.monitoring?.hasToken ? " (set — type to replace)" : ""}`}>
                <TextInput type="password" autoComplete="off" disabled={!f.monitoringTool} value={secret.monitoringToken} onChange={(e) => setSecret((s) => ({ ...s, monitoringToken: e.target.value }))} placeholder={f.monitoring?.hasToken ? "••••••••" : ""} />
              </Field>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
              {f.monitoring?.tool && <GhostBtn disabled={syncing} onClick={syncNow}><RefreshCw size={13} className={syncing ? "animate-spin" : ""} /> Sync now</GhostBtn>}
              {f.monitoring?.lastSyncAt && <span>Last import {timeAgo(f.monitoring.lastSyncAt)}</span>}
              {f.monitoring?.lastError && <span className="text-amber-600 dark:text-amber-400">{f.monitoring.lastError}</span>}
              <span>Imports every 10 minutes. CPU and memory come from collectors; LibreNMS supplies status, traffic and links.</span>
            </div>
          </Section>
        </div>
      )}
    </SolutionShell>
  );
}
