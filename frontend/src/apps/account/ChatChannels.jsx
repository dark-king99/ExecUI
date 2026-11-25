/**
 * Chat channels — send ExecUI events to Slack and Microsoft Teams (admins).
 *
 * Slack: connect the workspace once, then pick a channel per category.
 * Teams: paste a Workflows webhook URL per channel (created in Teams); it's
 * stored encrypted and never shown again. Each route has Test, on/off and
 * remove, and shows its last error so a broken channel is visible.
 */
import { useState } from "react";
import { MessageSquare, Plus, Trash2, Send, Loader2, Link2 } from "lucide-react";
import { Card, CardHeader, CardBody } from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import { useToast } from "../../components/ui/Toast";
import { useApi } from "../../hooks/useApi";
import { connections } from "../../services/api";

const field = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white";

export default function ChatChannels() {
  const toast = useToast();
  const { data, refetch } = useApi(() => connections.chat.get(), [], { cacheKey: "chat:routes" });
  const [channels, setChannels] = useState(null);
  const [form, setForm] = useState({ provider: "slack", category: "network_alerts", channel: "", webhookUrl: "", label: "" });
  const [busy, setBusy] = useState(null);

  const run = async (key, fn, ok) => {
    setBusy(key);
    try { const r = await fn(); if (ok) toast({ message: ok, type: "success" }); refetch(); return r; }
    catch (e) { toast({ message: e.message, type: "error" }); return null; }
    finally { setBusy(null); }
  };

  const connectSlack = async () => {
    const r = await run("slack", () => connections.startWith("slack", "workspace", []));
    if (r?.url) window.location.href = r.url;
  };
  const loadChannels = () => run("channels", async () => setChannels(await connections.chat.slackChannels()));
  const add = () => run("add", async () => {
    const ch = channels?.find((c) => c.id === form.channel);
    await connections.chat.addRoute(form.provider === "slack"
      ? { provider: "slack", category: form.category, channel: form.channel, channelName: ch?.name }
      : { provider: "teams", category: form.category, webhookUrl: form.webhookUrl, label: form.label });
    setForm((f) => ({ ...f, channel: "", webhookUrl: "", label: "" }));
  }, "Channel added");

  const slack = data?.slack;
  const categories = data?.categories ?? [];

  return (
    <Card>
      <CardHeader title="Chat channels" subtitle="Post network alerts, new tickets, approvals and automation messages to Slack or Teams" icon={MessageSquare} />
      <CardBody className="space-y-4">
        <div className="flex flex-wrap items-center gap-3 rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-800/60">
          <span className="font-medium text-slate-800 dark:text-slate-100">Slack</span>
          {slack?.connected
            ? <StatusBadge label={`Connected · ${slack.workspace}`} variant="success" dot />
            : <StatusBadge label={slack?.configured ? "Not connected" : "Not set up on this server"} variant="neutral" />}
          <button type="button" disabled={!slack?.configured || busy === "slack"} onClick={connectSlack}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
            {busy === "slack" ? <Loader2 size={12} className="animate-spin" /> : <Link2 size={12} />} {slack?.connected ? "Reconnect Slack" : "Add to Slack"}
          </button>
        </div>
        <p className="text-xs text-slate-500">
          Only titles, a short summary and a link back to ExecUI are posted — never ticket bodies or customer messages. For Teams, create a
          webhook in the channel (… → Workflows → “Post to a channel when a webhook request is received”) and paste its URL here.
        </p>

        <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
          <select className={field} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} aria-label="What to post">
            {categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          <select className={field} value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} aria-label="Where">
            <option value="slack">Slack</option>
            <option value="teams">Microsoft Teams</option>
          </select>
          {form.provider === "slack" ? (
            channels ? (
              <select className={field} value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })} aria-label="Slack channel">
                <option value="">Choose a channel…</option>
                {channels.map((c) => <option key={c.id} value={c.id}>{c.private ? "🔒" : "#"}{c.name}{c.private && !c.member ? " (invite the app first)" : ""}</option>)}
              </select>
            ) : (
              <button type="button" disabled={!slack?.connected || busy === "channels"} onClick={loadChannels} className={`${field} text-left disabled:opacity-50`}>
                {busy === "channels" ? "Loading channels…" : slack?.connected ? "Load Slack channels" : "Connect Slack first"}
              </button>
            )
          ) : (
            <>
              <input className={field} placeholder="Label, e.g. IT › Alerts" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
              <input className={`${field} md:col-span-4`} placeholder="https://…logic.azure.com/… or …powerplatform.com/…" value={form.webhookUrl} onChange={(e) => setForm({ ...form, webhookUrl: e.target.value })} />
            </>
          )}
          <button type="button" onClick={add}
            disabled={busy === "add" || (form.provider === "slack" ? !form.channel : !form.webhookUrl)}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-50">
            <Plus size={14} /> Add
          </button>
        </div>

        <div className="space-y-2">
          {(data?.routes ?? []).length === 0 && <p className="text-sm text-slate-500">Nothing is posted to chat yet.</p>}
          {(data?.routes ?? []).map((r) => (
            <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-700">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-slate-900 dark:text-white">{r.categoryLabel} → {r.provider === "slack" ? "Slack" : "Teams"} {r.label}</p>
                <p className="text-xs text-slate-500">{r.lastSentAt ? `Last posted ${new Date(r.lastSentAt).toLocaleString()}` : "Nothing posted yet"}</p>
                {r.lastError && <p className="text-xs text-amber-600 dark:text-amber-400">{r.lastError}</p>}
              </div>
              <label className="flex items-center gap-1.5 text-xs text-slate-500">
                <input type="checkbox" checked={r.enabled} onChange={(e) => run(r.id, () => connections.chat.toggleRoute(r.id, e.target.checked))} /> On
              </label>
              <button type="button" disabled={busy === `t${r.id}`} onClick={() => run(`t${r.id}`, () => connections.chat.testRoute(r.id), "Test message posted")}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:border-indigo-400 dark:border-slate-700 dark:text-slate-300">
                <Send size={12} /> Test
              </button>
              <button type="button" aria-label="Remove" onClick={() => window.confirm("Stop posting here?") && run(r.id, () => connections.chat.removeRoute(r.id), "Removed")}
                className="rounded p-1.5 text-slate-400 hover:text-red-600"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}
