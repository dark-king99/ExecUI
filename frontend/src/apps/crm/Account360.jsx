import { useMemo, useState } from "react";
import {
  Building2, Users, DollarSign, TrendingUp, AlertTriangle, CheckCircle2,
  Mail, Phone, Calendar, FileText, Activity, Plus, History, Target, AlertCircle, Loader2,
} from "lucide-react";
import { useApi, useMutation } from "../../hooks/useApi";
import { crm } from "../../services/api";

const TYPE_ICON = { email: Mail, call: Phone, meeting: Calendar, note: FileText };

function currency(n) { return n != null ? `$${Number(n).toLocaleString()}` : "—"; }

export default function Account360() {
  const [notes, setNotes] = useState("");

  // Load first account from list (in a real app this would use a :accountId route param)
  const { data: accounts, loading: acctLoading } = useApi(() => crm.accounts.list({ limit: 1 }), []);
  const account = Array.isArray(accounts) ? accounts[0] : accounts;
  const accountId = account?.id;

  const { data: deals, loading: dealsLoading } = useApi(
    () => accountId ? crm.accounts.deals(accountId) : Promise.resolve([]),
    [accountId], { pollingInterval: 60000 }
  );
  const { data: timeline, loading: timelineLoading, refetch: refetchTimeline } = useApi(
    () => accountId ? crm.accounts.timeline(accountId) : Promise.resolve([]),
    [accountId], { pollingInterval: 30000 }
  );

  const { mutate: addNote, loading: addingNote } = useMutation(
    (data) => crm.accounts.addNote(accountId, data),
    { onSuccess: () => { setNotes(""); refetchTimeline(); } }
  );

  const allDeals = deals ?? [];
  const allTimeline = timeline ?? [];

  const metrics = useMemo(() => {
    const openDeals = allDeals.filter(d => d.stage !== "Won" && d.stage !== "won");
    const pipelineValue = openDeals.reduce((s, d) => s + (d.value ?? 0), 0);
    const weighted = openDeals.reduce((s, d) => s + (d.value ?? 0) * (d.probability ?? 0), 0);
    return { pipelineValue, weighted };
  }, [allDeals]);

  if (acctLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
        <div className="grid grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-20 bg-slate-100 dark:bg-slate-700 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!account) return (
    <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-700 dark:text-amber-400 text-sm">
      <AlertCircle size={16} /> No account data available.
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Building2 className="h-6 w-6" />
          {account.name}
        </h1>
        <p className="text-slate-500">
          Account ID {account.id} · Segment: {account.segment} · Owner: {account.owner}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPI icon={DollarSign} label="Current ARR"         value={currency(account.arr)} />
        <KPI icon={TrendingUp} label="Open Pipeline"        value={currency(metrics.pipelineValue)} />
        <KPI icon={Target}     label="Weighted Forecast"    value={currency(Math.round(metrics.weighted))} />
        <KPI icon={DollarSign} label="Expansion Potential"  value={currency(account.expansionPotential)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Panel title="Account Health">
          {account.health === "attention" ? (
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5" /> Attention required — risk signals detected
            </div>
          ) : (
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" /> Healthy — no major risks detected
            </div>
          )}
        </Panel>
        <Panel title="Renewal & Lifecycle">
          <div className="text-sm">
            <div>Renewal Date: <strong>{account.renewalDate ?? "—"}</strong></div>
            <div className="text-slate-500 mt-1">Proactive renewal planning recommended</div>
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          <Panel title="Stakeholders & Contacts" icon={Users}>
            {account.contacts?.length > 0 ? (
              <div className="space-y-2">
                {account.contacts.map(c => (
                  <div key={c.email} className="rounded border p-3">
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-slate-500">{c.role}</div>
                    <div className="text-xs text-slate-500">{c.email} · {c.phone}</div>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-slate-400">No contacts found.</p>}
          </Panel>

          <Panel title="Deals & Opportunities" icon={TrendingUp}>
            {dealsLoading ? (
              <div className="space-y-2 animate-pulse">
                {[1,2].map(i => <div key={i} className="h-14 bg-slate-100 dark:bg-slate-700 rounded" />)}
              </div>
            ) : allDeals.length > 0 ? (
              <div className="space-y-2">
                {allDeals.map(d => (
                  <div key={d.id} className="flex items-center justify-between rounded border p-3 text-sm">
                    <div>
                      <div className="font-medium">{d.name}</div>
                      <div className="text-xs text-slate-500">Stage: {d.stage}</div>
                    </div>
                    <div className="text-right">
                      <div>{currency(d.value)}</div>
                      <div className="text-xs text-slate-500">{Math.round((d.probability ?? 0) * 100)}%</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-slate-400">No deals found.</p>}
          </Panel>
        </div>

        <Panel title="Unified Account Timeline" icon={Activity} className="lg:col-span-1">
          {timelineLoading && allTimeline.length === 0 ? (
            <div className="space-y-2 animate-pulse">
              {[1,2,3].map(i => <div key={i} className="h-16 bg-slate-100 dark:bg-slate-700 rounded" />)}
            </div>
          ) : allTimeline.length > 0 ? (
            <div className="space-y-3">
              {allTimeline.map(e => {
                const Icon = TYPE_ICON[e.type] || History;
                return (
                  <div key={e.id} className="rounded border p-3 bg-white dark:bg-slate-900">
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                      <span className="flex items-center gap-1"><Icon className="h-4 w-4" /> {e.type}</span>
                      <span>{e.ts ?? e.date}</span>
                    </div>
                    <div className="text-sm">{e.text ?? e.title}</div>
                  </div>
                );
              })}
            </div>
          ) : <p className="text-sm text-slate-400">No timeline events.</p>}
        </Panel>

        <div className="space-y-6">
          <Panel title="Account Notes & Actions">
            <div className="flex gap-2 mb-3">
              <input
                value={notes}
                onChange={e => setNotes(e.target.value)}
                onKeyDown={e => e.key === "Enter" && notes.trim() && addNote({ text: notes })}
                placeholder="Add note or action…"
                className="flex-1 px-3 py-2 rounded border bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={() => notes.trim() && addNote({ text: notes })}
                disabled={addingNote || !accountId}
                className="px-3 py-2 rounded bg-indigo-600 text-white text-sm flex items-center gap-1 disabled:opacity-60"
              >
                {addingNote ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add
              </button>
            </div>
            <div className="text-sm text-slate-500">Notes appear in the unified timeline and audit trail.</div>
          </Panel>

          <Panel title="Expansion & Growth Signals">
            <div className="space-y-2 text-sm">
              {account.crossSell && (
                <div className="flex justify-between">
                  <span>Cross-sell opportunities</span>
                  <span className="font-medium">{account.crossSell}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Upsell potential</span>
                <span className="font-medium">{currency(account.expansionPotential)}</span>
              </div>
              <div className="flex justify-between">
                <span>Engagement trend</span>
                <span className={`font-medium ${account.engagementTrend === "positive" ? "text-emerald-600" : "text-amber-600"}`}>
                  {account.engagementTrend ? account.engagementTrend.charAt(0).toUpperCase() + account.engagementTrend.slice(1) : "—"}
                </span>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function KPI({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl border bg-white dark:bg-slate-900 p-4 flex items-center gap-3">
      <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/40">
        <Icon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
      </div>
      <div>
        <div className="text-xs text-slate-500">{label}</div>
        <div className="text-lg font-semibold">{value}</div>
      </div>
    </div>
  );
}

function Panel({ title, icon: Icon, children, className = "" }) {
  return (
    <div className={`rounded-xl border bg-white dark:bg-slate-900 p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        {Icon && <Icon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />}
        <div className="font-semibold">{title}</div>
      </div>
      {children}
    </div>
  );
}
