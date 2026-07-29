import { useState, useEffect, Suspense, lazy } from "react";
import { setToken, clearToken } from "../services/api";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { UserProvider } from "../context/UserContext";
import Login from "../auth/Login";
import SsoCallback from "../auth/SsoCallback";
import { SidebarProvider } from "../components/SidebarContext";
import SidebarInset from "../components/SidebarInset";
import Navbar from "../components/Navbar";
import { ToastProvider } from "../components/ui/Toast";
import { Toaster } from "../components/ui/sonner";
import { SkeletonCard } from "../components/ui/Skeleton";
import ErrorBoundary from "../components/ErrorBoundary";
import BotWidget from "../components/BotWidget";
import CommandPalette from "../components/CommandPalette";
import Breadcrumbs from "../components/Breadcrumbs";
import Dashboard from "../apps/services/Dashboard";
import { accessFor } from "../lib/access";
import useRewardTracking from "../hooks/useRewardTracking";
import { identify, resetAnalytics } from "../lib/analytics";

// ── Lazy-loaded mini-app route groups ─────────────────────────────────────────
const HomeView            = lazy(() => import("../apps/HomeView"));
const PrivacyPolicy       = lazy(() => import("../apps/PrivacyPolicy"));
const ExecutiveOverview   = lazy(() => import("../apps/ExecutiveOverview"));
const NotFound            = lazy(() => import("../apps/NotFound"));

// Network — solution-based architecture (Auvik model)
const NetworkSolutions    = lazy(() => import("../apps/network/NetworkSolutions"));
import { NETWORK_ROUTES } from "../apps/network/solutions.config";
import { NetworkProvider } from "../context/NetworkContext";

// CRM — solution-based architecture (Salesforce Sales Cloud model)
const CrmSolutions        = lazy(() => import("../apps/crm/CrmSolutions"));



const IndustryObjectPage  = lazy(() => import("../apps/crm/IndustryObjectPage"));
const IndustrySetup       = lazy(() => import("../apps/crm/IndustrySetup"));
import { CRM_ROUTES } from "../apps/crm/solutions.config";
import { IndustryProvider } from "../context/IndustryContext";


// Marketing — solution-based architecture (Salesforce Marketing Cloud model)
const MarketingSolutions  = lazy(() => import("../apps/marketing/MarketingSolutions"));
import { MARKETING_ROUTES } from "../apps/marketing/solutions.config";

// Analytics — cross-service data overview (config-driven solutions)
const AnalyticsSolutions   = lazy(() => import("../apps/analytics/AnalyticsSolutions"));
import { ANALYTICS_ROUTES } from "../apps/analytics/solutions.config";

// Account
const Profile             = lazy(() => import("../apps/account/Profile"));
const Security            = lazy(() => import("../apps/account/Security"));
const Integrations        = lazy(() => import("../apps/account/Integrations"));
const Notifications       = lazy(() => import("../apps/account/Notifications"));
const Messaging           = lazy(() => import("../apps/account/Messaging"));
const TeamPermissions     = lazy(() => import("../apps/account/TeamPermissions"));
const Billing             = lazy(() => import("../apps/account/Billing"));
const AuditLogs           = lazy(() => import("../apps/account/AuditLogs"));
const Developer           = lazy(() => import("../apps/account/Developer"));
const Workflows           = lazy(() => import("../apps/account/Workflows"));
const Approvals           = lazy(() => import("../apps/approvals/Approvals"));
const EnterpriseWorkspace = lazy(() => import("../apps/account/EnterpriseWorkspace"));
const OrganizationProfile = lazy(() => import("../apps/account/OrganizationProfile"));
const Members             = lazy(() => import("../apps/account/Members"));
const Rewards             = lazy(() => import("../apps/rewards/Rewards"));
const SingleSignOn        = lazy(() => import("../apps/account/SingleSignOn"));

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

  // Turn navigation into reward points (only while signed in).
  useRewardTracking(!!user);

  // Sections with their own sidebar that replace the top navbar.
  const section = location.pathname.split("/")[1];
  const hideNavbar = ["network", "crm", "marketing", "analytics"].includes(section);

  // Home + Privacy are full-screen marketing/legal views — no app chrome at all
  // (sidebar/navbar only belong to the main system).
  const isStandalone = section === "home" || section === "privacy";

  // Organization (enterprise account) views are restricted to admins.
  const isAdmin = ["enterprise_admin", "system_admin"].includes(roleToUse) ||
                  ["enterprise_admin", "system_admin"].includes(user?.role);

  // Department-based module access. Blocked sections redirect to the overview.
  const access = accessFor(user);
  const guard = (sec, element) =>
    access.sections.includes(sec) ? element : <Navigate to="/overview" replace />;

  if (isStandalone) {
    return (
      <PageSuspense>
        <CommandPalette />
        <Routes>
          <Route path="/home" element={<HomeView />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
        </Routes>
      </PageSuspense>
    );
  }

  return (
    <div className="flex h-screen w-screen bg-slate-50 dark:bg-slate-950">
      {/* Ctrl+K works everywhere — including module views without the navbar. */}
      <CommandPalette />
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
          <Breadcrumbs />
          <ErrorBoundary>
            <PageSuspense>
              <Routes>
                {/* Default */}
                <Route path="/" element={<Navigate to="/home" replace />} />
                <Route path="/home" element={<HomeView />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />

                {/* Executive Overview — entry to the main system */}
                <Route path="/overview" element={<ExecutiveOverview />} />

                {/* Account — personal views (any user) */}
                {/* Rewards — org-wide, available to every employee. */}
                <Route path="/rewards" element={<Rewards />} />

                {/* Approvals — every employee participates in sign-off. */}
                <Route path="/approvals" element={<Approvals />} />

                <Route path="/account" element={<Navigate to="/account/profile" replace />} />
                <Route path="/account/profile"      element={<Profile />} />
                <Route path="/account/security"     element={<Security />} />
                <Route path="/account/integrations" element={<Integrations />} />
                <Route path="/account/api-keys"     element={<Navigate to="/account/integrations" replace />} />
                <Route path="/account/notifications" element={<Notifications />} />
                <Route path="/account/messaging"    element={<Messaging />} />


                {/* Account — organization views (enterprise admins only) */}
                <Route path="/account/organization" element={isAdmin ? <OrganizationProfile /> : <Navigate to="/account/profile" replace />} />
                <Route path="/account/members"      element={isAdmin ? <Members /> : <Navigate to="/account/profile" replace />} />
                <Route path="/account/team"         element={isAdmin ? <TeamPermissions /> : <Navigate to="/account/profile" replace />} />
                <Route path="/account/workspace"    element={isAdmin ? <EnterpriseWorkspace /> : <Navigate to="/account/profile" replace />} />
                <Route path="/account/billing"      element={isAdmin ? <Billing /> : <Navigate to="/account/profile" replace />} />
                <Route path="/account/audit"        element={isAdmin ? <AuditLogs /> : <Navigate to="/account/profile" replace />} />
                <Route path="/account/developer"    element={isAdmin ? <Developer /> : <Navigate to="/account/profile" replace />} />
                <Route path="/account/workflows"    element={isAdmin ? <Workflows /> : <Navigate to="/account/profile" replace />} />
                <Route path="/account/sso"          element={isAdmin ? <SingleSignOn /> : <Navigate to="/account/profile" replace />} />

                {/* Analytics — cross-service launcher + config-driven solution pages */}
                <Route path="/analytics" element={guard("analytics", <AnalyticsSolutions />)} />
                {ANALYTICS_ROUTES.map(({ path, Component }) => (
                  <Route key={path} path={path} element={guard("analytics", <Component />)} />
                ))}

                {/* Network — solution launcher + config-driven solution pages */}
                <Route path="/network" element={guard("network", <NetworkSolutions />)} />
                {NETWORK_ROUTES.map(({ path, Component }) => (
                  <Route key={path} path={path} element={guard("network", <Component />)} />
                ))}

                {/* CRM — solution launcher + config-driven solution pages */}
                <Route path="/crm" element={guard("crm", <CrmSolutions />)} />
                {CRM_ROUTES.map(({ path, Component }) => (
                  <Route key={path} path={path} element={guard("crm", <Component />)} />
                ))}


                {/* Industry modules — additive layer (core CRM routes above unchanged) */}
                <Route path="/crm/industry-setup" element={guard("crm", <IndustrySetup />)} />
                <Route path="/crm/i/:industryId/:objectType" element={guard("crm", <IndustryObjectPage />)} />


                {/* Marketing — solution launcher + config-driven solution pages */}
                <Route path="/marketing" element={guard("marketing", <MarketingSolutions />)} />
                {MARKETING_ROUTES.map(({ path, Component }) => (
                  <Route key={path} path={path} element={guard("marketing", <Component />)} />
                ))}
                {/* Marketing industry modules — additive layer, same engine as CRM */}
                <Route path="/marketing/i/:industryId/:objectType" element={guard("marketing", <IndustryObjectPage />)} />


                {/* Services */}
                <Route path="/services" element={guard("services", <Navigate to="/services/dashboard" replace />)} />
                <Route path="/services/dashboard"      element={guard("services", <Dashboard />)} />
                <Route path="/services/financial"      element={guard("services", <FinancialManagement />)} />
                <Route path="/services/operation"     element={guard("services", <OperationsSystem />)} />
                <Route path="/services/strategic"     element={guard("services", <StrategicPlanning />)} />
                <Route path="/services/marketing" element={guard("services", <MarketingSales />)} />
                <Route path="/services/team"         element={guard("services", <TeamProjectCoordination />)} />

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
      identify(user);                 // tie analytics events to this user
    } else {
      localStorage.removeItem("user");
      clearToken();
      resetAnalytics();               // stop attributing events after logout
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

  // The IdP redirects here after SSO — it must render before the login gate,
  // because the whole point is that there is no session yet.
  if (typeof window !== "undefined" && window.location.pathname === "/sso/callback") {
    return <SsoCallback onLogin={setUser} />;
  }

  if (!user) return <Login onLogin={setUser} />;

  return (
    <UserProvider user={user} setUser={setUser}>
      <ToastProvider>

        
        <IndustryProvider>
          <NetworkProvider>
            <SidebarProvider>
              <AppLayout
                user={user}
                setUser={setUser}
                roleToUse={roleToUse}
                effectiveRole={effectiveRole}
                setEffectiveRole={setEffectiveRole}
              />
            </SidebarProvider>
          </NetworkProvider>
        </IndustryProvider>

        <Toaster />
      </ToastProvider>
    </UserProvider>
  );
}
