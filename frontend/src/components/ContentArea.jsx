import { useSidebar } from "./SidebarContext";

// Main app
import HomeView from "../apps/HomeView";
import AnalyticsView from "../apps/AnalyticsView";
import AccountView from "../apps/AccountView";

// Network
import NetworkView from "../apps/NetworkView";
import Inventory from "../apps/network/views/Inventory";
import Alerts from "../apps/network/views/Alerts";
import TopologyMap from "../apps/network/views/TopologyMap";
import Traffic from "../apps/network/views/Traffic";
import Settings from "../apps/network/views/Settings";
import Documentation from "../apps/network/views/Documentation";

// CRM
import CRMView from "../apps/CRMView";
import LeadWorkspace from "../apps/crm/LeadWorkspace";
import OpportunityWorkspace from "../apps/crm/OpportunityWorkspace";
import TaskCadence from "../apps/crm/TaskCadence";
import PipelineTracking from "../apps/crm/PipelineTracking";
import DealCommandCenter from "../apps/crm/DealCommandCenter";
import ForecastingQuota from "../apps/crm/ForecastingQuota";
import RenewalsExpansion from "../apps/crm/RenewalsExpansion";
import Account360 from "../apps/crm/Account360";
import RevenueIntelligence from "../apps/crm/RevenueIntelligence";
import SmartCRM from "../apps/crm/SmartCRM";
import PlaybooksLibrary from "../apps/crm/PlaybooksLibrary";
import CRMAnalytics from "../apps/crm/CRMAnalytics";
import Reports from "../apps/crm/Reports";
import ServicesIntegration from "../apps/crm/ServicesIntegration";
import Team from "../apps/crm/Team";
import TeamManager from "../apps/crm/TeamManager";
import Database from "../apps/crm/Database";
import Partners from "../apps/crm/Partners";
import BoardVoting from "../apps/crm/BoardVoting";

// Marketing
import MarketingView from "../apps/MarketingView";
import MarketingAI from "../apps/marketing/MarketingAI";
import Campaign from "../apps/marketing/Campaign";
import EMMA from "../apps/marketing/EMMA";
import AudienceStudio from "../apps/marketing/AudienceStudio";
import Personalization from "../apps/marketing/Personalization";
import B2B from "../apps/marketing/B2B";
import ExperimentationLab from "../apps/marketing/ExperimentationLab";
import AttributionROI from "../apps/marketing/AttributionROI";
import CreativeAssets from "../apps/marketing/CreativeAssets";
import MarketingAnalytics from "../apps/marketing/MarketingAnalytics";
import CustomerDataPlatform from "../apps/marketing/CustomerDataPlatform";
import CommerceCommand from "../apps/marketing/CommerceCommand";
import Teams from "../apps/marketing/Teams";

export default function ContentArea({ roleToUse }) {
  const { appSection, networkView, crmView, marketingView } = useSidebar();

  // Network
  if (appSection === "network") {
    if (networkView === "dashboard") return <NetworkView />;
    if (networkView === "inventory") return <Inventory />;
    if (networkView === "docs")      return <Documentation />;
    if (networkView === "alerts")    return <Alerts />;
    if (networkView === "traffic")   return <Traffic />;
    if (networkView === "map")       return <TopologyMap />;
    if (networkView === "settings")  return <Settings />;
    return <NetworkView />;
  }

  // CRM
  if (appSection === "crm") {
    if (crmView === "stream")               return <CRMView />;
    if (crmView === "leads")                return <LeadWorkspace />;
    if (crmView === "opportunities")        return <OpportunityWorkspace />;
    if (crmView === "tasks")                return <TaskCadence />;
    if (crmView === "pipeline")             return <PipelineTracking />;
    if (crmView === "deals")                return <DealCommandCenter />;
    if (crmView === "forecasting")          return <ForecastingQuota />;
    if (crmView === "renewals")             return <RenewalsExpansion />;
    if (crmView === "account360")           return <Account360 />;
    if (crmView === "revenue-intelligence") return <RevenueIntelligence />;
    if (crmView === "smart-crm")            return <SmartCRM role={roleToUse} />;
    if (crmView === "playbooks")            return <PlaybooksLibrary />;
    if (crmView === "analytics")            return <CRMAnalytics />;
    if (crmView === "reports")              return <Reports />;
    if (crmView === "service-integration")  return <ServicesIntegration />;
    if (crmView === "team")                 return <Team />;
    if (crmView === "team-manager")         return <TeamManager />;
    if (crmView === "database")             return <Database />;
    if (crmView === "partners")             return <Partners />;
    if (crmView === "partners/board")       return <BoardVoting />;
    return <CRMView />;
  }

  // Marketing
  if (appSection === "marketing") {
    if (!marketingView || marketingView === "stream") return <MarketingView />;
    if (marketingView === "ai")              return <MarketingAI />;
    if (marketingView.startsWith("campaign"))return <Campaign />;
    if (marketingView === "emma")            return <EMMA />;
    if (marketingView === "audience")        return <AudienceStudio />;
    if (marketingView === "personalization") return <Personalization />;
    if (marketingView === "b2b")             return <B2B />;
    if (marketingView === "experimentation") return <ExperimentationLab />;
    if (marketingView === "attribution")     return <AttributionROI />;
    if (marketingView === "creative")        return <CreativeAssets />;
    if (marketingView === "analytics")       return <MarketingAnalytics />;
    if (marketingView === "cdp")             return <CustomerDataPlatform />;
    if (marketingView === "commerce")        return <CommerceCommand />;
    if (marketingView === "team")            return <Teams />;
    return <MarketingView />;
  }

  if (appSection === "analytics") return <AnalyticsView />;
  if (appSection === "account")   return <AccountView />;

  return <HomeView />;
}
