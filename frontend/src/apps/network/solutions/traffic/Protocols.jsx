import { Network } from "lucide-react";
import { useApi } from "../../../../hooks/useApi";
import { network } from "../../../../services/api";
import { SolutionShell, Section, BarList, Loading } from "../../components/net-ui";

const COLORS = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#14b8a6", "#94a3b8"];

export default function Protocols() {
  const { data: protocols, loading } = useApi(() => network.traffic.protocols(), [], { pollingInterval: 60000 });
  const all = protocols ?? [];

  // Build a stacked share bar
  let acc = 0;
  const segments = all.map((p, i) => {
    const seg = { ...p, start: acc, color: COLORS[i % COLORS.length] };
    acc += p.percent ?? 0;
    return seg;
  });

  return (
    <SolutionShell solutionId="traffic" title="Protocols" subtitle="Traffic distribution by application protocol">
      <Section title="Protocol Mix" icon={Network}>
        {loading && all.length === 0 ? <Loading rows={3} /> : (
          <>
            <div className="flex h-4 rounded-full overflow-hidden mb-5">
              {segments.map((s) => (
                <div key={s.name} style={{ width: `${s.percent}%`, backgroundColor: s.color }} title={`${s.name} ${s.percent}%`} />
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 mb-6">
              {segments.map((s) => (
                <div key={s.name} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300"><span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: s.color }} />{s.name}</span>
                  <span className="text-slate-500">{s.percent}% · {s.bytes}</span>
                </div>
              ))}
            </div>
            <BarList items={all.map((p) => ({ label: p.name, value: p.percent, sub: p.bytes }))} color="violet" format={(v) => `${v}%`} />
          </>
        )}
      </Section>
    </SolutionShell>
  );
}
