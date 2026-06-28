import { useState } from "react";
import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import { useToast } from "../../components/ui/Toast";
import { Key, Copy, Plus, Trash2, Loader2, AlertCircle, ShieldCheck, RefreshCw, Check, Lock } from "lucide-react";
import { useApi, useMutation } from "../../hooks/useApi";
import { account } from "../../services/api";

const SCOPES = [
  { id: "read",  label: "Read",  hint: "Fetch tenant data (GET)" },
  { id: "write", label: "Write", hint: "Push events / create records" },
];

function currentUser() {
  try { return JSON.parse(localStorage.getItem("user")) || {}; } catch { return {}; }
}

export default function ApiKeys() {
  const toast = useToast();
  const isAdmin = ["enterprise_admin", "system_admin"].includes(currentUser().role);

  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [scopes, setScopes] = useState(["read"]);
  const [createdKey, setCreatedKey] = useState(null); // plaintext shown once
  const [copied, setCopied] = useState(false);

  const { data: keys, loading, error, refetch } = useApi(() => account.apiKeys.list(), [], { immediate: isAdmin });

  const reveal = (result) => {
    setShowNew(false);
    setNewName("");
    setScopes(["read"]);
    setCreatedKey(result);
    refetch();
  };

  const { mutate: createKey, loading: creating } = useMutation((data) => account.apiKeys.create(data), {
    onSuccess: reveal,
    onError: (err) => toast({ message: err?.message ?? "Failed to create API key", type: "error" }),
  });

  const { mutate: deleteKey } = useMutation((id) => account.apiKeys.delete(id), {
    onSuccess: () => { toast({ message: "API key revoked", type: "warning" }); refetch(); },
    onError: (err) => toast({ message: err?.message ?? "Failed to revoke key", type: "error" }),
  });

  const { mutate: rotateKey } = useMutation((id) => account.apiKeys.rotate(id), {
    onSuccess: reveal,
    onError: (err) => toast({ message: err?.message ?? "Failed to rotate key", type: "error" }),
  });

  const handleCreate = () => {
    if (!newName.trim()) return;
    createKey({ name: newName.trim(), scopes });
  };

  const copyKey = (value) => {
    navigator.clipboard?.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const toggleScope = (id) =>
    setScopes((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const baseUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/api/v1`;

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <PageHeader title="API Keys" subtitle="Manage API keys for programmatic access" />
        <Card>
          <CardBody>
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <Lock size={26} className="text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Enterprise admins only</p>
              <p className="max-w-md text-xs text-slate-400">
                API keys are tenant-wide integration credentials. Ask an enterprise admin to create one for your integration.
              </p>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="API Keys"
        subtitle="Securely authenticate external servers & integrations"
        actions={
          <button
            onClick={() => { setShowNew(true); setCreatedKey(null); }}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg transition"
          >
            <Plus size={15} /> Generate Key
          </button>
        }
      />

      {/* One-time secret reveal */}
      {createdKey?.key && (
        <Card>
          <CardBody>
            <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
              <ShieldCheck size={18} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                  Copy your key now — it won't be shown again
                </p>
                <p className="mt-0.5 text-xs text-amber-700/80 dark:text-amber-400/70">
                  We store only a hash of this key. If you lose it, rotate or generate a new one.
                </p>
                <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-white p-2 dark:border-amber-500/20 dark:bg-slate-900">
                  <code className="min-w-0 flex-1 truncate font-mono text-sm text-slate-800 dark:text-slate-100">{createdKey.key}</code>
                  <button
                    onClick={() => copyKey(createdKey.key)}
                    className="flex shrink-0 items-center gap-1.5 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
                  >
                    {copied ? <Check size={13} /> : <Copy size={13} />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>
              <button onClick={() => setCreatedKey(null)} className="shrink-0 text-amber-600 hover:text-amber-800 dark:text-amber-400">✕</button>
            </div>
          </CardBody>
        </Card>
      )}

      {showNew && (
        <Card>
          <CardHeader title="Generate New API Key" icon={Key} />
          <CardBody className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Key Name</label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                placeholder="e.g. Production Integration"
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Scopes</label>
              <div className="flex flex-wrap gap-2">
                {SCOPES.map((s) => {
                  const on = scopes.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleScope(s.id)}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition ${
                        on ? "border-indigo-400 bg-indigo-50 text-indigo-700 dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-indigo-300"
                           : "border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300"
                      }`}
                    >
                      <span className={`flex h-4 w-4 items-center justify-center rounded border ${on ? "border-indigo-500 bg-indigo-500 text-white" : "border-slate-300 dark:border-slate-600"}`}>
                        {on && <Check size={11} />}
                      </span>
                      <span><span className="font-medium">{s.label}</span> <span className="text-xs text-slate-400">· {s.hint}</span></span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                disabled={creating || !newName.trim()}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm px-4 py-2 rounded-lg transition"
              >
                {creating && <Loader2 size={14} className="animate-spin" />}
                Create
              </button>
              <button onClick={() => setShowNew(false)} className="border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm px-4 py-2 rounded-lg hover:border-slate-400 transition">Cancel</button>
            </div>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader title="Your API Keys" icon={Key} />
        <CardBody className="space-y-3">
          {error && (
            <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {loading && !keys && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 animate-pulse">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-2" />
                  <div className="h-3 bg-slate-100 dark:bg-slate-700/60 rounded w-1/4" />
                </div>
              ))}
            </div>
          )}

          {!loading && !error && keys?.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-6">No API keys yet. Generate your first key above.</p>
          )}

          {keys?.map((k) => (
            <div key={k.id ?? k.name} className="p-4 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{k.name}</p>
                  <p className="font-mono text-xs text-slate-400 mt-0.5">{k.prefix}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge label={k.status} variant={k.status === "active" ? "success" : k.status === "revoked" ? "danger" : "neutral"} dot />
                  {k.status === "active" && (
                    <button
                      onClick={() => rotateKey(k.id)}
                      title="Rotate key"
                      className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-indigo-600 transition"
                    >
                      <RefreshCw size={14} />
                    </button>
                  )}
                  <button
                    onClick={() => deleteKey(k.id)}
                    title="Revoke key"
                    className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-600 transition"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-4 text-xs text-slate-400">
                {k.created && <span>Created: {k.created}</span>}
                <span>Last used: {k.lastUsed}</span>
                {k.expiresAt && <span>Expires: {k.expiresAt}</span>}
                {k.scopes?.length > 0 && (
                  <div className="flex gap-1">
                    {k.scopes.map((s) => (
                      <span key={s} className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">{s}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </CardBody>
      </Card>

      {/* Integration usage */}
      <Card>
        <CardHeader title="Using your key" icon={ShieldCheck} subtitle="Authenticate an external server against the integration API" />
        <CardBody className="space-y-3">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Send the key in an <code className="font-mono text-xs">X-API-Key</code> header (or as a Bearer token).
            Every request is scoped to your enterprise — a key can only read its own tenant's data.
          </p>
          <pre className="overflow-x-auto rounded-lg bg-slate-900 p-4 text-xs leading-relaxed text-slate-100">
{`curl ${baseUrl}/summary \\
  -H "X-API-Key: exk_live_your_key_here"`}
          </pre>
          <div className="grid gap-1 text-xs text-slate-500 sm:grid-cols-2">
            <span><code className="font-mono">GET  {baseUrl}/ping</code> — verify a key</span>
            <span><code className="font-mono">GET  {baseUrl}/summary</code> — tenant counts (read)</span>
            <span><code className="font-mono">POST {baseUrl}/events</code> — push an event (write)</span>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
