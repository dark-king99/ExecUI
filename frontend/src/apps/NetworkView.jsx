import { useState, useEffect, useCallback } from 'react';
import {
  Server, Activity, Bell, Cloud, Cpu, HardDrive,
  ShieldCheck, Boxes, TrendingUp, RefreshCw,
  AlertTriangle, CheckCircle2, XCircle, Loader2,
} from 'lucide-react';

// ── API helper ────────────────────────────────────────────────────────────────
const BASE = import.meta.env.VITE_API_BASE_URL ?? '';

function apiFetch(path, options = {}) {
  const token = localStorage.getItem('auth_token');
  return fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  }).then(async (res) => {
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message ?? `HTTP ${res.status}`);
    }
    if (res.status === 204) return null;
    return res.json();
  });
}

// ── Status helpers ────────────────────────────────────────────────────────────

function statusColor(value) {
  const v = (value ?? '').toLowerCase();
  if (['operational', 'good', 'normal', 'secure'].includes(v)) return 'text-emerald-500';
  if (['moderate', 'fair', 'warning'].includes(v)) return 'text-amber-500';
  return 'text-rose-500';
}

function utilizationColor(pct) {
  if (pct < 60) return 'bg-emerald-500';
  if (pct < 80) return 'bg-amber-500';
  return 'bg-rose-500';
}

// ── Sub-components ────────────────────────────────────────────────────────────

function KpiCard({ label, value, icon: Icon }) {
  return (
    <div className="rounded-xl border p-4 flex items-center justify-between shadow-sm border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
      <div>
        <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
        <p className="text-2xl font-semibold mt-0.5 text-slate-900 dark:text-white">{value}</p>
      </div>
      <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800">
        <Icon className="h-5 w-5 text-indigo-500" />
      </div>
    </div>
  );
}

function StatusCard({ title, value }) {
  return (
    <div className="rounded-lg border p-4 border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950">
      <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
      <p className={`text-base font-semibold mt-1 ${statusColor(value)}`}>{value || '—'}</p>
    </div>
  );
}

function Row({ label, value, highlight }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className={`font-semibold ${highlight ? 'text-amber-500' : 'text-slate-800 dark:text-slate-100'}`}>
        {value}
      </span>
    </div>
  );
}

function UtilBar({ hostname, device_type, cpu_util, mem_util, status }) {
  const cpu = Math.round(cpu_util ?? 0);
  const mem = Math.round(mem_util ?? 0);
  const isDown = status === 'down' || status === 'maintenance';
  return (
    <div className="rounded-lg border p-3 border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`h-2 w-2 rounded-full shrink-0 ${isDown ? 'bg-rose-500' : 'bg-emerald-500'}`} />
          <span className="text-xs font-medium truncate text-slate-700 dark:text-slate-200">{hostname}</span>
        </div>
        <span className="text-[10px] uppercase tracking-wide shrink-0 ml-2 text-slate-400 dark:text-slate-500">{device_type}</span>
      </div>
      <div className="space-y-1.5">
        <div>
          <div className="flex justify-between text-[10px] mb-0.5">
            <span className="text-slate-400 dark:text-slate-500">CPU</span>
            <span className="text-slate-600 dark:text-slate-300">{cpu}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700">
            <div className={`h-1.5 rounded-full transition-all ${utilizationColor(cpu)}`} style={{ width: `${cpu}%` }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-[10px] mb-0.5">
            <span className="text-slate-400 dark:text-slate-500">MEM</span>
            <span className="text-slate-600 dark:text-slate-300">{mem}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700">
            <div className={`h-1.5 rounded-full transition-all ${utilizationColor(mem)}`} style={{ width: `${mem}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main dashboard ────────────────────────────────────────────────────────────

export default function NetworkDashboard() {
  const [overview,  setOverview]  = useState(null);
  const [devices,   setDevices]   = useState([]);
  const [storage,   setStorage]   = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ov, dv, st] = await Promise.all([
        apiFetch('/network/dashboard/overview').catch(() => null),
        apiFetch('/network/dashboard/device-usage').catch(() => []),
        apiFetch('/network/dashboard/storage').catch(() => null),
      ]);
      setOverview(ov);
      setDevices(Array.isArray(dv) ? dv : []);
      setStorage(st);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Derived display values ─────────────────────────────────────────────────
  const kpis = overview?.kpis ?? {};
  const health = overview?.health ?? {};
  const cloud  = overview?.cloud  ?? {};

  const statCards = [
    { label: 'Total Devices',      value: loading ? '…' : kpis.total_devices ?? 0,                   icon: Boxes },
    { label: 'Servers Online',     value: loading ? '…' : `${kpis.servers_online ?? 0} / ${kpis.servers_total ?? 0}`, icon: Server },
    { label: 'Active Alerts',      value: loading ? '…' : kpis.active_alerts ?? 0,                   icon: Bell },
    { label: 'Endpoints Healthy',  value: loading ? '…' : `${kpis.endpoints_healthy_pct ?? 0}%`,     icon: ShieldCheck },
    { label: 'Cloud Regions',      value: loading ? '…' : kpis.cloud_regions ?? 0,                   icon: Cloud },
    { label: 'Avg CPU Util',       value: loading ? '…' : `${kpis.avg_cpu_util ?? 0}%`,              icon: Cpu },
  ];

  const healthCards = [
    { title: 'Network Status',   value: health.network_status },
    { title: 'Endpoint Health',  value: health.endpoint_health },
    { title: 'Server Load',      value: health.server_load },
    { title: 'Security Posture', value: health.security_posture },
  ];

  // ── Error state ────────────────────────────────────────────────────────────
  if (error && !overview) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-slate-600 dark:text-slate-300">
        <AlertTriangle className="h-10 w-10 text-rose-500" />
        <p className="text-sm font-medium">{error}</p>
        <button onClick={fetchAll} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700">
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
            Network Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Real-time overview of devices, servers, endpoints, and cloud infrastructure.
          </p>
        </div>
        <button
          onClick={fetchAll}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((s) => (
          <KpiCard key={s.label} label={s.label} value={s.value} icon={s.icon} />
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monitoring & Health */}
        <div className="lg:col-span-2 rounded-xl border p-5 border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Monitoring & Health</h2>
            <Activity className="h-5 w-5 text-emerald-500" />
          </div>
          {loading ? (
            <div className="flex items-center justify-center h-28">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {healthCards.map((c) => (
                <StatusCard key={c.title} title={c.title} value={c.value} />
              ))}
            </div>
          )}
        </div>

        {/* Cloud Control */}
        <div className="rounded-xl border p-5 border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Cloud Control</h2>
            <Cloud className="h-5 w-5 text-sky-500" />
          </div>
          {loading ? (
            <div className="flex items-center justify-center h-20">
              <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              <Row label="Active Regions"   value={cloud.active_regions ?? 0} />
              <Row label="Cloud Devices"    value={cloud.cloud_devices  ?? 0} />
              <Row
                label="Open Incidents"
                value={cloud.incidents_count > 0 ? `${cloud.incidents_count} Warning` : 'None'}
                highlight={cloud.has_warnings}
              />
            </div>
          )}
        </div>
      </div>

      {/* Bottom panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Device Usage */}
        <div className="rounded-xl border p-5 border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Server & Device Usage
            </h2>
            <TrendingUp className="h-5 w-5 text-indigo-500" />
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
            </div>
          ) : devices.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2 text-slate-400 dark:text-slate-500">
              <Server className="h-8 w-8" />
              <p className="text-sm">No devices found.</p>
              <p className="text-xs">Add devices via the Inventory view.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
              {devices.map((d) => (
                <UtilBar key={d.id} {...d} />
              ))}
            </div>
          )}
        </div>

        {/* Storage & Backups */}
        <div className="rounded-xl border p-5 border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Storage & Backups
            </h2>
            <HardDrive className="h-5 w-5 text-emerald-500" />
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
            </div>
          ) : !storage || storage.total_backups === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2 text-slate-400 dark:text-slate-500">
              <HardDrive className="h-8 w-8" />
              <p className="text-sm">No backup records found.</p>
              <p className="text-xs">Backups will appear here once recorded.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Total Backups',    value: storage.total_backups,   icon: HardDrive,    color: 'text-indigo-500' },
                  { label: 'Success Today',    value: storage.successful_today, icon: CheckCircle2, color: 'text-emerald-500' },
                  { label: 'Failed Today',     value: storage.failed_today,     icon: XCircle,      color: 'text-rose-500' },
                  { label: 'Total Size (GB)',  value: storage.total_size_gb,    icon: HardDrive,    color: 'text-sky-500' },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="rounded-lg border p-3 border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
                    <Icon className={`h-4 w-4 mb-1 ${color}`} />
                    <p className="text-xl font-semibold text-slate-900 dark:text-white">{value}</p>
                    <p className="text-xs mt-0.5 text-slate-500 dark:text-slate-400">{label}</p>
                  </div>
                ))}
              </div>

              {/* Success rate bar */}
              {storage.successful_today + storage.failed_today > 0 && (() => {
                const total = storage.successful_today + storage.failed_today;
                const pct = Math.round((storage.successful_today / total) * 100);
                return (
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-500 dark:text-slate-400">Today's success rate</span>
                      <span className={`font-semibold ${pct >= 90 ? 'text-emerald-500' : pct >= 70 ? 'text-amber-500' : 'text-rose-500'}`}>{pct}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700">
                      <div
                        className={`h-2 rounded-full transition-all ${pct >= 90 ? 'bg-emerald-500' : pct >= 70 ? 'bg-amber-500' : 'bg-rose-500'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
