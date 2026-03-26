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





// CRM (use your existing views or placeholders)
import CRMView from "../apps/CRMView";
import SmartCRM from "../apps/crm/SmartCRM";
import TeamManager from "../apps/crm/TeamManager";
import ServicesIntegration from "../apps/crm/ServicesIntegration";
import PipelineTracking from "../apps/crm/PipelineTracking";
import RevenueIntelligence from "../apps/crm/RevenueIntelligence";
import DealCommandCenter from "../apps/crm/DealCommandCenter";
import Account360 from "../apps/crm/Account360";
import Team from "../apps/crm/Team"
import Reports from "../apps/crm/Reports";
import Partners from "../apps/crm/Partners";
import BoardVoting from "../apps/crm/BoardVoting";
import Database from "../apps/crm/Database";


// Marketing (use your existing views or placeholders)
import MarketingView from "../apps/MarketingView";
import B2B from "../apps/marketing/B2B";
import Campaign from "../apps/marketing/Campaign";
import EMMA from "../apps/marketing/EMMA";
import Personalization from "../apps/marketing/Personalization";
import Teams from "../apps/marketing/Teams";
import CustomerDataPlatform from "../apps/marketing/CustomerDataPlatform";
import CommerceCommand from "../apps/marketing/CommerceCommand";
import MarketingAI from "../apps/marketing/MarketingAI";


export default function ContentArea({ roleToUse }) {
  const { appSection, networkView, crmView, marketingView } = useSidebar();

  // 🟦 Network mini-app
 if  (appSection === "network") {
    if (networkView === "dashboard") return <NetworkView />;
    if (networkView === "inventory") return <div><Inventory /></div>;
    if (networkView === "docs") return <div><Documentation /></div>;
    if (networkView === "alerts") return <div><Alerts /></div>;
    if (networkView === "traffic") return <div><Traffic /></div>;
    if (networkView === "map") return <div> <TopologyMap /></div>
    if (networkView === "settings") return <div> <Settings /></div>
  }                
  // 🟩 CRM mini-app
  if (appSection === "crm") {
    if (crmView === "stream") return <CRMView />;
    if (crmView === "account360") return <Account360 />;
    if (crmView === "service integration") return <div><ServicesIntegration /> (coming soon)</div>;
    if (crmView === "pipeline tracking") return <div><PipelineTracking /></div>;
    if (crmView === "revenue intelligence") return <RevenueIntelligence />;
    if (crmView === "deal") return <DealCommandCenter />;
    if (crmView === "smartcrm") return <div><SmartCRM 
    role={roleToUse}
    customer={{ name: "Alice Johnson",
                interactions:14,
                lastContactDays:2,
                segment: "High Value", }} /> </div>;
    if (crmView === "reports") return <div><Reports /></div>;
    if (crmView === "team") return <Team />;
    if (crmView === "teammanager") return <div><TeamManager /></div>;
    if (crmView === "partners") return <div><Partners /></div>;
    if (crmView === "partners.board") return <BoardVoting />;
    if (crmView === "database") return <div><Database /></div>;
    if (crmView === "crm analytics") return <div>CRM Analytics (coming soon)</div>;

  }
  // 🟩 Marketing mini-app
  if (appSection === "market") {
    if (marketingView === "stream") return <MarketingView />;
    if (marketingView === "marketingai") return <div><MarketingAI /></div>;
    if (marketingView === "campaign") return <div><Campaign /></div>;
    if (marketingView === "e.m.m.a") return <div><EMMA /></div>;
    if (marketingView === "b2b") return <div><B2B /></div>;
    if (marketingView === "personalization") return <div><Personalization /></div>;
    if (marketingView === "team") return <div><Teams /></div>;
    if (marketingView === "marketingAnalytics") return <div>Marketing Analytics (coming soon)</div>;
    if (marketingView === "cdp") return <div><CustomerDataPlatform /> (coming soon)</div>;
    if (marketingView === "commercecommand") return <div><CommerceCommand /></div>;

  }
  // 🟨 Analytics (single page workspace)
  if (appSection === "analytics") {
    return <AnalyticsView />;
  }

  if (appSection === "account") {
    return <AccountView />;
  }

  // 🏠 Main app
  return <HomeView />;
  

}


