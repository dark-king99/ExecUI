import { useState, useEffect, Suspense, lazy } from "react";
import { setToken, clearToken } from "../services/api";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useSidebar } from "../components/SidebarContext";
import Login from "../auth/Login";
import { SidebarProvider } from "../components/SidebarContext";
import SidebarInset from "../components/SidebarInset";
import Navbar from "../components/Navbar";
import { ToastProvider } from "../components/ui/Toast";
import { Toaster } from "../components/ui/sonner";
import { SkeletonCard } from "../components/ui/Skeleton";
import ErrorBoundary from "../components/ErrorBoundary";
import BotWidget from "../components/BotWidget";
import Dashboard from "../apps/services/Dashboard";

// ── Lazy-loaded mini-app route groups ─────────────────────────────────────────
const HomeView            = lazy(() => import("../apps/HomeView"));
const AccountView         = lazy(() => import("../apps/AccountView"));
const AnalyticsView       = lazy(() => import("../apps/AnalyticsView"));
const NetworkView         = lazy(() => import("../apps/NetworkView"));
const NotFound            = lazy(() => import("../apps/NotFound"));

// Network
const Inventory           = lazy(() => import("../apps/network/views/Inventory"));
const Alerts              = lazy(() => import("../apps/network/views/Alerts"));
const TopologyMap         = lazy(() => import("../apps/network/views/TopologyMap"));
const Traffic             = lazy(() => import("../apps/network/views/Traffic"));
const Settings            = lazy(() => import("../apps/network/views/Settings"));
const Documentation       = lazy(() => import("../apps/network/views/Documentation"));
const IncidentCenter      = lazy(() => import("../apps/network/views/IncidentCenter"));
const ChangeManagement    = lazy(() => import("../apps/network/views/ChangeManagement"));
const PolicyCompliance    = lazy(() => import("../apps/network/views/PolicyCompliance"));
const CapacityPlanning    = lazy(() => import("../apps/network/views/CapacityPlanning"));
const ServiceHealth       = lazy(() => import("../apps/network/views/ServiceHealth"));
const AutomationJobs      = lazy(() => import("../apps/network/views/AutomationJobs"));
const ServerManager       = lazy(() => import("../apps/network/views/ServerManager"));
const NetworkMonitor      = lazy(() => import("../apps/network/views/NetworkMonitor"));
const UserRestrictions    = lazy(() => import("../apps/network/views/UserRestrictions"));
const FirewallSetup       = lazy(() => import("../apps/network/views/FirewallSetup"));

// CRM — solution-based architecture (Salesforce Sales Cloud model)
const CrmSolutions        = lazy(() => import("../apps/crm/CrmSolutions"));
import { CRM_ROUTES } from "../apps/crm/solutions.config";

// Marketing — solution-based architecture (Salesforce Marketing Cloud model)
const MarketingSolutions  = lazy(() => import("../apps/marketing/MarketingSolutions"));
import { MARKETING_ROUTES } from "../apps/marketing/solutions.config";

// Analytics
const ExecutiveOverview   = lazy(() => import("../apps/analytics/ExecutiveOverview"));
const OperationalMetrics  = lazy(() => import("../apps/analytics/OperationalMetrics"));
const SelfServeExplorer   = lazy(() => import("../apps/analytics/SelfServeExplorer"));
const CohortRetention     = lazy(() => import("../apps/analytics/CohortRetention"));
const AnalyticsRevenue    = lazy(() => import("../apps/analytics/RevenueIntelligence"));
const DataQualityMonitor  = lazy(() => import("../apps/analytics/DataQualityMonitor"));

// Account
const Profile             = lazy(() => import("../apps/account/Profile"));
const Security            = lazy(() => import("../apps/account/Security"));
const ApiKeys             = lazy(() => import("../apps/account/ApiKeys"));
const Notifications       = lazy(() => import("../apps/account/Notifications"));
const TeamPermissions     = lazy(() => import("../apps/account/TeamPermissions"));
const Billing             = lazy(() => import("../apps/account/Billing"));
const AuditLogs           = lazy(() => import("../apps/account/AuditLogs"));
const EnterpriseWorkspace = lazy(() => import("../apps/account/EnterpriseWorkspace"));

// Services
const FinancialManagement             = lazy(() => import("../apps/services/FinancialManagement"));
const MarketingSales           = lazy(() => import("../apps/services/MarketingSales"));
const OperationsSystem             = lazy(() => import("../apps/services/OperationsSystem"));
const StrategicPlanning       = lazy(() => import("../apps/services/StrategicPlanning"));
const TeamProjectCoordination     = lazy(() => import("../apps/services/TeamProjectCoordination"));


// ── Fallback spinner ──────────────────────────────────────────────────────────
function PageSuspense({ children }) {
  return (
    <Suspense fallback={
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
        {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    }>
      {children}
    </Suspense>
  );
}

// ── App shell ─────────────────────────────────────────────────────────────────
function AppLayout({ user, setUser, roleToUse, effectiveRole, setEffectiveRole }) {
  const location = useLocation();

  // Sections with their own sidebar that replace the top navbar
  const section = location.pathname.split("/")[1];
  const hideNavbar = ["network", "crm", "marketing"].includes(section);

  return (
    <div className="flex h-screen w-screen bg-slate-50 dark:bg-slate-950">
      <SidebarInset user={user} />

      <div className="flex-1 flex flex-col min-w-0">
        {!hideNavbar && (
          <Navbar
            user={user}
            roleToUse={roleToUse}
            effectiveRole={effectiveRole}
            setEffectiveRole={setEffectiveRole}
            onLogout={() => setUser(null)}
          />
        )}

        <main className="flex-1 overflow-y-auto p-6">
          <ErrorBoundary>
            <PageSuspense>
              <Routes>
                {/* Default */}
                <Route path="/" element={<Navigate to="/home" replace />} />
                <Route path="/home" element={<HomeView />} />

                {/* Account */}
                <Route path="/account" element={<Navigate to="/account/profile" replace />} />
                <Route path="/account/profile"      element={<Profile />} />
                <Route path="/account/security"     element={<Security />} />
                <Route path="/account/api-keys"     element={<ApiKeys />} />
                <Route path="/account/notifications" element={<Notifications />} />
                <Route path="/account/team"         element={<TeamPermissions />} />
                <Route path="/account/billing"      element={<Billing />} />
                <Route path="/account/audit"         element={<AuditLogs />} />
                <Route path="/account/workspace"     element={<EnterpriseWorkspace />} />
                <Route path="/account/overview"     element={<AccountView />} />

                {/* Analytics */}
                <Route path="/analytics" element={<Navigate to="/analytics/executive" replace />} />
                <Route path="/analytics/executive"  element={<ExecutiveOverview />} />
                <Route path="/analytics/operational" element={<OperationalMetrics />} />
                <Route path="/analytics/explorer"   element={<SelfServeExplorer />} />
                <Route path="/analytics/cohort"     element={<CohortRetention />} />
                <Route path="/analytics/revenue"    element={<AnalyticsRevenue />} />
                <Route path="/analytics/quality"    element={<DataQualityMonitor />} />
                <Route path="/analytics/overview"   element={<AnalyticsView />} />

                {/* Network */}
                <Route path="/network" element={<Navigate to="/network/dashboard" replace />} />
                <Route path="/network/dashboard"  element={<NetworkView />} />
                <Route path="/network/inventory"  element={<Inventory />} />
                <Route path="/network/alerts"     element={<Alerts />} />
                <Route path="/network/traffic"    element={<Traffic />} />
                <Route path="/network/map"        element={<TopologyMap />} />
                <Route path="/network/settings"   element={<Settings />} />
                <Route path="/network/docs"       element={<Documentation />} />
                <Route path="/network/incidents"  element={<IncidentCenter />} />
                <Route path="/network/changes"    element={<ChangeManagement />} />
                <Route path="/network/policy"     element={<PolicyCompliance />} />
                <Route path="/network/capacity"   element={<CapacityPlanning />} />
                <Route path="/network/slo"          element={<ServiceHealth />} />
                <Route path="/network/automation"   element={<AutomationJobs />} />
                <Route path="/network/servers"      element={<ServerManager />} />
                <Route path="/network/monitor"      element={<NetworkMonitor />} />
                <Route path="/network/restrictions" element={<UserRestrictions />} />
                <Route path="/network/firewall"     element={<FirewallSetup />} />

                {/* CRM — solution launcher + config-driven solution pages */}
                <Route path="/crm" element={<CrmSolutions />} />
                {CRM_ROUTES.map(({ path, Component }) => (
                  <Route key={path} path={path} element={<Component />} />
                ))}

                {/* Marketing — solution launcher + config-driven solution pages */}
                <Route path="/marketing" element={<MarketingSolutions />} />
                {MARKETING_ROUTES.map(({ path, Component }) => (
                  <Route key={path} path={path} element={<Component />} />
                ))}


                {/* Services */}
                <Route path="/services" element={<Navigate to="/services/dashboard" replace />} />
                <Route path="/services/dashboard"      element={<Dashboard />} />
                <Route path="/services/financial"      element={<FinancialManagement />} />
                <Route path="/services/operation"     element={<OperationsSystem />} />
                <Route path="/services/strategic"     element={<StrategicPlanning />} />
                <Route path="/services/marketing" element={<MarketingSales />} />
                <Route path="/services/team"         element={<TeamProjectCoordination />} />

                <Route path="/botwidget" element={<Navigate to="/botwidget/botmessage" replace />} />

                {/* 404 */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </PageSuspense>
          </ErrorBoundary>
        </main>
      </div>
      <BotWidget />
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem("user");
      if (!stored) return null;
      const parsed = JSON.parse(stored);

      // Reject stale sessions from the pre-auth era (no token stored).
      // Also make sure the dedicated auth_token key is in sync.
      if (!parsed?.token) {
        localStorage.removeItem("user");
        clearToken();
        return null;
      }

      // Keep auth_token in sync with the stored user token.
      setToken(parsed.token);
      return parsed;
    } catch {
      localStorage.removeItem("user");
      clearToken();
      return null;
    }
  });

  const [effectiveRole, setEffectiveRole] = useState(null);
  const roleToUse = user?.role === "system_admin"
    ? effectiveRole || "enterprise_admin"
    : user?.role;

  useEffect(() => {
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
      if (user.token) setToken(user.token);
    } else {
      localStorage.removeItem("user");
      clearToken();
    }
  }, [user]);

  // Auto-logout when any API call receives 401 (invalid/expired token)
  useEffect(() => {
    function handleAuthExpired() {
      setUser(null);
    }
    window.addEventListener('auth:expired', handleAuthExpired);
    return () => window.removeEventListener('auth:expired', handleAuthExpired);
  }, []);

  if (!user) return <Login onLogin={setUser} />;

  return (
    <ToastProvider>
      <SidebarProvider>
        <AppLayout
          user={user}
          setUser={setUser}
          roleToUse={roleToUse}
          effectiveRole={effectiveRole}
          setEffectiveRole={setEffectiveRole}
        />
      </SidebarProvider>
      <Toaster />
    </ToastProvider>
  );
}
