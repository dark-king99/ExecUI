/**
 * What this person can see — the one answer the whole UI reads.
 *
 * The rule: **if you can't use it, you don't see it.** Not greyed out, not shown
 * and then redirected — absent. Two reasons, and the second is the important one:
 *
 *  1. A sidebar full of entries that bounce you to somewhere else is noise. Every
 *     item a person can't open is a thing they have to learn to ignore.
 *  2. Advertising what a plan doesn't include, or what an employee isn't allowed
 *     to touch, tells them something about the organization they were not meant
 *     to be told. "Payroll" in the nav of somebody who can't open it is an
 *     invitation to ask why.
 *
 * Three gates, applied together:
 *
 * | Gate | Question | Source |
 * |---|---|---|
 * | **plan** | did the organization buy it? | `lib/plans.js` |
 * | **department** | is it this employee's job? | `lib/access.js` |
 * | **role** | is this an administrator? | effective role, not the stored one |
 *
 * Effective access is the intersection. The sidebar, the routes, the command
 * palette and the search index all call the same functions here, so a page can't
 * be reachable by one route and invisible on another.
 *
 * Routes still guard themselves. Hiding a link is presentation; the redirect and
 * the API's own authorization are the security boundary, and neither is removed
 * by anything in this file.
 */
import { accessFor, isAdminRole } from "./access.js";

/** Did the org's plan *and* this employee's department both allow this section? */
export function canSeeSection(user, section, role) {
  if (!section) return true;
  return accessFor(user).sections.includes(section) && !blockedByRole(section, user, role);
}

/**
 * A solution inside a module (CRM → Opportunities, Services → Financial…).
 * A plan that doesn't include it must not show it anywhere.
 */
export function canSeeSolution(user, module, solutionId, role) {
  if (!canSeeSection(user, module, role)) return false;
  if (!solutionId) return true;

  const { planEntitlements: ent, slices } = accessFor(user);

  // Analytics is sliced by data domain rather than by named solution: a plan with
  // no Network gets no Network analytics, and "reports" follows the same rule as
  // the module itself.
  if (module === "analytics") return solutionId === "reports" || slices.includes(solutionId);

  // Network is all-or-nothing — the section gate has already decided.
  if (module === "network") return ent.solutions.network === "all";

  return (ent.solutions[module] ?? []).includes(solutionId);
}

/** Administrators, by the **effective** role, so role simulation really simulates. */
export const canSeeAdmin = (user, role) => isAdminRole(role ?? user?.role);

/** Some sections are administrator-only regardless of department or plan. */
const ADMIN_ONLY_SECTIONS = new Set([]);
const blockedByRole = (section, user, role) =>
  ADMIN_ONLY_SECTIONS.has(section) && !canSeeAdmin(user, role);

/**
 * One entry — a nav item, a route, a command-palette destination — described the
 * same way everywhere:
 *
 *   { section?: "crm", solution?: "opportunities", adminOnly?: true }
 *
 * Anything unset is unrestricted. This is what lets a single declaration drive
 * the sidebar and the search index without them being able to disagree.
 */
export function canSee(user, entry = {}, role) {
  if (entry.adminOnly && !canSeeAdmin(user, role)) return false;
  if (entry.section && !canSeeSection(user, entry.section, role)) return false;
  if (entry.solution && !canSeeSolution(user, entry.module ?? entry.section, entry.solution, role)) return false;
  return true;
}

/** Filter a list of declared entries. */
export const visible = (user, entries, role) => entries.filter((e) => canSee(user, e, role));
