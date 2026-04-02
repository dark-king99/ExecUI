import { useLocation } from "react-router-dom";
import Sidebar from "./sidebars/Sidebar";
import NetworkSidebar from "./sidebars/NetworkSidebar";
import MarketingSidebar from "./sidebars/MarketingSidebar";
import CrmSidebar from "./sidebars/CrmSidebar";
import AnalyticsSidebar from "./sidebars/AnalyticsSidebar";
import AccountSidebar from "./sidebars/AccountSidebar";
import ServiceSidebar from "./sidebars/ServiceSidebar";

export default function SidebarInset() {
  const { pathname } = useLocation();
  const section = pathname.split("/")[1];

  if (section === "network")   return <NetworkSidebar />;
  if (section === "crm")       return <CrmSidebar />;
  if (section === "marketing") return <MarketingSidebar />;
  if (section === "analytics") return <AnalyticsSidebar />;
  if (section === "account")   return <AccountSidebar />;
  if (section === "service")   return <ServiceSidebar />;

  return <Sidebar />;
}
