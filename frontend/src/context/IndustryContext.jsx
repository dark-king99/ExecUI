/**
 * Industry context — one cheap fetch of the tenant's selected industry + the
 * catalog, shared by the CRM sidebar, launcher, router and setup page.
 *
 * When the industry is "general" (the default), nothing extra is added and the
 * CRM behaves exactly as it always has.
 */
import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { crm } from "../services/api";
import { SOLUTIONS } from "../apps/crm/solutions.config";
import { industrySolutionFor } from "../apps/crm/industries.config";

const IndustryContext = createContext(null);

export function IndustryProvider({ children }) {
  const [industryId, setIndustryId] = useState("general");
  const [catalog, setCatalog] = useState([]);      // [{ id, name, objects }]
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
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
  }, []);

  useEffect(() => { load(); }, [load]);

  const setIndustry = useCallback(async (id) => {
    const res = await crm.industry.set(id);
    setIndustryId(res?.industry || id);
    if (res?.available) setCatalog(res.available);
    return res;
  }, []);

  const value = useMemo(() => {
    const entry = catalog.find((c) => c.id === industryId) || null;
    const industrySolution = industrySolutionFor(industryId, entry);
    return {
      industryId,
      catalog,
      currentEntry: entry,
      industrySolution,
      loading,
      setIndustry,
      refresh: load,
    };
  }, [industryId, catalog, loading, setIndustry, load]);

  return <IndustryContext.Provider value={value}>{children}</IndustryContext.Provider>;
}

export function useIndustry() {
  return useContext(IndustryContext) ?? {
    industryId: "general", catalog: [], currentEntry: null, industrySolution: null,
    loading: false, setIndustry: async () => {}, refresh: async () => {},
  };
}

/** Core CRM solutions + the tenant's industry solution (if any). */
export function useCrmSolutions() {
  const { industrySolution } = useIndustry();
  return useMemo(
    () => (industrySolution ? [...SOLUTIONS, industrySolution] : SOLUTIONS),
    [industrySolution]
  );
}
