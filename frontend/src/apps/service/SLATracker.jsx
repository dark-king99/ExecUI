import { useState, useEffect, useCallback } from "react";
import { Gauge, RefreshCw, AlertTriangle, Loader2, CheckCircle2, AlertCircle, XCircle } from "lucide-react";

const BASE = import.meta.env.VITE_API_BASE_URL ?? "";

function apiFetch(path, opts = {}) {
  const token = localStorage.getItem("auth_token");
  return fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts.headers,
    },
  }).then(async (res) => {
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message ?? `HTTP ${res.status}`);
    }
    return res.status === 204 ? null : res.json();
  });
}

const FALLBACK_SLA = {
  compliance_pct: 0,
  on_track: 0,
  at_risk: 0,
  breached: 0,
  policies: [],
};

function SLAStatusBadge({ status }) {
  const map = {
    on_track: { cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", icon: CheckCircle2 },
    at_risk:  { cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",   icon: AlertCircle },
    breached: { cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",           icon: XCircle },
  };
  const cfg = map[status] ?? map.on_track;
  const Icon = cfg.icon;
  return (
    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.cls}`}>
      <Icon className="h-3 w-3" />
      {status?.replace("_", " ") ?? "on track"}
    </span>
  );
}

export default function SLATracker() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const fetchSLA = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiFetch("/api/service/sla").catch(() => FALLBACK_SLA);
      setData(result ?? FALLBACK_SLA);
    } catch (err) {
      setError(err.message);
      setData(FALLBACK_SLA);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSLA(); }, [fetchSLA]);

  const policies = data?.policies ?? [];
  const compliance = data?.compliance_pct ?? 0;

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertTriangle className="h-10 w-10 text-rose-500" />
        <p className="text-sm text-slate-600 dark:text-slate-300">{error}</p>
        <button onClick={fetchSLA} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700">
          <RefreshCw className="h-4 w-4" /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">SLA Tracker</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Monitor service level agreement compliance across all services.
          </p>
        </div>
        <button onClick={fetchSLA} disabled={loading} className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Overall Compliance", value: loading ? "…" : `${compliance}%`, color: compliance >= 90 ? "text-emerald-500" : compliance >= 70 ? "text-amber-500" : "text-rose-500" },
          { label: "On Track",  value: loading ? "…" : data?.on_track ?? 0,  color: "text-emerald-500" },
          { label: "At Risk",   value: loading ? "…" : data?.at_risk ?? 0,   color: "text-amber-500" },
          { label: "Breached",  value: loading ? "…" : data?.breached ?? 0,  color: "text-rose-500" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 p-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
            <p className={`text-2xl font-semibold mt-1 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Compliance Bar */}
      {!loading && (
        <div className="rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Overall SLA Compliance</span>
            <span className={`text-sm font-semibold ${compliance >= 90 ? "text-emerald-500" : compliance >= 70 ? "text-amber-500" : "text-rose-500"}`}>
              {compliance}%
            </span>
          </div>
          <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className={`h-3 rounded-full transition-all ${compliance >= 90 ? "bg-emerald-500" : compliance >= 70 ? "bg-amber-500" : "bg-rose-500"}`}
              style={{ width: `${compliance}%` }}
            />
          </div>
        </div>
      )}

      {/* SLA Policies Table */}
      <div className="rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="font-semibold text-slate-900 dark:text-white">SLA Policies</h2>
        </div>
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
          </div>
        ) : policies.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2 text-slate-400 dark:text-slate-500">
            <Gauge className="h-8 w-8" />
            <p className="text-sm">No SLA policies configured.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/50">
                <tr>
                  {["Service", "Target Response", "Target Resolution", "Status"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 font-medium text-slate-500 dark:text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {policies.map((policy) => (
                  <tr key={policy.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{policy.service ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{policy.target_response ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{policy.target_resolution ?? "—"}</td>
                    <td className="px-4 py-3"><SLAStatusBadge status={policy.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
