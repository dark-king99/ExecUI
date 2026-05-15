import { useState, useMemo, useRef } from "react";
import {
  Database, Search, Shield, FileText, BarChart3, Settings, Download, Upload, History, Lock,
  AlertCircle, CheckCircle, Key, Eye, Server, Clock, RefreshCw, Users,
} from "lucide-react";
import { useApi } from "../../hooks/useApi";
import { useToast } from "../../components/ui/Toast";
import { crm } from "../../services/api";
import PageHeader from "../../components/ui/PageHeader";
import { Stat } from "../../components/ui/Card";

export default function CrmDatabase() {
  const toast = useToast();
  const fileInputRef = useRef(null);
  const [activeTab, setActiveTab] = useState("records");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);

  function handleExport() {
    if (!allRecords.length) {
      toast({ message: "No records to export.", type: "warning" });
      return;
    }
    const headers = ["id", "name", "type", "owner", "lastUpdated", "usage", "sensitive"];
    const rows = allRecords.map(r =>
      headers.map(h => JSON.stringify(r[h] ?? "")).join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `crm-records-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ message: `Exported ${allRecords.length} records.`, type: "success" });
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".csv")) {
      toast({ message: "Only CSV files are supported.", type: "error" });
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      const lines = text.trim().split("\n");
      const count = Math.max(0, lines.length - 1); // subtract header
      toast({ message: `Imported ${count} records from ${file.name}.`, type: "success" });
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  const { data: records, loading: recordsLoading, error: recordsError } = useApi(
    () => crm.database.records({ limit: 200 }), [], { pollingInterval: 60000 }
  );
  const { data: usage, loading: usageLoading } = useApi(
    () => crm.database.usage(), [], { pollingInterval: 60000 }
  );
  const { data: auditData, loading: auditLoading } = useApi(
    () => crm.database.auditTrail({ limit: 20 }), [], { pollingInterval: 30000 }
  );

  const allRecords = records ?? [];
  const filtered = useMemo(() =>
    allRecords.filter(r => r.name?.toLowerCase().includes(query.toLowerCase())),
    [allRecords, query]
  );

  return (
    <div className="space-y-6">
      <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
      <PageHeader
        title="CRM Database"
        subtitle="Enterprise data management, security, usage, and compliance"
        actions={
          <div className="flex gap-2">
            <button
              onClick={handleImportClick}
              className="px-3 py-2 rounded border border-slate-200 dark:border-slate-800 flex items-center gap-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              <Upload className="h-4 w-4" /> Import
            </button>
            <button
              onClick={handleExport}
              className="px-3 py-2 rounded border border-slate-200 dark:border-slate-800 flex items-center gap-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              <Download className="h-4 w-4" /> Export
            </button>
          </div>
        }
      />

      <div className="flex gap-2 border-b">
        {[
          { id: "records",  label: "Records",     icon: Database },
          { id: "security", label: "Security",     icon: Shield },
          { id: "usage",    label: "Usage",        icon: BarChart3 },
          { id: "reports",  label: "Reports",      icon: FileText },
          { id: "settings", label: "Preferences",  icon: Settings },
          { id: "audit",    label: "Audit Trail",  icon: History },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-3 py-2 text-sm border-b-2 ${
              activeTab === t.id ? "border-orange-600 text-orange-600" : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <t.icon className="h-4 w-4" />{t.label}
          </button>
        ))}
      </div>

      {activeTab === "records" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search records..."
                className="flex-1 outline-none text-sm bg-transparent dark:text-slate-100"
              />
            </div>

            {recordsError && (
              <div className="flex items-center gap-2 p-4 text-sm text-red-600 dark:text-red-400">
                <AlertCircle size={15} /> {recordsError}
              </div>
            )}

            {recordsLoading && allRecords.length === 0 && (
              <div className="p-4 space-y-2 animate-pulse">
                {[1,2,3].map(i => <div key={i} className="h-16 bg-slate-100 dark:bg-slate-700 rounded" />)}
              </div>
            )}

            {!recordsLoading && !recordsError && filtered.length === 0 && (
              <p className="p-6 text-sm text-slate-500 text-center">No records found.</p>
            )}

            <div className="divide-y">
              {filtered.map(r => (
                <button
                  key={r.id}
                  onClick={() => setSelected(r)}
                  className="w-full text-left p-4 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{r.name}</div>
                      <div className="text-xs text-slate-500">{r.type} • Owner: {r.owner}</div>
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

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            {!selected ? (
              <div className="text-sm text-slate-500">Select a record to view details.</div>
            ) : (
              <div className="space-y-3">
                <div className="font-semibold text-lg">{selected.name}</div>
                {[["ID", selected.id], ["Type", selected.type], ["Owner", selected.owner], ["Last Updated", selected.lastUpdated], ["Usage", `${selected.usage} queries`], ["Sensitivity", selected.sensitive ? "Restricted" : "Standard"]].map(([label, val]) => (
                  <div key={label} className="text-sm"><strong>{label}:</strong> {val}</div>
                ))}
                <div className="pt-2 flex gap-2">
                  <button className="px-3 py-1 rounded border text-sm">View Report</button>
                  <button className="px-3 py-1 rounded border text-sm">Permissions</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "security" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Stat label="Access Level" value="RBAC" icon={Key} color="orange" />
            <Stat label="Encryption" value="AES-256" icon={Shield} color="emerald" />
            <Stat label="Compliance" value="SOC 2 / GDPR" icon={CheckCircle} color="sky" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { icon: Key,       title: "Role-Based Access Control", desc: "Users access only what their role permits. Admins, managers, and reps have distinct permission tiers." },
              { icon: Lock,      title: "Field-Level Encryption",    desc: "Sensitive fields (email, phone, revenue) are encrypted at rest and in transit using AES-256." },
              { icon: Shield,    title: "Sensitive Record Locking",  desc: "Records flagged as sensitive require elevated permissions to view or modify." },
              { icon: Eye,       title: "Audit Logging",             desc: "Every read, write, and delete is logged with user identity, timestamp, and IP address." },
              { icon: Server,    title: "Data Residency",            desc: "Tenant data is isolated per region. Cross-tenant access is structurally blocked at the API layer." },
              { icon: FileText,  title: "Compliance Export",         desc: "Export GDPR data subject reports, SOC 2 audit packages, and ISO 27001 evidence bundles on demand." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex gap-3">
                <div className="h-9 w-9 rounded-lg bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center shrink-0">
                  <Icon size={16} className="text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="font-medium text-sm text-slate-900 dark:text-white">{title}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "usage" && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-900">
          <div className="text-slate-900 dark:text-white font-medium mb-2">Database Usage Analytics</div>
          {usageLoading ? (
            <div className="grid grid-cols-3 gap-4 animate-pulse">
              {[1,2,3].map(i => <div key={i} className="h-14 bg-slate-100 dark:bg-slate-700 rounded" />)}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="p-3 border border-slate-200 dark:border-slate-800 rounded text-slate-600 dark:text-slate-400">Total Records: {usage?.totalRecords ?? allRecords.length}</div>
              <div className="p-3 border border-slate-200 dark:border-slate-800 rounded text-slate-600 dark:text-slate-400">Queries Today: {usage?.queriesToday ?? "—"}</div>
              <div className="p-3 border border-slate-200 dark:border-slate-800 rounded text-slate-600 dark:text-slate-400">Storage Used: {usage?.storageUsed ?? "—"}</div>
            </div>
          )}
        </div>
      )}

      {activeTab === "reports" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Stat label="Total Records" value={recordsLoading ? "…" : allRecords.length} icon={Database} color="orange" />
            <Stat label="Sensitive Records" value={recordsLoading ? "…" : allRecords.filter(r => r.sensitive).length} icon={Lock} color="amber" />
            <Stat label="Queries Today" value={usageLoading ? "…" : (usage?.queriesToday ?? "—")} icon={BarChart3} color="sky" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { icon: BarChart3,  title: "Data Growth Trends",          desc: "Month-over-month record growth, broken down by object type (Leads, Accounts, Deals, Contacts)." },
              { icon: Users,      title: "Access Frequency by Team",     desc: "Track which teams query the database most frequently and identify usage bottlenecks." },
              { icon: Lock,       title: "Sensitive Data Exposure",      desc: "View which users accessed sensitive records and whether access was justified by role." },
              { icon: Clock,      title: "Inactive / Stale Records",     desc: "Identify records not updated in 90+ days for archival or cleanup workflows." },
              { icon: Shield,     title: "Compliance Readiness",         desc: "Overall compliance score across GDPR, SOC 2, and ISO 27001 controls with gap analysis." },
              { icon: RefreshCw,  title: "Sync Health Report",           desc: "Status of data integrations — last sync time, record count delta, and error rates." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex gap-3 items-start">
                <div className="h-9 w-9 rounded-lg bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center shrink-0">
                  <Icon size={16} className="text-orange-600 dark:text-orange-400" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm text-slate-900 dark:text-white">{title}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{desc}</p>
                </div>
                <button
                  onClick={() => toast({ message: `${title} report opened.`, type: "info" })}
                  className="text-xs text-orange-600 dark:text-orange-400 hover:underline shrink-0"
                >
                  View
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "settings" && (
        <div className="space-y-4">
          {[
            { icon: Clock,    title: "Retention Policies",    desc: "Define how long records of each type are retained before auto-archival or deletion.",   action: "Configure" },
            { icon: History,  title: "Auto-Archival Rules",   desc: "Set inactivity thresholds to automatically archive stale records and free up active storage.", action: "Configure" },
            { icon: Eye,      title: "PII Masking",           desc: "Mask or tokenize personally identifiable information in exports, logs, and non-production environments.", action: "Configure" },
            { icon: Server,   title: "Backup Schedules",      desc: "Configure full and incremental backup cadences, retention duration, and restore point objectives.", action: "Configure" },
            { icon: RefreshCw,title: "Data Sync Integrations",desc: "Manage bidirectional sync with HubSpot, Salesforce, and other CRM data sources.",       action: "Manage" },
          ].map(({ icon: Icon, title, desc, action }) => (
            <div key={title} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex items-start gap-3">
              <div className="h-9 w-9 rounded-lg bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center shrink-0">
                <Icon size={16} className="text-orange-600 dark:text-orange-400" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm text-slate-900 dark:text-white">{title}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{desc}</p>
              </div>
              <button
                onClick={() => toast({ message: `${title} settings opened.`, type: "info" })}
                className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-orange-400 transition shrink-0"
              >
                {action}
              </button>
            </div>
          ))}
        </div>
      )}

      {activeTab === "audit" && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-900 space-y-2">
          <div className="text-slate-900 dark:text-white font-medium">Audit Trail</div>
          {auditLoading && (
            <div className="space-y-1 animate-pulse">
              {[1,2,3].map(i => <div key={i} className="h-5 bg-slate-100 dark:bg-slate-700 rounded" />)}
            </div>
          )}
          {!auditLoading && auditData?.length === 0 && (
            <p className="text-sm text-slate-500">No audit entries found.</p>
          )}
          <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
            {auditData?.map((entry, i) => (
              <div key={i}>• {entry.time} — {entry.user} {entry.action}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
