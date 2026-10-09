import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, useLocation } from "react-router-dom";
import App from "./App/App";
import "./styles/App.css";
import { initAnalytics, logInfo, trackPageview } from "./lib/analytics";

// Load the analytics provider once (safe no-op without a key).
initAnalytics();

// Emit an SPA pageview on every route change — the basis for drop-off funnels.
function AnalyticsPageviews() {
  const { pathname } = useLocation();
  useEffect(() => {
    trackPageview(pathname);
    logInfo("spa_navigation_observed", { router: "react_router" });
  }, [pathname]);
  return null;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AnalyticsPageviews />
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
