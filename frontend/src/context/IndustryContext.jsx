/**
 * Industry context — one cheap fetch of the tenant's selected industry + the
 * catalog, shared by the CRM sidebar, launcher, router and setup page.
 *
 * When the industry is "general" (the default), nothing extra is added and the
 * CRM behaves exactly as it always has.
 */
import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { crm } from "../services/api";
import { useUser } from "./UserContext";
import { accessFor } from "../lib/access";
import { SOLUTIONS as CRM_SOLUTIONS } from "../apps/crm/solutions.config";
import { SOLUTIONS as MKT_SOLUTIONS } from "../apps/marketing/solutions.config";
import { industrySolutionFor } from "../apps/crm/industries.config";

const IndustryContext = createContext(null);

export function IndustryProvider({ children }) {
  const [industryId, setIndustryId] = useState("general");
  const [catalog, setCatalog] = useState([]);      // [{ id, name, objects }]
  const [loading, setLoading] = useState(true);
  // Same reasoning as NetworkContext: no CRM access means a guaranteed 403.
  const { user } = useUser();
  const canRead = accessFor(user).sections.includes("crm");

  const load = useCallback(async () => {
    if (!canRead) { setIndustryId("general"); setCatalog([]); setLoading(false); return; }
    try {
      const res = await crm.industry.get();
      setIndustryId(res?.industry || "general");
      setCatalog(res?.available || []);
    } catch {
      // No CRM access / not reachable — stay on core-only, never block the app.
      setIndustryId("general");
      setCatalog([]);
    } finally {
      setLoading(false);
    }
  }, [canRead]);

  useEffect(() => { load(); }, [load]);

  const setIndustry = useCallback(async (id) => {
    const res = await crm.industry.set(id);
    setIndustryId(res?.industry || id);
    if (res?.available) setCatalog(res.available);
    return res;
  }, []);

  const value = useMemo(() => {
    const entry = catalog.find((c) => c.id === industryId) || null;
    return {
      industryId,
      catalog,
      currentEntry: entry,
      crmIndustrySolution: industrySolutionFor(industryId, entry, "crm"),
      marketingIndustrySolution: industrySolutionFor(industryId, entry, "marketing"),
      loading,
      setIndustry,
      refresh: load,
    };
  }, [industryId, catalog, loading, setIndustry, load]);

  return <IndustryContext.Provider value={value}>{children}</IndustryContext.Provider>;
}

export function useIndustry() {
  return useContext(IndustryContext) ?? {
    industryId: "general", catalog: [], currentEntry: null,
    crmIndustrySolution: null, marketingIndustrySolution: null,
    loading: false, setIndustry: async () => {}, refresh: async () => {},
  };
}

/** Core CRM solutions + the tenant's CRM industry solution (if any). */
export function useCrmSolutions() {
  const { crmIndustrySolution } = useIndustry();
  return useMemo(
    () => (crmIndustrySolution ? [...CRM_SOLUTIONS, crmIndustrySolution] : CRM_SOLUTIONS),
    [crmIndustrySolution]
  );
}

/** Core Marketing solutions + the tenant's marketing industry solution (if any). */
export function useMarketingSolutions() {
  const { marketingIndustrySolution } = useIndustry();
  return useMemo(
    () => (marketingIndustrySolution ? [...MKT_SOLUTIONS, marketingIndustrySolution] : MKT_SOLUTIONS),
    [marketingIndustrySolution]
  );
}
