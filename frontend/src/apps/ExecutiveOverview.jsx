import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users, Megaphone, Network, BarChart3, Layers, ArrowRight, ArrowUpRight,
  Activity, CalendarClock, ListChecks, MessagesSquare, Send, Lock, ShieldCheck, Clock, Mail, Check,
} from "lucide-react";
import { useApi, useMutation } from "../hooks/useApi";
import { overview } from "../services/api";
import { Avatar, AvatarImage, AvatarFallback } from "../components/ui/avatar";
import { SOLUTIONS as MKT } from "./marketing/solutions.config";
import { SOLUTIONS as CRM } from "./crm/solutions.config";
import { SOLUTIONS as NET } from "./network/solutions.config";
import { SOLUTIONS as ANA } from "./analytics/solutions.config";

// ── helpers ────────────────────────────────────────────────────────────────
const compact = (n) => {
  if (typeof n !== "number") return n ?? "—";
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, "") + "K";
  return n.toLocaleString();
};
const fmt = (v, unit) => (v == null ? "—" : unit === "$" ? "$" + compact(v) : unit === "%" ? v + "%" : compact(v));
const initials = (n) => (n || "").split(" ").filter(Boolean).slice(0, 2).map((s) => s[0]).join("").toUpperCase() || "?";
const partOfDay = () => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; };
const timeAgo = (t) => {
  if (!t) return "";
  const s = Math.floor((Date.now() - new Date(t)) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};
const whenLabel = (t) => (t ? new Date(t).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "");

// Animate a number from 0 to target on mount (respects reduced-motion).
function useCountUp(target, duration = 900) {
  const [val, setVal] = useState(0);
  const ref = useRef(0);
  useEffect(() => {
    const end = Number(target) || 0;
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { setVal(end); return; }
    let raf, start;
    const step = (t) => {
      if (!start) start = t;
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(end * eased);
      ref.current = end * eased;
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

const solEntries = (sols) => sols.map((s) => ({ name: s.name, path: s.pages?.[0]?.path ?? s.basePath }));
const SERVICES_SOLS = [
  { name: "Financial Management", path: "/services/financial" },
  { name: "Operations System",    path: "/services/operation" },
  { name: "Strategic Planning",   path: "/services/strategic" },
  { name: "Marketing & Sales",    path: "/services/marketing" },
  { name: "Team & Project",       path: "/services/team" },
];

const ACCENT = {
  orange:  "bg-orange-500",  violet: "bg-violet-500", emerald: "bg-emerald-600",
  sky:     "bg-sky-500",     indigo: "bg-indigo-500",
};
const GAUGE_STROKE = { orange: "#f97316", violet: "#8b5cf6", emerald: "#10b981", sky: "#0ea5e9", indigo: "#6366f1" };

const SERVICE_META = {
  crm:       { name: "CRM · Sales Cloud",  icon: Users,     accent: "orange",  path: "/crm",       sols: solEntries(CRM), metric: (m) => ({ label: "Open Deals",       value: m.crm?.openDeals ?? 0 }) },
  marketing: { name: "Marketing Cloud",    icon: Megaphone, accent: "violet",  path: "/marketing", sols: solEntries(MKT), metric: (m) => ({ label: "Active Campaigns", value: m.marketing?.activeCampaigns ?? 0 }) },
  network:   { name: "Network Operations", icon: Network,   accent: "emerald", path: "/network",   sols: solEntries(NET), metric: (m) => ({ label: "Uptime",          value: (m.network?.uptimePct ?? 0) + "%" }) },
  services:  { name: "Business Services",  icon: Layers,    accent: "sky",     path: "/services",  sols: SERVICES_SOLS,   metric: (m) => ({ label: "Active Projects",  value: m.services?.activeProjects ?? 0 }) },
  analytics: { name: "Analytics",          icon: BarChart3, accent: "indigo",  path: "/analytics", sols: solEntries(ANA), metric: (m, a) => ({ label: "Data Slices",  value: a?.slices?.length ?? 0 }) },
};
const SERVICE_ORDER = ["crm", "marketing", "network", "services", "analytics"];

// ── 270° gauge ───────────────────────────────────────────────────────────────
function Gauge({ value, label, status, color }) {
  const v = Math.max(0, Math.min(100, value ?? 0));
  const animated = useCountUp(v, 1000);
  const R = 80, C = 2 * Math.PI * R, ARC = 0.75; // 270°
  const track = C * ARC;
  const prog = track * (animated / 100);
  return (
    <div className="relative flex flex-col items-center">
      <svg viewBox="0 0 200 200" className="h-52 w-52">
        <g transform="rotate(135 100 100)">
          <circle cx="100" cy="100" r={R} fill="none" stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeWidth="14" strokeLinecap="round" strokeDasharray={`${track} ${C}`} />
          <circle cx="100" cy="100" r={R} fill="none" stroke={color} strokeWidth="14" strokeLinecap="round" strokeDasharray={`${prog} ${C}`} />
        </g>
        <text x="100" y="96" textAnchor="middle" className="fill-slate-900 dark:fill-white" style={{ fontSize: 46, fontWeight: 700 }}>{value == null ? "—" : Math.round(animated)}</text>
        <text x="100" y="120" textAnchor="middle" className="fill-slate-400" style={{ fontSize: 11, letterSpacing: 1 }}>{status?.toUpperCase()}</text>
      </svg>
      <p className="-mt-3 text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}

function KpiCard({ kpi, delay, onOpen }) {
  const numeric = typeof kpi.value === "number";
  const animated = useCountUp(numeric ? kpi.value : 0, 900);
  const display = numeric ? fmt(Math.round(animated), kpi.unit) : fmt(kpi.value, kpi.unit);
  const clickable = !!kpi.link;
  return (
    <button
      type="button"
      disabled={!clickable}
      onClick={() => clickable && onOpen(kpi.link)}
      style={{ animationDelay: `${delay}ms` }}
      className={`group animate-slide-up relative flex flex-col justify-center rounded-2xl border border-slate-200 bg-white p-4 text-left transition dark:border-slate-800 dark:bg-slate-900/50 ${
        clickable ? "cursor-pointer hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md dark:hover:border-indigo-700" : ""
      }`}
    >
      {clickable && (
        <ArrowUpRight size={13} className="absolute right-3 top-3 text-slate-300 opacity-0 transition group-hover:opacity-100 dark:text-slate-600" />
      )}
      <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{display}</p>
      <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-400">{kpi.label}</p>
    </button>
  );
}

function Panel({ title, icon: Icon, children, action, delay = 0 }) {
  return (
    <div
      style={{ animationDelay: `${delay}ms` }}
      className="animate-fade-in flex flex-col rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/50"
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
          {Icon && <Icon size={15} className="text-indigo-500" />}
          {title}
        </h3>
        {action}
      </div>
      {children}
    </div>
  );
}

const TASK_COLS = [
  { key: "todo", label: "To Do", dot: "bg-slate-400" },
  { key: "in_progress", label: "In Progress", dot: "bg-amber-500" },
  { key: "review", label: "Review", dot: "bg-violet-500" },
  { key: "done", label: "Done", dot: "bg-emerald-500" },
];

export default function ExecutiveOverview() {
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useApi(() => overview.dashboard(), [], { cacheKey: "overview:dashboard" });
  const { data: deptLabels } = useApi(() => overview.departments(), [], { cacheKey: "overview:departments" });
  const [draft, setDraft] = useState("");
  const [toDept, setToDept] = useState("all");

  const { mutate: sendMessage, loading: sending } = useMutation((d) => overview.sendMessage(d), {
    onSuccess: () => { setDraft(""); refetch(); },
  });

  // "Email me this report" — sends the KPI snapshot via Resend.
  const [reportState, setReportState] = useState("idle"); // idle | sending | sent | error
  const emailReport = async () => {
    setReportState("sending");
    try {
      const r = await overview.emailReport();
      setReportState(r?.skipped ? "sent" : "sent");
      setTimeout(() => setReportState("idle"), 4000);
    } catch {
      setReportState("error");
      setTimeout(() => setReportState("idle"), 4000);
    }
  };

  if (loading && !data) {
    return (
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="h-24 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800/50" />
        <div className="grid gap-5 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-48 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800/50" />)}
        </div>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900/50">
          <Activity size={28} className="text-slate-300 dark:text-slate-600" />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Couldn't load your overview</p>
          <p className="max-w-md text-xs text-slate-400">{error || "Something went wrong while loading your dashboard."}</p>
          <button onClick={() => refetch()} className="mt-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { identity, access, gauge, kpis, metrics, activity, schedule, tasks, messages } = data;
  // Department Communication here is for enterprise admins only; the channel
  // itself remains available to every employee in Account → Messaging.
  const isAdmin = ["enterprise_admin", "system_admin"].includes(identity.role);
  const accent = identity.deptKey === "sales" ? "orange" : identity.deptKey === "marketing" ? "violet"
    : identity.deptKey === "it" ? "emerald" : identity.deptKey === "finance" ? "sky"
    : identity.deptKey === "operations" ? "indigo" : "indigo";
  const services = SERVICE_ORDER.filter((s) => access.sections.includes(s));

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      {/* ── Header: greeting + identity ─────────────────────────────────── */}
      <div className="animate-slide-up relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/50 sm:flex-row sm:items-center sm:justify-between">
        {/* Animated color-mesh wash — subtle, welcoming, pure CSS. */}
        <div aria-hidden className="mesh-hue pointer-events-none absolute inset-0 overflow-hidden opacity-60">
          <div className="mesh-blob mesh-1 left-[-10%] top-[-40%] h-[160%] w-[30%] bg-indigo-500/25" />
          <div className="mesh-blob mesh-2 right-[-6%] top-[-30%] h-[150%] w-[28%] bg-fuchsia-500/20" />
          <div className="mesh-blob mesh-3 left-[40%] top-[10%] h-[140%] w-[30%] bg-sky-400/20" />
        </div>
        <div className="relative flex items-center gap-4">
          <Avatar className="h-14 w-14 border-2 border-indigo-500/30">
            <AvatarImage src={identity.avatarUrl} alt={identity.name} />
            <AvatarFallback className="bg-indigo-100 text-lg font-semibold text-indigo-600 dark:bg-indigo-500/15">{initials(identity.name)}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-white">{partOfDay()}, {identity.firstName || identity.name}</h1>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              <span className="capitalize">{(identity.role || "").replace(/_/g, " ")}</span>
              {identity.department && <> · {identity.department} dept</>}
              {identity.employeeId && <> · {identity.employeeId}</>}
            </p>
          </div>
        </div>
        <div className="relative flex items-center gap-2">
          <button
            onClick={emailReport}
            disabled={reportState === "sending"}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-60 dark:border-slate-700 dark:text-slate-400 dark:hover:text-indigo-400"
          >
            {reportState === "sent" ? <Check size={13} className="text-emerald-500" /> : <Mail size={13} />}
            {reportState === "sending" ? "Sending…" : reportState === "sent" ? "Report sent" : reportState === "error" ? "Failed — retry" : "Email report"}
          </button>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
            {access.privileged ? <ShieldCheck size={13} /> : <Lock size={13} />}
            {access.privileged ? "Full access" : `${identity.department} scope`}
          </span>
        </div>
      </div>

      {/* ── Gauge + KPI band ────────────────────────────────────────────── */}
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="animate-slide-up flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/50" style={{ animationDelay: "60ms" }}>
          <Gauge value={gauge.value} label={gauge.label} status={gauge.status} color={GAUGE_STROKE[accent]} />
        </div>

        <div className="lg:col-span-2">
          <div className="grid h-full grid-cols-2 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {kpis.map((k, i) => (
              <KpiCard key={k.key} kpi={k} delay={i * 70} onOpen={navigate} />
            ))}
          </div>
        </div>
      </div>

      {/* ── Core service cards (department-scoped) ───────────────────────── */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">Your core services</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {services.map((key, i) => {
            const meta = SERVICE_META[key];
            const { label, value } = meta.metric(metrics, access);
            const Icon = meta.icon;
            return (
              <div key={key} style={{ animationDelay: `${i * 80}ms` }} className={`animate-slide-up flex flex-col overflow-hidden rounded-2xl ${ACCENT[meta.accent]} text-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg`}>
                <button onClick={() => navigate(meta.path)} className="group p-5 text-left transition hover:bg-black/10">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-3xl font-bold leading-none">{value}</p>
                      <p className="mt-1.5 text-sm font-medium opacity-90">{label}</p>
                    </div>
                    <Icon size={26} className="opacity-80" />
                  </div>
                  <p className="mt-3 flex items-center gap-1 text-sm font-semibold">
                    {meta.name}
                    <ArrowUpRight size={14} className="transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </p>
                </button>
                <div className="mt-auto flex flex-wrap gap-1.5 border-t border-white/15 bg-black/10 px-4 py-3">
                  {meta.sols.slice(0, 4).map((s) => (
                    <button key={s.path} onClick={() => navigate(s.path)} className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-medium transition hover:bg-white/25">
                      {s.name}
                    </button>
                  ))}
                  {meta.sols.length > 4 && <span className="px-1 py-1 text-[11px] opacity-80">+{meta.sols.length - 4}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Activity / Schedule / Tasks ─────────────────────────────────── */}
      <div className="grid gap-5 lg:grid-cols-3">
        <Panel title="Recent Activity" icon={Activity} delay={60}>
          {activity.length === 0 ? (
            <Empty text="No recent activity" />
          ) : (
            <ul className="space-y-3">
              {activity.map((a) => (
                <li key={a.id} className="flex items-start gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-slate-700 dark:text-slate-200">
                      <span className="font-medium">{a.user}</span> · {a.action?.replace(/[._]/g, " ")}
                    </p>
                    {a.detail && <p className="truncate text-xs text-slate-400">{a.detail}</p>}
                  </div>
                  <span className="shrink-0 text-[11px] text-slate-400">{timeAgo(a.time)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Upcoming & Meetings" icon={CalendarClock} delay={140}>
          {schedule.length === 0 ? (
            <Empty text="Nothing scheduled" />
          ) : (
            <ul className="space-y-3">
              {schedule.map((s) => (
                <li key={s.id} className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    <Clock size={15} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">{s.title}</p>
                    <p className="text-xs capitalize text-slate-400">{s.type}</p>
                  </div>
                  <span className="shrink-0 text-[11px] text-slate-400">{whenLabel(s.when)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Task Workflow" icon={ListChecks} action={<span className="text-xs text-slate-400">{tasks.items.length} recent</span>} delay={220}>
          <div className="mb-3 grid grid-cols-4 gap-2">
            {TASK_COLS.map((c) => (
              <div key={c.key} className="rounded-lg bg-slate-50 p-2 text-center dark:bg-slate-800/50">
                <p className="text-lg font-bold text-slate-900 dark:text-white">{tasks.byStatus[c.key] ?? 0}</p>
                <p className="flex items-center justify-center gap-1 text-[10px] text-slate-400"><span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />{c.label}</p>
              </div>
            ))}
          </div>
          {tasks.items.length === 0 ? (
            <Empty text="No tasks yet" />
          ) : (
            <ul className="space-y-2">
              {tasks.items.slice(0, 4).map((t) => (
                <li key={t.id} className="flex items-center gap-2 text-sm">
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${TASK_COLS.find((c) => c.key === t.status)?.dot ?? "bg-slate-400"}`} />
                  <span className="min-w-0 flex-1 truncate text-slate-700 dark:text-slate-200">{t.title}</span>
                  {t.priority && <span className="shrink-0 text-[10px] uppercase text-slate-400">{t.priority}</span>}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {/* ── Inter-department communication (enterprise admins only) ──────── */}
      {isAdmin && (
      <Panel title="Department Communication" icon={MessagesSquare}
        action={<button onClick={() => navigate("/account/messaging?c=dept")} className="text-xs font-medium text-indigo-500 hover:underline">Open in Messaging →</button>}>
        <form
          onSubmit={(e) => { e.preventDefault(); if (draft.trim()) sendMessage({ body: draft, toDept }); }}
          className="mb-4 flex flex-col gap-2 sm:flex-row"
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={`Message from ${identity.department}…`}
            className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
          <select
            value={toDept}
            onChange={(e) => setToDept(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="all">Everyone</option>
            {Object.entries(deptLabels || {}).filter(([k]) => k !== "general").map(([k, label]) => (
              <option key={k} value={k}>{label}</option>
            ))}
          </select>
          <button type="submit" disabled={sending || !draft.trim()} className="flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50">
            <Send size={14} /> Send
          </button>
        </form>
        {messages.length === 0 ? (
          <Empty text="No messages yet — start the conversation" />
        ) : (
          <ul className="space-y-3">
            {messages.map((msg) => (
              <li key={msg.id} className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{initials(msg.authorName)}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-700 dark:text-slate-200">{msg.body}</p>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    <span className="font-medium">{msg.authorName}</span>
                    <span className="capitalize"> · {msg.fromDept}</span> → {msg.toDept ? <span className="capitalize">{msg.toDept}</span> : "Everyone"} · {timeAgo(msg.time)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      )}
    </div>
  );
}

function Empty({ text }) {
  return <p className="py-6 text-center text-sm text-slate-400">{text}</p>;
}
