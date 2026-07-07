import { useState, useMemo } from "react";
import { Users, Search, Building2 } from "lucide-react";
import StatusBadge from "../../../../components/ui/StatusBadge";
import { useApi } from "../../../../hooks/useApi";
import { marketing } from "../../../../services/api";
import { SolutionShell, Section, Loading, ErrorNote, Pill, fmtNum } from "../../components/mkt-ui";

const STAGE_VARIANT = { Prospect: "neutral", MQL: "info", SQL: "indigo", Customer: "success", Champion: "warning" };
const STAGES = ["all", "Prospect", "MQL", "SQL", "Customer", "Champion"];

function ScoreBadge({ score }) {
  const color = score >= 85 ? "text-emerald-600" : score >= 70 ? "text-amber-600" : "text-slate-500";
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <div className={`h-full rounded-full ${score >= 85 ? "bg-emerald-500" : score >= 70 ? "bg-amber-500" : "bg-slate-400"}`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-xs font-semibold ${color}`}>{score}</span>
    </div>
  );
}

export default function Prospects() {
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState("all");
  const { data: accounts, loading, error } = useApi(() => marketing.b2b.accounts.list({ limit: 50 }), [], { pollingInterval: 120000 });

  const all = accounts ?? [];
  const filtered = useMemo(() => all.filter((a) => {
    const ms = stage === "all" || a.stage === stage;
    const mq = !search || a.name?.toLowerCase().includes(search.toLowerCase()) || a.email?.toLowerCase().includes(search.toLowerCase());
    return ms && mq;
  }), [all, search, stage]);

  return (
    <SolutionShell solutionId="account-engagement" title="Prospects" subtitle="Every account in your B2B funnel with engagement scoring">
      <ErrorNote error={error} />
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-900 flex-1 max-w-72">
          <Search size={14} className="text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search prospects…" className="flex-1 text-sm bg-transparent outline-none text-slate-900 dark:text-white" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {STAGES.map((s) => (
            <button key={s} onClick={() => setStage(s)} className={`text-xs px-2.5 py-1 rounded-full border transition ${stage === s ? "bg-sky-600 text-white border-sky-600" : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-sky-400"}`}>{s === "all" ? "All" : s}</button>
          ))}
        </div>
      </div>

      <Section title={`${fmtNum(filtered.length)} Prospects`} icon={Users} pad={false}>
        {loading && all.length === 0 ? <Loading table /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  {["Account", "Industry", "Size", "Stage", "Engagement Score"].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.length === 0 ? (
                  <tr><td colSpan={5} className="py-10 text-center text-sm text-slate-500">No prospects found.</td></tr>
                ) : filtered.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="px-5 py-3">
                      <div className="font-medium text-slate-900 dark:text-white">{a.name}</div>
                      <div className="text-xs text-slate-400">{a.email}</div>
                    </td>
                    <td className="px-5 py-3"><Pill color="sky">{a.industry}</Pill></td>
                    <td className="px-5 py-3 text-slate-500">{a.size}</td>
                    <td className="px-5 py-3"><StatusBadge label={a.stage} variant={STAGE_VARIANT[a.stage] ?? "neutral"} /></td>
                    <td className="px-5 py-3"><ScoreBadge score={a.score ?? 0} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </SolutionShell>
  );
}
