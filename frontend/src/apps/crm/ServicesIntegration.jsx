import React from "react";
import {
  Mail,
  MessageSquare,
  Share2,
  Megaphone,
  Calendar,
  Plug,
  Database,
  Activity,
  RefreshCw,
  Settings,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from "lucide-react";

/**
 * ServiceIntegration.jsx
 * Enterprise CRM → Integrations Command Center (UI Skeleton)
 * - Overview of connected services
 * - Unified interaction stream placeholder
 * - Lead ingestion sources
 * - CRM ↔ Marketing sync health
 * - Admin controls & audit
 */

function StatusPill({ status }) {
  const map = {
    healthy: { icon: CheckCircle2, cls: "bg-emerald-100 text-emerald-700" },
    warning: { icon: AlertTriangle, cls: "bg-amber-100 text-amber-700" },
    down: { icon: XCircle, cls: "bg-rose-100 text-rose-700" },
    syncing: { icon: RefreshCw, cls: "bg-sky-100 text-sky-700" },
  };
  const { icon: Icon, cls } = map[status] || map.healthy;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${cls}`}>
      <Icon className="h-3.5 w-3.5" />
      {status}
    </span>
  );
}

function Section({ title, right, children }) {
  return (
    <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

import {
    Phone,
    UserPlus,
  } from "lucide-react";
  
  const CHANNEL_META = {
    email: { label: "Email", icon: Mail, cls: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300" },
    call: { label: "Call", icon: Phone, cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
    chat: { label: "Chat", icon: MessageSquare, cls: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300" },
    social: { label: "Social", icon: Share2, cls: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/40 dark:text-fuchsia-300" },
    meeting: { label: "Meeting", icon: Calendar, cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
    campaign: { label: "Campaign", icon: Megaphone, cls: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300" },
    lead: { label: "Lead", icon: UserPlus, cls: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300" },
  };
  
  const TIMELINE = [
    {
      id: 1,
      ts: "2026-02-22 09:14",
      channel: "email",
      title: "Re: Q2 Pricing Proposal",
      who: "Alice Johnson",
      summary: "Customer asked for volume discount tiers and contract length options.",
      status: "ok",
    },
    {
      id: 2,
      ts: "2026-02-22 08:47",
      channel: "meeting",
      title: "Quarterly Review Scheduled",
      who: "Bob Smith",
      summary: "30-min review booked via Google Calendar. Agenda auto-attached.",
      status: "ok",
    },
    {
      id: 3,
      ts: "2026-02-22 08:02",
      channel: "campaign",
      title: "Spring Promo Touchpoint",
      who: "Segment: SMB Tech",
      summary: "Email + social touch executed. 18% open rate in first hour.",
      status: "ok",
    },
    {
      id: 4,
      ts: "2026-02-21 17:31",
      channel: "call",
      title: "Support Escalation",
      who: "Charlie Davis",
      summary: "Reported intermittent API errors. Ticket linked and routed to L2.",
      status: "warn",
    },
    {
      id: 5,
      ts: "2026-02-21 16:10",
      channel: "lead",
      title: "New Lead Ingested",
      who: "Website Form",
      summary: "Lead scored 78/100 and routed to Enterprise SDR queue.",
      status: "ok",
    },
    {
      id: 6,
      ts: "2026-02-21 15:22",
      channel: "social",
      title: "LinkedIn DM Reply",
      who: "Dana Patel",
      summary: "Asked for case study and security whitepaper.",
      status: "ok",
    },
  ];
  
  function ChannelBadge({ channel }) {
    const meta = CHANNEL_META[channel] || CHANNEL_META.email;
    const Icon = meta.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${meta.cls}`}>
        <Icon className="h-3.5 w-3.5" />
        {meta.label}
      </span>
    );
  }
  
  function StatusDot({ status }) {
    if (status === "warn") {
      return (
        <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 text-xs">
          <AlertTriangle className="h-3.5 w-3.5" /> Attention
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs">
        <CheckCircle2 className="h-3.5 w-3.5" /> OK
      </span>
    );
  }

export default function ServiceIntegration() {
  const integrations = [
    { id: "email", name: "Email", icon: Mail, status: "healthy", desc: "Gmail, Outlook, SMTP" },
    { id: "msg", name: "Messaging", icon: MessageSquare, status: "healthy", desc: "SMS, WhatsApp, Chat" },
    { id: "social", name: "Social", icon: Share2, status: "warning", desc: "LinkedIn, X, Facebook" },
    { id: "calendar", name: "Calendar", icon: Calendar, status: "healthy", desc: "Google, Microsoft" },
    { id: "leads", name: "Lead Sources", icon: Database, status: "syncing", desc: "Forms, Ads, Imports" },
    { id: "api", name: "API & Webhooks", icon: Plug, status: "healthy", desc: "Partners, Custom Feeds" },
  ];

  const leadSources = [
    { name: "Website Forms", status: "healthy", today: 42 },
    { name: "Ad Platforms", status: "warning", today: 18 },
    { name: "CSV Imports", status: "healthy", today: 7 },
    { name: "Partner Feeds", status: "down", today: 0 },
    { name: "Public API", status: "healthy", today: 23 },
  ];

  return (
    <div className="space-y-6">
      {/* Header / Command Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            Service Integration
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Unified communication, history, lead ingestion, and marketing sync
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusPill status="healthy" />
          <button className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm">
            <RefreshCw className="h-4 w-4" />
            Sync Now
          </button>
          <button className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm">
            <Settings className="h-4 w-4" />
            Manage Integrations
          </button>
        </div>
      </div>

      {/* Integrations Overview */}
      <Section title="Connected Services">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {integrations.map((i) => {
            const Icon = i.icon;
            return (
              <div
                key={i.id}
                className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-slate-100">{i.name}</p>
                      <p className="text-xs text-slate-500">{i.desc}</p>
                    </div>
                  </div>
                  <StatusPill status={i.status} />
                </div>
                <div className="flex gap-2">
                  <button className="text-xs px-2 py-1 rounded border border-slate-200 dark:border-slate-800">
                    Configure
                  </button>
                  <button className="text-xs px-2 py-1 rounded border border-slate-200 dark:border-slate-800">
                    View Logs
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      <Section
  title="Unified Interaction Stream"
  right={
    <div className="flex items-center gap-2">
      <input
        type="text"
        placeholder="Search people, keywords, campaigns…"
        className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      <select className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <option value="">All channels</option>
        <option value="email">Email</option>
        <option value="call">Calls</option>
        <option value="chat">Chat</option>
        <option value="social">Social</option>
        <option value="meeting">Meetings</option>
        <option value="campaign">Campaigns</option>
        <option value="lead">Leads</option>
      </select>
    </div>
  }
>
  <div className="divide-y divide-slate-200 dark:divide-slate-800">
    {TIMELINE.map((item) => (
      <div
        key={item.id}
        className="py-4 flex gap-4 hover:bg-slate-50 dark:hover:bg-slate-950/50 transition"
      >
        {/* Left rail */}
        <div className="flex flex-col items-center">
          <div className="w-2 h-2 rounded-full bg-indigo-500 mt-2" />
          <div className="flex-1 w-px bg-slate-200 dark:bg-slate-800" />
        </div>

        {/* Main card */}
        <div className="flex-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <ChannelBadge channel={item.channel} />
              <span className="text-xs text-slate-500">{item.ts}</span>
            </div>
            <StatusDot status={item.status} />
          </div>

          <div className="flex flex-col gap-1">
            <p className="font-medium text-slate-900 dark:text-slate-100">
              {item.title}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              <strong>{item.who}</strong> — {item.summary}
            </p>
          </div>

          <div className="mt-3 flex gap-2">
            <button className="text-xs px-2 py-1 rounded border border-slate-200 dark:border-slate-800">
              Open
            </button>
            <button className="text-xs px-2 py-1 rounded border border-slate-200 dark:border-slate-800">
              Link to Record
            </button>
            <button className="text-xs px-2 py-1 rounded border border-slate-200 dark:border-slate-800">
              View Context
            </button>
          </div>
        </div>
      </div>
    ))}
  </div>
</Section>


      {/* Lead Ingestion */}
      <Section title="Lead Generation & Ingestion">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {leadSources.map((s) => (
            <div
              key={s.name}
              className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4"
            >
              <div className="flex items-center justify-between">
                <p className="font-medium text-slate-900 dark:text-slate-100">{s.name}</p>
                <StatusPill status={s.status} />
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                Leads today: <strong>{s.today}</strong>
              </p>
              <button className="mt-3 text-xs px-2 py-1 rounded border border-slate-200 dark:border-slate-800">
                Configure Source
              </button>
            </div>
          ))}
        </div>
      </Section>

      {/* CRM ↔ Marketing Sync Health */}
      <Section title="CRM ↔ Marketing Sync Health">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {[
            { label: "Contacts Synced", value: "12,430" },
            { label: "Segments", value: "24" },
            { label: "Audiences In Sync", value: "Yes" },
            { label: "Last Sync", value: "2 min ago" },
          ].map((kpi) => (
            <div
              key={kpi.label}
              className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4"
            >
              <p className="text-xs text-slate-500">{kpi.label}</p>
              <p className="text-xl font-semibold text-slate-900 dark:text-slate-100">{kpi.value}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <button className="text-xs px-2 py-1 rounded border border-slate-200 dark:border-slate-800">
            View Sync Logs
          </button>
          <button className="text-xs px-2 py-1 rounded border border-slate-200 dark:border-slate-800">
            Force Resync
          </button>
          <button className="text-xs px-2 py-1 rounded border border-slate-200 dark:border-slate-800">
            Field Mapping
          </button>
        </div>
      </Section>

      {/* Enterprise Controls / Audit */}
      <Section title="Enterprise Controls & Audit">
        <div className="rounded-lg border border-dashed border-slate-300 dark:border-slate-700 p-6 text-center text-sm text-slate-500">
          Admin controls placeholder: routing rules, permissions, audit log, change history.
        </div>
      </Section>
    </div>
  );
}