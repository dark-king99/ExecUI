import { Users, Send, Heart, Eye, TrendingUp } from "lucide-react";
import { marketing } from "../../../../services/api";
import { useApi } from "../../../../hooks/useApi";
import { SolutionShell, MetricGrid, Section, BarList, Loading, fmtNum } from "../../components/mkt-ui";
import { platformMeta } from "./platformMeta";

export default function Analytics() {
  const { data, loading } = useApi(() => marketing.social.analytics(), []);
  const a = data ?? {};

  const metrics = [
    { label: "Total followers", value: fmtNum(a.totalFollowers ?? 0), icon: Users, color: "violet" },
    { label: "Posts published", value: fmtNum(a.publishedCount ?? 0), icon: Send, color: "sky" },
    { label: "Total reach", value: fmtNum(a.reach ?? 0), icon: Eye, color: "emerald" },
    { label: "Engagement rate", value: `${a.engagementRate ?? 0}%`, icon: TrendingUp, color: "amber" },
  ];

  const followerBars = (a.byPlatform ?? []).map((p) => ({ label: platformMeta(p.platform).name, value: p.followers }));
  const engagementBars = [
    { label: "Likes", value: a.likes ?? 0 },
    { label: "Comments", value: a.comments ?? 0 },
    { label: "Shares", value: a.shares ?? 0 },
  ];

  if (loading && !data) return <SolutionShell solutionId="social"><Loading /></SolutionShell>;

  return (
    <SolutionShell solutionId="social" title="Social Analytics" subtitle="Following, reach and engagement across channels.">
      <MetricGrid items={metrics} cols={4} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Section title="Followers by platform" icon={Users}>
          {followerBars.length ? <BarList items={followerBars} color="violet" format={fmtNum} /> : <p className="text-sm text-slate-400 py-6 text-center">Connect accounts to see following.</p>}
        </Section>
        <Section title="Engagement breakdown" icon={Heart}>
          {a.engagements ? <BarList items={engagementBars} color="rose" format={fmtNum} /> : <p className="text-sm text-slate-400 py-6 text-center">Publish posts to see engagement.</p>}
        </Section>
      </div>

      <Section title="Channels" subtitle={`${a.accounts ?? 0} connected · ${a.scheduled ?? 0} scheduled · ${a.drafts ?? 0} drafts`}>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {(a.byPlatform ?? []).map((p) => {
            const m = platformMeta(p.platform);
            return (
              <div key={p.platform} className="flex items-center gap-3 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
                <m.Icon size={20} className={m.color} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{fmtNum(p.followers)}</p>
                  <p className="text-[11px] text-slate-400 truncate">@{p.handle}{p.live ? "" : " · sim"}</p>
                </div>
              </div>
            );
          })}
          {(a.byPlatform ?? []).length === 0 && <p className="text-sm text-slate-400 col-span-full py-6 text-center">No channels connected yet.</p>}
        </div>
      </Section>
    </SolutionShell>
  );
}
