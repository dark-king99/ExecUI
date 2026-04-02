import { useState, useEffect, useCallback } from "react";
import { FileBarChart2, RefreshCw, AlertTriangle, Loader2, TrendingUp, Clock, CheckCircle2, Gauge } from "lucide-react";

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

const FALLBACK_SUMMARY = {
  total_requests_this_month: 0,
  avg_resolution_hours: 0,
  sla_compliance_pct: 0,
  top_services: [],
  requests_by_status: {},
  requests_by_priority: {},
};

export default function ServiceReports() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch("/api/service/reports/summary").catch(() => FALLBACK_SUMMARY);
      setSummary(data ?? FALLBACK_SUMMARY);
    } catch (err) {
      setError(err.message);
      setSummary(FALLBACK_SUMMARY);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  if (error && !summary) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertTriangle className="h-10 w-10 text-rose-500" />
        <p className="text-sm text-slate-600 dark:text-slate-300">{error}</p>
        <button onClick={fetchReports} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700">
          <RefreshCw className="h-4 w-4" /> Retry
        </button>
      </div>
    );
  }

  const s = summary ?? FALLBACK_SUMMARY;
  const statusEntries = Object.entries(s.requests_by_status ?? {});
  const priorityEntries = Object.entries(s.requests_by_priority ?? {});
  const topServices = s.top_services ?? [];

  const kpiCards = [
    { label: "Requests This Month",   value: loading ? "…" : s.total_requests_this_month ?? 0, icon: TrendingUp,   color: "text-indigo-500" },
    { label: "Avg Resolution (hrs)",  value: loading ? "…" : s.avg_resolution_hours ?? 0,       icon: Clock,        color: "text-amber-500"  },
    { label: "SLA Compliance",        value: loading ? "…" : `${s.sla_compliance_pct ?? 0}%`,   icon: Gauge,        color: "text-emerald-500"},
    { label: "Resolved This Month",   value: loading ? "…" : s.resolved_this_month ?? 0,        icon: CheckCircle2, color: "text-emerald-500"},
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Service Reports</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Analytics and insights on service request performance.
          </p>
        </div>
        <button onClick={fetchReports} disabled={loading} className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 p-5 flex items-center justify-between shadow-sm">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
              <p className="text-2xl font-semibold mt-0.5 text-slate-900 dark:text-white">{value}</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800">
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
          </div>
        ))}
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* By Status */}
        <div className="rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 p-5">
          <h2 className="font-semibold text-slate-900 dark:text-white mb-4">Requests by Status</h2>
          {loading ? (
            <div className="flex items-center justify-center h-24">
              <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
            </div>
          ) : statusEntries.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-6">No data available.</p>
          ) : (
            <div className="space-y-3">
              {statusEntries.map(([status, count]) => (
                <div key={status} className="flex items-center justify-between text-sm">
                  <span className="capitalize text-slate-600 dark:text-slate-400">{status.replace("_", " ")}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-2 rounded-full bg-indigo-500"
                        style={{ width: `${Math.min(100, (Number(count) / (s.total_requests_this_month || 1)) * 100)}%` }}
                      />
                    </div>
                    <span className="font-semibold text-slate-900 dark:text-slate-100 w-6 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* By Priority */}
        <div className="rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 p-5">
          <h2 className="font-semibold text-slate-900 dark:text-white mb-4">Requests by Priority</h2>
          {loading ? (
            <div className="flex items-center justify-center h-24">
              <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
            </div>
          ) : priorityEntries.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-6">No data available.</p>
          ) : (
            <div className="space-y-3">
              {priorityEntries.map(([priority, count]) => {
                const color = priority === "urgent" ? "bg-red-500" : priority === "high" ? "bg-orange-500" : priority === "medium" ? "bg-amber-500" : "bg-emerald-500";
                return (
                  <div key={priority} className="flex items-center justify-between text-sm">
                    <span className="capitalize text-slate-600 dark:text-slate-400">{priority}</span>
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className={`h-2 rounded-full ${color}`}
                          style={{ width: `${Math.min(100, (Number(count) / (s.total_requests_this_month || 1)) * 100)}%` }}
                        />
                      </div>
                      <span className="font-semibold text-slate-900 dark:text-slate-100 w-6 text-right">{count}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top Services */}
        <div className="rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 p-5">
          <h2 className="font-semibold text-slate-900 dark:text-white mb-4">Top Services Requested</h2>
          {loading ? (
            <div className="flex items-center justify-center h-24">
              <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
            </div>
          ) : topServices.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-24 gap-2 text-slate-400 dark:text-slate-500">
              <FileBarChart2 className="h-6 w-6" />
              <p className="text-sm">No data available.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {topServices.slice(0, 5).map((svc, i) => (
                <div key={svc.name ?? i} className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400 truncate max-w-[150px]">{svc.name ?? svc.category ?? "Unknown"}</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{svc.count ?? 0}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
