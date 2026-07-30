import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDataSync, useApi } from "../../hooks/useApi";
import { account } from "../../services/api";
import { useUser } from "../../context/UserContext";
import { useSidebar } from '../../components/SidebarContext';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  FolderKanban,
  FileText,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Megaphone,
  
  Send,
  Activity,
  BarChart3,
  Calendar,
  Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/cards";
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';

// The services API is mounted at /api/services, like every other module. The
// base defaults to "/api" for the same reason services/api.js does: with `?? ''`
// these pages requested /services/... , which matches no route and falls through
// to the SPA — so every one of them logged "Unexpected token '<'" and rendered
// empty. Same-origin production and dev alike.
const API = `${import.meta.env.VITE_API_BASE_URL || '/api'}/services`;


const StatCard = ({ title, value, subtitle, icon: Icon, trend, trendValue, accentColor, isDarkMode }) => (
  <Card 
    data-testid={`stat-card-${title.toLowerCase().replace(/\s+/g, '-')}`}
    className={`${
      isDarkMode 
        ? 'bg-slate-900/50 border-slate-800 hover:border-slate-700' 
        : 'bg-white border-slate-200 hover:border-slate-300'
    } transition-colors`}
  >
    <CardContent className="p-4">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className={`text-xs font-medium uppercase tracking-wider ${
            isDarkMode ? 'text-slate-400' : 'text-slate-500'
          }`}>
            {title}
          </p>
          <p className={`text-2xl font-bold tracking-tight ${
            isDarkMode ? 'text-slate-50' : 'text-slate-900'
          }`}>
            {value}
          </p>
          {subtitle && (
            <p className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              {subtitle}
            </p>
          )}
        </div>
        <div className={`p-2.5 rounded-lg ${accentColor}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      {trend !== undefined && (
        <div className="mt-3 flex items-center gap-1.5">
          {trend === 'up' ? (
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
          ) : (
            <ArrowDownRight className="w-3.5 h-3.5 text-rose-500" />
          )}
          <span className={`text-xs font-medium ${
            trend === 'up' ? 'text-emerald-500' : 'text-rose-500'
          }`}>
            {trendValue}
          </span>
          <span className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
            vs last period
          </span>
        </div>
      )}
    </CardContent>
  </Card>
);

const RecentActivity = ({ transactions, isDarkMode }) => (
  <Card 
    data-testid="recent-transactions"
    className={`${
      isDarkMode 
        ? 'bg-slate-900/50 border-slate-800' 
        : 'bg-white border-slate-200'
    }`}
  >
    <CardHeader className="pb-3">
      <CardTitle className={`text-sm font-medium flex items-center gap-2 ${
        isDarkMode ? 'text-slate-50' : 'text-slate-900'
      }`}>
        <Activity className="w-4 h-4 text-emerald-500" />
        Recent Transactions
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-3">
      {transactions.length === 0 ? (
        <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          No recent transactions
        </p>
      ) : (
        transactions.slice(0, 5).map((tx, idx) => (
          <div 
            key={tx.id || idx}
            className={`flex items-center justify-between py-2 ${
              idx !== transactions.length - 1 ? `border-b ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}` : ''
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                tx.type === 'income' 
                  ? 'bg-emerald-500/10 text-emerald-500' 
                  : 'bg-rose-500/10 text-rose-500'
              }`}>
                {tx.type === 'income' ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
              </div>
              <div>
                <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-50' : 'text-slate-900'}`}>
                  {tx.description || tx.category}
                </p>
                <p className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  {tx.category}
                </p>
              </div>
            </div>
            <span className={`text-sm font-semibold ${
              tx.type === 'income' ? 'text-emerald-500' : 'text-rose-500'
            }`}>
              {tx.type === 'income' ? '+' : '-'}${tx.amount?.toLocaleString() || '0'}
            </span>
          </div>
        ))
      )}
    </CardContent>
  </Card>
);

const ProjectsOverview = ({ projects, isDarkMode }) => {
  const statusColors = {
    planning: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    in_progress: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    review: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    completed: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  };

  return (
    <Card 
      data-testid="projects-overview"
      className={`${
        isDarkMode 
          ? 'bg-slate-900/50 border-slate-800' 
          : 'bg-white border-slate-200'
      }`}
    >
      <CardHeader className="pb-3">
        <CardTitle className={`text-sm font-medium flex items-center gap-2 ${
          isDarkMode ? 'text-slate-50' : 'text-slate-900'
        }`}>
          <FolderKanban className="w-4 h-4 text-amber-500" />
          Active Projects
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {projects.length === 0 ? (
          <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            No active projects
          </p>
        ) : (
          projects.slice(0, 4).map((project, idx) => (
            <div 
              key={project.id || idx}
              className={`p-3 rounded-lg ${isDarkMode ? 'bg-slate-800/50' : 'bg-slate-50'}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-50' : 'text-slate-900'}`}>
                    {project.name}
                  </p>
                  <p className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    {project.team_members?.length || 0} team members
                  </p>
                </div>
                <Badge 
                  variant="outline" 
                  className={`text-xs ${statusColors[project.status] || statusColors.planning}`}
                >
                  {project.status?.replace('_', ' ')}
                </Badge>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>Progress</span>
                  <span className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>{project.progress || 0}%</span>
                </div>
                <Progress value={project.progress || 0} className="h-1.5" />
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};

const QuickStats = ({ stats, isDarkMode }) => (
  <Card 
    data-testid="quick-stats"
    className={`${
      isDarkMode 
        ? 'bg-slate-900/50 border-slate-800' 
        : 'bg-white border-slate-200'
    }`}
  >
    <CardHeader className="pb-3">
      <CardTitle className={`text-sm font-medium flex items-center gap-2 ${
        isDarkMode ? 'text-slate-50' : 'text-slate-900'
      }`}>
        <BarChart3 className="w-4 h-4 text-indigo-500" />
        Quick Stats
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-2 gap-4">
        <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-3.5 h-3.5 text-blue-500" />
            <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>SOPs</span>
          </div>
          <p className={`text-xl font-bold ${isDarkMode ? 'text-slate-50' : 'text-slate-900'}`}>
            {stats.operations?.sops_count || 0}
          </p>
        </div>
        <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-3.5 h-3.5 text-purple-500" />
            <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Goals</span>
          </div>
          <p className={`text-xl font-bold ${isDarkMode ? 'text-slate-50' : 'text-slate-900'}`}>
            {stats.strategic?.goals_count || 0}
          </p>
        </div>
        <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Avg Progress</span>
          </div>
          <p className={`text-xl font-bold ${isDarkMode ? 'text-slate-50' : 'text-slate-900'}`}>
            {stats.strategic?.avg_progress || 0}%
          </p>
        </div>
        <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="w-3.5 h-3.5 text-rose-500" />
            <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Transactions</span>
          </div>
          <p className={`text-xl font-bold ${isDarkMode ? 'text-slate-50' : 'text-slate-900'}`}>
            {stats.financial?.transaction_count || 0}
          </p>
        </div>
      </div>
    </CardContent>
  </Card>
);

export const Dashboard = () => {
  const { theme } = useSidebar();
  const isDarkMode = theme === 'dark';
  const navigate = useNavigate();

  // Identity comes from the shared profile query (same cache as the Greeting),
  // so avatar/name/role edits in Profile propagate here automatically.
  const { data: profile } = useApi(() => account.profile.get(), [], { cacheKey: "account:profile" });
  const stored = useUser().user ?? {};
  const displayName =
    profile?.name ||
    [stored.firstName, stored.lastName].filter(Boolean).join(' ').trim() ||
    stored.name || stored.email || '—';
  const displayRole = String(profile?.role ?? stored.role ?? '').replace(/_/g, ' ');
  const displayDept = profile?.department ?? stored.department ?? '';
  const avatarUrl = profile?.avatarUrl ?? stored.avatarUrl ?? stored.avatar_url;
  const initials = displayName.split(' ').filter(Boolean).map((n) => n[0]).slice(0, 2).join('') || '?';

  const [stats, setStats] = useState({
    financial: { total_income: 0, total_expenses: 0, net_profit: 0, transaction_count: 0 },
    projects: { active: 0, completed: 0, total: 0 },
    team: { active_members: 0, total: 0 },
    clients: { active: 0, total: 0, total_value: 0 },
    operations: { sops_count: 0 },
    strategic: { goals_count: 0, avg_progress: 0 },
    recent_transactions: [],
    recent_projects: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  // Keep this page in sync app-wide (focus + cross-page mutations).
  useDataSync(() => fetchDashboardStats());

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch(`${API}/dashboard/stats`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  };


  if (loading) {
    return (
      <div data-testid="dashboard-loading" className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div data-testid="dashboard-view" className="space-y-6">
      {/* Header */}
      <header
        className={`animate-slide-up flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pb-6 border-b mb-8 ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}
      >
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 border-2 border-orange-500/30">
            <AvatarImage src={avatarUrl} alt={displayName} />
            <AvatarFallback
              className="font-heading text-xl text-orange-400 bg-slate-200"
            >
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className={`text-sm font-body ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{getGreeting()}</p>
            <h1
              className={`text-2xl sm:text-3xl font-semibold tracking-tight font-heading ${isDarkMode ? 'text-white' : 'text-slate-900'}`}
              data-testid="employee-name"
            >
              {displayName}
            </h1>
            <p className="text-sm font-body text-slate-500 capitalize">
              {[displayRole, displayDept].filter(Boolean).join(' — ') || '—'}
            </p>
          </div>
        </div>

        {/* Quick stats — real numbers, click to drill into the module. */}
        <div className="stagger flex flex-wrap items-center gap-3">
          {[
            { icon: Activity, tint: 'text-orange-400', value: stats.projects.active,       label: 'Live Projects', to: '/services/team',      testid: 'stat-projects' },
            { icon: Target,   tint: 'text-violet-400', value: stats.strategic.goals_count,  label: 'Active Goals',  to: '/services/strategic', testid: 'stat-goals' },
            { icon: Users,    tint: 'text-emerald-400',value: stats.clients.active,         label: 'Active Clients',to: '/services/marketing', testid: 'stat-clients' },
          ].map((p) => (
            <button
              key={p.label}
              onClick={() => navigate(p.to)}
              data-testid={p.testid}
              title={`View ${p.label}`}
              className={`stat-pill animate-slide-up flex items-center gap-2 px-4 py-2 rounded-full border shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                isDarkMode ? 'bg-slate-900/60 border-slate-700 hover:border-slate-600' : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <p.icon className={`w-4 h-4 ${p.tint}`} />
              <span className={`font-medium font-body ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{p.value ?? 0}</span>
              <span className={`text-sm font-body ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{p.label}</span>
            </button>
          ))}
        </div>
      </header>

      {/* Main Stats Grid */}
      <div className="animate-slide-up grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" style={{ animationDelay: '80ms' }}>
        <StatCard
          title="Total Revenue"
          value={`$${stats.financial.total_income.toLocaleString()}`}
          subtitle="All time income"
          icon={DollarSign}
          accentColor="bg-emerald-500/10 text-emerald-500"
          isDarkMode={isDarkMode}
        />
        <StatCard
          title="Net Profit"
          value={`$${stats.financial.net_profit.toLocaleString()}`}
          subtitle="After expenses"
          icon={TrendingUp}
          accentColor="bg-indigo-500/10 text-indigo-500"
          isDarkMode={isDarkMode}
        />
        <StatCard
          title="Active Projects"
          value={stats.projects.active}
          subtitle={`${stats.projects.completed} completed`}
          icon={FolderKanban}
          accentColor="bg-amber-500/10 text-amber-500"
          isDarkMode={isDarkMode}
        />
        <StatCard
          title="Active Clients"
          value={stats.clients.active}
          subtitle={`$${stats.clients.total_value.toLocaleString()} total value`}
          icon={Users}
          accentColor="bg-rose-500/10 text-rose-500"
          isDarkMode={isDarkMode}
        />
      </div>

      {/* Secondary Grid */}
      <div className="animate-slide-up grid grid-cols-1 lg:grid-cols-3 gap-4" style={{ animationDelay: '160ms' }}>
        <RecentActivity 
          transactions={stats.recent_transactions} 
          isDarkMode={isDarkMode} 
        />
        <ProjectsOverview 
          projects={stats.recent_projects} 
          isDarkMode={isDarkMode} 
        />
        <QuickStats 
          stats={stats} 
          isDarkMode={isDarkMode} 
        />
      </div>
    </div>
  );
};

export default Dashboard;
