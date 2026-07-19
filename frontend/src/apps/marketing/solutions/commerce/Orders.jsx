import { useState, useMemo } from "react";
import { Package, Search, DollarSign, Receipt } from "lucide-react";
import StatusBadge from "../../../../components/ui/StatusBadge";
import { useApi } from "../../../../hooks/useApi";
import { marketing } from "../../../../services/api";
import { SolutionShell, MetricGrid, Section, Loading, Pill, fmtMoney, fmtNum } from "../../components/mkt-ui";

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—");

export default function Orders() {
  const [search, setSearch] = useState("");
  const { data: orders, loading } = useApi(() => marketing.commerce.orders(), [], { pollingInterval: 120000 });
  const all = orders ?? [];

  const filtered = useMemo(() => all.filter((o) => !search || o.customer?.toLowerCase().includes(search.toLowerCase()) || o.id?.toLowerCase().includes(search.toLowerCase())), [all, search]);
  const totalValue = all.reduce((s, o) => s + (o.value ?? 0), 0);

  const metrics = [
    { label: "Orders", value: fmtNum(all.length), icon: Package, color: "rose" },
    { label: "Order Value", value: fmtMoney(totalValue), icon: DollarSign, color: "emerald" },
    { label: "Avg Order", value: fmtMoney(all.length ? totalValue / all.length : 0), icon: Receipt, color: "violet" },
  ];

  return (
    <SolutionShell solutionId="commerce" title="Orders" subtitle="Closed-won revenue and marketing-influenced orders">
      <MetricGrid items={metrics} cols={3} loading={loading && all.length === 0} />

      <Section title="Recent Orders" icon={Package} pad={false}
        actions={
          <div className="flex items-center gap-2 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 bg-white dark:bg-slate-900">
            <Search size={13} className="text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="text-sm bg-transparent outline-none text-slate-900 dark:text-white w-32" />
          </div>
        }>
        {loading && all.length === 0 ? <Loading table /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  {["Order", "Customer", "Channel", "Value", "Status", "Date"].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="py-10 text-center text-sm text-slate-500">No orders found.</td></tr>
                ) : filtered.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="px-5 py-3 font-mono text-xs text-slate-500">#{o.id}</td>
                    <td className="px-5 py-3 font-medium text-slate-900 dark:text-white">{o.customer}</td>
                    <td className="px-5 py-3"><Pill color="violet">{o.channel}</Pill></td>
                    <td className="px-5 py-3 font-medium text-slate-900 dark:text-white">{fmtMoney(o.value)}</td>
                    <td className="px-5 py-3"><StatusBadge label={o.status} variant="success" /></td>
                    <td className="px-5 py-3 text-slate-500 text-xs">{fmtDate(o.date)}</td>
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
