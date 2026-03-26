import { useState } from "react";
import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import { useToast } from "../../components/ui/Toast";
import { Key, Copy, Plus, Trash2, Loader2, AlertCircle } from "lucide-react";
import { useApi, useMutation } from "../../hooks/useApi";
import { account } from "../../services/api";

export default function ApiKeys() {
  const toast = useToast();
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");

  const { data: keys, loading, error, refetch } = useApi(() => account.apiKeys.list(), []);

  const { mutate: createKey, loading: creating } = useMutation(
    (data) => account.apiKeys.create(data),
    {
      onSuccess: () => {
        setShowNew(false);
        setNewName("");
        toast({ message: "API key created. Copy it now — it won't be shown again.", type: "info", duration: 5000 });
        refetch();
      },
      onError: (err) => toast({ message: err?.message ?? "Failed to create API key", type: "error" }),
    }
  );

  const { mutate: deleteKey } = useMutation(
    (id) => account.apiKeys.delete(id),
    {
      onSuccess: () => { toast({ message: "API key revoked", type: "warning" }); refetch(); },
      onError: (err) => toast({ message: err?.message ?? "Failed to revoke key", type: "error" }),
    }
  );

  const handleCreate = () => {
    if (!newName.trim()) return;
    createKey({ name: newName.trim() });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="API Keys"
        subtitle="Manage API keys for programmatic access"
        actions={
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg transition"
          >
            <Plus size={15} /> Generate Key
          </button>
        }
      />

      {showNew && (
        <Card>
          <CardHeader title="Generate New API Key" icon={Key} />
          <CardBody className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Key Name</label>
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleCreate()}
                placeholder="e.g. Production Backend"
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                disabled={creating}
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
              {[1, 2, 3].map(i => (
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

          {keys?.map(k => (
            <div key={k.id ?? k.name} className="p-4 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{k.name}</p>
                  <p className="font-mono text-xs text-slate-400 mt-0.5">{k.prefix}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge label={k.status} variant={k.status === "active" ? "success" : "neutral"} dot />
                  <button
                    onClick={() => { navigator.clipboard?.writeText(k.prefix ?? k.name); toast({ message: "Key prefix copied", type: "info" }); }}
                    className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
                  >
                    <Copy size={14} />
                  </button>
                  <button
                    onClick={() => deleteKey(k.id)}
                    className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-600 transition"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="flex gap-4 text-xs text-slate-400">
                {k.created && <span>Created: {k.created}</span>}
                {k.lastUsed && <span>Last used: {k.lastUsed}</span>}
                {k.scopes?.length > 0 && (
                  <div className="flex gap-1">
                    {k.scopes.map(s => (
                      <span key={s} className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">{s}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}
