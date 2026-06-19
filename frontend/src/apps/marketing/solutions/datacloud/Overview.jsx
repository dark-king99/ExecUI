import { Database, Fingerprint, Share2, Activity, Code2 } from "lucide-react";
import { useApi } from "../../../../hooks/useApi";
import { marketing } from "../../../../services/api";
import { SolutionShell, MetricGrid, Section, Loading, fmtNum } from "../../components/mkt-ui";

export default function Overview() {
  const { data: m, loading } = useApi(() => marketing.cdp.metrics(), [], { pollingInterval: 120000 });
  const d = m ?? {};
  const p = d.predictiveLayer ?? {};

  const metrics = [
    { label: "Unified Profiles", value: fmtNum(d.totalProfiles ?? 0), icon: Database, color: "indigo" },
    { label: "Resolved Identities", value: fmtNum(d.resolvedIdentities ?? 0), icon: Fingerprint, color: "violet" },
    { label: "Connected Sources", value: `${d.activeSources ?? 0}/${d.totalSources ?? 0}`, icon: Share2, color: "sky" },
    { label: "Events Ingested", value: fmtNum(d.totalEvents ?? 0), icon: Activity, color: "emerald" },
  ];

  return (
    <SolutionShell solutionId="datacloud" title="Data Cloud Overview" subtitle="One unified, real-time view of every customer">
      <MetricGrid items={metrics} cols={4} loading={loading && !m} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Section title="Audience Health" icon={Database} className="lg:col-span-1">
          {loading && !m ? <Loading rows={2} /> : (
            <div className="space-y-3">
              {[
                ["Addressable Audience", fmtNum(d.audience ?? 0)],
                ["Growth (30d)", d.audienceDelta != null ? `+${d.audienceDelta}%` : "—"],
                ["Match Confidence", d.confidence != null ? `${d.confidence}%` : "—"],
                ["Active Models", d.activeModels ?? "—"],
                ["Active Segments", d.activeSegments ?? "—"],
              ].map(([label, val]) => (
                <div key={label} className="flex items-center justify-between text-sm py-1.5 border-b border-slate-50 dark:border-slate-800 last:border-0">
                  <span className="text-slate-500">{label}</span>
                  <span className="font-medium text-slate-900 dark:text-white">{val}</span>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="Predictive Layer" subtitle="AI-derived scores across the audience" icon={Activity} className="lg:col-span-2">
          {loading && !m ? <Loading rows={2} /> : (
            <>
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[["Churn Risk", `${p.churnRisk ?? "—"}%`, "amber"], ["Upsell Probability", `${p.upsellProbability ?? "—"}%`, "emerald"], ["Projected Lift", `+${d.projectedLift ?? "—"}%`, "indigo"]].map(([l, v]) => (
                  <div key={l} className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 text-center">
                    <div className="text-xl font-bold text-slate-900 dark:text-white">{v}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{l}</div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-2"><Code2 size={14} /> Segment Query Preview</div>
              <pre className="text-[11px] bg-slate-900 dark:bg-slate-950 text-emerald-300 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">{d.sqlPreview ?? "—"}</pre>
            </>
          )}
        </Section>
      </div>
    </SolutionShell>
  );
}
