/**
 * useRewardTracking — reports the current section to the reward system so
 * navigation earns points. Mounted once at the app root (inside the Router).
 *
 * We ping at section granularity (first path segment) and dedupe per session,
 * so moving around a section doesn't spam the API; the server additionally
 * caps navigation to once per section per day. Entirely fire-and-forget —
 * failures never surface to the user.
 */
import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { rewards } from "../services/api";

export default function useRewardTracking(enabled = true) {
  const { pathname } = useLocation();
  const seen = useRef(new Set());

  useEffect(() => {
    if (!enabled || !pathname) return;
    const section = "/" + (pathname.split("/").filter(Boolean)[0] || "home");
    if (seen.current.has(section)) return;
    seen.current.add(section);
    rewards.track(pathname);
  }, [pathname, enabled]);
}
