import { useState, useMemo } from "react";
import { Building2, Search, DollarSign, Briefcase, Activity } from "lucide-react";
import StatusBadge from "../../../../components/ui/StatusBadge";
import { useApi } from "../../../../hooks/useApi";
import { crm } from "../../../../services/api";
import { SolutionShell, MetricGrid, Section, Loading, ErrorNote, fmtMoney, fmtNum } from "../../components/crm-ui";

export default function Accounts() {
  const [search, setSearch] = useState("");
  const { data: accounts, loading, error } = useApi(() => crm.accounts.list(), [], { pollingInterval: 120000 });

  const all = accounts ?? [];
  const filtered = useMemo(() => all.filter((a) => !search || a.name?.toLowerCase().includes(search.toLowerCase()) || a.email?.toLowerCase().includes(search.toLowerCase())), [all, search]);

  const metrics = [
    { label: "Accounts", value: fmtNum(all.length), icon: Building2, color: "sky" },
    { label: "Active", value: fmtNum(all.filter((a) => a.health === "active").length), icon: Activity, color: "emerald" },
    { label: "Total Revenue", value: fmtMoney(all.reduce((s, a) => s + (a.revenue ?? 0), 0)), icon: DollarSign, color: "violet" },
    { label: "Open Deals", value: fmtNum(all.reduce((s, a) => s + (a.openDeals ?? 0), 0)), icon: Briefcase, color: "amber" },
  ];

  return (
    <SolutionShell solutionId="accounts" title="Accounts" subtitle="Your entire book of business with revenue and deal context">
      <ErrorNote error={error} />
      <MetricGrid items={metrics} cols={4} loading={loading && all.length === 0} />

      <Section title={`${fmtNum(filtered.length)} Accounts`} icon={Building2} pad={false}
        actions={
          <div className="flex items-center gap-1.5 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 bg-white dark:bg-slate-900">
            <Search size={13} className="text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="text-sm bg-transparent outline-none text-slate-900 dark:text-white w-32" />
          </div>
        }>
        {loading && all.length === 0 ? <Loading table /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  {["Account", "Revenue", "Open Deals", "Total Deals", "Health"].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.length === 0 ? (
                  <tr><td colSpan={5} className="py-10 text-center text-sm text-slate-500">No accounts found.</td></tr>
                ) : filtered.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="px-5 py-3">
                      <div className="font-medium text-slate-900 dark:text-white">{a.name}</div>
                      <div className="text-xs text-slate-400">{a.email}</div>
                    </td>
                    <td className="px-5 py-3 font-medium text-slate-900 dark:text-white">{a.revenueFmt ?? fmtMoney(a.revenue)}</td>
                    <td className="px-5 py-3 text-slate-700 dark:text-slate-300">{fmtNum(a.openDeals)}</td>
                    <td className="px-5 py-3 text-slate-500">{fmtNum(a.totalDeals)}</td>
                    <td className="px-5 py-3"><StatusBadge label={a.health} variant={a.health === "active" ? "success" : "neutral"} dot /></td>
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
