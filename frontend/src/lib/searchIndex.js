/**
 * Application search index — a flat catalog of navigable destinations
 * (modules, solutions, solution pages, account & service pages) used by the
 * navbar search. Department access is respected: results in a module the
 * employee can't access are filtered out.
 */
import { SOLUTIONS as MKT } from "../apps/marketing/solutions.config";
import { SOLUTIONS as CRM } from "../apps/crm/solutions.config";
import { SOLUTIONS as NET } from "../apps/network/solutions.config";
import { SOLUTIONS as ANA } from "../apps/analytics/solutions.config";
import { canSee } from "./visibility.js";
import { STATIC_DESTINATIONS } from "./destinations.js";

function fromConfig(sols, section, sectionLabel) {
  const out = [];
  sols.forEach((s) => {
    (s.pages || []).forEach((p) => {
      out.push({
        label: p.label,
        group: `${sectionLabel} · ${s.name}`,
        path: p.path,
        section,
        // The solution this page belongs to, so a plan that doesn't include it
        // can't find it here either. A destination the plan doesn't cover is not
        // a search result, it's an advert.
        solution: s.id,
        keywords: `${s.name} ${s.tagline || ""} ${p.label} ${section}`,
      });
    });
  });
  return out;
}



export const SEARCH_INDEX = [
  ...STATIC_DESTINATIONS,
  ...fromConfig(CRM, "crm", "CRM"),
  ...fromConfig(MKT, "marketing", "Marketing"),
  ...fromConfig(NET, "network", "Network"),
  ...fromConfig(ANA, "analytics", "Analytics"),
];

/**
 * Can this person actually open that destination?
 *
 * The same three gates the sidebar uses — plan, department, role — via the one
 * policy in `lib/visibility.js`. Offering a page that immediately redirects is
 * worse than not offering it, and offering one the organization hasn't bought is
 * an advert in a search box.
 */
export const canReach = (entry, user, role) => canSee(user, entry, role);

/** Rank index entries against a query, filtered by what the user can reach. */
export function searchApp(query, user, role) {
  const q = (query || "").trim().toLowerCase();
  if (!q) return [];
  const tokens = q.split(/\s+/).filter(Boolean);
  return SEARCH_INDEX
    .filter((e) => canReach(e, user, role))
    .map((e) => {
      const label = e.label.toLowerCase();
      const hay = `${label} ${(e.group || "").toLowerCase()} ${e.keywords.toLowerCase()} ${e.path.toLowerCase()}`;
      let score = 0;
      if (label === q) score += 200;
      if (label.startsWith(q)) score += 120;
      if (label.includes(q)) score += 60;
      if (e.path.toLowerCase().includes(q)) score += 40;
      if (hay.includes(q)) score += 15;
      tokens.forEach((t) => { if (hay.includes(t)) score += 6; });
      return { ...e, score };
    })
    .filter((e) => e.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
}
