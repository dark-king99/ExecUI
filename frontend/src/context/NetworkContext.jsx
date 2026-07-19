/**
 * Network context — the tenant's network scale profile ("office" | "datacenter"),
 * shared by the Network sidebar, launcher, setup page and dashboards. Small
 * offices get a focused view (internet + routers + devices); the datacenter
 * profile keeps the full enterprise feature set.
 */
import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { network } from "../services/api";
import { solutionsForProfile } from "../apps/network/solutions.config";

const NetworkContext = createContext(null);

export function NetworkProvider({ children }) {
  const [profile, setProfileState] = useState("office");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await network.profile.get();
      setProfileState(res?.profile || "office");
    } catch {
      setProfileState("office");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const setProfile = useCallback(async (p) => {
    const res = await network.profile.set(p);
    setProfileState(res?.profile || p);
    return res;
  }, []);

  const value = useMemo(() => ({ profile, loading, setProfile, refresh: load }), [profile, loading, setProfile, load]);
  return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>;
}

export function useNetwork() {
  return useContext(NetworkContext) ?? { profile: "office", loading: false, setProfile: async () => {}, refresh: async () => {} };
}

/** Network solutions visible for the tenant's current profile. */
export function useNetworkSolutions() {
  const { profile } = useNetwork();
  return useMemo(() => solutionsForProfile(profile), [profile]);
}
