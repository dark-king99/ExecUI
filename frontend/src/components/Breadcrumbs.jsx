/**
 * Breadcrumbs — orient the user on deep solution pages:
 *   CRM · Sales Cloud › Opportunities › Deal Room
 * Rendered at the layout level for module routes two levels deep or more;
 * every crumb is clickable. Config-driven from the same solution catalogs
 * that power the sidebars, so it can never drift from the real routes.
 */
import { Link, useLocation } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { SOLUTIONS as CRM } from "../apps/crm/solutions.config";
import { SOLUTIONS as MKT } from "../apps/marketing/solutions.config";
import { SOLUTIONS as NET } from "../apps/network/solutions.config";
import { SOLUTIONS as ANA } from "../apps/analytics/solutions.config";

const MODULES = {
  crm:       { label: "CRM · Sales Cloud", sols: CRM },
  marketing: { label: "Marketing Cloud",   sols: MKT },
  network:   { label: "Network Ops",       sols: NET },
  analytics: { label: "Analytics",         sols: ANA },
};

const SERVICES_PAGES = {
  dashboard: "Dashboard", financial: "Financial Management", operation: "Operations System",
  strategic: "Strategic Planning", marketing: "Marketing & Sales", team: "Team & Project",
};

function crumbsFor(pathname) {
  const [, section, ...rest] = pathname.split("/");

  if (section === "services" && rest[0]) {
    return [
      { label: "Business Services", to: "/services/dashboard" },
      { label: SERVICES_PAGES[rest[0]] ?? rest[0], to: pathname },
    ];
  }

  const mod = MODULES[section];
  if (!mod || rest.length === 0) return null;

  // Longest-prefix match: find the owning solution, then the exact page.
  let solution = null;
  for (const s of mod.sols) {
    const root = s.pages?.[0]?.path;
    if (!root) continue;
    if (pathname === root || pathname.startsWith(root + "/")) {
      if (!solution || root.length > solution.pages[0].path.length) solution = s;
    }
  }
  if (!solution) return null;

  const crumbs = [
    { label: mod.label, to: `/${section}` },
    { label: solution.name, to: solution.pages[0].path },
  ];
  const page = solution.pages.find((p) => p.path === pathname);
  if (page && page.path !== solution.pages[0].path) {
    crumbs.push({ label: page.label, to: page.path });
  }
  return crumbs;
}

export default function Breadcrumbs() {
  const { pathname } = useLocation();
  const crumbs = crumbsFor(pathname);
  if (!crumbs || crumbs.length < 2) return null;

  return (
    <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
      {crumbs.map((c, i) => {
        const last = i === crumbs.length - 1;
        return (
          <span key={c.to} className="flex items-center gap-1">
            {i > 0 && <ChevronRight size={12} className="text-slate-300 dark:text-slate-700" />}
            {last ? (
              <span className="font-medium text-slate-600 dark:text-slate-300">{c.label}</span>
            ) : (
              <Link to={c.to} className="transition hover:text-indigo-500 hover:underline">{c.label}</Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
