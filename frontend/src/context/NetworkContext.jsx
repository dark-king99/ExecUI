/**
 * Network context — the tenant's network scale profile ("office" | "datacenter"),
 * shared by the Network sidebar, launcher and dashboards.
 *
 * The profile is READ-ONLY here: it's a property of the organization's plan
 * (Executive's office vs enterprise/datacenter tier), chosen in Billing — never
 * changed from the Network module. Small offices get a focused view (internet +
 * routers + devices); the datacenter tier unlocks the full enterprise feature set.
 */
import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { network } from "../services/api";
import { useUser } from "./UserContext";
import { accessFor } from "../lib/access";
import { solutionsForProfile } from "../apps/network/solutions.config";

const NetworkContext = createContext(null);

export function NetworkProvider({ children }) {
  const [profile, setProfileState] = useState("office");
  const [loading, setLoading] = useState(true);
  // Employees without Network access would get a 403 here. Skip the call rather
  // than firing a request we know will be refused — it only produced console
  // noise and false errors in analytics.
  const { user } = useUser();
  const canRead = accessFor(user).sections.includes("network");

  const load = useCallback(async () => {
    if (!canRead) { setLoading(false); return; }
    try {
      const res = await network.profile.get();
      setProfileState(res?.profile || "office");
    } catch {
      setProfileState("office");
    } finally {
      setLoading(false);
    }
  }, [canRead]);

  useEffect(() => {
    load();
    // Re-read when the plan (and thus the network tier) changes in Billing.
    const onChange = () => load();
    window.addEventListener("network:profile-changed", onChange);
    return () => window.removeEventListener("network:profile-changed", onChange);
  }, [load]);

  const value = useMemo(() => ({ profile, loading, refresh: load }), [profile, loading, load]);
  return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>;
}

export function useNetwork() {
  return useContext(NetworkContext) ?? { profile: "office", loading: false, refresh: async () => {} };
}

/** Network solutions visible for the tenant's current profile. */
export function useNetworkSolutions() {
  const { profile } = useNetwork();
  return useMemo(() => solutionsForProfile(profile), [profile]);
}
