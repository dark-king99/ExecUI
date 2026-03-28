import { useState, useEffect, Suspense, lazy } from "react";
import { setToken, clearToken } from "../services/api";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useSidebar } from "../components/SidebarContext";
import Login from "../auth/Login";
import { SidebarProvider } from "../components/SidebarContext";
import SidebarInset from "../components/SidebarInset";
import Navbar from "../components/Navbar";
import { ToastProvider } from "../components/ui/Toast";
import { SkeletonCard } from "../components/ui/Skeleton";
import ErrorBoundary from "../components/ErrorBoundary";
import BotWidget from "../components/BotWidget";

// ── Lazy-loaded mini-app route groups ─────────────────────────────────────────
const HomeView            = lazy(() => import("../apps/HomeView"));
const AccountView         = lazy(() => import("../apps/AccountView"));
const AnalyticsView       = lazy(() => import("../apps/AnalyticsView"));
const NetworkView         = lazy(() => import("../apps/NetworkView"));
const CRMView             = lazy(() => import("../apps/CRMView"));
const MarketingView       = lazy(() => import("../apps/MarketingView"));
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

// CRM
const SmartCRM            = lazy(() => import("../apps/crm/SmartCRM"));
const TeamManager         = lazy(() => import("../apps/crm/TeamManager"));
const ServicesIntegration = lazy(() => import("../apps/crm/ServicesIntegration"));
const PipelineTracking    = lazy(() => import("../apps/crm/PipelineTracking"));
const RevenueIntelligence = lazy(() => import("../apps/crm/RevenueIntelligence"));
const DealCommandCenter   = lazy(() => import("../apps/crm/DealCommandCenter"));
const Account360          = lazy(() => import("../apps/crm/Account360"));
const Team                = lazy(() => import("../apps/crm/Team"));
const Reports             = lazy(() => import("../apps/crm/Reports"));
const Partners            = lazy(() => import("../apps/crm/Partners"));
const BoardVoting         = lazy(() => import("../apps/crm/BoardVoting"));
const Database            = lazy(() => import("../apps/crm/Database"));
const LeadWorkspace       = lazy(() => import("../apps/crm/LeadWorkspace"));
const OpportunityWorkspace= lazy(() => import("../apps/crm/OpportunityWorkspace"));
const TaskCadence         = lazy(() => import("../apps/crm/TaskCadence"));
const ForecastingQuota    = lazy(() => import("../apps/crm/ForecastingQuota"));
const RenewalsExpansion   = lazy(() => import("../apps/crm/RenewalsExpansion"));
const PlaybooksLibrary    = lazy(() => import("../apps/crm/PlaybooksLibrary"));
const CRMAnalytics        = lazy(() => import("../apps/crm/CRMAnalytics"));

// Marketing
const B2B                 = lazy(() => import("../apps/marketing/B2B"));
const Campaign            = lazy(() => import("../apps/marketing/Campaign"));
const EMMA                = lazy(() => import("../apps/marketing/EMMA"));
const Personalization     = lazy(() => import("../apps/marketing/Personalization"));
const Teams               = lazy(() => import("../apps/marketing/Teams"));
const CustomerDataPlatform= lazy(() => import("../apps/marketing/CustomerDataPlatform"));
const CommerceCommand     = lazy(() => import("../apps/marketing/CommerceCommand"));
const MarketingAI         = lazy(() => import("../apps/marketing/MarketingAI"));
const CampaignOverview    = lazy(() => import("../apps/marketing/CampaignOverview"));
const CampaignBuilder     = lazy(() => import("../apps/marketing/CampaignBuilder"));
const ExperimentationLab  = lazy(() => import("../apps/marketing/ExperimentationLab"));
const AudienceStudio      = lazy(() => import("../apps/marketing/AudienceStudio"));
const AttributionROI      = lazy(() => import("../apps/marketing/AttributionROI"));
const CreativeAssets      = lazy(() => import("../apps/marketing/CreativeAssets"));
const MarketingAnalytics  = lazy(() => import("../apps/marketing/MarketingAnalytics"));

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
                <Route path="/account/audit"        element={<AuditLogs />} />
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
                <Route path="/network/slo"        element={<ServiceHealth />} />
                <Route path="/network/automation" element={<AutomationJobs />} />

                {/* CRM */}
                <Route path="/crm" element={<Navigate to="/crm/stream" replace />} />
                <Route path="/crm/stream"              element={<CRMView />} />
                <Route path="/crm/account360"          element={<Account360 />} />
                <Route path="/crm/service-integration" element={<ServicesIntegration />} />
                <Route path="/crm/pipeline"            element={<PipelineTracking />} />
                <Route path="/crm/revenue-intelligence" element={<RevenueIntelligence />} />
                <Route path="/crm/deals"               element={<DealCommandCenter />} />
                <Route path="/crm/smart-crm"           element={<SmartCRM role={roleToUse} />} />
                <Route path="/crm/reports"             element={<Reports />} />
                <Route path="/crm/team"                element={<Team />} />
                <Route path="/crm/team-manager"        element={<TeamManager />} />
                <Route path="/crm/partners"            element={<Partners />} />
                <Route path="/crm/partners/board"      element={<BoardVoting />} />
                <Route path="/crm/database"            element={<Database />} />
                <Route path="/crm/leads"               element={<LeadWorkspace />} />
                <Route path="/crm/opportunities"       element={<OpportunityWorkspace />} />
                <Route path="/crm/tasks"               element={<TaskCadence />} />
                <Route path="/crm/forecasting"         element={<ForecastingQuota />} />
                <Route path="/crm/renewals"            element={<RenewalsExpansion />} />
                <Route path="/crm/playbooks"           element={<PlaybooksLibrary />} />
                <Route path="/crm/analytics"           element={<CRMAnalytics />} />

                {/* Marketing */}
                <Route path="/marketing" element={<Navigate to="/marketing/stream" replace />} />
                <Route path="/marketing/stream"           element={<MarketingView />} />
                <Route path="/marketing/ai"               element={<MarketingAI />} />
                <Route path="/marketing/campaign"         element={<Campaign />} />
                <Route path="/marketing/campaign/overview"   element={<CampaignOverview />} />
                <Route path="/marketing/campaign/builder"    element={<CampaignBuilder />} />
                <Route path="/marketing/campaign/analytics"  element={<MarketingAnalytics />} />
                <Route path="/marketing/campaign/scheduler"  element={<CampaignOverview />} />
                <Route path="/marketing/emma"             element={<EMMA />} />
                <Route path="/marketing/b2b"              element={<B2B />} />
                <Route path="/marketing/personalization"  element={<Personalization />} />
                <Route path="/marketing/team"             element={<Teams />} />
                <Route path="/marketing/cdp"              element={<CustomerDataPlatform />} />
                <Route path="/marketing/commerce"         element={<CommerceCommand />} />
                <Route path="/marketing/analytics"        element={<MarketingAnalytics />} />
                <Route path="/marketing/experimentation"  element={<ExperimentationLab />} />
                <Route path="/marketing/audience"         element={<AudienceStudio />} />
                <Route path="/marketing/attribution"      element={<AttributionROI />} />
                <Route path="/marketing/creative"         element={<CreativeAssets />} />

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
    </ToastProvider>
  );
}
