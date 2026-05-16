import {
  Mail, MessageSquare, Share2, Megaphone, Calendar, Plug, Database, Activity,
  RefreshCw, Settings, AlertTriangle, CheckCircle2, XCircle, Phone, UserPlus, AlertCircle, Loader2,
} from "lucide-react";
import { useApi, useMutation } from "../../hooks/useApi";
import { crm } from "../../services/api";
import { useToast } from "../../components/ui/Toast";
import PageHeader from "../../components/ui/PageHeader";

const STATUS_MAP = {
  healthy: { icon: CheckCircle2, cls: "bg-emerald-100 text-emerald-700" },
  warning: { icon: AlertTriangle, cls: "bg-amber-100 text-amber-700" },
  down:    { icon: XCircle,       cls: "bg-rose-100 text-rose-700" },
  syncing: { icon: RefreshCw,     cls: "bg-sky-100 text-sky-700" },
};

const CHANNEL_META = {
  email:    { label: "Email",    icon: Mail,         cls: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300" },
  call:     { label: "Call",     icon: Phone,        cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
  chat:     { label: "Chat",     icon: MessageSquare,cls: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300" },
  social:   { label: "Social",   icon: Share2,       cls: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/40 dark:text-fuchsia-300" },
  meeting:  { label: "Meeting",  icon: Calendar,     cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
  campaign: { label: "Campaign", icon: Megaphone,    cls: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300" },
  lead:     { label: "Lead",     icon: UserPlus,     cls: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300" },
};

const ICON_MAP = { Mail, MessageSquare, Share2, Calendar, Database, Plug, Activity };

function StatusPill({ status }) {
  const { icon: Icon, cls } = STATUS_MAP[status] ?? STATUS_MAP.healthy;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${cls}`}>
      <Icon className="h-3.5 w-3.5" /> {status}
    </span>
  );
}

function ChannelBadge({ channel }) {
  const meta = CHANNEL_META[channel] ?? CHANNEL_META.email;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${meta.cls}`}>
      <Icon className="h-3.5 w-3.5" /> {meta.label}
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

export default function ServiceIntegration() {
  const toast = useToast();

  const { data: integrations, loading: intLoading, error: intError } = useApi(
    () => crm.integrations.list(), [], { pollingInterval: 60000 }
  );
  const { data: timeline, loading: tlLoading } = useApi(
    () => crm.integrations.timeline({ limit: 20 }), [], { pollingInterval: 30000 }
  );
  const { data: leadSources, loading: lsLoading } = useApi(
    () => crm.integrations.leadSources(), [], { pollingInterval: 30000 }
  );
  const { data: syncHealth, loading: syncLoading } = useApi(
    () => crm.integrations.syncHealth(), [], { pollingInterval: 30000 }
  );

  const { mutate: syncNow, loading: syncing } = useMutation(
    () => crm.integrations.sync(),
    {
      onSuccess: () => toast({ message: "Sync initiated", type: "success" }),
      onError: (err) => toast({ message: err?.message ?? "Sync failed", type: "error" }),
    }
  );

  const allIntegrations = integrations ?? [];
  const allTimeline = timeline ?? [];
  const allLeadSources = leadSources ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Service Integration"
        subtitle="Unified communication, interaction history, lead ingestion, and marketing sync."
        actions={
          <div className="flex items-center gap-2">
            <StatusPill status="healthy" />
            <button
              onClick={() => syncNow()}
              disabled={syncing}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition disabled:opacity-60"
            >
              {syncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Sync Now
            </button>
          </div>
        }
      />

      <Section title="Connected Services">
        {intError && (
          <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 mb-3">
            <AlertCircle size={15} /> {intError}
          </div>
        )}
        {intLoading && allIntegrations.length === 0 && (
          <div className="grid grid-cols-3 gap-3 animate-pulse">
            {[1,2,3,4,5,6].map(i => <div key={i} className="h-20 bg-slate-100 dark:bg-slate-700 rounded-lg" />)}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {allIntegrations.map(item => {
            const Icon = ICON_MAP[item.icon] ?? Plug;
            return (
              <div key={item.id} className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-slate-100">{item.name}</p>
                      <p className="text-xs text-slate-500">{item.desc ?? item.description}</p>
                    </div>
                  </div>
                  <StatusPill status={item.status} />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => toast({ message: `${item.name} configuration opened.`, type: "info" })} className="text-xs px-2 py-1 rounded border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition">Configure</button>
                  <button onClick={() => toast({ message: `Viewing logs for ${item.name}.`, type: "info" })} className="text-xs px-2 py-1 rounded border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition">View Logs</button>
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="Unified Interaction Stream">
        {tlLoading && allTimeline.length === 0 && (
          <div className="space-y-3 animate-pulse">
            {[1,2,3].map(i => <div key={i} className="h-20 bg-slate-100 dark:bg-slate-700 rounded-lg" />)}
          </div>
        )}
        {!tlLoading && allTimeline.length === 0 && (
          <p className="text-sm text-slate-500 text-center py-4">No interaction data available.</p>
        )}
        <div className="divide-y divide-slate-200 dark:divide-slate-800">
          {allTimeline.map((item, i) => (
            <div key={item.id ?? i} className="py-4 flex gap-4 hover:bg-slate-50 dark:hover:bg-slate-950/50 transition">
              <div className="flex flex-col items-center">
                <div className="w-2 h-2 rounded-full bg-indigo-500 mt-2" />
                <div className="flex-1 w-px bg-slate-200 dark:bg-slate-800" />
              </div>
              <div className="flex-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <ChannelBadge channel={item.channel} />
                    <span className="text-xs text-slate-500">{item.ts ?? item.timestamp}</span>
                  </div>
                  {item.status === "warn" ? (
                    <span className="inline-flex items-center gap-1 text-amber-600 text-xs"><AlertTriangle className="h-3.5 w-3.5" /> Attention</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-emerald-600 text-xs"><CheckCircle2 className="h-3.5 w-3.5" /> OK</span>
                  )}
                </div>
                <p className="font-medium text-slate-900 dark:text-slate-100">{item.title}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400"><strong>{item.who}</strong> — {item.summary}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Lead Generation & Ingestion">
        {lsLoading && allLeadSources.length === 0 && (
          <div className="grid grid-cols-3 gap-3 animate-pulse">
            {[1,2,3].map(i => <div key={i} className="h-20 bg-slate-100 dark:bg-slate-700 rounded-lg" />)}
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {allLeadSources.map(s => (
            <div key={s.name} className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4">
              <div className="flex items-center justify-between">
                <p className="font-medium text-slate-900 dark:text-slate-100">{s.name}</p>
                <StatusPill status={s.status} />
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">Leads today: <strong>{s.today ?? "—"}</strong></p>
              <button className="mt-3 text-xs px-2 py-1 rounded border border-slate-200 dark:border-slate-800">Configure Source</button>
            </div>
          ))}
        </div>
      </Section>

      <Section title="CRM ↔ Marketing Sync Health">
        {syncLoading ? (
          <div className="grid grid-cols-4 gap-3 animate-pulse">
            {[1,2,3,4].map(i => <div key={i} className="h-16 bg-slate-100 dark:bg-slate-700 rounded-lg" />)}
          </div>
        ) : syncHealth ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {Object.entries(syncHealth).map(([label, value]) => (
              <div key={label} className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4">
                <p className="text-xs text-slate-500">{label}</p>
                <p className="text-xl font-semibold text-slate-900 dark:text-slate-100">{String(value)}</p>
              </div>
            ))}
          </div>
        ) : null}
        <div className="mt-3 flex gap-2">
          <button className="text-xs px-2 py-1 rounded border border-slate-200 dark:border-slate-800">View Sync Logs</button>
          <button onClick={() => syncNow()} disabled={syncing} className="text-xs px-2 py-1 rounded border border-slate-200 dark:border-slate-800 disabled:opacity-60">Force Resync</button>
          <button className="text-xs px-2 py-1 rounded border border-slate-200 dark:border-slate-800">Field Mapping</button>
        </div>
      </Section>
    </div>
  );
}
