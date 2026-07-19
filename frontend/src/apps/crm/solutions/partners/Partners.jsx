import { Handshake, DollarSign, Award, Users } from "lucide-react";
import StatusBadge from "../../../../components/ui/StatusBadge";
import { useApi } from "../../../../hooks/useApi";
import { crm } from "../../../../services/api";
import { SolutionShell, MetricGrid, Section, Loading, Pill, fmtMoney, fmtNum } from "../../components/crm-ui";

const TIER_COLOR = { Gold: "amber", Silver: "slate", Bronze: "orange" };

export default function Partners() {
  const { data: partners, loading } = useApi(() => crm.partners.list(), [], { pollingInterval: 120000 });
  const all = partners ?? [];

  const metrics = [
    { label: "Partners", value: fmtNum(all.length), icon: Handshake, color: "orange" },
    { label: "Partner Revenue", value: fmtMoney(all.reduce((s, p) => s + (p.revenue ?? 0), 0)), icon: DollarSign, color: "emerald" },
    { label: "Gold Tier", value: fmtNum(all.filter((p) => p.tier === "Gold").length), icon: Award, color: "amber" },
    { label: "Active", value: fmtNum(all.filter((p) => p.status === "active").length), icon: Users, color: "sky" },
  ];

  return (
    <SolutionShell solutionId="partners" title="Partners" subtitle="Your reseller, referral, and technology partner ecosystem">
      <MetricGrid items={metrics} cols={4} loading={loading && all.length === 0} />

      <Section title="Partner Directory" icon={Handshake} pad={false}>
        {loading && all.length === 0 ? <Loading table /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  {["Partner", "Type", "Tier", "Revenue", "Status"].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {all.length === 0 ? (
                  <tr><td colSpan={5} className="py-10 text-center text-sm text-slate-500">No partners.</td></tr>
                ) : all.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="px-5 py-3">
                      <div className="font-medium text-slate-900 dark:text-white">{p.name}</div>
                      <div className="text-xs text-slate-400">{p.email}</div>
                    </td>
                    <td className="px-5 py-3 text-slate-500">{p.type}</td>
                    <td className="px-5 py-3"><Pill color={TIER_COLOR[p.tier] ?? "slate"}>{p.tier}</Pill></td>
                    <td className="px-5 py-3 font-medium text-slate-900 dark:text-white">{fmtMoney(p.revenue)}</td>
                    <td className="px-5 py-3"><StatusBadge label={p.status} variant="success" dot /></td>
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
