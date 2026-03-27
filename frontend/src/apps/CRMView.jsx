import { useState, useEffect, useCallback } from 'react';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import {
  Users, TrendingUp, BarChart3, Database,
  Calendar as CalendarIcon, CheckCircle2, Clock, AlertTriangle,
  ChevronRight, Phone, Mail, MessageSquare, FileText,
  Target, DollarSign, Ticket, RefreshCw,
  AlertCircle, CheckSquare, LayoutGrid
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/cards';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { Checkbox } from '../components/ui/checkbox';
import { Calendar } from '../components/ui/calendar';
import { ScrollArea } from '../components/ui/scroll-area';
import { Button } from '../components/ui/button';
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

// ── Component ─────────────────────────────────────────────────────────────────
export default function CRMDashboard() {
  const { theme } = useSidebar();
  const isDark = theme === 'dark';

  const [employee, setEmployee]             = useState(null);
  const [recentServices, setRecentServices] = useState([]);
  const [tasks, setTasks]                   = useState([]);
  const [tickets, setTickets]               = useState([]);
  const [followUps, setFollowUps]           = useState([]);
  const [opportunities, setOpportunities]   = useState([]);
  const [overview, setOverview]             = useState(null);
  const [selectedDate, setSelectedDate]     = useState(new Date());
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState(null);

  // ── Fetch all dashboard data ──────────────────────────────────────────────
  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [emp, services, tasksData, ticketsData, followUpsData, opps, ov] =
        await Promise.all([
          apiFetch('/crm/dashboard/profile').catch(() => null),
          apiFetch('/crm/dashboard/services/recent?limit=4').catch(() => []),
          apiFetch('/crm/dashboard/tasks?status=pending').catch(() => []),
          apiFetch('/crm/dashboard/tickets').catch(() => []),
          apiFetch('/crm/dashboard/follow-ups?status=scheduled').catch(() => []),
          apiFetch('/crm/dashboard/opportunities').catch(() => []),
          apiFetch('/crm/dashboard/overview').catch(() => null),
        ]);

      if (emp) setEmployee(emp);
      setRecentServices(services ?? []);
      setTasks(tasksData ?? []);
      setTickets(ticketsData ?? []);
      setFollowUps(followUpsData ?? []);
      setOpportunities(opps ?? []);
      setOverview(ov);
    } catch (err) {
      console.error('CRM dashboard fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount — no employeeId dependency, auth comes from JWT
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const trackServiceUsage = async (service) => {
    try {
      await apiFetch('/crm/dashboard/services/track', {
        method: 'POST',
        body: JSON.stringify({
          service_name: service.service_name,
          service_title: service.service_title,
          service_description: service.service_description,
          service_icon: service.service_icon,
        }),
      });
      const updated = await apiFetch('/crm/dashboard/services/recent?limit=4');
      setRecentServices(updated ?? []);
    } catch (err) {
      console.error('Service track failed:', err);
    }
  };

  const updateTaskStatus = async (taskId, newStatus) => {
    try {
      await apiFetch(`/crm/dashboard/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
      );
    } catch (err) {
      console.error('Task update failed:', err);
    }
  };

  const updateTicketStatus = async (ticketId, newStatus) => {
    try {
      await apiFetch(`/crm/dashboard/tickets/${ticketId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      setTickets((prev) =>
        prev.map((t) => (t.id === ticketId ? { ...t, status: newStatus } : t))
      );
    } catch (err) {
      console.error('Ticket update failed:', err);
    }
  };

  // ── Utilities ─────────────────────────────────────────────────────────────
  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getServiceIcon = (iconName) => {
    const icons = {
      pipeline:      <TrendingUp className="w-6 h-6" />,
      database:      <Database className="w-6 h-6" />,
      opportunities: <Target className="w-6 h-6" />,
      reports:       <BarChart3 className="w-6 h-6" />,
      contacts:      <Users className="w-6 h-6" />,
      tickets:       <Ticket className="w-6 h-6" />,
      analytics:     <BarChart3 className="w-6 h-6" />,
    };
    return icons[iconName] ?? <LayoutGrid className="w-6 h-6" />;
  };

  const getServiceColor = (name) => {
    const colors = {
      pipeline:      'text-emerald-400 bg-emerald-500/10',
      database:      'text-sky-400 bg-sky-500/10',
      opportunities: 'text-amber-400 bg-amber-500/10',
      reports:       'text-violet-400 bg-violet-500/10',
      contacts:      'text-rose-400 bg-rose-500/10',
      tickets:       'text-orange-400 bg-orange-500/10',
    };
    return colors[name] ?? 'text-slate-400 bg-slate-500/10';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      urgent: 'bg-red-500/15 text-red-400 border-red-500/30',
      high:   'bg-orange-500/15 text-orange-400 border-orange-500/30',
      medium: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      low:    'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    };
    return colors[priority] ?? colors.medium;
  };

  const getSLAColor = (slaStatus) => {
    const colors = {
      on_track: 'text-emerald-400',
      at_risk:  'text-amber-400',
      breached: 'text-red-400',
    };
    return colors[slaStatus] ?? colors.on_track;
  };

  const getTaskTypeIcon = (type) => {
    const icons = {
      call:      <Phone className="w-4 h-4" />,
      email:     <Mail className="w-4 h-4" />,
      meeting:   <Users className="w-4 h-4" />,
      follow_up: <RefreshCw className="w-4 h-4" />,
      review:    <FileText className="w-4 h-4" />,
    };
    return icons[type] ?? <CheckSquare className="w-4 h-4" />;
  };

  const formatCurrency = (value, currency = 'USD') =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value ?? 0);

  // ── Loading / Error states ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div
        className={`w-full max-w-[1600px] mx-auto p-4 md:p-8 flex items-center justify-center min-h-screen ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}
      >
        <div className={`font-body ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Loading dashboard…</div>
      </div>
    );
  }

  if (error && !employee) {
    return (
      <div
        className={`w-full max-w-[1600px] mx-auto p-4 md:p-8 flex flex-col items-center justify-center min-h-screen ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}
      >
        <AlertCircle className={`w-12 h-12 mb-4 ${isDark ? 'text-red-400' : 'text-red-500'}`} />
        <p className={`font-body ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{error}</p>
        <Button onClick={fetchDashboardData} className="mt-4 bg-orange-500 hover:bg-orange-600 text-white" data-testid="retry-btn">
          Retry
        </Button>
      </div>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <div
      className={`w-full max-w-[1600px] mx-auto p-4 md:p-8 ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}
      data-testid="crm-dashboard"
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header
        className={`flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pb-6 border-b mb-8 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}
      >
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 border-2 border-orange-500/30">
            <AvatarImage src={employee?.avatar_url} alt={employee?.name} />
            <AvatarFallback
              className={`font-heading text-xl ${isDark ? 'bg-slate-800 text-orange-400' : 'bg-slate-200 text-orange-600'}`}
            >
              {employee?.name?.split(' ').map((n) => n[0]).join('') || '?'}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className={`text-sm font-body ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{getGreeting()}</p>
            <h1
              className={`text-2xl sm:text-3xl font-semibold tracking-tight font-heading ${isDark ? 'text-slate-50' : 'text-slate-900'}`}
              data-testid="employee-name"
            >
              {employee?.name ?? '—'}
            </h1>
            <p className={`text-sm font-body ${isDark ? 'text-slate-500' : 'text-slate-600'}`}>
              {employee?.role ?? 'Customer Service'} — {employee?.department ?? 'CRM'}
            </p>
          </div>
        </div>

        {/* Quick Stats Pills */}
        <div className="flex flex-wrap items-center gap-3">
          <div
            className={`stat-pill flex items-center gap-2 px-4 py-2 rounded-full border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}
            data-testid="stat-tasks"
          >
            <CheckSquare className="w-4 h-4 text-orange-400" />
            <span className={`font-medium font-body ${isDark ? 'text-slate-50' : 'text-slate-900'}`}>
              {overview?.tasks?.pending ?? 0}
            </span>
            <span className={`text-sm font-body ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Tasks</span>
          </div>
          <div
            className={`stat-pill flex items-center gap-2 px-4 py-2 rounded-full border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}
            data-testid="stat-tickets"
          >
            <Ticket className="w-4 h-4 text-sky-400" />
            <span className={`font-medium font-body ${isDark ? 'text-slate-50' : 'text-slate-900'}`}>
              {overview?.tickets?.open ?? 0}
            </span>
            <span className={`text-sm font-body ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Open Tickets</span>
          </div>
          <div
            className={`stat-pill flex items-center gap-2 px-4 py-2 rounded-full border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}
            data-testid="stat-pipeline"
          >
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <span className={`font-medium font-body ${isDark ? 'text-slate-50' : 'text-slate-900'}`}>
              {formatCurrency(overview?.opportunities?.pipeline_value)}
            </span>
            <span className={`text-sm font-body ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Pipeline</span>
          </div>
        </div>
      </header>

      {/* ── Main Grid ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        {/* Left Column */}
        <div className="lg:col-span-8 flex flex-col gap-6 lg:gap-8">
          {/* Recent Services */}
          <section>
            <h2
              className={`text-xl font-medium tracking-tight font-heading mb-4 ${isDark ? 'text-slate-50' : 'text-slate-900'}`}
            >
              Recent Services
            </h2>
            {recentServices.length === 0 ? (
              <Card
                className={`backdrop-blur-xl border rounded-2xl ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}
              >
                <CardContent className="p-8 text-center">
                  <LayoutGrid className={`w-12 h-12 mx-auto mb-4 ${isDark ? 'text-slate-600' : 'text-slate-400'}`} />
                  <p className={`font-body ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    No recent services. Start using CRM features to see them here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
                {recentServices.map((service) => (
                  <Card
                    key={service.id}
                    className={`service-card backdrop-blur-xl border rounded-2xl cursor-pointer transition-all hover:-translate-y-1 ${isDark ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'}`}
                    onClick={() => trackServiceUsage(service)}
                    data-testid={`service-card-${service.service_name}`}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className={`p-3 rounded-xl ${getServiceColor(service.service_name)}`}>
                          {getServiceIcon(service.service_icon ?? service.service_name)}
                        </div>
                        <Badge
                          className={`font-body ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'} border-0`}
                        >
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

          {/* Tasks & Follow-ups */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-xl font-medium tracking-tight font-heading ${isDark ? 'text-slate-50' : 'text-slate-900'}`}>
                Tasks &amp; Follow-ups
              </h2>
              <Button
                variant="ghost"
                className={`font-body ${isDark ? 'text-slate-400 hover:text-slate-50' : 'text-slate-500 hover:text-slate-900'}`}
                data-testid="view-all-tasks"
              >
                View All <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
            <Card
              className={`backdrop-blur-xl border rounded-2xl ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}
            >
              <CardContent className="p-6">
                {tasks.length === 0 && followUps.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle2 className={`w-12 h-12 mx-auto mb-4 ${isDark ? 'text-slate-600' : 'text-slate-400'}`} />
                    <p className={`font-body ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      No pending tasks or follow-ups
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="h-[320px]">
                    <div className="space-y-3 pr-4">
                      {tasks.slice(0, 5).map((task) => (
                        <div
                          key={task.id}
                          className={`flex items-start gap-3 p-3 rounded-lg transition-all ${isDark ? 'bg-slate-800/50 hover:bg-slate-800' : 'bg-slate-50 hover:bg-slate-100'}`}
                          data-testid={`task-item-${task.id}`}
                        >
                          <Checkbox
                            checked={task.status === 'completed'}
                            onCheckedChange={() =>
                              updateTaskStatus(task.id, task.status === 'completed' ? 'pending' : 'completed')
                            }
                            className={`mt-0.5 ${isDark ? 'border-slate-600' : 'border-slate-300'} data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500`}
                            data-testid={`task-checkbox-${task.id}`}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              {getTaskTypeIcon(task.task_type)}
                              <p className={`text-sm font-medium font-body ${isDark ? 'text-slate-50' : 'text-slate-900'}`}>
                                {task.title}
                              </p>
                            </div>
                            {task.relatedCustomerName && (
                              <p className={`text-xs font-body mt-1 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                                Customer: {task.relatedCustomerName}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full border font-body ${getPriorityColor(task.priority)}`}
                              >
                                {task.priority}
                              </span>
                              {task.due_date && (
                                <span className={`text-xs font-body ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                                  Due: {format(parseISO(task.due_date), 'MMM d')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}

                      {followUps.slice(0, 3).map((followUp) => (
                        <div
                          key={followUp.id}
                          className={`flex items-start gap-3 p-3 rounded-lg border-l-2 border-amber-500 ${isDark ? 'bg-slate-800/50' : 'bg-amber-50'}`}
                          data-testid={`followup-item-${followUp.id}`}
                        >
                          <RefreshCw className={`w-4 h-4 mt-1 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium font-body ${isDark ? 'text-slate-50' : 'text-slate-900'}`}>
                              Follow-up: {followUp.customer_name}
                            </p>
                            <p className={`text-xs font-body mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                              {followUp.follow_up_type} —{' '}
                              {format(parseISO(followUp.scheduled_date), 'MMM d, h:mm a')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </section>

          {/* Ticket Queue */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-xl font-medium tracking-tight font-heading ${isDark ? 'text-slate-50' : 'text-slate-900'}`}>
                Ticket Queue
              </h2>
              {(overview?.tickets?.at_risk > 0 || overview?.tickets?.breached > 0) && (
                <Badge className="bg-red-500/15 text-red-400 border-red-500/30 font-body">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  {(overview.tickets.at_risk ?? 0) + (overview.tickets.breached ?? 0)} SLA Issues
                </Badge>
              )}
            </div>
            <Card
              className={`backdrop-blur-xl border rounded-2xl ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}
            >
              <CardContent className="p-6">
                {tickets.length === 0 ? (
                  <div className="text-center py-8">
                    <Ticket className={`w-12 h-12 mx-auto mb-4 ${isDark ? 'text-slate-600' : 'text-slate-400'}`} />
                    <p className={`font-body ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      No tickets in queue
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="h-[280px]">
                    <div className="space-y-3 pr-4">
                      {tickets.slice(0, 6).map((ticket) => (
                        <div
                          key={ticket.id}
                          className={`p-4 rounded-lg border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}
                          data-testid={`ticket-item-${ticket.id}`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-mono ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                  {ticket.ticket_number}
                                </span>
                                <span
                                  className={`text-xs px-2 py-0.5 rounded-full border font-body ${getPriorityColor(ticket.priority)}`}
                                >
                                  {ticket.priority}
                                </span>
                              </div>
                              <p className={`text-sm font-medium font-body mt-1 ${isDark ? 'text-slate-50' : 'text-slate-900'}`}>
                                {ticket.subject}
                              </p>
                              <p className={`text-xs font-body mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                {ticket.customer_name} • {ticket.category}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <Badge
                                variant="outline"
                                className={`text-xs font-body capitalize ${isDark ? 'border-slate-700' : 'border-slate-300'}`}
                              >
                                {ticket.status.replace('_', ' ')}
                              </Badge>
                              <button
                                onClick={() =>
                                  updateTicketStatus(
                                    ticket.id,
                                    ticket.status === 'open' ? 'in_progress' : 'open'
                                  )
                                }
                                className={`text-xs font-body ${getSLAColor(ticket.sla_status)} hover:underline`}
                              >
                                SLA: {ticket.sla_status.replace('_', ' ')}
                              </button>
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

        {/* Right Column */}
        <div className="lg:col-span-4 flex flex-col gap-6 lg:gap-8">
          {/* Calendar */}
          <Card
            className={`backdrop-blur-xl border rounded-2xl ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}
            data-testid="calendar-widget"
          >
            <CardHeader className="pb-2">
              <CardTitle
                className={`text-lg font-medium font-heading flex items-center gap-2 ${isDark ? 'text-slate-50' : 'text-slate-900'}`}
              >
                <CalendarIcon className="w-5 h-5 text-orange-400" />
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
                  months: 'flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0',
                  month: 'space-y-4 w-full',
                  caption: `flex justify-center pt-1 relative items-center font-heading ${isDark ? 'text-slate-50' : 'text-slate-900'}`,
                  caption_label: 'text-sm font-medium',
                  nav: 'space-x-1 flex items-center',
                  nav_button: `h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 ${isDark ? 'text-slate-400 hover:text-slate-50' : 'text-slate-500 hover:text-slate-900'}`,
                  nav_button_previous: 'absolute left-1',
                  nav_button_next: 'absolute right-1',
                  table: 'w-full border-collapse space-y-1',
                  head_row: 'flex w-full justify-between',
                  head_cell: `rounded-md w-8 font-normal text-[0.8rem] font-body ${isDark ? 'text-slate-500' : 'text-slate-500'}`,
                  row: 'flex w-full mt-2 justify-between',
                  cell: 'text-center text-sm p-0 relative focus-within:relative focus-within:z-20',
                  day: `h-8 w-8 p-0 font-normal rounded-md font-body ${isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100'}`,
                  day_selected: 'bg-orange-500 text-white hover:bg-orange-600 font-medium',
                  day_today: `${isDark ? 'bg-slate-800 text-orange-400' : 'bg-orange-100 text-orange-600'}`,
                  day_outside: `opacity-50 ${isDark ? 'text-slate-600' : 'text-slate-400'}`,
                  day_disabled: `opacity-50 ${isDark ? 'text-slate-600' : 'text-slate-400'}`,
                }}
              />
            </CardContent>
          </Card>

          {/* Today's Workload */}
          <Card
            className={`backdrop-blur-xl border rounded-2xl ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}
            data-testid="schedule-widget"
          >
            <CardHeader className="pb-2">
              <CardTitle
                className={`text-lg font-medium font-heading flex items-center gap-2 ${isDark ? 'text-slate-50' : 'text-slate-900'}`}
              >
                <Clock className="w-5 h-5 text-orange-400" />
                Today's Workload
              </CardTitle>
              <p className={`text-sm font-body ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                {format(new Date(), 'EEEE, MMMM d')}
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { icon: <CheckSquare className="w-5 h-5 text-orange-400" />, label: 'Pending Tasks',   value: overview?.tasks?.pending ?? 0, alert: false },
                  { icon: <RefreshCw className="w-5 h-5 text-amber-400" />,   label: 'Follow-ups Today', value: overview?.follow_ups_today ?? 0, alert: false },
                  { icon: <Ticket className="w-5 h-5 text-sky-400" />,        label: 'Open Tickets',    value: overview?.tickets?.open ?? 0,    alert: false },
                  { icon: <AlertTriangle className={`w-5 h-5 ${(overview?.tickets?.breached ?? 0) > 0 ? 'text-red-400' : 'text-slate-400'}`} />,
                    label: 'SLA Breached', value: overview?.tickets?.breached ?? 0, alert: (overview?.tickets?.breached ?? 0) > 0 },
                ].map(({ icon, label, value, alert }) => (
                  <div
                    key={label}
                    className={`flex items-center justify-between p-3 rounded-lg ${alert ? 'bg-red-500/10' : isDark ? 'bg-slate-800/50' : 'bg-slate-50'}`}
                  >
                    <div className="flex items-center gap-3">
                      {icon}
                      <span className={`text-sm font-body ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{label}</span>
                    </div>
                    <span className={`text-lg font-semibold font-heading ${alert ? 'text-red-400' : isDark ? 'text-slate-50' : 'text-slate-900'}`}>
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Opportunities Pipeline */}
          <Card
            className={`backdrop-blur-xl border rounded-2xl ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}
            data-testid="opportunities-widget"
          >
            <CardHeader className="pb-2">
              <CardTitle
                className={`text-lg font-medium font-heading flex items-center gap-2 ${isDark ? 'text-slate-50' : 'text-slate-900'}`}
              >
                <Target className="w-5 h-5 text-orange-400" />
                Opportunities
              </CardTitle>
              <p className={`text-sm font-body ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                {overview?.opportunities?.total ?? 0} active •{' '}
                {formatCurrency(overview?.opportunities?.pipeline_value)}
              </p>
            </CardHeader>
            <CardContent>
              {opportunities.length === 0 ? (
                <div className="text-center py-6">
                  <Target className={`w-10 h-10 mx-auto mb-3 ${isDark ? 'text-slate-600' : 'text-slate-400'}`} />
                  <p className={`text-sm font-body ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    No opportunities yet
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[200px]">
                  <div className="space-y-3 pr-4">
                    {opportunities.slice(0, 5).map((opp) => (
                      <div
                        key={opp.id}
                        className={`p-3 rounded-lg ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'}`}
                        data-testid={`opportunity-item-${opp.id}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium font-body truncate ${isDark ? 'text-slate-50' : 'text-slate-900'}`}>
                              {opp.name}
                            </p>
                            <p className={`text-xs font-body mt-0.5 capitalize ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                              {opp.stage.replace('_', ' ')}
                            </p>
                          </div>
                          <div className="text-right ml-3">
                            <p className={`text-sm font-semibold font-heading ${isDark ? 'text-slate-50' : 'text-slate-900'}`}>
                              {formatCurrency(opp.value)}
                            </p>
                            <p className={`text-xs font-body ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                              {opp.probability}% prob
                            </p>
                          </div>
                        </div>
                        <div className="mt-2 h-1 rounded-full bg-slate-700/30 overflow-hidden">
                          <div
                            className="h-full bg-orange-500 rounded-full transition-all"
                            style={{ width: `${opp.probability}%` }}
                          />
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
