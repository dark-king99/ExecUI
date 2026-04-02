import { useState, useEffect, useCallback } from "react";
import {
  CheckSquare, RefreshCw, AlertTriangle, Loader2, Check, X,
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

export default function Approvals() {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [processing, setProcessing] = useState(null);

  const fetchApprovals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch("/api/service/approvals/pending").catch(() => []);
      setApprovals(Array.isArray(data) ? data : data?.data ?? []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchApprovals(); }, [fetchApprovals]);

  const handleAction = async (approvalId, action) => {
    setProcessing(approvalId);
    try {
      await apiFetch(`/api/service/approvals/${approvalId}/${action}`, { method: "POST" });
      setApprovals((prev) => prev.filter((a) => a.id !== approvalId));
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(null);
    }
  };

  if (error && approvals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertTriangle className="h-10 w-10 text-rose-500" />
        <p className="text-sm text-slate-600 dark:text-slate-300">{error}</p>
        <button onClick={fetchApprovals} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700">
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
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Approvals</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Review and action pending service requests.
          </p>
        </div>
        <button onClick={fetchApprovals} disabled={loading} className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 text-sm">
          <AlertTriangle className="h-4 w-4" /> {error}
        </div>
      )}

      {/* Approval List */}
      <div className="rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
          </div>
        ) : approvals.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2 text-slate-400 dark:text-slate-500">
            <CheckSquare className="h-8 w-8" />
            <p className="text-sm">No pending approvals. You're all caught up!</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {approvals.map((approval) => (
              <div key={approval.id} className="flex items-start gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-slate-100">
                        {approval.request?.title ?? "Untitled Request"}
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                        Requested by{" "}
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {approval.request?.user?.firstName ?? "Unknown"} {approval.request?.user?.lastName ?? ""}
                        </span>
                      </p>
                      {approval.request?.description && (
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                          {approval.request.description}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        {approval.createdAt ? new Date(approval.createdAt).toLocaleDateString() : "—"}
                      </p>
                      {approval.request?.priority && (
                        <span className={`text-xs capitalize font-medium ${
                          approval.request.priority === "urgent" ? "text-red-500" :
                          approval.request.priority === "high" ? "text-orange-500" :
                          approval.request.priority === "medium" ? "text-amber-500" : "text-emerald-500"
                        }`}>
                          {approval.request.priority}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleAction(approval.id, "approve")}
                    disabled={processing === approval.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-700 disabled:opacity-60 transition"
                  >
                    {processing === approval.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Check className="h-3.5 w-3.5" />
                    )}
                    Approve
                  </button>
                  <button
                    onClick={() => handleAction(approval.id, "reject")}
                    disabled={processing === approval.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-sm hover:bg-rose-50 dark:hover:bg-rose-900/20 disabled:opacity-60 transition"
                  >
                    <X className="h-3.5 w-3.5" />
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
