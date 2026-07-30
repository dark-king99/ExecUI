import { useState } from "react";
import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import { useToast } from "../../components/ui/Toast";
import { Plug, Plus, Trash2, Loader2, AlertCircle, Lock, ShieldCheck, Zap, KeyRound } from "lucide-react";
import { useApi, useMutation } from "../../hooks/useApi";
import { account } from "../../services/api";
import { useUser } from "../../context/UserContext";

const KINDS = [
  { id: "api", label: "External API" },
  { id: "webhook", label: "Webhook" },
  { id: "slack", label: "Slack" },
  { id: "custom", label: "Custom" },
];
const AUTH = [
  { id: "bearer", label: "Bearer token" },
  { id: "header", label: "Custom header" },
  { id: "none", label: "No auth" },
];
const blankForm = { name: "", kind: "api", baseUrl: "", authType: "bearer", authHeader: "X-API-Key", secret: "" };

export default function Integrations() {
  const toast = useToast();
  const isAdmin = useUser().isAdmin;
  const [form, setForm] = useState(null); // null = closed, object = add form
  const [testingId, setTestingId] = useState(null);

  const { data: conns, loading, error, refetch } = useApi(() => account.integrations.list(), [], { immediate: isAdmin });

  const { mutate: createConn, loading: creating } = useMutation((d) => account.integrations.create(d), {
    onSuccess: () => { setForm(null); toast({ message: "Connection saved — secret encrypted", type: "success" }); refetch(); },
    onError: (e) => toast({ message: e?.message ?? "Failed to save connection", type: "error" }),
  });

  const { mutate: deleteConn } = useMutation((id) => account.integrations.delete(id), {
    onSuccess: () => { toast({ message: "Connection removed", type: "warning" }); refetch(); },
    onError: (e) => toast({ message: e?.message ?? "Failed to remove", type: "error" }),
  });

  const runTest = async (id) => {
    setTestingId(id);
    try {
      const r = await account.integrations.test(id);
      toast({
        message: r.ok ? `Reached target — ${r.status} ${r.statusText} (${r.latencyMs}ms)` : `Failed — ${r.statusText || r.status}`,
        type: r.ok ? "success" : "error",
      });
      refetch();
    } catch (e) {
      toast({ message: e?.message ?? "Test failed", type: "error" });
    } finally {
      setTestingId(null);
    }
  };

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <PageHeader title="Integrations" subtitle="Connect ExecUI to external services" />
        <Card><CardBody>
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <Lock size={26} className="text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Enterprise admins only</p>
            <p className="max-w-md text-xs text-slate-400">Outbound integration credentials are managed by enterprise admins.</p>
          </div>
        </CardBody></Card>
      </div>
    );
  }

  const f = form;
  const setF = (patch) => setForm((p) => ({ ...p, ...patch }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Integrations"
        subtitle="Securely connect ExecUI to external services & webhooks"
        actions={
          <button onClick={() => setForm({ ...blankForm })} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg transition">
            <Plus size={15} /> Add Connection
          </button>
        }
      />

      <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300">
        <ShieldCheck size={18} className="mt-0.5 shrink-0 text-emerald-500" />
        <p>
          Secrets you enter here are <span className="font-semibold">encrypted at rest</span> (AES-256-GCM) and used only
          server-side when ExecUI calls out. They're never shown again or exposed to the browser — only the last 4 characters are displayed.
        </p>
      </div>

      {f && (
        <Card>
          <CardHeader title="New Connection" icon={Plug} />
          <CardBody className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name">
                <input value={f.name} onChange={(e) => setF({ name: e.target.value })} placeholder="e.g. Slack Notifications" className={inputCls} />
              </Field>
              <Field label="Type">
                <select value={f.kind} onChange={(e) => setF({ kind: e.target.value })} className={inputCls}>
                  {KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Target URL">
              <input value={f.baseUrl} onChange={(e) => setF({ baseUrl: e.target.value })} placeholder="https://api.example.com" className={inputCls} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Authentication">
                <select value={f.authType} onChange={(e) => setF({ authType: e.target.value })} className={inputCls}>
                  {AUTH.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
                </select>
              </Field>
              {f.authType === "header" && (
                <Field label="Header name">
                  <input value={f.authHeader} onChange={(e) => setF({ authHeader: e.target.value })} placeholder="X-API-Key" className={inputCls} />
                </Field>
              )}
            </div>
            {f.authType !== "none" && (
              <Field label="Secret / Token" hint="Stored encrypted — you won't see it again.">
                <div className="relative">
                  <KeyRound size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="password" value={f.secret} onChange={(e) => setF({ secret: e.target.value })} placeholder="Paste the external service's secret" className={`${inputCls} pl-9 font-mono`} />
                </div>
              </Field>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => createConn(f)}
                disabled={creating || !f.name.trim() || !f.baseUrl.trim()}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm px-4 py-2 rounded-lg transition"
              >
                {creating && <Loader2 size={14} className="animate-spin" />} Save Connection
              </button>
              <button onClick={() => setForm(null)} className="border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm px-4 py-2 rounded-lg hover:border-slate-400 transition">Cancel</button>
            </div>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader title="Connections" icon={Plug} />
        <CardBody className="space-y-3">
          {error && (
            <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
              <AlertCircle size={16} /> {error}
            </div>
          )}
          {loading && !conns && [1, 2].map((i) => (
            <div key={i} className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 animate-pulse">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-2" />
              <div className="h-3 bg-slate-100 dark:bg-slate-700/60 rounded w-1/2" />
            </div>
          ))}
          {!loading && !error && conns?.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-6">No connections yet. Add one to let ExecUI call an external service.</p>
          )}
          {conns?.map((c) => (
            <div key={c.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{c.name}</p>
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] uppercase tracking-wide text-slate-500">{c.kind}</span>
                  </div>
                  <p className="font-mono text-xs text-slate-400 mt-0.5 truncate">{c.baseUrl}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge label={c.status} variant={c.status === "active" ? "success" : "neutral"} dot />
                  <button onClick={() => runTest(c.id)} disabled={testingId === c.id} title="Test connection" className="flex items-center gap-1 rounded-md border border-slate-200 dark:border-slate-700 px-2 py-1 text-xs text-slate-600 dark:text-slate-300 hover:border-indigo-400 hover:text-indigo-600 transition disabled:opacity-50">
                    {testingId === c.id ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />} Test
                  </button>
                  <button onClick={() => deleteConn(c.id)} title="Remove" className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-600 transition">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-4 text-xs text-slate-400 mt-2">
                <span>Auth: {c.authType === "none" ? "none" : c.authType === "header" ? `header (${c.authHeader})` : "bearer"}</span>
                {c.hasSecret && <span className="font-mono">secret ••••{c.secretLast4}</span>}
                <span>Last used: {c.lastUsed}</span>
                {c.lastStatus && <span className={c.lastStatus.startsWith("error") ? "text-red-500" : "text-emerald-500"}>{c.lastStatus}</span>}
              </div>
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}

const inputCls = "w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500";

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{label}</label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-slate-400">{hint}</p>}
    </div>
  );
}
