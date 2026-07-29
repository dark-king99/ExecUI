/**
 * Developer console — API tokens and outbound webhooks.
 *
 * Two secrets are shown exactly once (an API token at creation, a webhook
 * signing secret at creation/rotation) because neither is recoverable from the
 * server: tokens are stored as hashes. The UI makes that one-time moment
 * obvious rather than letting someone assume they can come back for it.
 */
import { useState } from "react";
import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody } from "../../components/ui/Card";
import { useApi } from "../../hooks/useApi";
import { useToast } from "../../components/ui/Toast";
import { developer } from "../../services/api";
import {
  KeyRound, Webhook, Plus, Trash2, Copy, Check, AlertTriangle, X, Ban,
  RefreshCw, Send, Pause, Play, ExternalLink, ScrollText, ShieldCheck,
} from "lucide-react";

const cls = (...a) => a.filter(Boolean).join(" ");
const input = "w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white";
const when = (d) => (d ? new Date(d).toLocaleString() : "—");

/** A secret the server will never show again. */
function RevealOnce({ label, value, onDone }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* clipboard blocked */ }
  };
  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-500/40 dark:bg-amber-500/10">
      <div className="mb-2 flex items-start gap-2">
        <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-500" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">{label}</p>
          <p className="text-xs text-slate-500">Copy it now — for security it is stored hashed and can never be shown again.</p>
        </div>
        <button onClick={onDone} className="rounded p-1 text-slate-400 hover:text-slate-700"><X size={15} /></button>
      </div>
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-lg bg-white px-2.5 py-1.5 font-mono text-xs text-slate-800 dark:bg-slate-900 dark:text-slate-200">{value}</code>
        <button onClick={copy} className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-amber-500 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-amber-600">
          {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}

// ── API tokens ───────────────────────────────────────────────────────────────
function Tokens({ meta, toast }) {
  const { data: tokens, refetch } = useApi(() => developer.tokens.list(), [], { cacheKey: "dev:tokens" });
  const [form, setForm] = useState({ open: false, name: "", scopes: [], expiresInDays: "" });
  const [issued, setIssued] = useState(null);
  const [busy, setBusy] = useState(false);

  const toggleScope = (s) =>
    setForm((f) => ({ ...f, scopes: f.scopes.includes(s) ? f.scopes.filter((x) => x !== s) : [...f.scopes, s] }));

  const create = async () => {
    setBusy(true);
    try {
      const t = await developer.tokens.create({ name: form.name, scopes: form.scopes, expiresInDays: form.expiresInDays || undefined });
      setIssued(t.token);
      setForm({ open: false, name: "", scopes: [], expiresInDays: "" });
      toast.success?.("Token created.");
      refetch();
    } catch (e) { toast.error?.(e.message); } finally { setBusy(false); }
  };

  const act = async (fn, msg) => {
    try { await fn(); toast.success?.(msg); refetch(); } catch (e) { toast.error?.(e.message); }
  };

  return (
    <div className="space-y-4">
      {issued && <RevealOnce label="Your new API token" value={issued} onDone={() => setIssued(null)} />}

      <Card>
        <CardBody>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <KeyRound size={15} className="text-indigo-500" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">API tokens</h3>
            </div>
            <button onClick={() => setForm((f) => ({ ...f, open: !f.open }))}
              className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500">
              <Plus size={13} /> New token
            </button>
          </div>

          {form.open && (
            <div className="mb-4 space-y-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-[11px] uppercase tracking-wide text-slate-400">Name</span>
                  <input className={input} placeholder="Zapier integration" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] uppercase tracking-wide text-slate-400">Expires in (days)</span>
                  <input className={input} type="number" min="1" placeholder="Never" value={form.expiresInDays} onChange={(e) => setForm({ ...form, expiresInDays: e.target.value })} />
                </label>
              </div>
              <div>
                <span className="mb-1.5 block text-[11px] uppercase tracking-wide text-slate-400">Scopes — grant only what the integration needs</span>
                <div className="grid gap-1 sm:grid-cols-2">
                  {(meta?.scopes || []).map((s) => (
                    <label key={s.scope} className="flex cursor-pointer items-start gap-2 rounded px-1 py-1 text-sm hover:bg-slate-50 dark:hover:bg-slate-800">
                      <input type="checkbox" className="mt-0.5" checked={form.scopes.includes(s.scope)} onChange={() => toggleScope(s.scope)} />
                      <span>
                        <code className="text-xs font-medium text-slate-800 dark:text-slate-200">{s.scope}</code>
                        <span className="block text-[11px] text-slate-400">{s.description}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setForm({ open: false, name: "", scopes: [], expiresInDays: "" })} className="px-3 py-1.5 text-sm text-slate-500 hover:text-slate-800">Cancel</button>
                <button onClick={create} disabled={busy || !form.name.trim() || !form.scopes.length}
                  className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
                  {busy ? "Creating…" : "Create token"}
                </button>
              </div>
            </div>
          )}

          {!tokens?.length ? (
            <p className="py-8 text-center text-sm text-slate-400">No API tokens yet. Create one to let another system call ExecUI.</p>
          ) : (
            <div className="space-y-2">
              {tokens.map((t) => (
                <div key={t.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{t.name}</p>
                      {!t.active && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500 dark:bg-slate-800">{t.revokedAt ? "Revoked" : "Expired"}</span>}
                    </div>
                    <code className="text-[11px] text-slate-400">{t.prefix}</code>
                    <p className="mt-0.5 flex flex-wrap gap-1">
                      {t.scopes.map((s) => <span key={s} className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">{s}</span>)}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-400">
                      Last used {when(t.lastUsedAt)}{t.lastUsedIp ? ` from ${t.lastUsedIp}` : ""} · Created {when(t.createdAt)}
                      {t.expiresAt ? ` · Expires ${when(t.expiresAt)}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {t.active && (
                      <button onClick={() => window.confirm(`Revoke "${t.name}"? Any system using it stops working immediately.`) && act(() => developer.tokens.revoke(t.id), "Token revoked.")}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-600 hover:border-red-300 hover:text-red-600 dark:border-slate-700 dark:text-slate-300">
                        <Ban size={12} /> Revoke
                      </button>
                    )}
                    <button onClick={() => window.confirm("Delete this token record?") && act(() => developer.tokens.remove(t.id), "Token deleted.")}
                      className="rounded-lg border border-slate-200 p-1.5 text-slate-400 hover:text-red-500 dark:border-slate-700"><Trash2 size={13} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

// ── Webhooks ─────────────────────────────────────────────────────────────────
function Webhooks({ meta, toast }) {
  const { data: endpoints, refetch } = useApi(() => developer.webhooks.list(), [], { cacheKey: "dev:webhooks" });
  const [form, setForm] = useState({ open: false, url: "", description: "", events: ["*"] });
  const [secret, setSecret] = useState(null);
  const [busy, setBusy] = useState(false);

  const create = async () => {
    setBusy(true);
    try {
      const e = await developer.webhooks.create(form);
      setSecret(e.secret);
      setForm({ open: false, url: "", description: "", events: ["*"] });
      toast.success?.("Endpoint registered.");
      refetch();
    } catch (e) { toast.error?.(e.message); } finally { setBusy(false); }
  };

  const act = async (fn, msg) => {
    try { const r = await fn(); toast.success?.(r?.message || msg); refetch(); } catch (e) { toast.error?.(e.message); }
  };

  const toggleEvent = (ev) =>
    setForm((f) => {
      if (ev === "*") return { ...f, events: ["*"] };
      const base = f.events.filter((x) => x !== "*");
      return { ...f, events: base.includes(ev) ? base.filter((x) => x !== ev) : [...base, ev] };
    });

  return (
    <div className="space-y-4">
      {secret && <RevealOnce label="Webhook signing secret" value={secret} onDone={() => setSecret(null)} />}

      <Card>
        <CardBody>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Webhook size={15} className="text-indigo-500" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Webhook endpoints</h3>
            </div>
            <button onClick={() => setForm((f) => ({ ...f, open: !f.open }))}
              className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500">
              <Plus size={13} /> Add endpoint
            </button>
          </div>

          {form.open && (
            <div className="mb-4 space-y-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              <label className="block">
                <span className="mb-1 block text-[11px] uppercase tracking-wide text-slate-400">Endpoint URL (HTTPS)</span>
                <input className={input} placeholder="https://hooks.your-company.com/execui" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] uppercase tracking-wide text-slate-400">Description</span>
                <input className={input} placeholder="Sync deals into our data warehouse" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </label>
              <div>
                <span className="mb-1.5 block text-[11px] uppercase tracking-wide text-slate-400">Events</span>
                <label className="mb-1 flex cursor-pointer items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.events.includes("*")} onChange={() => toggleEvent("*")} />
                  <span className="font-medium text-slate-800 dark:text-slate-200">All events</span>
                </label>
                {!form.events.includes("*") && (
                  <div className="grid max-h-44 gap-0.5 overflow-y-auto rounded-lg border border-slate-200 p-2 sm:grid-cols-2 dark:border-slate-700">
                    {(meta?.events || []).map((ev) => (
                      <label key={ev} className="flex cursor-pointer items-center gap-2 text-xs">
                        <input type="checkbox" checked={form.events.includes(ev)} onChange={() => toggleEvent(ev)} />
                        <code className="text-slate-600 dark:text-slate-300">{ev}</code>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setForm({ open: false, url: "", description: "", events: ["*"] })} className="px-3 py-1.5 text-sm text-slate-500 hover:text-slate-800">Cancel</button>
                <button onClick={create} disabled={busy || !form.url.trim() || !form.events.length}
                  className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
                  {busy ? "Saving…" : "Add endpoint"}
                </button>
              </div>
            </div>
          )}

          {!endpoints?.length ? (
            <p className="py-8 text-center text-sm text-slate-400">No endpoints yet. Add one to be notified when your data changes.</p>
          ) : (
            <div className="space-y-2">
              {endpoints.map((e) => (
                <div key={e.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <code className="truncate text-sm font-medium text-slate-900 dark:text-white">{e.url}</code>
                        {!e.active && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">{e.disabledAt ? "Auto-disabled" : "Paused"}</span>}
                      </div>
                      {e.description && <p className="text-xs text-slate-500">{e.description}</p>}
                      <p className="mt-1 flex flex-wrap gap-1">
                        {e.events.map((ev) => <span key={ev} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">{ev === "*" ? "all events" : ev}</span>)}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-400">
                        Secret {e.secretHint} · Last attempt {when(e.lastAttemptAt)}{e.lastStatus ? ` (${e.lastStatus})` : ""}
                        {e.failureCount ? ` · ${e.failureCount} consecutive failure(s)` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                      <button onClick={() => act(() => developer.webhooks.test(e.id), "Test sent.")}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-600 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-300">
                        <Send size={12} /> Test
                      </button>
                      <button onClick={() => window.confirm("Rotate the signing secret? Your receiver must be updated with the new one.") && developer.webhooks.rotate(e.id).then((r) => { setSecret(r.secret); refetch(); }).catch((x) => toast.error?.(x.message))}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-600 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-300">
                        <RefreshCw size={12} /> Rotate
                      </button>
                      <button onClick={() => act(() => developer.webhooks.update(e.id, { active: !e.active }), e.active ? "Paused." : "Resumed.")}
                        className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:text-indigo-600 dark:border-slate-700">
                        {e.active ? <Pause size={13} /> : <Play size={13} />}
                      </button>
                      <button onClick={() => window.confirm("Delete this endpoint?") && act(() => developer.webhooks.remove(e.id), "Endpoint deleted.")}
                        className="rounded-lg border border-slate-200 p-1.5 text-slate-400 hover:text-red-500 dark:border-slate-700"><Trash2 size={13} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

// ── Deliveries ───────────────────────────────────────────────────────────────
const STATUS = {
  delivered: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  pending: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  failed: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
};

function Deliveries({ toast }) {
  const { data, refetch } = useApi(() => developer.deliveries.list({ limit: 50 }), [], { cacheKey: "dev:deliveries" });
  const [open, setOpen] = useState(null);

  const replay = async (id) => {
    try { await developer.deliveries.replay(id); toast.success?.("Queued for redelivery."); refetch(); }
    catch (e) { toast.error?.(e.message); }
  };

  return (
    <Card>
      <CardBody>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ScrollText size={15} className="text-indigo-500" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Recent deliveries</h3>
          </div>
          <button onClick={refetch} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-800 dark:border-slate-700"><RefreshCw size={12} /> Refresh</button>
        </div>
        {!data?.length ? (
          <p className="py-8 text-center text-sm text-slate-400">No deliveries yet. They appear here as your data changes.</p>
        ) : (
          <div className="space-y-1.5">
            {data.map((d) => (
              <div key={d.id} className="rounded-lg border border-slate-200 p-2.5 dark:border-slate-700">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cls("rounded-full px-2 py-0.5 text-[10px] font-medium", STATUS[d.status])}>{d.status}</span>
                  <code className="text-xs font-medium text-slate-800 dark:text-slate-200">{d.event}</code>
                  <span className="text-[11px] text-slate-400">
                    {when(d.createdAt)} · {d.attempts} attempt(s){d.responseStatus ? ` · HTTP ${d.responseStatus}` : ""}
                  </span>
                  <div className="ml-auto flex items-center gap-1.5">
                    <button onClick={() => setOpen(open === d.id ? null : d.id)} className="text-[11px] text-indigo-600 hover:underline dark:text-indigo-400">
                      {open === d.id ? "Hide" : "Payload"}
                    </button>
                    {d.status !== "delivered" && (
                      <button onClick={() => replay(d.id)} className="inline-flex items-center gap-1 rounded border border-slate-200 px-2 py-1 text-[11px] text-slate-600 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-300">
                        <RefreshCw size={11} /> Replay
                      </button>
                    )}
                  </div>
                </div>
                {d.error && <p className="mt-1 text-[11px] text-red-600 dark:text-red-400">{d.error}</p>}
                {open === d.id && (
                  <pre className="mt-2 max-h-56 overflow-auto rounded-lg bg-slate-50 p-2 text-[11px] text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {JSON.stringify(d.payload, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function Developer() {
  const toast = useToast();
  const { data: meta } = useApi(() => developer.meta(), [], { cacheKey: "dev:meta" });
  const [tab, setTab] = useState("tokens");

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Developer"
        subtitle="Let other systems call ExecUI with a scoped API token, and get notified with signed webhooks when your data changes."
        actions={
          <a href="/api/v1/openapi.json" target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-300">
            <ExternalLink size={13} /> OpenAPI spec
          </a>
        }
      />

      <div className="mb-4 flex rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
        {[["tokens", "API tokens", KeyRound], ["webhooks", "Webhooks", Webhook], ["deliveries", "Deliveries", ScrollText]].map(([id, label, Icon]) => (
          <button key={id} onClick={() => setTab(id)}
            className={cls("inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition",
              tab === id ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300")}>
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {tab === "tokens" && <Tokens meta={meta} toast={toast} />}
      {tab === "webhooks" && <Webhooks meta={meta} toast={toast} />}
      {tab === "deliveries" && <Deliveries toast={toast} />}

      <div className="mt-5 flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900/50">
        <ShieldCheck size={14} className="mt-0.5 shrink-0 text-emerald-500" />
        <p>
          Tokens are stored hashed and scoped to your organization's data only. Webhook payloads are signed with
          <code className="mx-1 rounded bg-slate-200 px-1 dark:bg-slate-800">X-ExecUI-Signature</code>
          so your receiver can verify they came from ExecUI — see <code>docs/API.md</code> for the verification snippet.
        </p>
      </div>
    </div>
  );
}
