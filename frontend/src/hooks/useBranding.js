/**
 * The signed-in tenant's branding, for the app shell.
 *
 * Fetched once per session and cached, because it's read by the sidebar on
 * every render and changes about as often as a company renames itself. The
 * admin screen fires `branding:changed` after a save so the change lands
 * without a reload.
 *
 * Always resolves to something usable: on any failure — offline, 401, a plan
 * without branding — it returns the platform defaults rather than a null the
 * caller has to guard. The sidebar can render unconditionally.
 */
import { useState, useEffect } from "react";
import { enterprise } from "../services/api";

export const PLATFORM_BRANDING = Object.freeze({
  organizationName: null,
  productName: "ExecUI",
  logoUrl: null,
  primaryColor: null,
  supportEmail: null,
  hidePoweredBy: false,
  entitled: false,
});

let cache = null;
let inflight = null;

function load() {
  if (cache) return Promise.resolve(cache);
  inflight ??= enterprise.branding
    .get()
    .then((b) => { cache = { ...PLATFORM_BRANDING, ...b }; return cache; })
    .catch(() => PLATFORM_BRANDING)
    .finally(() => { inflight = null; });
  return inflight;
}

/** Drop the cache so the next read re-fetches (after a save, or on sign-out). */
export function resetBranding() {
  cache = null;
  inflight = null;
}

export function useBranding() {
  const [branding, setBranding] = useState(cache ?? PLATFORM_BRANDING);

  useEffect(() => {
    let alive = true;
    load().then((b) => { if (alive) setBranding(b); });

    const onChange = () => {
      resetBranding();
      load().then((b) => { if (alive) setBranding(b); });
    };
    window.addEventListener("branding:changed", onChange);
    return () => { alive = false; window.removeEventListener("branding:changed", onChange); };
  }, []);

  return branding;
}
