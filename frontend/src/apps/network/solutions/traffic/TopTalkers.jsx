import { Users, Network } from "lucide-react";
import { useApi } from "../../../../hooks/useApi";
import { network } from "../../../../services/api";
import { SolutionShell, Section, Loading } from "../../components/net-ui";

export default function TopTalkers() {
  const { data: talkers, loading } = useApi(() => network.traffic.topTalkers(), [], { pollingInterval: 60000 });
  const all = talkers ?? [];
  const max = Math.max(...all.map((t) => t.percent ?? 0), 1);

  return (
    <SolutionShell solutionId="traffic" title="Top Talkers" subtitle="The hosts consuming the most bandwidth right now">
      <Section title="Bandwidth by Host" icon={Users} pad={false}>
        {loading && all.length === 0 ? <Loading table /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  {["Host", "IP", "Traffic", "Volume", "Share"].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {all.length === 0 ? (
                  <tr><td colSpan={5} className="py-10 text-center text-sm text-slate-500">No traffic data.</td></tr>
                ) : all.map((t, i) => (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="px-5 py-3 font-medium text-slate-900 dark:text-white flex items-center gap-2"><Network size={14} className="text-violet-500" />{t.hostname ?? t.name}</td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-500">{t.ip}</td>
                    <td className="px-5 py-3 text-slate-700 dark:text-slate-300">{t.traffic}</td>
                    <td className="px-5 py-3 text-slate-500">{t.bytes}</td>
                    <td className="px-5 py-3 w-48">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div className="h-full rounded-full bg-violet-500" style={{ width: `${Math.max(3, ((t.percent ?? 0) / max) * 100)}%` }} />
                        </div>
                        <span className="text-xs text-slate-500 w-9 text-right">{t.percent}%</span>
                      </div>
                    </td>
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
