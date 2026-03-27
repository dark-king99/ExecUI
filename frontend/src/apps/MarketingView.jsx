
import { useState, useEffect } from 'react';
import { useState, useEffect, useCallback } from 'react';
import { format, parseISO, isToday, isTomorrow, formatDistanceToNow } from 'date-fns';
import {
  Mail, Building, Cpu, ImageIcon,
  Calendar as CalendarIcon, CheckCircle2, Clock,
  ChevronRight, Users, Send, Smartphone,
  Megaphone, LayoutGrid, AlertCircle
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
export default function MarketingDashboard() {
  const { theme } = useSidebar();
  const isDark = theme === 'dark';

  const [employee, setEmployee]       = useState(null);
  const [todos, setTodos]             = useState([]);
  const [schedule, setSchedule]       = useState([]);
  const [activities, setActivities]   = useState([]);
  const [serviceStats, setServiceStats] = useState(null);
  const [overview, setOverview]       = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [emp, todosData, scheduleData, activitiesData, stats, ov] = await Promise.all([
        apiFetch('/marketing/dashboard/profile'),
        apiFetch('/marketing/dashboard/todos'),
        apiFetch('/marketing/dashboard/schedule'),
        apiFetch('/marketing/dashboard/activities'),
        apiFetch('/marketing/dashboard/service-stats'),
        apiFetch('/marketing/dashboard/overview'),
      ]);
      setEmployee(emp);
      setTodos(todosData ?? []);
      setSchedule(scheduleData ?? []);
      setActivities(activitiesData ?? []);
      setServiceStats(stats);
      setOverview(ov);
    } catch (err) {
      console.error('Marketing dashboard fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleTodoToggle = async (todoId, completed) => {
    try {
      const updated = await apiFetch(`/marketing/dashboard/todos/${todoId}`, {
        method: 'PATCH',
        body: JSON.stringify({ completed: !completed }),
      });
      setTodos((prev) =>
        prev.map((t) => (t.id === todoId ? { ...t, completed: !completed } : t))
      );
    } catch (err) {
      console.error('Todo toggle failed:', err);
    }
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getServiceIcon = (service) => {
    const icons = {
      personalization: <Cpu className="w-6 h-6" />,
      b2b: <Building className="w-6 h-6" />,
      emma: <Mail className="w-6 h-6" />,
      creative: <ImageIcon className="w-6 h-6" />,
    };
    return icons[service] || <LayoutGrid className="w-6 h-6" />;
  };

  const getServiceColor = (service) => {
    const colors = {
      personalization: 'text-sky-400 bg-sky-500/10',
      b2b: 'text-emerald-400 bg-emerald-500/10',
      emma: 'text-rose-400 bg-rose-500/10',
      creative: 'text-orange-400 bg-orange-500/10',
    };
    return colors[service] || 'text-slate-400 bg-slate-500/10';
  };

  const getEventTypeClass = (type) => {
    const classes = {
      meeting: 'event-meeting',
      campaign: 'event-campaign',
      deadline: 'event-deadline',
      review: 'event-review',
    };
    return classes[type] || '';
  };

  const formatEventTime = (ds) => format(parseISO(ds), 'h:mm a');
  const formatEventDate = (ds) => {
    const d = parseISO(ds);
    if (isToday(d)) return 'Today';
    if (isTomorrow(d)) return 'Tomorrow';
    return format(d, 'MMM d');
  };
  const formatActivityTime = (ds) =>
    formatDistanceToNow(parseISO(ds), { addSuffix: true });

  // ── Loading / Error states ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="w-full max-w-[1600px] mx-auto p-4 md:p-8 flex items-center justify-center min-h-screen">
        <div className="text-slate-400 font-body">Loading dashboard…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`w-full max-w-[1600px] mx-auto p-4 md:p-8 flex flex-col items-center justify-center min-h-screen ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}>
        <AlertCircle className={`w-12 h-12 mb-4 ${isDark ? 'text-red-400' : 'text-red-500'}`} />
        <p className={`font-body mb-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{error}</p>
        <Button onClick={fetchDashboardData} className="bg-orange-500 hover:bg-orange-600 text-white">
          Retry
        </Button>
      </div>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <div
      className={`w-screen max-w-[1600px] mx-auto p-4 md:p-8 ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}
      data-testid="marketing-dashboard"
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
              {employee?.role} — {employee?.department}
            </p>
          </div>
        </div>

        {/* Quick Stats Pills */}
        <div className="flex flex-wrap items-center gap-3">
          <div
            className={`stat-pill flex items-center gap-2 px-4 py-2 rounded-full border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}
            data-testid="stat-campaigns"
          >
            <Megaphone className="w-4 h-4 text-orange-400" />
            <span className={`font-medium font-body ${isDark ? 'text-slate-50' : 'text-slate-900'}`}>
              {overview?.campaigns_live ?? 0}
            </span>
            <span className={`text-sm font-body ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Campaigns Live</span>
          </div>
          <div
            className={`stat-pill flex items-center gap-2 px-4 py-2 rounded-full border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}
            data-testid="stat-leads"
          >
            <Users className="w-4 h-4 text-emerald-400" />
            <span className={`font-medium font-body ${isDark ? 'text-slate-50' : 'text-slate-900'}`}>
              {overview?.active_leads ?? 0}
            </span>
            <span className={`text-sm font-body ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Active Leads</span>
          </div>
          <div
            className={`stat-pill flex items-center gap-2 px-4 py-2 rounded-full border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}
            data-testid="stat-emails"
          >
            <Send className="w-4 h-4 text-sky-400" />
            <span className={`font-medium font-body ${isDark ? 'text-slate-50' : 'text-slate-900'}`}>
              {(overview?.emails_sent ?? 0).toLocaleString()}
            </span>
            <span className={`text-sm font-body ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Emails Sent</span>
          </div>
        </div>
      </header>

      {/* ── Main Grid ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        {/* Left Column */}
        <div className="lg:col-span-8 flex flex-col gap-6 lg:gap-8">
          {/* Marketing Services */}
          <section>
            <h2 className={`text-xl font-medium tracking-tight font-heading mb-4 ${isDark ? 'text-slate-50' : 'text-slate-900'}`}>
              Marketing Services
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
              {/* Personalization */}
              <Card
                className={`service-card backdrop-blur-xl border rounded-2xl cursor-pointer ${isDark ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'}`}
                data-testid="service-card-personalization"
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`service-icon p-3 rounded-xl ${getServiceColor('personalization')}`}>
                      <Cpu className="w-6 h-6" />
                    </div>
                    <Badge className="bg-sky-500/20 text-sky-400 border-0 font-body">
                      {serviceStats?.personalization?.tests_running ?? 0} tests
                    </Badge>
                  </div>
                  <h3 className={`text-lg font-medium font-heading mb-1 ${isDark ? 'text-slate-50' : 'text-slate-900'}`}>
                    Personalization
                  </h3>
                  <p className={`text-sm font-body mb-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Dynamic audience segmentation &amp; content
                  </p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className={`font-body ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Active Segments</span>
                      <span className={`font-medium font-body ${isDark ? 'text-slate-50' : 'text-slate-900'}`}>
                        {serviceStats?.personalization?.active_segments ?? 0}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className={`font-body ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Visitors Personalized</span>
                      <span className={`font-medium font-body ${isDark ? 'text-slate-50' : 'text-slate-900'}`}>
                        {(serviceStats?.personalization?.visitors_personalized ?? 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className={`font-body ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Conversion Lift</span>
                      <span className="text-emerald-400 font-medium font-body">
                        {serviceStats?.personalization?.conversion_lift ?? '0%'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* B2B */}
              <Card
                className={`service-card backdrop-blur-xl border rounded-2xl cursor-pointer ${isDark ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'}`}
                data-testid="service-card-b2b"
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`service-icon p-3 rounded-xl ${getServiceColor('b2b')}`}>
                      <Building className="w-6 h-6" />
                    </div>
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-0 font-body">
                      {serviceStats?.b2b?.conversion_rate ?? '0%'} CVR
                    </Badge>
                  </div>
                  <h3 className={`text-lg font-medium font-heading mb-1 ${isDark ? 'text-slate-50' : 'text-slate-900'}`}>
                    B2B Accounts
                  </h3>
                  <p className={`text-sm font-body mb-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Lead scoring &amp; pipeline management
                  </p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className={`font-body ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Qualified Leads</span>
                      <span className={`font-medium font-body ${isDark ? 'text-slate-50' : 'text-slate-900'}`}>
                        {serviceStats?.b2b?.qualified_leads ?? 0}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className={`font-body ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Pipeline Value</span>
                      <span className={`font-medium font-body ${isDark ? 'text-slate-50' : 'text-slate-900'}`}>
                        {serviceStats?.b2b?.pipeline_value ?? '$0'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className={`font-body ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Avg Deal Size</span>
                      <span className={`font-medium font-body ${isDark ? 'text-slate-50' : 'text-slate-900'}`}>
                        {serviceStats?.b2b?.avg_deal_size ?? '$0'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* EMMA */}
              <Card
                className={`service-card backdrop-blur-xl border rounded-2xl cursor-pointer ${isDark ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'}`}
                data-testid="service-card-emma"
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`service-icon p-3 rounded-xl ${getServiceColor('emma')}`}>
                      <Mail className="w-6 h-6" />
                    </div>
                    <Badge className="bg-rose-500/20 text-rose-400 border-0 font-body">
                      <Smartphone className="w-3 h-3 mr-1" />
                      Mobile
                    </Badge>
                  </div>
                  <h3 className={`text-lg font-medium font-heading mb-1 ${isDark ? 'text-slate-50' : 'text-slate-900'}`}>
                    EMMA
                  </h3>
                  <p className={`text-sm font-body mb-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Email, Mobile &amp; Automation
                  </p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className={`font-body ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Emails Today</span>
                      <span className={`font-medium font-body ${isDark ? 'text-slate-50' : 'text-slate-900'}`}>
                        {(serviceStats?.emma?.emails_sent_today ?? 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className={`font-body ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Open Rate</span>
                      <span className="text-emerald-400 font-medium font-body">
                        {serviceStats?.emma?.open_rate ?? '0%'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className={`font-body ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Automations Active</span>
                      <span className={`font-medium font-body ${isDark ? 'text-slate-50' : 'text-slate-900'}`}>
                        {serviceStats?.emma?.automations_active ?? 0}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className={`font-body ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Total Subscribers</span>
                      <span className={`font-medium font-body ${isDark ? 'text-slate-50' : 'text-slate-900'}`}>
                        {(serviceStats?.emma?.subscribers ?? 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Creative Assets */}
              <Card
                className={`service-card backdrop-blur-xl border rounded-2xl cursor-pointer relative overflow-hidden ${isDark ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'}`}
                data-testid="service-card-creative"
              >
                <CardContent className="p-6 relative z-10">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`service-icon p-3 rounded-xl ${getServiceColor('creative')}`}>
                      <ImageIcon className="w-6 h-6" />
                    </div>
                    <Badge className="bg-orange-500/20 text-orange-400 border-0 font-body">
                      {serviceStats?.creative?.approval_pending ?? 0} pending
                    </Badge>
                  </div>
                  <h3 className={`text-lg font-medium font-heading mb-1 ${isDark ? 'text-slate-50' : 'text-slate-900'}`}>
                    Creative Assets
                  </h3>
                  <p className={`text-sm font-body mb-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Automated ad variations &amp; assets
                  </p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className={`font-body ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Assets Generated</span>
                      <span className={`font-medium font-body ${isDark ? 'text-slate-50' : 'text-slate-900'}`}>
                        {serviceStats?.creative?.assets_generated ?? 0}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className={`font-body ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Campaigns Active</span>
                      <span className={`font-medium font-body ${isDark ? 'text-slate-50' : 'text-slate-900'}`}>
                        {serviceStats?.creative?.campaigns_active ?? 0}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className={`font-body ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Brand Score</span>
                      <span className="text-emerald-400 font-medium font-body">
                        {serviceStats?.creative?.brand_score ?? 'N/A'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Activity Feed */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-xl font-medium tracking-tight font-heading ${isDark ? 'text-slate-50' : 'text-slate-900'}`}>
                Recent Activity
              </h2>
              <Button
                variant="ghost"
                className={`font-body ${isDark ? 'text-slate-400 hover:text-slate-50' : 'text-slate-500 hover:text-slate-900'}`}
                data-testid="view-all-activity"
              >
                View All <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
            <Card
              className={`backdrop-blur-xl border rounded-2xl ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}
            >
              <CardContent className="p-6">
                {activities.length === 0 ? (
                  <div className="text-center py-8">
                    <LayoutGrid className={`w-12 h-12 mx-auto mb-4 ${isDark ? 'text-slate-600' : 'text-slate-400'}`} />
                    <p className={`font-body ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      No recent activity. Actions you take will appear here.
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="h-[320px] custom-scrollbar">
                    <div className="space-y-4 pr-4">
                      {activities.map((activity, index) => (
                        <div
                          key={activity.id}
                          className="activity-item flex gap-4 opacity-0 animate-fade-in"
                          style={{ animationDelay: `${index * 0.08}s` }}
                          data-testid={`activity-item-${activity.id}`}
                        >
                          <div className={`p-2 rounded-lg ${getServiceColor(activity.service)} shrink-0`}>
                            {getServiceIcon(activity.service)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-body ${isDark ? 'text-slate-50' : 'text-slate-900'}`}>
                              <span className="font-medium capitalize">{activity.action}</span>
                              {' '}
                              <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>{activity.target}</span>
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge
                                variant="outline"
                                className={`text-xs font-body capitalize ${isDark ? 'border-slate-700 text-slate-500' : 'border-slate-300 text-slate-500'}`}
                              >
                                {activity.service}
                              </Badge>
                              <span className={`text-xs font-body ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                                {formatActivityTime(activity.timestamp)}
                              </span>
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
            className={`backdrop-blur-xl border rounded-2xl calendar-widget ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}
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

          {/* Schedule */}
          <Card
            className={`backdrop-blur-xl border rounded-2xl ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}
            data-testid="schedule-widget"
          >
            <CardHeader className="pb-2">
              <CardTitle
                className={`text-lg font-medium font-heading flex items-center gap-2 ${isDark ? 'text-slate-50' : 'text-slate-900'}`}
              >
                <Clock className="w-5 h-5 text-orange-400" />
                My Schedule
              </CardTitle>
              <p className={`text-sm font-body ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                {format(selectedDate, 'EEEE, MMMM d, yyyy')}
              </p>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[240px] custom-scrollbar">
                <div className="space-y-3 pr-4">
                  {schedule.length === 0 ? (
                    <p className={`text-sm font-body text-center py-6 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                      No upcoming events. Add them via the API.
                    </p>
                  ) : (
                    schedule
                      .filter((event) => {
                        const ed = parseISO(event.start_time);
                        return (
                          format(ed, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd') ||
                          isToday(ed) ||
                          isTomorrow(ed)
                        );
                      })
                      .slice(0, 5)
                      .map((event, index) => (
                        <div
                          key={event.id}
                          className={`p-3 rounded-lg ${getEventTypeClass(event.event_type)} opacity-0 animate-fade-in ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'}`}
                          style={{ animationDelay: `${index * 0.08}s` }}
                          data-testid={`schedule-event-${event.id}`}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <p className={`text-sm font-medium font-body ${isDark ? 'text-slate-50' : 'text-slate-900'}`}>
                                {event.title}
                              </p>
                              <p className={`text-xs font-body mt-1 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                                {formatEventDate(event.start_time)} at {formatEventTime(event.start_time)}
                                {event.end_time && ` – ${formatEventTime(event.end_time)}`}
                              </p>
                            </div>
                            <Badge
                              variant="outline"
                              className={`text-xs capitalize font-body ${isDark ? 'border-slate-700 text-slate-400' : 'border-slate-300 text-slate-500'}`}
                            >
                              {event.event_type}
                            </Badge>
                          </div>
                          {event.location && (
                            <p className={`text-xs font-body mt-2 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                              {event.location}
                            </p>
                          )}
                        </div>
                      ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Todos */}
          <Card
            className={`backdrop-blur-xl border rounded-2xl ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}
            data-testid="todo-widget"
          >
            <CardHeader className="pb-2">
              <CardTitle
                className={`text-lg font-medium font-heading flex items-center gap-2 ${isDark ? 'text-slate-50' : 'text-slate-900'}`}
              >
                <CheckCircle2 className="w-5 h-5 text-orange-400" />
                My Tasks
              </CardTitle>
              <p className={`text-sm font-body ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                {todos.filter((t) => !t.completed).length} remaining
              </p>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[280px] custom-scrollbar">
                <div className="space-y-3 pr-4">
                  {todos.length === 0 ? (
                    <p className={`text-sm font-body text-center py-6 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                      No tasks yet. Create them via the API.
                    </p>
                  ) : (
                    todos.map((todo, index) => (
                      <div
                        key={todo.id}
                        className={`todo-item flex items-start gap-3 p-3 rounded-lg transition-all opacity-0 animate-fade-in ${
                          todo.completed
                            ? `completed ${isDark ? 'bg-slate-800/30' : 'bg-slate-50'}`
                            : `${isDark ? 'bg-slate-800/50 hover:bg-slate-800' : 'bg-slate-50 hover:bg-slate-100'}`
                        }`}
                        style={{ animationDelay: `${index * 0.08}s` }}
                        data-testid={`todo-item-${todo.id}`}
                      >
                        <Checkbox
                          checked={todo.completed}
                          onCheckedChange={() => handleTodoToggle(todo.id, todo.completed)}
                          className={`todo-checkbox mt-0.5 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500 ${isDark ? 'border-slate-600' : 'border-slate-300'}`}
                          data-testid={`todo-checkbox-${todo.id}`}
                        />
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm font-body todo-title ${
                              todo.completed
                                ? isDark ? 'text-slate-500 line-through' : 'text-slate-400 line-through'
                                : isDark ? 'text-slate-50' : 'text-slate-900'
                            }`}
                          >
                            {todo.title}
                          </p>
                          {todo.description && (
                            <p className={`text-xs font-body mt-1 truncate ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                              {todo.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-body priority-${todo.priority}`}>
                              {todo.priority}
                            </span>
                            {todo.due_date && (
                              <span className={`text-xs font-body ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                                Due: {format(parseISO(todo.due_date), 'MMM d')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
