import { useState } from "react";
import { Users, UserPlus, TrendingUp, Send, Clock, Hash, Wand2, Award } from "lucide-react";
import { marketing } from "../../../../services/api";
import { useApi } from "../../../../hooks/useApi";
import { useToast } from "../../../../components/ui/Toast";
import { SolutionShell, MetricGrid, Section, BarList, Loading, ErrorNote, fmtNum } from "../../components/mkt-ui";
import { platformMeta } from "./platformMeta";

// Lightweight SVG area chart for the follower trend.
function TrendChart({ series }) {
  if (!series || series.length < 2) return <p className="text-sm text-slate-400 py-8 text-center">Not enough data yet.</p>;
  const W = 640, H = 160, pad = 6;
  const ys = series.map((d) => d.followers);
  const min = Math.min(...ys), max = Math.max(...ys);
  const span = max - min || 1;
  const x = (i) => pad + (i * (W - pad * 2)) / (series.length - 1);
  const y = (v) => H - pad - ((v - min) / span) * (H - pad * 2);
  const line = series.map((d, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(d.followers).toFixed(1)}`).join(" ");
  const area = `${line} L ${x(series.length - 1).toFixed(1)} ${H - pad} L ${x(0).toFixed(1)} ${H - pad} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-40" preserveAspectRatio="none">
      <defs>
        <linearGradient id="growthFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(139 92 246)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="rgb(139 92 246)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#growthFill)" />
      <path d={line} fill="none" stroke="rgb(139 92 246)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={x(series.length - 1)} cy={y(series[series.length - 1].followers)} r="3.5" fill="rgb(139 92 246)" />
    </svg>
  );
}

export default function Growth() {
  const toast = useToast();
  const { data, loading, error } = useApi(() => marketing.social.growth(), []);
  const [tags, setTags] = useState(["#EnterpriseSoftware", "#Productivity", "#B2B", "#Automation", "#SmallBusiness"]);
  const [suggesting, setSuggesting] = useState(false);

  const g = data ?? {};
  const suggest = async () => {
    setSuggesting(true);
    try { const r = await marketing.social.hashtags({}); setTags(r.hashtags || []); toast.success("Hashtags refreshed"); }
    catch (e) { toast.error(e.message || "Couldn't suggest"); }
    finally { setSuggesting(false); }
  };

  const metrics = [
    { label: "Total followers", value: fmtNum(g.totalFollowers ?? 0), icon: Users, color: "violet" },
    { label: "Net new (14d)", value: `${(g.netNew ?? 0) >= 0 ? "+" : ""}${fmtNum(g.netNew ?? 0)}`, icon: UserPlus, color: "emerald", delta: g.growthPct != null ? `${g.growthPct >= 0 ? "+" : ""}${g.growthPct}%` : undefined },
    { label: "Engagement rate", value: `${g.engagementRate ?? 0}%`, icon: TrendingUp, color: "sky" },
    { label: "Posts published", value: fmtNum(g.publishedCount ?? 0), icon: Send, color: "amber" },
  ];

  const followerBars = (g.byPlatform ?? []).map((p) => ({ label: platformMeta(p.platform).name, value: p.followers }));

  if (loading && !data) return <SolutionShell solutionId="social"><Loading /></SolutionShell>;

  return (
    <SolutionShell solutionId="social" title="Following Growth" subtitle="Grow following and engagement across every channel.">
      <MetricGrid items={metrics} cols={4} />
      {error && <ErrorNote error={error} />}

      <Section
        title="Follower growth"
        subtitle="Last 14 days"
        actions={g.projected ? <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">projected until history builds</span> : null}
      >
        <TrendChart series={g.series} />
      </Section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Section title="Best times to post" icon={Clock} subtitle={g.bestTimesProjected ? "Suggested — publish more to personalise" : "From your top-performing posts"}>
          <div className="space-y-2">
            {(g.bestTimes ?? []).map((t, i) => (
              <div key={t} className="flex items-center gap-3">
                <span className="h-6 w-6 rounded-md bg-violet-100 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400 text-xs font-semibold flex items-center justify-center">{i + 1}</span>
                <span className="text-sm text-slate-700 dark:text-slate-200">{t}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Followers by platform" icon={Users}>
          {followerBars.length ? <BarList items={followerBars} color="violet" format={fmtNum} /> : <p className="text-sm text-slate-400 py-6 text-center">Connect accounts to see following.</p>}
        </Section>
      </div>

      <Section
        title="Hashtag suggestions"
        icon={Hash}
        subtitle="Boost reach with relevant tags"
        actions={<button onClick={suggest} disabled={suggesting} className="text-xs flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"><Wand2 size={12} /> {suggesting ? "Thinking…" : "Suggest with AI"}</button>}
      >
        <div className="flex flex-wrap gap-2">
          {tags.map((t) => (
            <button key={t} onClick={() => { navigator.clipboard?.writeText(t); toast.success(`Copied ${t}`); }}
              className="text-sm px-3 py-1.5 rounded-full bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-500/20 transition">
              {t}
            </button>
          ))}
        </div>
      </Section>

      {g.topPost && (
        <Section title="Top-performing post" icon={Award}>
          <div className="flex items-start justify-between gap-4">
            <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap line-clamp-3 flex-1">{g.topPost.content}</p>
            <div className="text-right shrink-0">
              <p className="text-lg font-semibold text-slate-900 dark:text-white">{fmtNum(g.topPost.engagements)}</p>
              <p className="text-[11px] text-slate-400">engagements</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-2">
            {(g.topPost.platforms ?? []).map((pl) => { const m = platformMeta(pl); return <m.Icon key={pl} size={14} className={m.color} />; })}
          </div>
        </Section>
      )}
    </SolutionShell>
  );
}
