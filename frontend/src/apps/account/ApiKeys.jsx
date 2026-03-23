import { useState } from "react";
import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import { useToast } from "../../components/ui/Toast";
import { Key, Copy, Plus, Trash2 } from "lucide-react";

const keys = [
  { name: "Production API Key",  prefix: "ak_live_xKf2...", created: "Jan 12, 2026", lastUsed: "2h ago",  scopes: ["read", "write"], status: "active" },
  { name: "Analytics Read-Only", prefix: "ak_live_mNp8...", created: "Feb 5, 2026",  lastUsed: "1d ago",  scopes: ["read"],          status: "active" },
  { name: "CI/CD Pipeline",      prefix: "ak_live_qRs7...", created: "Dec 1, 2025",  lastUsed: "10d ago", scopes: ["read", "write"], status: "active" },
  { name: "Legacy Integration",  prefix: "ak_live_hTw3...", created: "Aug 20, 2025", lastUsed: "Never",   scopes: ["read"],          status: "inactive" },
];

export default function ApiKeys() {
  const toast = useToast();
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");

  const create = () => {
    if (!newName.trim()) return;
    setShowNew(false);
    setNewName("");
    toast({ message: "API key created. Copy it now — it won't be shown again.", type: "info", duration: 5000 });
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
                placeholder="e.g. Production Backend"
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={create} className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg transition">Create</button>
              <button onClick={() => setShowNew(false)} className="border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm px-4 py-2 rounded-lg hover:border-slate-400 transition">Cancel</button>
            </div>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader title="Your API Keys" icon={Key} />
        <CardBody className="space-y-3">
          {keys.map(k => (
            <div key={k.name} className="p-4 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{k.name}</p>
                  <p className="font-mono text-xs text-slate-400 mt-0.5">{k.prefix}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge label={k.status} variant={k.status === "active" ? "success" : "neutral"} dot />
                  <button
                    onClick={() => { navigator.clipboard?.writeText(k.prefix); toast({ message: "Key prefix copied", type: "info" }); }}
                    className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
                  >
                    <Copy size={14} />
                  </button>
                  <button
                    onClick={() => toast({ message: "API key revoked", type: "warning" })}
                    className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-600 transition"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="flex gap-4 text-xs text-slate-400">
                <span>Created: {k.created}</span>
                <span>Last used: {k.lastUsed}</span>
                <div className="flex gap-1">
                  {k.scopes.map(s => (
                    <span key={s} className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">{s}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}
