/**
 * Traffic by application, from NetFlow/IPFIX that routers export to a
 * collector. Every byte here was reported by a device; with no flow data the
 * page says so rather than showing anything.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { Network, ArrowRightLeft, Info } from "lucide-react";
import { useApi } from "../../../../hooks/useApi";
import { network } from "../../../../services/api";
import { SolutionShell, Section, BarList, Loading } from "../../components/net-ui";

const COLORS = ["#8a6b10", "#0e688a", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#14b8a6", "#6366f1", "#a3a3a3", "#94a3b8"];
const WINDOWS = [[1, "Last hour"], [24, "Last 24 hours"], [168, "Last 7 days"]];

export default function Protocols() {
  const [hours, setHours] = useState(1);
  const { data: protocols, loading } = useApi(() => network.traffic.protocols({ hours }), [hours], { pollingInterval: 60000 });
  const { data: conversations } = useApi(() => network.traffic.conversations({ hours }), [hours], { pollingInterval: 60000 });
  const all = protocols ?? [];

  let acc = 0;
  const segments = all.map((p, i) => {
    const seg = { ...p, start: acc, color: COLORS[i % COLORS.length] };
    acc += p.percent ?? 0;
    return seg;
  });

  return (
    <SolutionShell solutionId="traffic" title="Protocols" subtitle="Traffic by application, from NetFlow / IPFIX"
      actions={(
        <select value={hours} onChange={(e) => setHours(Number(e.target.value))} aria-label="Time window"
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
          {WINDOWS.map(([h, l]) => <option key={h} value={h}>{l}</option>)}
        </select>
      )}>
      <Section title="Application mix" icon={Network}>
        {loading && !protocols ? <Loading rows={3} /> : all.length === 0 ? (
          <p className="flex items-start gap-2 py-4 text-sm text-slate-500">
            <Info size={16} className="mt-0.5 shrink-0 text-sky-500" />
            <span>No flow data for this period. Turn on flow collection in <Link to="/network/config/settings" className="font-medium text-sky-600 underline">Settings</Link> and point a router's NetFlow or IPFIX export at your collector.</span>
          </p>
        ) : (
          <>
            <div className="mb-5 flex h-4 overflow-hidden rounded-full">
              {segments.map((s) => <div key={s.name} style={{ width: `${s.percent}%`, backgroundColor: s.color }} title={`${s.name} ${s.percent}%`} />)}
            </div>
            <div className="mb-6 grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2">
              {segments.map((s) => (
                <div key={s.name} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300"><span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: s.color }} />{s.name}</span>
                  <span className="text-slate-500">{s.percent}% · {s.bytes} · {s.mbps} Mbps avg</span>
                </div>
              ))}
            </div>
            <BarList items={all.map((p) => ({ label: p.name, value: p.percent, sub: p.bytes }))} color="violet" format={(v) => `${v}%`} />
          </>
        )}
      </Section>

      <Section title="Top conversations" icon={ArrowRightLeft} pad={false}>
        {(conversations ?? []).length === 0 ? <p className="px-5 py-6 text-sm text-slate-400">No conversations recorded for this period.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-100 dark:border-slate-800">
                {["From", "To", "Service", "Volume"].map((h) => <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">{h}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {conversations.map((c, i) => (
                  <tr key={i}>
                    <td className="px-5 py-2.5 font-mono text-xs text-slate-700 dark:text-slate-200">{c.src}</td>
                    <td className="px-5 py-2.5 font-mono text-xs text-slate-700 dark:text-slate-200">{c.dst}</td>
                    <td className="px-5 py-2.5 text-slate-600 dark:text-slate-300">{c.service}</td>
                    <td className="px-5 py-2.5 text-slate-500">{c.bytes}</td>
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
