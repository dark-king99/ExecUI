import { useState } from "react";
import { motion as Motion, useReducedMotion } from "motion/react";
import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody } from "../../components/ui/Card";
import { SkeletonCard } from "../../components/ui/Skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "../../components/ui/avatar";
import { useApi } from "../../hooks/useApi";
import { rewards } from "../../services/api";
import {
  Trophy, Flame, Compass, Wrench, Factory, Crown, Medal, Award,
  ChevronRight, RefreshCw, Sparkles,
} from "lucide-react";

// Category → colour + icon (navigation / usage / performance).
const CATS = {
  navigation:  { label: "Navigation",  icon: Compass, color: "text-indigo-500",  bar: "bg-indigo-500",  soft: "bg-indigo-500/10" },
  usage:       { label: "Workspace",   icon: Wrench,  color: "text-sky-500",     bar: "bg-sky-500",     soft: "bg-sky-500/10" },
  performance: { label: "Performance", icon: Factory, color: "text-emerald-500", bar: "bg-emerald-500", soft: "bg-emerald-500/10" },
};

const RANGES = [
  { id: "all",   label: "All time" },
  { id: "month", label: "This month" },
  { id: "week",  label: "This week" },
];

function initials(name = "") {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";
}

// ── Level progress ring ──────────────────────────────────────────────────────
function LevelRing({ level, progress, size = 92 }) {
  const stroke = 7;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} fill="none" className="stroke-slate-200 dark:stroke-slate-700" />
        <circle
          cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} fill="none" strokeLinecap="round"
          className="stroke-indigo-500" strokeDasharray={c} strokeDashoffset={c * (1 - Math.max(0, Math.min(1, progress)))}
          style={{ transition: "stroke-dashoffset .8s ease" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center leading-none">
          <div className="text-[10px] uppercase tracking-wider text-slate-400">Level</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{level}</div>
        </div>
      </div>
    </div>
  );
}

// ── Sparkline (14-day activity) ──────────────────────────────────────────────
function Sparkline({ series = [] }) {
  const max = Math.max(1, ...series.map((d) => d.points));
  return (
    <div className="flex items-end gap-1 h-12">
      {series.map((d, i) => (
        <div key={d.day} title={`${d.day}: ${d.points} pts`} className="flex-1 flex items-end">
          <div
            className="w-full rounded-sm bg-indigo-500/70 hover:bg-indigo-500 transition-colors"
            style={{ height: `${Math.max(3, (d.points / max) * 100)}%`, opacity: 0.45 + (i / series.length) * 0.55 }}
          />
        </div>
      ))}
    </div>
  );
}

// ── Personal profile hero ────────────────────────────────────────────────────
function ProfileCard({ data, isSelf, loading }) {
  if (loading || !data) return <SkeletonCard />;
  const { user, points, rank, memberCount, level, breakdown, streak, badges, activitySeries } = data;
  const maxCat = Math.max(1, breakdown.navigation, breakdown.usage, breakdown.performance);
  return (
    <Card>
      <CardBody className="space-y-5">
        <div className="flex items-center gap-4">
          <LevelRing level={level.level} progress={level.progress} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Avatar className="h-7 w-7">
                {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.name} />}
                <AvatarFallback className="text-[11px] bg-indigo-500 text-white">{initials(user.name)}</AvatarFallback>
              </Avatar>
              <div className="truncate">
                <p className="font-semibold text-slate-900 dark:text-white truncate">{isSelf ? "You" : user.name}</p>
                <p className="text-xs text-slate-500 truncate">{user.jobTitle || user.department || "Team member"}</p>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-2xl font-bold text-slate-900 dark:text-white">{points.toLocaleString()}</span>
              <span className="text-xs text-slate-500">points</span>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400">
                <Trophy size={12} /> {level.name}
              </span>
            </div>
          </div>
        </div>

        {/* Rank + streak + next level */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 py-2">
            <div className="text-lg font-bold text-slate-900 dark:text-white">#{rank}</div>
            <div className="text-[10px] uppercase tracking-wide text-slate-400">of {memberCount}</div>
          </div>
          <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 py-2">
            <div className="text-lg font-bold text-slate-900 dark:text-white flex items-center justify-center gap-1">
              <Flame size={15} className="text-orange-500" />{streak.current}
            </div>
            <div className="text-[10px] uppercase tracking-wide text-slate-400">day streak</div>
          </div>
          <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 py-2">
            <div className="text-lg font-bold text-slate-900 dark:text-white">{level.next ? level.pointsToNext.toLocaleString() : "—"}</div>
            <div className="text-[10px] uppercase tracking-wide text-slate-400">{level.next ? `to ${level.next.name}` : "max level"}</div>
          </div>
        </div>

        {/* Category breakdown */}
        <div className="space-y-2">
          {Object.entries(CATS).map(([key, cat]) => {
            const val = breakdown[key] || 0;
            const Icon = cat.icon;
            return (
              <div key={key} className="flex items-center gap-2">
                <Icon size={14} className={cat.color} />
                <span className="text-xs text-slate-500 w-24 shrink-0">{cat.label}</span>
                <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div className={`h-full rounded-full ${cat.bar}`} style={{ width: `${(val / maxCat) * 100}%`, transition: "width .8s ease" }} />
                </div>
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300 w-10 text-right">{val}</span>
              </div>
            );
          })}
        </div>

        {/* Activity sparkline */}
        {activitySeries?.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-wide text-slate-400 mb-1.5">Last 14 days</p>
            <Sparkline series={activitySeries} />
          </div>
        )}

        {/* Badges */}
        <div>
          <p className="text-[10px] uppercase tracking-wide text-slate-400 mb-2">Badges</p>
          <div className="flex flex-wrap gap-2">
            {badges.map((b) => (
              <div
                key={b.id}
                title={`${b.name} — ${b.desc}`}
                className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs border transition ${
                  b.earned
                    ? "border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300"
                    : "border-slate-200 dark:border-slate-800 text-slate-300 dark:text-slate-600 grayscale opacity-60"
                }`}
              >
                <span className="text-sm leading-none">{b.icon}</span>
                <span className="font-medium">{b.name}</span>
              </div>
            ))}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

// ── Leaderboard row ──────────────────────────────────────────────────────────
const MEDAL = { 1: "text-amber-400", 2: "text-slate-400", 3: "text-amber-600" };

function Row({ r, active, isMe, onClick, reduce }) {
  return (
    <Motion.button
      layout={!reduce}
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition ${
        active ? "bg-indigo-50 dark:bg-indigo-500/10 ring-1 ring-indigo-200 dark:ring-indigo-500/30" : "hover:bg-slate-50 dark:hover:bg-slate-800/60"
      }`}
    >
      <div className="w-7 shrink-0 text-center">
        {r.rank <= 3 ? (
          <Crown size={18} className={`inline ${MEDAL[r.rank]}`} />
        ) : (
          <span className="text-sm font-semibold text-slate-400">{r.rank}</span>
        )}
      </div>
      <Avatar className="h-8 w-8 shrink-0">
        {r.avatarUrl && <AvatarImage src={r.avatarUrl} alt={r.name} />}
        <AvatarFallback className="text-[11px] bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-200">{initials(r.name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
          {r.name} {isMe && <span className="text-[10px] font-semibold text-indigo-500">· You</span>}
        </p>
        <p className="text-xs text-slate-400 truncate">{r.department || r.levelName}</p>
      </div>
      {r.longestStreak >= 3 && (
        <span className="hidden sm:flex items-center gap-0.5 text-xs text-orange-500"><Flame size={12} />{r.currentStreak}</span>
      )}
      <div className="text-right shrink-0">
        <div className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">{r.points.toLocaleString()}</div>
        <div className="text-[10px] text-slate-400">Lvl {r.level}</div>
      </div>
      <ChevronRight size={14} className="text-slate-300 shrink-0" />
    </Motion.button>
  );
}

function EarnGuide({ config }) {
  if (!config?.earnGuide) return null;
  return (
    <Card>
      <CardBody>
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={15} className="text-indigo-500" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">How to earn</h3>
        </div>
        <ul className="space-y-2.5">
          {config.earnGuide.map((g) => (
            <li key={g.title} className="flex gap-2.5">
              <span className="text-base leading-none mt-0.5">{g.icon}</span>
              <div>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{g.title}</p>
                <p className="text-xs text-slate-500">{g.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}

export default function Rewards() {
  const reduce = useReducedMotion();
  const [range, setRange] = useState("all");
  const [selected, setSelected] = useState(null); // colleague userId, or null = me

  const { data: me } = useApi(() => rewards.me(), [], { cacheKey: "rewards:me" });
  const { data: board, loading: boardLoading, error, refetch } = useApi(() => rewards.leaderboard(range), [range], { cacheKey: `rewards:board:${range}` });
  const { data: config } = useApi(() => rewards.config(), [], { cacheKey: "rewards:config" });
  const { data: colleague, loading: colleagueLoading } = useApi(
    () => (selected ? rewards.user(selected) : Promise.resolve(null)), [selected], { immediate: !!selected });

  const myId = me?.user?.id;
  const viewing = selected && selected !== myId ? colleague : me;
  const viewingSelf = !selected || selected === myId;

  return (
    <div>
      <PageHeader
        title="Rewards"
        subtitle="Recognition for how the team explores, uses, and performs across the platform — visible to everyone."
        actions={
          <button onClick={refetch} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1.5">
            <RefreshCw size={13} /> Refresh
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: profile + how-to-earn */}
        <div className="space-y-5 lg:col-span-1">
          <ProfileCard data={viewing} isSelf={viewingSelf} loading={selected ? colleagueLoading : !me} />
          {selected && selected !== myId && (
            <button onClick={() => setSelected(null)} className="text-xs text-indigo-500 hover:underline">← Back to my rewards</button>
          )}
          <EarnGuide config={config} />
        </div>

        {/* Right: leaderboard */}
        <div className="lg:col-span-2">
          <Card>
            <CardBody>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Medal size={16} className="text-amber-500" />
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Leaderboard</h3>
                  {board && <span className="text-xs text-slate-400">· {board.memberCount} members</span>}
                </div>
                <div className="flex rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5">
                  {RANGES.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setRange(r.id)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md transition ${
                        range === r.id ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="flex items-center justify-between rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 mb-3">
                  <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                  <button onClick={refetch} className="text-xs text-red-600 dark:text-red-400 hover:underline flex items-center gap-1"><RefreshCw size={12} /> Retry</button>
                </div>
              )}

              {boardLoading && !board ? (
                <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-14 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />)}</div>
              ) : board?.leaderboard?.length ? (
                <Motion.div layout={!reduce} className="space-y-1">
                  {board.leaderboard.map((r) => (
                    <Row key={r.userId} r={r} reduce={reduce}
                      isMe={r.userId === myId}
                      active={selected ? r.userId === selected : r.userId === myId}
                      onClick={() => setSelected(r.userId)} />
                  ))}
                </Motion.div>
              ) : (
                <div className="text-center py-12 text-sm text-slate-400">
                  <Award size={28} className="mx-auto mb-2 opacity-40" />
                  No activity yet — start exploring and getting work done to earn points.
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
