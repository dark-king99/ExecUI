import { useState, useMemo } from "react";
import {
  Database,
  Search,
  Shield,
  FileText,
  BarChart3,
  Settings,
  Users,
  Download,
  Upload,
  History,
  Lock,
} from "lucide-react";

const MOCK_RECORDS = [
  {
    id: "C-001",
    name: "Acme Industries",
    type: "Account",
    owner: "Sales Team",
    lastUpdated: "2026-02-10",
    sensitive: true,
    usage: 124,
  },
  {
    id: "C-002",
    name: "Nova Retail",
    type: "Account",
    owner: "Marketing",
    lastUpdated: "2026-02-08",
    sensitive: false,
    usage: 87,
  },
  {
    id: "C-003",
    name: "Atlas Energy",
    type: "Account",
    owner: "Support",
    lastUpdated: "2026-02-01",
    sensitive: true,
    usage: 203,
  },
];

export default function CrmDatabase() {
  const [activeTab, setActiveTab] = useState("records");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);

  const filtered = useMemo(() => {
    return MOCK_RECORDS.filter((r) =>
      r.name.toLowerCase().includes(query.toLowerCase())
    );
  }, [query]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">CRM Database</h1>
          <p className="text-slate-500">
            Enterprise data management, security, usage, and compliance
          </p>
        </div>
        <div className="flex gap-2">
          <button className="px-3 py-2 rounded border flex items-center gap-2">
            <Upload className="h-4 w-4" /> Import
          </button>
          <button className="px-3 py-2 rounded border flex items-center gap-2">
            <Download className="h-4 w-4" /> Export
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {[
          { id: "records", label: "Records", icon: Database },
          { id: "security", label: "Security", icon: Shield },
          { id: "usage", label: "Usage", icon: BarChart3 },
          { id: "reports", label: "Reports", icon: FileText },
          { id: "settings", label: "Preferences", icon: Settings },
          { id: "audit", label: "Audit Trail", icon: History },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-3 py-2 text-sm border-b-2 ${
              activeTab === t.id
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Records View */}
      {activeTab === "records" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* List */}
          <div className="lg:col-span-2 rounded-xl border bg-white dark:bg-slate-900">
            <div className="p-3 border-b flex items-center gap-2">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search records..."
                className="flex-1 outline-none text-sm bg-transparent"
              />
            </div>

            <div className="divide-y">
              {filtered.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelected(r)}
                  className="w-full text-left p-4 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{r.name}</div>
                      <div className="text-xs text-slate-500">
                        {r.type} • Owner: {r.owner}
                      </div>
                    </div>
                    {r.sensitive && (
                      <span className="text-xs flex items-center gap-1 text-red-600">
                        <Lock className="h-3 w-3" /> Sensitive
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    Last updated: {r.lastUpdated} • Usage: {r.usage} queries
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Detail Panel */}
          <div className="rounded-xl border bg-white dark:bg-slate-900 p-4">
            {!selected ? (
              <div className="text-sm text-slate-500">
                Select a record to view details.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="font-semibold text-lg">{selected.name}</div>
                <div className="text-sm">
                  <strong>ID:</strong> {selected.id}
                </div>
                <div className="text-sm">
                  <strong>Type:</strong> {selected.type}
                </div>
                <div className="text-sm">
                  <strong>Owner:</strong> {selected.owner}
                </div>
                <div className="text-sm">
                  <strong>Last Updated:</strong> {selected.lastUpdated}
                </div>
                <div className="text-sm">
                  <strong>Usage:</strong> {selected.usage} queries
                </div>
                <div className="text-sm">
                  <strong>Sensitivity:</strong>{" "}
                  {selected.sensitive ? "Restricted" : "Standard"}
                </div>

                <div className="pt-2 flex gap-2">
                  <button className="px-3 py-1 rounded border text-sm">
                    View Report
                  </button>
                  <button className="px-3 py-1 rounded border text-sm">
                    Permissions
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Security */}
      {activeTab === "security" && (
        <div className="rounded-xl border p-4 bg-white dark:bg-slate-900 space-y-2">
          <div className="font-medium">Data Security & Access Control</div>
          <ul className="text-sm text-slate-600 list-disc ml-5 space-y-1">
            <li>Role-based access control (RBAC)</li>
            <li>Field-level encryption</li>
            <li>Sensitive record locking</li>
            <li>Audit logging of all access</li>
            <li>Compliance export (GDPR / SOC / ISO)</li>
          </ul>
        </div>
      )}

      {/* Usage */}
      {activeTab === "usage" && (
        <div className="rounded-xl border p-4 bg-white dark:bg-slate-900">
          <div className="font-medium mb-2">Database Usage Analytics</div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="p-3 border rounded">Total Records: {MOCK_RECORDS.length}</div>
            <div className="p-3 border rounded">Queries Today: 412</div>
            <div className="p-3 border rounded">Storage Used: 3.2 GB</div>
          </div>
        </div>
      )}

      {/* Reports */}
      {activeTab === "reports" && (
        <div className="rounded-xl border p-4 bg-white dark:bg-slate-900 space-y-2">
          <div className="font-medium">Database Reports</div>
          <ul className="text-sm text-slate-600 list-disc ml-5 space-y-1">
            <li>Data growth trends</li>
            <li>Access frequency by team</li>
            <li>Sensitive data exposure report</li>
            <li>Inactive / stale records</li>
            <li>Compliance readiness summary</li>
          </ul>
        </div>
      )}

      {/* Preferences */}
      {activeTab === "settings" && (
        <div className="rounded-xl border p-4 bg-white dark:bg-slate-900 space-y-2">
          <div className="font-medium">Database Preferences</div>
          <ul className="text-sm text-slate-600 list-disc ml-5 space-y-1">
            <li>Retention policies</li>
            <li>Auto-archival rules</li>
            <li>PII masking settings</li>
            <li>Backup schedules</li>
            <li>Data sync integrations</li>
          </ul>
        </div>
      )}

      {/* Audit */}
      {activeTab === "audit" && (
        <div className="rounded-xl border p-4 bg-white dark:bg-slate-900 space-y-2">
          <div className="font-medium">Audit Trail</div>
          <div className="text-sm text-slate-600">
            • 2026-02-12 — Sales Team accessed Acme Industries  
            <br />
            • 2026-02-11 — Admin changed retention policy  
            <br />
            • 2026-02-10 — Marketing exported Nova Retail  
          </div>
        </div>
      )}
    </div>
  );
}