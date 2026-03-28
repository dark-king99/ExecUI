import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const SidebarContext = createContext();

// Derive the active section from the URL pathname
function sectionFromPath(pathname) {
  const seg = pathname.split("/")[1];
  if (!seg) return "main";
  const map = { home: "main", network: "network", crm: "crm", marketing: "marketing", analytics: "analytics", account: "account" };
  return map[seg] ?? "main";
}

export function SidebarProvider({ children }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const appSection = sectionFromPath(pathname);

  // ✅ SINGLE SOURCE OF TRUTH – theme
  const [theme, setTheme] = useState(
    () => localStorage.getItem("theme") || "dark"
  );

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark");
    if (theme === "dark") root.classList.add("dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => (prev === "dark" ? "light" : "dark"));

  // Navigation helpers used by sidebars
  const setAppSection = (section) => {
    const paths = { main: "/home", network: "/network", crm: "/crm", market: "/marketing", analytics: "/analytics", account: "/account" };
    navigate(paths[section] ?? "/home");
  };

  const setNetworkView = (view) => navigate(`/network/${view}`);
  const setCrmView     = (view) => navigate(`/crm/${view}`);
  const setMarketingView = (view) => navigate(`/marketing/${view}`);
  const setAnalyticsView = (view) => navigate(`/analytics/${view}`);
  const setAccountView   = (view) => navigate(`/account/${view}`);

  // Derive sub-view from URL for active-state highlighting in sidebars
  const pathParts = pathname.split("/").filter(Boolean);
  const networkView  = pathParts[0] === "network"   ? (pathParts[1] ?? "dashboard") : "dashboard";
  const crmView      = pathParts[0] === "crm"       ? (pathParts.slice(1).join("/") || "stream")    : "stream";
  const marketingView = pathParts[0] === "marketing" ? (pathParts.slice(1).join("/") || "stream")   : "stream";
  const analyticsView = pathParts[0] === "analytics" ? (pathParts[1] ?? "executive") : "executive";
  const accountView   = pathParts[0] === "account"   ? (pathParts[1] ?? "profile")   : "profile";

  return (
    <SidebarContext.Provider
      value={{
        theme, toggleTheme, setTheme,
        appSection, setAppSection,
        networkView,   setNetworkView,
        crmView,       setCrmView,
        marketingView, setMarketingView,
        analyticsView, setAnalyticsView,
        accountView,   setAccountView,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) throw new Error("useSidebar must be used inside SidebarProvider");
  return context;
}
