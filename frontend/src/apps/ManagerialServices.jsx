import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ClipboardList, CheckSquare, Gauge, BookOpen,
  RefreshCw, AlertTriangle, Loader2, Plus, ArrowRight,
  TrendingUp, Clock,
} from "lucide-react";

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

function KpiCard({ label, value, icon: Icon, color = "text-indigo-500" }) {
  return (
    <div className="rounded-xl border p-5 flex items-center justify-between shadow-sm bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-700">
      <div>
        <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
        <p className="text-2xl font-semibold mt-0.5 text-slate-900 dark:text-white">{value}</p>
      </div>
      <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800">
        <Icon className={`h-5 w-5 ${color}`} />
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    pending:     "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    approved:    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    resolved:    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    rejected:    "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[status] ?? map.pending}`}>
      {status?.replace("_", " ") ?? "pending"}
    </span>
  );
}

function PriorityBadge({ priority }) {
  const map = {
    urgent: "text-red-500",
    high:   "text-orange-500",
    medium: "text-amber-500",
    low:    "text-emerald-500",
  };
  return (
    <span className={`text-xs font-medium capitalize ${map[priority] ?? map.medium}`}>
      {priority ?? "medium"}
    </span>
  );
}

export default function ManagerialServices() {
  const navigate = useNavigate();

  const [overview, setOverview]   = useState(null);
  const [requests, setRequests]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ov, reqs] = await Promise.all([
        apiFetch("/api/service/dashboard/overview").catch(() => null),
        apiFetch("/api/service/requests?take=5").catch(() => []),
      ]);
      setOverview(ov);
      setRequests(Array.isArray(reqs) ? reqs : reqs?.data ?? []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const kpis = overview?.kpis ?? {};

  const kpiCards = [
    { label: "Total Requests",      value: loading ? "…" : kpis.total_requests ?? 0,      icon: ClipboardList, color: "text-indigo-500" },
    { label: "Pending Approvals",   value: loading ? "…" : kpis.pending_approvals ?? 0,    icon: CheckSquare,   color: "text-amber-500"  },
    { label: "SLA Compliance",      value: loading ? "…" : `${kpis.sla_compliance ?? 0}%`, icon: Gauge,         color: "text-emerald-500"},
    { label: "Open Tickets",        value: loading ? "…" : kpis.open_tickets ?? 0,         icon: TrendingUp,    color: "text-rose-500"   },
  ];

  const quickActions = [
    { label: "Browse Service Catalog", path: "/service/catalog",   icon: BookOpen,    desc: "Find and request services" },
    { label: "View Approvals",         path: "/service/approvals", icon: CheckSquare, desc: "Review pending requests"   },
    { label: "SLA Tracker",            path: "/service/sla",       icon: Gauge,       desc: "Monitor service levels"    },
    { label: "Knowledge Base",         path: "/service/knowledge", icon: BookOpen,    desc: "Browse articles and guides" },
  ];

  if (error && !overview) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-slate-600 dark:text-slate-300">
        <AlertTriangle className="h-10 w-10 text-rose-500" />
        <p className="text-sm font-medium">{error}</p>
        <button
          onClick={fetchAll}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700"
        >
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
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
            Managerial Services
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Overview of service requests, approvals, SLA compliance, and open tickets.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/service/requests")}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700 transition"
          >
            <Plus className="h-4 w-4" /> New Request
          </button>
          <button
            onClick={fetchAll}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((k) => (
          <KpiCard key={k.label} label={k.label} value={k.value} icon={k.icon} color={k.color} />
        ))}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Requests */}
        <div className="lg:col-span-2 rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Recent Requests</h2>
            <button
              onClick={() => navigate("/service/requests")}
              className="flex items-center gap-1 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              View all <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
            </div>
          ) : requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2 text-slate-400 dark:text-slate-500">
              <ClipboardList className="h-8 w-8" />
              <p className="text-sm">No service requests yet.</p>
              <button
                onClick={() => navigate("/service/requests")}
                className="text-sm text-indigo-500 hover:underline"
              >
                Create your first request
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800">
                    <th className="text-left py-2 pr-4 font-medium text-slate-500 dark:text-slate-400">Title</th>
                    <th className="text-left py-2 pr-4 font-medium text-slate-500 dark:text-slate-400">Category</th>
                    <th className="text-left py-2 pr-4 font-medium text-slate-500 dark:text-slate-400">Priority</th>
                    <th className="text-left py-2 font-medium text-slate-500 dark:text-slate-400">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {requests.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                      <td className="py-3 pr-4 font-medium text-slate-900 dark:text-slate-100 truncate max-w-[200px]">
                        {req.title}
                      </td>
                      <td className="py-3 pr-4 text-slate-500 dark:text-slate-400 capitalize">
                        {req.category ?? "general"}
                      </td>
                      <td className="py-3 pr-4">
                        <PriorityBadge priority={req.priority} />
                      </td>
                      <td className="py-3">
                        <StatusBadge status={req.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 p-5">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Quick Actions</h2>
          <div className="space-y-3">
            {quickActions.map(({ label, path, icon: Icon, desc }) => (
              <button
                key={path}
                onClick={() => navigate(path)}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition text-left"
              >
                <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20">
                  <Icon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{label}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{desc}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 ml-auto shrink-0" />
              </button>
            ))}
          </div>

          {/* Activity Summary */}
          <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4" /> Activity Summary
            </h3>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-4 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {[
                  { label: "Requests this month", value: overview?.stats?.requests_this_month ?? 0 },
                  { label: "Avg resolution (days)", value: overview?.stats?.avg_resolution_days ?? "—" },
                  { label: "Approvals pending",    value: kpis.pending_approvals ?? 0 },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">{label}</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
