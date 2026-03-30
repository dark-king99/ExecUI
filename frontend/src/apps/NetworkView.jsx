
import { useState, useEffect, useCallback } from 'react';
import {
  Server, Activity, Bell, Cloud, Cpu, HardDrive,
  ShieldCheck, Boxes, TrendingUp, RefreshCw,
  AlertTriangle, CheckCircle2, XCircle, Loader2,
} from 'lucide-react';
import { useSidebar } from '../components/SidebarContext';

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

function KpiCard({ label, value, icon: Icon, isDark }) {
  return (
    <div className={`rounded-xl border p-4 flex items-center justify-between shadow-sm
      ${isDark ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'}`}>
      <div>
        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{label}</p>
        <p className={`text-2xl font-semibold mt-0.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>{value}</p>
      </div>
      <div className={`p-3 rounded-lg ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
        <Icon className="h-5 w-5 text-indigo-500" />
      </div>
    </div>
  );
}

function StatusCard({ title, value, isDark }) {
  return (
    <div className={`rounded-lg border p-4 ${isDark ? 'border-slate-700 bg-slate-950' : 'border-slate-200 bg-slate-50'}`}>
      <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{title}</p>
      <p className={`text-base font-semibold mt-1 ${statusColor(value)}`}>{value || '—'}</p>
    </div>
  );
}

function Row({ label, value, highlight, isDark }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>{label}</span>
      <span className={`font-semibold ${highlight ? 'text-amber-500' : isDark ? 'text-slate-100' : 'text-slate-800'}`}>
        {value}
      </span>
    </div>
  );
}

function UtilBar({ hostname, device_type, cpu_util, mem_util, status, isDark }) {
  const cpu = Math.round(cpu_util ?? 0);
  const mem = Math.round(mem_util ?? 0);
  const isDown = status === 'down' || status === 'maintenance';
  return (
    <div className={`rounded-lg border p-3 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-slate-50'}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`h-2 w-2 rounded-full shrink-0 ${isDown ? 'bg-rose-500' : 'bg-emerald-500'}`} />
          <span className={`text-xs font-medium truncate ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{hostname}</span>
        </div>
        <span className={`text-[10px] uppercase tracking-wide shrink-0 ml-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{device_type}</span>
      </div>
      <div className="space-y-1.5">
        <div>
          <div className="flex justify-between text-[10px] mb-0.5">
            <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>CPU</span>
            <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>{cpu}%</span>
          </div>
          <div className={`h-1.5 rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
            <div className={`h-1.5 rounded-full transition-all ${utilizationColor(cpu)}`} style={{ width: `${cpu}%` }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-[10px] mb-0.5">
            <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>MEM</span>
            <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>{mem}%</span>
          </div>
          <div className={`h-1.5 rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
            <div className={`h-1.5 rounded-full transition-all ${utilizationColor(mem)}`} style={{ width: `${mem}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main dashboard ────────────────────────────────────────────────────────────

export default function NetworkDashboard() {
  const { theme } = useSidebar();
  const isDark = theme === 'dark';

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
      <div className={`flex flex-col items-center justify-center h-64 gap-4 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
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
          <h1 className={`text-2xl font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Network Dashboard
          </h1>
          <p className={`mt-1 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Real-time overview of devices, servers, endpoints, and cloud infrastructure.
          </p>
        </div>
        <button
          onClick={fetchAll}
          disabled={loading}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors
            ${isDark ? 'border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((s) => (
          <KpiCard key={s.label} label={s.label} value={s.value} icon={s.icon} isDark={isDark} />
        ))}
        import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { 
  Sun, Moon, Server, Network, Activity, AlertTriangle,
  Calendar as CalendarIcon, CheckCircle2, Clock, Wifi,
  ChevronRight, HardDrive, Shield, MonitorSpeaker,
  Wrench, AlertCircle, LayoutGrid, Radio, Globe,
  Cpu, Router, Database, BarChart3, Map, Bell,
  Zap, Settings, RefreshCw, CircleDot
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/cards';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { Checkbox } from '../components/ui/checkbox';
import { Calendar } from '../components/ui/calendar';
import { ScrollArea } from '../components/ui/scroll-area';
import { Button } from '../components/ui/button';

export default function NetworkDashboard({ apiUrl, employeeId, isDark, toggleTheme }) {
  const [employee, setEmployee] = useState(null);
  const [recentServices, setRecentServices] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [devicesSummary, setDevicesSummary] = useState(null);
  const [overview, setOverview] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!employeeId) return;

    const headers = {
      'X-Employee-ID': employeeId,
      'Content-Type': 'application/json'
    };

    const fetchData = async (endpoint) => {
      try {
        const response = await fetch(`${apiUrl}${endpoint}`, { headers });
        if (!response.ok) return null;
        return await response.json();
      } catch {
        return null;
      }
    };

    const loadDashboard = async () => {
      setLoading(true);
      setError(null);

      try {
        const results = await Promise.all([
          fetchData('/employee/profile'),
          fetchData('/services/recent?limit=4'),
          fetchData('/tasks?status=pending'),
          fetchData('/alerts?status=open'),
          fetchData('/incidents'),
          fetchData('/maintenance?status=scheduled'),
          fetchData('/devices/summary'),
          fetchData('/dashboard/overview')
        ]);

        const [emp, services, tasksData, alertsData, incidentsData, maintenanceData, devices, overviewData] = results;

        if (emp) setEmployee(emp);
        setRecentServices(services || []);
        setTasks(tasksData || []);
        setAlerts(alertsData || []);
        setIncidents(incidentsData || []);
        setMaintenance(maintenanceData || []);
        setDevicesSummary(devices);
        setOverview(overviewData);
      } catch (err) {
        console.error('Dashboard load error:', err);
        setError('Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [apiUrl, employeeId]);

  const getHeaders = () => ({
    'X-Employee-ID': employeeId,
    'Content-Type': 'application/json'
  });

  const trackServiceUsage = async (serviceName, serviceTitle, serviceDescription, serviceIcon) => {
    try {
      await fetch(`${apiUrl}/services/track`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          service_name: serviceName,
          service_title: serviceTitle,
          service_description: serviceDescription,
          service_icon: serviceIcon
        })
      });
      
      const response = await fetch(`${apiUrl}/services/recent?limit=4`, { headers: getHeaders() });
      if (response.ok) {
        const data = await response.json();
        setRecentServices(data || []);
      }
    } catch (err) {
      console.error('Error tracking service usage:', err);
    }
  };

  const updateTaskStatus = async (taskId, newStatus) => {
    try {
      const response = await fetch(`${apiUrl}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ status: newStatus })
      });
      
      if (response.ok) {
        setTasks(tasks.map(task => 
          task.id === taskId ? { ...task, status: newStatus } : task
        ));
      }
    } catch (err) {
      console.error('Error updating task:', err);
    }
  };

  const acknowledgeAlert = async (alertId) => {
    try {
      const response = await fetch(`${apiUrl}/alerts/${alertId}/acknowledge`, {
        method: 'POST',
        headers: getHeaders()
      });
      
      if (response.ok) {
        setAlerts(alerts.filter(alert => alert.id !== alertId));
      }
    } catch (err) {
      console.error('Error acknowledging alert:', err);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getServiceIcon = (iconName) => {
    const icons = {
      'inventory': <Server className="w-6 h-6" />,
      'traffic': <Activity className="w-6 h-6" />,
      'topology': <Network className="w-6 h-6" />,
      'alerts': <Bell className="w-6 h-6" />,
      'monitoring': <MonitorSpeaker className="w-6 h-6" />,
      'firewall': <Shield className="w-6 h-6" />,
      'wireless': <Wifi className="w-6 h-6" />,
      'default': <LayoutGrid className="w-6 h-6" />
    };
    return icons[iconName] || icons['default'];
  };

  const getServiceColor = (serviceName) => {
    const colors = {
      'inventory': 'text-sky-400 bg-sky-500/10',
      'traffic': 'text-emerald-400 bg-emerald-500/10',
      'topology': 'text-violet-400 bg-violet-500/10',
      'alerts': 'text-rose-400 bg-rose-500/10',
      'monitoring': 'text-amber-400 bg-amber-500/10',
      'firewall': 'text-orange-400 bg-orange-500/10',
      'wireless': 'text-cyan-400 bg-cyan-500/10'
    };
    return colors[serviceName] || 'text-slate-400 bg-slate-500/10';
  };

  const getSeverityColor = (severity) => {
    const colors = {
      'critical': 'bg-red-500/15 text-red-400 border-red-500/30',
      'high': 'bg-orange-500/15 text-orange-400 border-orange-500/30',
      'major': 'bg-orange-500/15 text-orange-400 border-orange-500/30',
      'medium': 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      'minor': 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      'low': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      'warning': 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
      'info': 'bg-sky-500/15 text-sky-400 border-sky-500/30'
    };
    return colors[severity] || colors['medium'];
  };

  const getDeviceStatusColor = (status) => {
    const colors = {
      'online': 'text-emerald-400',
      'offline': 'text-red-400',
      'degraded': 'text-amber-400',
      'maintenance': 'text-sky-400'
    };
    return colors[status] || 'text-slate-400';
  };

  const getTaskTypeIcon = (type) => {
    const icons = {
      'maintenance': <Wrench className="w-4 h-4" />,
      'upgrade': <RefreshCw className="w-4 h-4" />,
      'troubleshoot': <Settings className="w-4 h-4" />,
      'audit': <BarChart3 className="w-4 h-4" />,
      'config_change': <Cpu className="w-4 h-4" />,
      'install': <HardDrive className="w-4 h-4" />
    };
    return icons[type] || <CheckCircle2 className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <div className={`w-full max-w-[1600px] mx-auto p-4 md:p-8 flex items-center justify-center min-h-screen ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}>
        <div className={`font-body ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Loading dashboard...</div>
      </div>
    );
  }

  if (error && !employee) {
    return (
      <div className={`w-full max-w-[1600px] mx-auto p-4 md:p-8 flex flex-col items-center justify-center min-h-screen ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}>
        <AlertCircle className={`w-12 h-12 mb-4 ${isDark ? 'text-red-400' : 'text-red-500'}`} />
        <p className={`font-body ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{error}</p>
        <Button 
          onClick={fetchDashboardData} 
          className="mt-4 bg-orange-500 hover:bg-orange-600 text-white"
          data-testid="retry-btn"
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className={`w-full max-w-[1600px] mx-auto p-4 md:p-8 ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`} data-testid="network-dashboard">
      {/* Header Section */}
      <header className={`flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pb-6 border-b mb-8 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 border-2 border-emerald-500/30">
            <AvatarImage src={employee?.avatar_url} alt={employee?.name} />
            <AvatarFallback className={`font-heading text-xl ${isDark ? 'bg-slate-800 text-emerald-400' : 'bg-slate-200 text-emerald-600'}`}>
              {employee?.name?.split(' ').map(n => n[0]).join('') || '?'}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className={`text-sm font-body ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{getGreeting()}</p>
            <h1 className={`text-2xl sm:text-3xl font-semibold tracking-tight font-heading ${isDark ? 'text-slate-50' : 'text-slate-900'}`} data-testid="employee-name">
              {employee?.name || 'Network Engineer'}
            </h1>
            <p className={`text-sm font-body ${isDark ? 'text-slate-500' : 'text-slate-600'}`}>
              {employee?.role || 'Network Operations'} - {employee?.department || 'NOC'}
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Quick Stats Pills */}
          <div className={`stat-pill flex items-center gap-2 px-4 py-2 rounded-full border ${overview?.alerts?.critical > 0 ? 'bg-red-500/10 border-red-500/30' : isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`} data-testid="stat-alerts">
            <AlertTriangle className={`w-4 h-4 ${overview?.alerts?.critical > 0 ? 'text-red-400' : 'text-rose-400'}`} />
            <span className={`font-medium font-body ${overview?.alerts?.critical > 0 ? 'text-red-400' : isDark ? 'text-slate-50' : 'text-slate-900'}`}>
              {overview?.alerts?.critical || 0}
            </span>
            <span className={`text-sm font-body ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Critical</span>
          </div>
          <div className={`stat-pill flex items-center gap-2 px-4 py-2 rounded-full border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`} data-testid="stat-devices">
            <Server className="w-4 h-4 text-sky-400" />
            <span className={`font-medium font-body ${isDark ? 'text-slate-50' : 'text-slate-900'}`}>{overview?.devices?.total || 0}</span>
            <span className={`text-sm font-body ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Devices</span>
          </div>
          <div className={`stat-pill flex items-center gap-2 px-4 py-2 rounded-full border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`} data-testid="stat-tasks">
            <Wrench className="w-4 h-4 text-amber-400" />
            <span className={`font-medium font-body ${isDark ? 'text-slate-50' : 'text-slate-900'}`}>{overview?.tasks?.pending || 0}</span>
            <span className={`text-sm font-body ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Tasks</span>
          </div>
          
          <Button
            variant="outline"
            size="icon"
            onClick={toggleTheme}
            className={`ml-2 ${isDark ? 'bg-slate-900 border-slate-700 hover:bg-slate-800' : 'bg-white border-slate-200 hover:bg-slate-100'}`}
            data-testid="theme-toggle"
          >
            {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-600" />}
          </Button>
        </div>
      </header>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        {/* Left Column - Services & Workload */}
        <div className="lg:col-span-8 flex flex-col gap-6 lg:gap-8">
          {/* Recent Services Section */}
          <section>
            <h2 className={`text-xl font-medium tracking-tight font-heading mb-4 ${isDark ? 'text-slate-50' : 'text-slate-900'}`}>
              Recent Services
            </h2>
            
            {recentServices.length === 0 ? (
              <Card className={`backdrop-blur-xl border rounded-2xl ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                <CardContent className="p-8 text-center">
                  <Network className={`w-12 h-12 mx-auto mb-4 ${isDark ? 'text-slate-600' : 'text-slate-400'}`} />
                  <p className={`font-body ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    No recent services. Start using Network features to see them here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
                {recentServices.map((service) => (
                  <Card 
                    key={service.id}
                    className={`service-card backdrop-blur-xl border rounded-2xl cursor-pointer transition-all hover:-translate-y-1 ${isDark ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'}`}
                    onClick={() => trackServiceUsage(service.service_name, service.service_title, service.service_description, service.service_icon)}
                    data-testid={`service-card-${service.service_name}`}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className={`p-3 rounded-xl ${getServiceColor(service.service_name)}`}>
                          {getServiceIcon(service.service_icon)}
                        </div>
                        <Badge className={`font-body ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'} border-0`}>
                          {service.usage_count} uses
                        </Badge>
                      </div>
                      <h3 className={`text-lg font-medium font-heading mb-1 ${isDark ? 'text-slate-50' : 'text-slate-900'}`}>
                        {service.service_title}
                      </h3>
                      <p className={`text-sm font-body ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {service.service_description}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>

          {/* Network Alerts */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-xl font-medium tracking-tight font-heading ${isDark ? 'text-slate-50' : 'text-slate-900'}`}>
                Active Alerts
              </h2>
              {(overview?.alerts?.critical > 0 || overview?.alerts?.high > 0) && (
                <Badge className="bg-red-500/15 text-red-400 border-red-500/30 font-body">
                  <Zap className="w-3 h-3 mr-1" />
                  {(overview?.alerts?.critical || 0) + (overview?.alerts?.high || 0)} High Priority
                </Badge>
              )}
            </div>
            
            <Card className={`backdrop-blur-xl border rounded-2xl ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
              <CardContent className="p-6">
                {alerts.length === 0 ? (
                  <div className="text-center py-8">
                    <Bell className={`w-12 h-12 mx-auto mb-4 ${isDark ? 'text-slate-600' : 'text-slate-400'}`} />
                    <p className={`font-body ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      No active alerts - all systems operational
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="h-[280px]">
                    <div className="space-y-3 pr-4">
                      {alerts.slice(0, 6).map((alert) => (
                        <div 
                          key={alert.id}
                          className={`p-4 rounded-lg border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}
                          data-testid={`alert-item-${alert.id}`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-mono ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                  {alert.alert_number}
                                </span>
                                <span className={`text-xs px-2 py-0.5 rounded-full border font-body ${getSeverityColor(alert.severity)}`}>
                                  {alert.severity}
                                </span>
                              </div>
                              <p className={`text-sm font-medium font-body mt-1 ${isDark ? 'text-slate-50' : 'text-slate-900'}`}>
                                {alert.title}
                              </p>
                              <p className={`text-xs font-body mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                {alert.source} • {alert.category}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => acknowledgeAlert(alert.id)}
                              className={`ml-2 text-xs ${isDark ? 'border-slate-700 hover:bg-slate-700' : 'border-slate-300'}`}
                              data-testid={`acknowledge-alert-${alert.id}`}
                            >
                              Acknowledge
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </section>

          {/* Tasks */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-xl font-medium tracking-tight font-heading ${isDark ? 'text-slate-50' : 'text-slate-900'}`}>
                My Tasks
              </h2>
              <Button 
                variant="ghost" 
                className={`font-body ${isDark ? 'text-slate-400 hover:text-slate-50' : 'text-slate-500 hover:text-slate-900'}`}
                data-testid="view-all-tasks"
              >
                View All <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
            
            <Card className={`backdrop-blur-xl border rounded-2xl ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
              <CardContent className="p-6">
                {tasks.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle2 className={`w-12 h-12 mx-auto mb-4 ${isDark ? 'text-slate-600' : 'text-slate-400'}`} />
                    <p className={`font-body ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      No pending tasks
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="h-[280px]">
                    <div className="space-y-3 pr-4">
                      {tasks.slice(0, 6).map((task) => (
                        <div 
                          key={task.id}
                          className={`flex items-start gap-3 p-3 rounded-lg transition-all ${isDark ? 'bg-slate-800/50 hover:bg-slate-800' : 'bg-slate-50 hover:bg-slate-100'}`}
                          data-testid={`task-item-${task.id}`}
                        >
                          <Checkbox
                            checked={task.status === 'completed'}
                            onCheckedChange={() => updateTaskStatus(task.id, task.status === 'completed' ? 'pending' : 'completed')}
                            className={`mt-0.5 ${isDark ? 'border-slate-600' : 'border-slate-300'} data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500`}
                            data-testid={`task-checkbox-${task.id}`}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              {getTaskTypeIcon(task.task_type)}
                              <p className={`text-sm font-medium font-body ${isDark ? 'text-slate-50' : 'text-slate-900'}`}>
                                {task.title}
                              </p>
                            </div>
                            {task.related_device_name && (
                              <p className={`text-xs font-body mt-1 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                                Device: {task.related_device_name}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <span className={`text-xs px-2 py-0.5 rounded-full border font-body ${getSeverityColor(task.priority)}`}>
                                {task.priority}
                              </span>
                              <Badge variant="outline" className={`text-xs font-body capitalize ${isDark ? 'border-slate-700 text-slate-400' : 'border-slate-300 text-slate-500'}`}>
                                {task.task_type.replace('_', ' ')}
                              </Badge>
                              {task.due_date && (
                                <span className={`text-xs font-body ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                                  Due: {format(parseISO(task.due_date), 'MMM d')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </section>
        </div>

        {/* Right Column - Calendar & Status */}
        <div className="lg:col-span-4 flex flex-col gap-6 lg:gap-8">
          {/* Calendar Widget */}
          <Card className={`backdrop-blur-xl border rounded-2xl ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`} data-testid="calendar-widget">
            <CardHeader className="pb-2">
              <CardTitle className={`text-lg font-medium font-heading flex items-center gap-2 ${isDark ? 'text-slate-50' : 'text-slate-900'}`}>
                <CalendarIcon className="w-5 h-5 text-emerald-400" />
                Calendar
              </CardTitle>
            </CardHeader>
            <CardContent className="px-2 pb-4">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md"
                classNames={{
                  months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                  month: "space-y-4 w-full",
                  caption: `flex justify-center pt-1 relative items-center font-heading ${isDark ? 'text-slate-50' : 'text-slate-900'}`,
                  caption_label: "text-sm font-medium",
                  nav: "space-x-1 flex items-center",
                  nav_button: `h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 ${isDark ? 'text-slate-400 hover:text-slate-50' : 'text-slate-500 hover:text-slate-900'}`,
                  nav_button_previous: "absolute left-1",
                  nav_button_next: "absolute right-1",
                  table: "w-full border-collapse space-y-1",
                  head_row: "flex w-full justify-between",
                  head_cell: `rounded-md w-8 font-normal text-[0.8rem] font-body ${isDark ? 'text-slate-500' : 'text-slate-500'}`,
                  row: "flex w-full mt-2 justify-between",
                  cell: "text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
                  day: `h-8 w-8 p-0 font-normal rounded-md font-body ${isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100'}`,
                  day_selected: "bg-emerald-500 text-white hover:bg-emerald-600 font-medium",
                  day_today: `${isDark ? 'bg-slate-800 text-emerald-400' : 'bg-emerald-100 text-emerald-600'}`,
                  day_outside: `opacity-50 ${isDark ? 'text-slate-600' : 'text-slate-400'}`,
                  day_disabled: `opacity-50 ${isDark ? 'text-slate-600' : 'text-slate-400'}`,
                }}
              />
            </CardContent>
          </Card>

          {/* Network Status */}
          <Card className={`backdrop-blur-xl border rounded-2xl ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`} data-testid="network-status-widget">
            <CardHeader className="pb-2">
              <CardTitle className={`text-lg font-medium font-heading flex items-center gap-2 ${isDark ? 'text-slate-50' : 'text-slate-900'}`}>
                <Activity className="w-5 h-5 text-emerald-400" />
                Network Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className={`flex items-center justify-between p-3 rounded-lg ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                  <div className="flex items-center gap-3">
                    <CircleDot className="w-5 h-5 text-emerald-400" />
                    <span className={`text-sm font-body ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Online</span>
                  </div>
                  <span className={`text-lg font-semibold font-heading text-emerald-400`}>
                    {overview?.devices?.online || 0}
                  </span>
                </div>
                
                <div className={`flex items-center justify-between p-3 rounded-lg ${overview?.devices?.offline > 0 ? 'bg-red-500/10' : isDark ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                  <div className="flex items-center gap-3">
                    <CircleDot className={`w-5 h-5 ${overview?.devices?.offline > 0 ? 'text-red-400' : 'text-slate-400'}`} />
                    <span className={`text-sm font-body ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Offline</span>
                  </div>
                  <span className={`text-lg font-semibold font-heading ${overview?.devices?.offline > 0 ? 'text-red-400' : isDark ? 'text-slate-50' : 'text-slate-900'}`}>
                    {overview?.devices?.offline || 0}
                  </span>
                </div>
                
                <div className={`flex items-center justify-between p-3 rounded-lg ${overview?.devices?.degraded > 0 ? 'bg-amber-500/10' : isDark ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                  <div className="flex items-center gap-3">
                    <CircleDot className={`w-5 h-5 ${overview?.devices?.degraded > 0 ? 'text-amber-400' : 'text-slate-400'}`} />
                    <span className={`text-sm font-body ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Degraded</span>
                  </div>
                  <span className={`text-lg font-semibold font-heading ${overview?.devices?.degraded > 0 ? 'text-amber-400' : isDark ? 'text-slate-50' : 'text-slate-900'}`}>
                    {overview?.devices?.degraded || 0}
                  </span>
                </div>
                
                <div className={`flex items-center justify-between p-3 rounded-lg ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                  <div className="flex items-center gap-3">
                    <Wrench className="w-5 h-5 text-sky-400" />
                    <span className={`text-sm font-body ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Maintenance</span>
                  </div>
                  <span className={`text-lg font-semibold font-heading ${isDark ? 'text-slate-50' : 'text-slate-900'}`}>
                    {overview?.maintenance?.upcoming || 0}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Active Incidents */}
          <Card className={`backdrop-blur-xl border rounded-2xl ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`} data-testid="incidents-widget">
            <CardHeader className="pb-2">
              <CardTitle className={`text-lg font-medium font-heading flex items-center gap-2 ${isDark ? 'text-slate-50' : 'text-slate-900'}`}>
                <AlertTriangle className="w-5 h-5 text-rose-400" />
                Active Incidents
              </CardTitle>
              <p className={`text-sm font-body ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                {overview?.incidents?.active || 0} active
              </p>
            </CardHeader>
            <CardContent>
              {incidents.length === 0 ? (
                <div className="text-center py-6">
                  <Shield className={`w-10 h-10 mx-auto mb-3 ${isDark ? 'text-slate-600' : 'text-slate-400'}`} />
                  <p className={`text-sm font-body ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    No active incidents
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[200px]">
                  <div className="space-y-3 pr-4">
                    {incidents.filter(i => i.status !== 'resolved').slice(0, 5).map((incident) => (
                      <div 
                        key={incident.id}
                        className={`p-3 rounded-lg border-l-2 ${
                          incident.severity === 'critical' ? 'border-red-500 bg-red-500/5' :
                          incident.severity === 'major' ? 'border-orange-500 bg-orange-500/5' :
                          'border-amber-500 bg-amber-500/5'
                        }`}
                        data-testid={`incident-item-${incident.id}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-mono ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                {incident.incident_number}
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded-full border font-body ${getSeverityColor(incident.severity)}`}>
                                {incident.severity}
                              </span>
                            </div>
                            <p className={`text-sm font-medium font-body mt-1 truncate ${isDark ? 'text-slate-50' : 'text-slate-900'}`}>
                              {incident.title}
                            </p>
                            <Badge variant="outline" className={`mt-2 text-xs font-body capitalize ${isDark ? 'border-slate-700 text-slate-400' : 'border-slate-300 text-slate-500'}`}>
                              {incident.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { 
  Sun, Moon, Server, Network, Activity, AlertTriangle,
  Calendar as CalendarIcon, CheckCircle2, Clock, Wifi,
  ChevronRight, HardDrive, Shield, MonitorSpeaker,
  Wrench, AlertCircle, LayoutGrid, Radio, Globe,
  Cpu, Router, Database, BarChart3, Map, Bell,
  Zap, Settings, RefreshCw, CircleDot
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/cards';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { Checkbox } from '../components/ui/checkbox';
import { Calendar } from '../components/ui/calendar';
import { ScrollArea } from '../components/ui/scroll-area';
import { Button } from '../components/ui/button';

export default function NetworkDashboard({ apiUrl, employeeId, isDark, toggleTheme }) {
  const [employee, setEmployee] = useState(null);
  const [recentServices, setRecentServices] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [devicesSummary, setDevicesSummary] = useState(null);
  const [overview, setOverview] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!employeeId) return;

    const headers = {
      'X-Employee-ID': employeeId,
      'Content-Type': 'application/json'
    };

    const fetchData = async (endpoint) => {
      try {
        const response = await fetch(`${apiUrl}${endpoint}`, { headers });
        if (!response.ok) return null;
        return await response.json();
      } catch {
        return null;
      }
    };

    const loadDashboard = async () => {
      setLoading(true);
      setError(null);

      try {
        const results = await Promise.all([
          fetchData('/employee/profile'),
          fetchData('/services/recent?limit=4'),
          fetchData('/tasks?status=pending'),
          fetchData('/alerts?status=open'),
          fetchData('/incidents'),
          fetchData('/maintenance?status=scheduled'),
          fetchData('/devices/summary'),
          fetchData('/dashboard/overview')
        ]);

        const [emp, services, tasksData, alertsData, incidentsData, maintenanceData, devices, overviewData] = results;

        if (emp) setEmployee(emp);
        setRecentServices(services || []);
        setTasks(tasksData || []);
        setAlerts(alertsData || []);
        setIncidents(incidentsData || []);
        setMaintenance(maintenanceData || []);
        setDevicesSummary(devices);
        setOverview(overviewData);
      } catch (err) {
        console.error('Dashboard load error:', err);
        setError('Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [apiUrl, employeeId]);

  const getHeaders = () => ({
    'X-Employee-ID': employeeId,
    'Content-Type': 'application/json'
  });

  const trackServiceUsage = async (serviceName, serviceTitle, serviceDescription, serviceIcon) => {
    try {
      await fetch(`${apiUrl}/services/track`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          service_name: serviceName,
          service_title: serviceTitle,
          service_description: serviceDescription,
          service_icon: serviceIcon
        })
      });
      
      const response = await fetch(`${apiUrl}/services/recent?limit=4`, { headers: getHeaders() });
      if (response.ok) {
        const data = await response.json();
        setRecentServices(data || []);
      }
    } catch (err) {
      console.error('Error tracking service usage:', err);
    }
  };

  const updateTaskStatus = async (taskId, newStatus) => {
    try {
      const response = await fetch(`${apiUrl}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ status: newStatus })
      });
      
      if (response.ok) {
        setTasks(tasks.map(task => 
          task.id === taskId ? { ...task, status: newStatus } : task
        ));
      }
    } catch (err) {
      console.error('Error updating task:', err);
    }
  };

  const acknowledgeAlert = async (alertId) => {
    try {
      const response = await fetch(`${apiUrl}/alerts/${alertId}/acknowledge`, {
        method: 'POST',
        headers: getHeaders()
      });
      
      if (response.ok) {
        setAlerts(alerts.filter(alert => alert.id !== alertId));
      }
    } catch (err) {
      console.error('Error acknowledging alert:', err);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getServiceIcon = (iconName) => {
    const icons = {
      'inventory': <Server className="w-6 h-6" />,
      'traffic': <Activity className="w-6 h-6" />,
      'topology': <Network className="w-6 h-6" />,
      'alerts': <Bell className="w-6 h-6" />,
      'monitoring': <MonitorSpeaker className="w-6 h-6" />,
      'firewall': <Shield className="w-6 h-6" />,
      'wireless': <Wifi className="w-6 h-6" />,
      'default': <LayoutGrid className="w-6 h-6" />
    };
    return icons[iconName] || icons['default'];
  };

  const getServiceColor = (serviceName) => {
    const colors = {
      'inventory': 'text-sky-400 bg-sky-500/10',
      'traffic': 'text-emerald-400 bg-emerald-500/10',
      'topology': 'text-violet-400 bg-violet-500/10',
      'alerts': 'text-rose-400 bg-rose-500/10',
      'monitoring': 'text-amber-400 bg-amber-500/10',
      'firewall': 'text-orange-400 bg-orange-500/10',
      'wireless': 'text-cyan-400 bg-cyan-500/10'
    };
    return colors[serviceName] || 'text-slate-400 bg-slate-500/10';
  };

  const getSeverityColor = (severity) => {
    const colors = {
      'critical': 'bg-red-500/15 text-red-400 border-red-500/30',
      'high': 'bg-orange-500/15 text-orange-400 border-orange-500/30',
      'major': 'bg-orange-500/15 text-orange-400 border-orange-500/30',
      'medium': 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      'minor': 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      'low': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      'warning': 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
      'info': 'bg-sky-500/15 text-sky-400 border-sky-500/30'
    };
    return colors[severity] || colors['medium'];
  };

  const getDeviceStatusColor = (status) => {
    const colors = {
      'online': 'text-emerald-400',
      'offline': 'text-red-400',
      'degraded': 'text-amber-400',
      'maintenance': 'text-sky-400'
    };
    return colors[status] || 'text-slate-400';
  };

  const getTaskTypeIcon = (type) => {
    const icons = {
      'maintenance': <Wrench className="w-4 h-4" />,
      'upgrade': <RefreshCw className="w-4 h-4" />,
      'troubleshoot': <Settings className="w-4 h-4" />,
      'audit': <BarChart3 className="w-4 h-4" />,
      'config_change': <Cpu className="w-4 h-4" />,
      'install': <HardDrive className="w-4 h-4" />
    };
    return icons[type] || <CheckCircle2 className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <div className={`w-full max-w-[1600px] mx-auto p-4 md:p-8 flex items-center justify-center min-h-screen ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}>
        <div className={`font-body ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Loading dashboard...</div>
      </div>
    );
  }

  if (error && !employee) {
    return (
      <div className={`w-full max-w-[1600px] mx-auto p-4 md:p-8 flex flex-col items-center justify-center min-h-screen ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}>
        <AlertCircle className={`w-12 h-12 mb-4 ${isDark ? 'text-red-400' : 'text-red-500'}`} />
        <p className={`font-body ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{error}</p>
        <Button 
          onClick={fetchDashboardData} 
          className="mt-4 bg-orange-500 hover:bg-orange-600 text-white"
          data-testid="retry-btn"
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className={`w-full max-w-[1600px] mx-auto p-4 md:p-8 ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`} data-testid="network-dashboard">
      {/* Header Section */}
      <header className={`flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pb-6 border-b mb-8 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 border-2 border-emerald-500/30">
            <AvatarImage src={employee?.avatar_url} alt={employee?.name} />
            <AvatarFallback className={`font-heading text-xl ${isDark ? 'bg-slate-800 text-emerald-400' : 'bg-slate-200 text-emerald-600'}`}>
              {employee?.name?.split(' ').map(n => n[0]).join('') || '?'}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className={`text-sm font-body ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{getGreeting()}</p>
            <h1 className={`text-2xl sm:text-3xl font-semibold tracking-tight font-heading ${isDark ? 'text-slate-50' : 'text-slate-900'}`} data-testid="employee-name">
              {employee?.name || 'Network Engineer'}
            </h1>
            <p className={`text-sm font-body ${isDark ? 'text-slate-500' : 'text-slate-600'}`}>
              {employee?.role || 'Network Operations'} - {employee?.department || 'NOC'}
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Quick Stats Pills */}
          <div className={`stat-pill flex items-center gap-2 px-4 py-2 rounded-full border ${overview?.alerts?.critical > 0 ? 'bg-red-500/10 border-red-500/30' : isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`} data-testid="stat-alerts">
            <AlertTriangle className={`w-4 h-4 ${overview?.alerts?.critical > 0 ? 'text-red-400' : 'text-rose-400'}`} />
            <span className={`font-medium font-body ${overview?.alerts?.critical > 0 ? 'text-red-400' : isDark ? 'text-slate-50' : 'text-slate-900'}`}>
              {overview?.alerts?.critical || 0}
            </span>
            <span className={`text-sm font-body ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Critical</span>
          </div>
          <div className={`stat-pill flex items-center gap-2 px-4 py-2 rounded-full border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`} data-testid="stat-devices">
            <Server className="w-4 h-4 text-sky-400" />
            <span className={`font-medium font-body ${isDark ? 'text-slate-50' : 'text-slate-900'}`}>{overview?.devices?.total || 0}</span>
            <span className={`text-sm font-body ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Devices</span>
          </div>
          <div className={`stat-pill flex items-center gap-2 px-4 py-2 rounded-full border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`} data-testid="stat-tasks">
            <Wrench className="w-4 h-4 text-amber-400" />
            <span className={`font-medium font-body ${isDark ? 'text-slate-50' : 'text-slate-900'}`}>{overview?.tasks?.pending || 0}</span>
            <span className={`text-sm font-body ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Tasks</span>
          </div>
          
          <Button
            variant="outline"
            size="icon"
            onClick={toggleTheme}
            className={`ml-2 ${isDark ? 'bg-slate-900 border-slate-700 hover:bg-slate-800' : 'bg-white border-slate-200 hover:bg-slate-100'}`}
            data-testid="theme-toggle"
          >
            {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-600" />}
          </Button>
        </div>
      </header>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        {/* Left Column - Services & Workload */}
        <div className="lg:col-span-8 flex flex-col gap-6 lg:gap-8">
          {/* Recent Services Section */}
          <section>
            <h2 className={`text-xl font-medium tracking-tight font-heading mb-4 ${isDark ? 'text-slate-50' : 'text-slate-900'}`}>
              Recent Services
            </h2>
            
            {recentServices.length === 0 ? (
              <Card className={`backdrop-blur-xl border rounded-2xl ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                <CardContent className="p-8 text-center">
                  <Network className={`w-12 h-12 mx-auto mb-4 ${isDark ? 'text-slate-600' : 'text-slate-400'}`} />
                  <p className={`font-body ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    No recent services. Start using Network features to see them here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
                {recentServices.map((service) => (
                  <Card 
                    key={service.id}
                    className={`service-card backdrop-blur-xl border rounded-2xl cursor-pointer transition-all hover:-translate-y-1 ${isDark ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'}`}
                    onClick={() => trackServiceUsage(service.service_name, service.service_title, service.service_description, service.service_icon)}
                    data-testid={`service-card-${service.service_name}`}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className={`p-3 rounded-xl ${getServiceColor(service.service_name)}`}>
                          {getServiceIcon(service.service_icon)}
                        </div>
                        <Badge className={`font-body ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'} border-0`}>
                          {service.usage_count} uses
                        </Badge>
                      </div>
                      <h3 className={`text-lg font-medium font-heading mb-1 ${isDark ? 'text-slate-50' : 'text-slate-900'}`}>
                        {service.service_title}
                      </h3>
                      <p className={`text-sm font-body ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {service.service_description}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>

          {/* Network Alerts */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-xl font-medium tracking-tight font-heading ${isDark ? 'text-slate-50' : 'text-slate-900'}`}>
                Active Alerts
              </h2>
              {(overview?.alerts?.critical > 0 || overview?.alerts?.high > 0) && (
                <Badge className="bg-red-500/15 text-red-400 border-red-500/30 font-body">
                  <Zap className="w-3 h-3 mr-1" />
                  {(overview?.alerts?.critical || 0) + (overview?.alerts?.high || 0)} High Priority
                </Badge>
              )}
            </div>
            
            <Card className={`backdrop-blur-xl border rounded-2xl ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
              <CardContent className="p-6">
                {alerts.length === 0 ? (
                  <div className="text-center py-8">
                    <Bell className={`w-12 h-12 mx-auto mb-4 ${isDark ? 'text-slate-600' : 'text-slate-400'}`} />
                    <p className={`font-body ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      No active alerts - all systems operational
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="h-[280px]">
                    <div className="space-y-3 pr-4">
                      {alerts.slice(0, 6).map((alert) => (
                        <div 
                          key={alert.id}
                          className={`p-4 rounded-lg border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}
                          data-testid={`alert-item-${alert.id}`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-mono ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                  {alert.alert_number}
                                </span>
                                <span className={`text-xs px-2 py-0.5 rounded-full border font-body ${getSeverityColor(alert.severity)}`}>
                                  {alert.severity}
                                </span>
                              </div>
                              <p className={`text-sm font-medium font-body mt-1 ${isDark ? 'text-slate-50' : 'text-slate-900'}`}>
                                {alert.title}
                              </p>
                              <p className={`text-xs font-body mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                {alert.source} • {alert.category}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => acknowledgeAlert(alert.id)}
                              className={`ml-2 text-xs ${isDark ? 'border-slate-700 hover:bg-slate-700' : 'border-slate-300'}`}
                              data-testid={`acknowledge-alert-${alert.id}`}
                            >
                              Acknowledge
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </section>

          {/* Tasks */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-xl font-medium tracking-tight font-heading ${isDark ? 'text-slate-50' : 'text-slate-900'}`}>
                My Tasks
              </h2>
              <Button 
                variant="ghost" 
                className={`font-body ${isDark ? 'text-slate-400 hover:text-slate-50' : 'text-slate-500 hover:text-slate-900'}`}
                data-testid="view-all-tasks"
              >
                View All <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
            
            <Card className={`backdrop-blur-xl border rounded-2xl ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
              <CardContent className="p-6">
                {tasks.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle2 className={`w-12 h-12 mx-auto mb-4 ${isDark ? 'text-slate-600' : 'text-slate-400'}`} />
                    <p className={`font-body ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      No pending tasks
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="h-[280px]">
                    <div className="space-y-3 pr-4">
                      {tasks.slice(0, 6).map((task) => (
                        <div 
                          key={task.id}
                          className={`flex items-start gap-3 p-3 rounded-lg transition-all ${isDark ? 'bg-slate-800/50 hover:bg-slate-800' : 'bg-slate-50 hover:bg-slate-100'}`}
                          data-testid={`task-item-${task.id}`}
                        >
                          <Checkbox
                            checked={task.status === 'completed'}
                            onCheckedChange={() => updateTaskStatus(task.id, task.status === 'completed' ? 'pending' : 'completed')}
                            className={`mt-0.5 ${isDark ? 'border-slate-600' : 'border-slate-300'} data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500`}
                            data-testid={`task-checkbox-${task.id}`}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              {getTaskTypeIcon(task.task_type)}
                              <p className={`text-sm font-medium font-body ${isDark ? 'text-slate-50' : 'text-slate-900'}`}>
                                {task.title}
                              </p>
                            </div>
                            {task.related_device_name && (
                              <p className={`text-xs font-body mt-1 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                                Device: {task.related_device_name}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <span className={`text-xs px-2 py-0.5 rounded-full border font-body ${getSeverityColor(task.priority)}`}>
                                {task.priority}
                              </span>
                              <Badge variant="outline" className={`text-xs font-body capitalize ${isDark ? 'border-slate-700 text-slate-400' : 'border-slate-300 text-slate-500'}`}>
                                {task.task_type.replace('_', ' ')}
                              </Badge>
                              {task.due_date && (
                                <span className={`text-xs font-body ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                                  Due: {format(parseISO(task.due_date), 'MMM d')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </section>
        </div>

        {/* Right Column - Calendar & Status */}
        <div className="lg:col-span-4 flex flex-col gap-6 lg:gap-8">
          {/* Calendar Widget */}
          <Card className={`backdrop-blur-xl border rounded-2xl ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`} data-testid="calendar-widget">
            <CardHeader className="pb-2">
              <CardTitle className={`text-lg font-medium font-heading flex items-center gap-2 ${isDark ? 'text-slate-50' : 'text-slate-900'}`}>
                <CalendarIcon className="w-5 h-5 text-emerald-400" />
                Calendar
              </CardTitle>
            </CardHeader>
            <CardContent className="px-2 pb-4">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md"
                classNames={{
                  months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                  month: "space-y-4 w-full",
                  caption: `flex justify-center pt-1 relative items-center font-heading ${isDark ? 'text-slate-50' : 'text-slate-900'}`,
                  caption_label: "text-sm font-medium",
                  nav: "space-x-1 flex items-center",
                  nav_button: `h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 ${isDark ? 'text-slate-400 hover:text-slate-50' : 'text-slate-500 hover:text-slate-900'}`,
                  nav_button_previous: "absolute left-1",
                  nav_button_next: "absolute right-1",
                  table: "w-full border-collapse space-y-1",
                  head_row: "flex w-full justify-between",
                  head_cell: `rounded-md w-8 font-normal text-[0.8rem] font-body ${isDark ? 'text-slate-500' : 'text-slate-500'}`,
                  row: "flex w-full mt-2 justify-between",
                  cell: "text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
                  day: `h-8 w-8 p-0 font-normal rounded-md font-body ${isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100'}`,
                  day_selected: "bg-emerald-500 text-white hover:bg-emerald-600 font-medium",
                  day_today: `${isDark ? 'bg-slate-800 text-emerald-400' : 'bg-emerald-100 text-emerald-600'}`,
                  day_outside: `opacity-50 ${isDark ? 'text-slate-600' : 'text-slate-400'}`,
                  day_disabled: `opacity-50 ${isDark ? 'text-slate-600' : 'text-slate-400'}`,
                }}
              />
            </CardContent>
          </Card>

          {/* Network Status */}
          <Card className={`backdrop-blur-xl border rounded-2xl ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`} data-testid="network-status-widget">
            <CardHeader className="pb-2">
              <CardTitle className={`text-lg font-medium font-heading flex items-center gap-2 ${isDark ? 'text-slate-50' : 'text-slate-900'}`}>
                <Activity className="w-5 h-5 text-emerald-400" />
                Network Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className={`flex items-center justify-between p-3 rounded-lg ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                  <div className="flex items-center gap-3">
                    <CircleDot className="w-5 h-5 text-emerald-400" />
                    <span className={`text-sm font-body ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Online</span>
                  </div>
                  <span className={`text-lg font-semibold font-heading text-emerald-400`}>
                    {overview?.devices?.online || 0}
                  </span>
                </div>
                
                <div className={`flex items-center justify-between p-3 rounded-lg ${overview?.devices?.offline > 0 ? 'bg-red-500/10' : isDark ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                  <div className="flex items-center gap-3">
                    <CircleDot className={`w-5 h-5 ${overview?.devices?.offline > 0 ? 'text-red-400' : 'text-slate-400'}`} />
                    <span className={`text-sm font-body ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Offline</span>
                  </div>
                  <span className={`text-lg font-semibold font-heading ${overview?.devices?.offline > 0 ? 'text-red-400' : isDark ? 'text-slate-50' : 'text-slate-900'}`}>
                    {overview?.devices?.offline || 0}
                  </span>
                </div>
                
                <div className={`flex items-center justify-between p-3 rounded-lg ${overview?.devices?.degraded > 0 ? 'bg-amber-500/10' : isDark ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                  <div className="flex items-center gap-3">
                    <CircleDot className={`w-5 h-5 ${overview?.devices?.degraded > 0 ? 'text-amber-400' : 'text-slate-400'}`} />
                    <span className={`text-sm font-body ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Degraded</span>
                  </div>
                  <span className={`text-lg font-semibold font-heading ${overview?.devices?.degraded > 0 ? 'text-amber-400' : isDark ? 'text-slate-50' : 'text-slate-900'}`}>
                    {overview?.devices?.degraded || 0}
                  </span>
                </div>
                
                <div className={`flex items-center justify-between p-3 rounded-lg ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                  <div className="flex items-center gap-3">
                    <Wrench className="w-5 h-5 text-sky-400" />
                    <span className={`text-sm font-body ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Maintenance</span>
                  </div>
                  <span className={`text-lg font-semibold font-heading ${isDark ? 'text-slate-50' : 'text-slate-900'}`}>
                    {overview?.maintenance?.upcoming || 0}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Active Incidents */}
          <Card className={`backdrop-blur-xl border rounded-2xl ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`} data-testid="incidents-widget">
            <CardHeader className="pb-2">
              <CardTitle className={`text-lg font-medium font-heading flex items-center gap-2 ${isDark ? 'text-slate-50' : 'text-slate-900'}`}>
                <AlertTriangle className="w-5 h-5 text-rose-400" />
                Active Incidents
              </CardTitle>
              <p className={`text-sm font-body ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                {overview?.incidents?.active || 0} active
              </p>
            </CardHeader>
            <CardContent>
              {incidents.length === 0 ? (
                <div className="text-center py-6">
                  <Shield className={`w-10 h-10 mx-auto mb-3 ${isDark ? 'text-slate-600' : 'text-slate-400'}`} />
                  <p className={`text-sm font-body ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    No active incidents
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[200px]">
                  <div className="space-y-3 pr-4">
                    {incidents.filter(i => i.status !== 'resolved').slice(0, 5).map((incident) => (
                      <div 
                        key={incident.id}
                        className={`p-3 rounded-lg border-l-2 ${
                          incident.severity === 'critical' ? 'border-red-500 bg-red-500/5' :
                          incident.severity === 'major' ? 'border-orange-500 bg-orange-500/5' :
                          'border-amber-500 bg-amber-500/5'
                        }`}
                        data-testid={`incident-item-${incident.id}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-mono ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                {incident.incident_number}
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded-full border font-body ${getSeverityColor(incident.severity)}`}>
                                {incident.severity}
                              </span>
                            </div>
                            <p className={`text-sm font-medium font-body mt-1 truncate ${isDark ? 'text-slate-50' : 'text-slate-900'}`}>
                              {incident.title}
                            </p>
                            <Badge variant="outline" className={`mt-2 text-xs font-body capitalize ${isDark ? 'border-slate-700 text-slate-400' : 'border-slate-300 text-slate-500'}`}>
                              {incident.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { 
  Sun, Moon, Server, Network, Activity, AlertTriangle,
  Calendar as CalendarIcon, CheckCircle2, Clock, Wifi,
  ChevronRight, HardDrive, Shield, MonitorSpeaker,
  Wrench, AlertCircle, LayoutGrid, Radio, Globe,
  Cpu, Router, Database, BarChart3, Map, Bell,
  Zap, Settings, RefreshCw, CircleDot
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/cards';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { Checkbox } from '../components/ui/checkbox';
import { Calendar } from '../components/ui/calendar';
import { ScrollArea } from '../components/ui/scroll-area';
import { Button } from '../components/ui/button';

export default function NetworkDashboard({ apiUrl, employeeId, isDark, toggleTheme }) {
  const [employee, setEmployee] = useState(null);
  const [recentServices, setRecentServices] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [devicesSummary, setDevicesSummary] = useState(null);
  const [overview, setOverview] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [initialized, setInitialized] = useState(false);

  const getHeaders = () => ({
    'X-Employee-ID': employeeId,
    'Content-Type': 'application/json'
  });

  const fetchData = async (endpoint) => {
    try {
      const response = await fetch(`${apiUrl}${endpoint}`, { 
        headers: getHeaders() 
      });
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadDashboard = async () => {
      if (!employeeId || !apiUrl) return;
      
      setLoading(true);

      const [emp, services, tasksData, alertsData, incidentsData, maintenanceData, devices, overviewData] = await Promise.all([
        fetchData('/employee/profile'),
        fetchData('/services/recent?limit=4'),
        fetchData('/tasks?status=pending'),
        fetchData('/alerts?status=open'),
        fetchData('/incidents'),
        fetchData('/maintenance?status=scheduled'),
        fetchData('/devices/summary'),
        fetchData('/dashboard/overview')
      ]);

      if (isMounted) {
        if (emp) setEmployee(emp);
        setRecentServices(services || []);
        setTasks(tasksData || []);
        setAlerts(alertsData || []);
        setIncidents(incidentsData || []);
        setMaintenance(maintenanceData || []);
        setDevicesSummary(devices);
        setOverview(overviewData);
        setLoading(false);
        setInitialized(true);
      }
    };

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, [apiUrl, employeeId]);

  const trackServiceUsage = async (serviceName, serviceTitle, serviceDescription, serviceIcon) => {
    try {
      await fetch(`${apiUrl}/services/track`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          service_name: serviceName,
          service_title: serviceTitle,
          service_description: serviceDescription,
          service_icon: serviceIcon
        })
      });
      
      const response = await fetch(`${apiUrl}/services/recent?limit=4`, { headers: getHeaders() });
      if (response.ok) {
        const data = await response.json();
        setRecentServices(data || []);
      }
    } catch (err) {
      console.error('Error tracking service usage:', err);
    }
  };

  const updateTaskStatus = async (taskId, newStatus) => {
    try {
      const response = await fetch(`${apiUrl}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ status: newStatus })
      });
      
      if (response.ok) {
        setTasks(tasks.map(task => 
          task.id === taskId ? { ...task, status: newStatus } : task
        ));
      }
    } catch (err) {
      console.error('Error updating task:', err);
    }
  };

  const acknowledgeAlert = async (alertId) => {
    try {
      const response = await fetch(`${apiUrl}/alerts/${alertId}/acknowledge`, {
        method: 'POST',
        headers: getHeaders()
      });
      
      if (response.ok) {
        setAlerts(alerts.filter(alert => alert.id !== alertId));
      }
    } catch (err) {
      console.error('Error acknowledging alert:', err);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getServiceIcon = (iconName) => {
    const icons = {
      'inventory': <Server className="w-6 h-6" />,
      'traffic': <Activity className="w-6 h-6" />,
      'topology': <Network className="w-6 h-6" />,
      'alerts': <Bell className="w-6 h-6" />,
      'monitoring': <MonitorSpeaker className="w-6 h-6" />,
      'firewall': <Shield className="w-6 h-6" />,
      'wireless': <Wifi className="w-6 h-6" />,
      'default': <LayoutGrid className="w-6 h-6" />
    };
    return icons[iconName] || icons['default'];
  };

  const getServiceColor = (serviceName) => {
    const colors = {
      'inventory': 'text-sky-400 bg-sky-500/10',
      'traffic': 'text-emerald-400 bg-emerald-500/10',
      'topology': 'text-violet-400 bg-violet-500/10',
      'alerts': 'text-rose-400 bg-rose-500/10',
      'monitoring': 'text-amber-400 bg-amber-500/10',
      'firewall': 'text-orange-400 bg-orange-500/10',
      'wireless': 'text-cyan-400 bg-cyan-500/10'
    };
    return colors[serviceName] || 'text-slate-400 bg-slate-500/10';
  };

  const getSeverityColor = (severity) => {
    const colors = {
      'critical': 'bg-red-500/15 text-red-400 border-red-500/30',
      'high': 'bg-orange-500/15 text-orange-400 border-orange-500/30',
      'major': 'bg-orange-500/15 text-orange-400 border-orange-500/30',
      'medium': 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      'minor': 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      'low': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      'warning': 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
      'info': 'bg-sky-500/15 text-sky-400 border-sky-500/30'
    };
    return colors[severity] || colors['medium'];
  };

  const getDeviceStatusColor = (status) => {
    const colors = {
      'online': 'text-emerald-400',
      'offline': 'text-red-400',
      'degraded': 'text-amber-400',
      'maintenance': 'text-sky-400'
    };
    return colors[status] || 'text-slate-400';
  };

  const getTaskTypeIcon = (type) => {
    const icons = {
      'maintenance': <Wrench className="w-4 h-4" />,
      'upgrade': <RefreshCw className="w-4 h-4" />,
      'troubleshoot': <Settings className="w-4 h-4" />,
      'audit': <BarChart3 className="w-4 h-4" />,
      'config_change': <Cpu className="w-4 h-4" />,
      'install': <HardDrive className="w-4 h-4" />
    };
    return icons[type] || <CheckCircle2 className="w-4 h-4" />;
  };

  if (loading && !initialized) {
    return (
      <div className={`w-full max-w-[1600px] mx-auto p-4 md:p-8 flex items-center justify-center min-h-screen ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}>
        <div className={`font-body ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Loading dashboard...</div>
      </div>
    );
  }

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monitoring & Health */}
        <div className={`lg:col-span-2 rounded-xl border p-5 ${isDark ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'}`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Monitoring & Health</h2>
            <Activity className="h-5 w-5 text-emerald-500" />
          </div>
          {loading ? (
            <div className="flex items-center justify-center h-28">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {healthCards.map((c) => (
                <StatusCard key={c.title} title={c.title} value={c.value} isDark={isDark} />
              ))}
            </div>
          )}
        </div>

        {/* Cloud Control */}
        <div className={`rounded-xl border p-5 ${isDark ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'}`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Cloud Control</h2>
            <Cloud className="h-5 w-5 text-sky-500" />
          </div>
          {loading ? (
            <div className="flex items-center justify-center h-20">
              <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              <Row label="Active Regions"   value={cloud.active_regions ?? 0}   isDark={isDark} />
              <Row label="Cloud Devices"    value={cloud.cloud_devices  ?? 0}   isDark={isDark} />
              <Row
                label="Open Incidents"
                value={cloud.incidents_count > 0 ? `${cloud.incidents_count} Warning` : 'None'}
                highlight={cloud.has_warnings}
                isDark={isDark}
              />
            </div>
          )}
          
  if (error && !employee) {
    return (
      <div className={`w-full max-w-[1600px] mx-auto p-4 md:p-8 flex flex-col items-center justify-center min-h-screen ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}>
        <AlertCircle className={`w-12 h-12 mb-4 ${isDark ? 'text-red-400' : 'text-red-500'}`} />
        <p className={`font-body ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{error}</p>
        <Button 
          onClick={fetchDashboardData} 
          className="mt-4 bg-orange-500 hover:bg-orange-600 text-white"
          data-testid="retry-btn"
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className={`w-full max-w-[1600px] mx-auto p-4 md:p-8 ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`} data-testid="network-dashboard">
      {/* Header Section */}
      <header className={`flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pb-6 border-b mb-8 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 border-2 border-emerald-500/30">
            <AvatarImage src={employee?.avatar_url} alt={employee?.name} />
            <AvatarFallback className={`font-heading text-xl ${isDark ? 'bg-slate-800 text-emerald-400' : 'bg-slate-200 text-emerald-600'}`}>
              {employee?.name?.split(' ').map(n => n[0]).join('') || '?'}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className={`text-sm font-body ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{getGreeting()}</p>
            <h1 className={`text-2xl sm:text-3xl font-semibold tracking-tight font-heading ${isDark ? 'text-slate-50' : 'text-slate-900'}`} data-testid="employee-name">
              {employee?.name || 'Network Engineer'}
            </h1>
            <p className={`text-sm font-body ${isDark ? 'text-slate-500' : 'text-slate-600'}`}>
              {employee?.role || 'Network Operations'} - {employee?.department || 'NOC'}
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Quick Stats Pills */}
          <div className={`stat-pill flex items-center gap-2 px-4 py-2 rounded-full border ${overview?.alerts?.critical > 0 ? 'bg-red-500/10 border-red-500/30' : isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`} data-testid="stat-alerts">
            <AlertTriangle className={`w-4 h-4 ${overview?.alerts?.critical > 0 ? 'text-red-400' : 'text-rose-400'}`} />
            <span className={`font-medium font-body ${overview?.alerts?.critical > 0 ? 'text-red-400' : isDark ? 'text-slate-50' : 'text-slate-900'}`}>
              {overview?.alerts?.critical || 0}
            </span>
            <span className={`text-sm font-body ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Critical</span>
          </div>
          <div className={`stat-pill flex items-center gap-2 px-4 py-2 rounded-full border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`} data-testid="stat-devices">
            <Server className="w-4 h-4 text-sky-400" />
            <span className={`font-medium font-body ${isDark ? 'text-slate-50' : 'text-slate-900'}`}>{overview?.devices?.total || 0}</span>
            <span className={`text-sm font-body ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Devices</span>
          </div>
          <div className={`stat-pill flex items-center gap-2 px-4 py-2 rounded-full border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`} data-testid="stat-tasks">
            <Wrench className="w-4 h-4 text-amber-400" />
            <span className={`font-medium font-body ${isDark ? 'text-slate-50' : 'text-slate-900'}`}>{overview?.tasks?.pending || 0}</span>
            <span className={`text-sm font-body ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Tasks</span>
          </div>
          
          <Button
            variant="outline"
            size="icon"
            onClick={toggleTheme}
            className={`ml-2 ${isDark ? 'bg-slate-900 border-slate-700 hover:bg-slate-800' : 'bg-white border-slate-200 hover:bg-slate-100'}`}
            data-testid="theme-toggle"
          >
            {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-600" />}
          </Button>
        </div>
      </header>


      {/* Bottom panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Device Usage */}
        <div className={`rounded-xl border p-5 ${isDark ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'}`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Server & Device Usage
            </h2>
            <TrendingUp className="h-5 w-5 text-indigo-500" />
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
            </div>
          ) : devices.length === 0 ? (
            <div className={`flex flex-col items-center justify-center h-40 gap-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              <Server className="h-8 w-8" />
              <p className="text-sm">No devices found.</p>
              <p className="text-xs">Add devices via the Inventory view.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
              {devices.map((d) => (
                <UtilBar key={d.id} {...d} isDark={isDark} />
              ))}
            </div>
          )}
        </div>

        {/* Storage & Backups */}
        <div className={`rounded-xl border p-5 ${isDark ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'}`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Storage & Backups
            </h2>
            <HardDrive className="h-5 w-5 text-emerald-500" />
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
            </div>
          ) : !storage || storage.total_backups === 0 ? (
            <div className={`flex flex-col items-center justify-center h-40 gap-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
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
                  <div key={label} className={`rounded-lg border p-3 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-slate-50'}`}>
                    <Icon className={`h-4 w-4 mb-1 ${color}`} />
                    <p className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{value}</p>
                    <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{label}</p>
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
                      <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Today's success rate</span>
                      <span className={`font-semibold ${pct >= 90 ? 'text-emerald-500' : pct >= 70 ? 'text-amber-500' : 'text-rose-500'}`}>{pct}%</span>
                    </div>
                    <div className={`h-2 rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
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
=======
      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        {/* Left Column - Services & Workload */}
        <div className="lg:col-span-8 flex flex-col gap-6 lg:gap-8">
          {/* Recent Services Section */}
          <section>
            <h2 className={`text-xl font-medium tracking-tight font-heading mb-4 ${isDark ? 'text-slate-50' : 'text-slate-900'}`}>
              Recent Services
            </h2>
            
            {recentServices.length === 0 ? (
              <Card className={`backdrop-blur-xl border rounded-2xl ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                <CardContent className="p-8 text-center">
                  <Network className={`w-12 h-12 mx-auto mb-4 ${isDark ? 'text-slate-600' : 'text-slate-400'}`} />
                  <p className={`font-body ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    No recent services. Start using Network features to see them here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
                {recentServices.map((service) => (
                  <Card 
                    key={service.id}
                    className={`service-card backdrop-blur-xl border rounded-2xl cursor-pointer transition-all hover:-translate-y-1 ${isDark ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'}`}
                    onClick={() => trackServiceUsage(service.service_name, service.service_title, service.service_description, service.service_icon)}
                    data-testid={`service-card-${service.service_name}`}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className={`p-3 rounded-xl ${getServiceColor(service.service_name)}`}>
                          {getServiceIcon(service.service_icon)}
                        </div>
                        <Badge className={`font-body ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'} border-0`}>
                          {service.usage_count} uses
                        </Badge>
                      </div>
                      <h3 className={`text-lg font-medium font-heading mb-1 ${isDark ? 'text-slate-50' : 'text-slate-900'}`}>
                        {service.service_title}
                      </h3>
                      <p className={`text-sm font-body ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {service.service_description}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>

          {/* Network Alerts */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-xl font-medium tracking-tight font-heading ${isDark ? 'text-slate-50' : 'text-slate-900'}`}>
                Active Alerts
              </h2>
              {(overview?.alerts?.critical > 0 || overview?.alerts?.high > 0) && (
                <Badge className="bg-red-500/15 text-red-400 border-red-500/30 font-body">
                  <Zap className="w-3 h-3 mr-1" />
                  {(overview?.alerts?.critical || 0) + (overview?.alerts?.high || 0)} High Priority
                </Badge>
              )}
            </div>
            
            <Card className={`backdrop-blur-xl border rounded-2xl ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
              <CardContent className="p-6">
                {alerts.length === 0 ? (
                  <div className="text-center py-8">
                    <Bell className={`w-12 h-12 mx-auto mb-4 ${isDark ? 'text-slate-600' : 'text-slate-400'}`} />
                    <p className={`font-body ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      No active alerts - all systems operational
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="h-[280px]">
                    <div className="space-y-3 pr-4">
                      {alerts.slice(0, 6).map((alert) => (
                        <div 
                          key={alert.id}
                          className={`p-4 rounded-lg border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}
                          data-testid={`alert-item-${alert.id}`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-mono ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                  {alert.alert_number}
                                </span>
                                <span className={`text-xs px-2 py-0.5 rounded-full border font-body ${getSeverityColor(alert.severity)}`}>
                                  {alert.severity}
                                </span>
                              </div>
                              <p className={`text-sm font-medium font-body mt-1 ${isDark ? 'text-slate-50' : 'text-slate-900'}`}>
                                {alert.title}
                              </p>
                              <p className={`text-xs font-body mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                {alert.source} • {alert.category}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => acknowledgeAlert(alert.id)}
                              className={`ml-2 text-xs ${isDark ? 'border-slate-700 hover:bg-slate-700' : 'border-slate-300'}`}
                              data-testid={`acknowledge-alert-${alert.id}`}
                            >
                              Acknowledge
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </section>

          {/* Tasks */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-xl font-medium tracking-tight font-heading ${isDark ? 'text-slate-50' : 'text-slate-900'}`}>
                My Tasks
              </h2>
              <Button 
                variant="ghost" 
                className={`font-body ${isDark ? 'text-slate-400 hover:text-slate-50' : 'text-slate-500 hover:text-slate-900'}`}
                data-testid="view-all-tasks"
              >
                View All <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
            
            <Card className={`backdrop-blur-xl border rounded-2xl ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
              <CardContent className="p-6">
                {tasks.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle2 className={`w-12 h-12 mx-auto mb-4 ${isDark ? 'text-slate-600' : 'text-slate-400'}`} />
                    <p className={`font-body ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      No pending tasks
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="h-[280px]">
                    <div className="space-y-3 pr-4">
                      {tasks.slice(0, 6).map((task) => (
                        <div 
                          key={task.id}
                          className={`flex items-start gap-3 p-3 rounded-lg transition-all ${isDark ? 'bg-slate-800/50 hover:bg-slate-800' : 'bg-slate-50 hover:bg-slate-100'}`}
                          data-testid={`task-item-${task.id}`}
                        >
                          <Checkbox
                            checked={task.status === 'completed'}
                            onCheckedChange={() => updateTaskStatus(task.id, task.status === 'completed' ? 'pending' : 'completed')}
                            className={`mt-0.5 ${isDark ? 'border-slate-600' : 'border-slate-300'} data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500`}
                            data-testid={`task-checkbox-${task.id}`}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              {getTaskTypeIcon(task.task_type)}
                              <p className={`text-sm font-medium font-body ${isDark ? 'text-slate-50' : 'text-slate-900'}`}>
                                {task.title}
                              </p>
                            </div>
                            {task.related_device_name && (
                              <p className={`text-xs font-body mt-1 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                                Device: {task.related_device_name}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <span className={`text-xs px-2 py-0.5 rounded-full border font-body ${getSeverityColor(task.priority)}`}>
                                {task.priority}
                              </span>
                              <Badge variant="outline" className={`text-xs font-body capitalize ${isDark ? 'border-slate-700 text-slate-400' : 'border-slate-300 text-slate-500'}`}>
                                {task.task_type.replace('_', ' ')}
                              </Badge>
                              {task.due_date && (
                                <span className={`text-xs font-body ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                                  Due: {format(parseISO(task.due_date), 'MMM d')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </section>
        </div>

        {/* Right Column - Calendar & Status */}
        <div className="lg:col-span-4 flex flex-col gap-6 lg:gap-8">
          {/* Calendar Widget */}
          <Card className={`backdrop-blur-xl border rounded-2xl ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`} data-testid="calendar-widget">
            <CardHeader className="pb-2">
              <CardTitle className={`text-lg font-medium font-heading flex items-center gap-2 ${isDark ? 'text-slate-50' : 'text-slate-900'}`}>
                <CalendarIcon className="w-5 h-5 text-emerald-400" />
                Calendar
              </CardTitle>
            </CardHeader>
            <CardContent className="px-2 pb-4">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md"
                classNames={{
                  months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                  month: "space-y-4 w-full",
                  caption: `flex justify-center pt-1 relative items-center font-heading ${isDark ? 'text-slate-50' : 'text-slate-900'}`,
                  caption_label: "text-sm font-medium",
                  nav: "space-x-1 flex items-center",
                  nav_button: `h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 ${isDark ? 'text-slate-400 hover:text-slate-50' : 'text-slate-500 hover:text-slate-900'}`,
                  nav_button_previous: "absolute left-1",
                  nav_button_next: "absolute right-1",
                  table: "w-full border-collapse space-y-1",
                  head_row: "flex w-full justify-between",
                  head_cell: `rounded-md w-8 font-normal text-[0.8rem] font-body ${isDark ? 'text-slate-500' : 'text-slate-500'}`,
                  row: "flex w-full mt-2 justify-between",
                  cell: "text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
                  day: `h-8 w-8 p-0 font-normal rounded-md font-body ${isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100'}`,
                  day_selected: "bg-emerald-500 text-white hover:bg-emerald-600 font-medium",
                  day_today: `${isDark ? 'bg-slate-800 text-emerald-400' : 'bg-emerald-100 text-emerald-600'}`,
                  day_outside: `opacity-50 ${isDark ? 'text-slate-600' : 'text-slate-400'}`,
                  day_disabled: `opacity-50 ${isDark ? 'text-slate-600' : 'text-slate-400'}`,
                }}
              />
            </CardContent>
          </Card>

          {/* Network Status */}
          <Card className={`backdrop-blur-xl border rounded-2xl ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`} data-testid="network-status-widget">
            <CardHeader className="pb-2">
              <CardTitle className={`text-lg font-medium font-heading flex items-center gap-2 ${isDark ? 'text-slate-50' : 'text-slate-900'}`}>
                <Activity className="w-5 h-5 text-emerald-400" />
                Network Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className={`flex items-center justify-between p-3 rounded-lg ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                  <div className="flex items-center gap-3">
                    <CircleDot className="w-5 h-5 text-emerald-400" />
                    <span className={`text-sm font-body ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Online</span>
                  </div>
                  <span className={`text-lg font-semibold font-heading text-emerald-400`}>
                    {overview?.devices?.online || 0}
                  </span>
                </div>
                
                <div className={`flex items-center justify-between p-3 rounded-lg ${overview?.devices?.offline > 0 ? 'bg-red-500/10' : isDark ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                  <div className="flex items-center gap-3">
                    <CircleDot className={`w-5 h-5 ${overview?.devices?.offline > 0 ? 'text-red-400' : 'text-slate-400'}`} />
                    <span className={`text-sm font-body ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Offline</span>
                  </div>
                  <span className={`text-lg font-semibold font-heading ${overview?.devices?.offline > 0 ? 'text-red-400' : isDark ? 'text-slate-50' : 'text-slate-900'}`}>
                    {overview?.devices?.offline || 0}
                  </span>
                </div>
                
                <div className={`flex items-center justify-between p-3 rounded-lg ${overview?.devices?.degraded > 0 ? 'bg-amber-500/10' : isDark ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                  <div className="flex items-center gap-3">
                    <CircleDot className={`w-5 h-5 ${overview?.devices?.degraded > 0 ? 'text-amber-400' : 'text-slate-400'}`} />
                    <span className={`text-sm font-body ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Degraded</span>
                  </div>
                  <span className={`text-lg font-semibold font-heading ${overview?.devices?.degraded > 0 ? 'text-amber-400' : isDark ? 'text-slate-50' : 'text-slate-900'}`}>
                    {overview?.devices?.degraded || 0}
                  </span>
                </div>
                
                <div className={`flex items-center justify-between p-3 rounded-lg ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                  <div className="flex items-center gap-3">
                    <Wrench className="w-5 h-5 text-sky-400" />
                    <span className={`text-sm font-body ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Maintenance</span>
                  </div>
                  <span className={`text-lg font-semibold font-heading ${isDark ? 'text-slate-50' : 'text-slate-900'}`}>
                    {overview?.maintenance?.upcoming || 0}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Active Incidents */}
          <Card className={`backdrop-blur-xl border rounded-2xl ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`} data-testid="incidents-widget">
            <CardHeader className="pb-2">
              <CardTitle className={`text-lg font-medium font-heading flex items-center gap-2 ${isDark ? 'text-slate-50' : 'text-slate-900'}`}>
                <AlertTriangle className="w-5 h-5 text-rose-400" />
                Active Incidents
              </CardTitle>
              <p className={`text-sm font-body ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                {overview?.incidents?.active || 0} active
              </p>
            </CardHeader>
            <CardContent>
              {incidents.length === 0 ? (
                <div className="text-center py-6">
                  <Shield className={`w-10 h-10 mx-auto mb-3 ${isDark ? 'text-slate-600' : 'text-slate-400'}`} />
                  <p className={`text-sm font-body ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    No active incidents
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[200px]">
                  <div className="space-y-3 pr-4">
                    {incidents.filter(i => i.status !== 'resolved').slice(0, 5).map((incident) => (
                      <div 
                        key={incident.id}
                        className={`p-3 rounded-lg border-l-2 ${
                          incident.severity === 'critical' ? 'border-red-500 bg-red-500/5' :
                          incident.severity === 'major' ? 'border-orange-500 bg-orange-500/5' :
                          'border-amber-500 bg-amber-500/5'
                        }`}
                        data-testid={`incident-item-${incident.id}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-mono ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                {incident.incident_number}
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded-full border font-body ${getSeverityColor(incident.severity)}`}>
                                {incident.severity}
                              </span>
                            </div>
                            <p className={`text-sm font-medium font-body mt-1 truncate ${isDark ? 'text-slate-50' : 'text-slate-900'}`}>
                              {incident.title}
                            </p>
                            <Badge variant="outline" className={`mt-2 text-xs font-body capitalize ${isDark ? 'border-slate-700 text-slate-400' : 'border-slate-300 text-slate-500'}`}>
                              {incident.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
