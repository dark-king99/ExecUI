/**
 * Connected accounts — your own Gmail/Outlook and calendar, and (for admins)
 * the organization's support inbox.
 *
 * The page never sees a token: connecting sends the browser to Google or
 * Microsoft, which returns to the server, which returns here with only
 * `?connected=` or `?error=`. A provider the server has no credentials for is
 * shown as not set up — never as connectable, never as connected.
 */
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Link2, Mail, CalendarDays, RefreshCw, Unplug, LifeBuoy, AlertTriangle, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import { Card, CardHeader, CardBody } from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import { useToast } from "../../components/ui/Toast";
import { useApi } from "../../hooks/useApi";
import { useUser } from "../../context/UserContext";
import { connections as api } from "../../services/api";

const when = (d) => (d ? new Date(d).toLocaleString() : "never");
const PROVIDER_NAME = { google: "Google", microsoft: "Microsoft" };

function Toggle({ checked, onChange, label, disabled }) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm text-slate-700 dark:text-slate-200">
      <span>{label}</span>
      <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={onChange}
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition disabled:opacity-50 ${checked ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-600"}`}>
        <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition ${checked ? "translate-x-4" : "translate-x-0.5"}`} />
      </button>
    </label>
  );
}

function ConnectionCard({ connection, busy, onSync, onDisconnect, onToggle }) {
  const personal = connection.purpose === "personal";
  const needsReauth = connection.status !== "active";
  return (
    <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-slate-900 dark:text-white">{PROVIDER_NAME[connection.provider] ?? connection.provider}</p>
          <p className="truncate text-sm text-slate-500">{connection.accountEmail}</p>
        </div>
        {needsReauth
          ? <StatusBadge label="Reconnect needed" variant="warning" />
          : <StatusBadge label="Connected" variant="success" dot />}
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Last synced {when(connection.lastSyncAt)}
        {connection.lastError && <span className="block text-amber-600 dark:text-amber-400">{connection.lastError}</span>}
      </p>
      {personal && (
        <div className="mt-3 space-y-2 border-t border-slate-100 pt-3 dark:border-slate-800">
          <Toggle label="Log emails with CRM contacts" checked={connection.logEmails} disabled={busy} onChange={() => onToggle("logEmails")} />
          <Toggle label="Log meetings with CRM contacts" checked={connection.logMeetings} disabled={busy} onChange={() => onToggle("logMeetings")} />
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={onSync} disabled={busy || needsReauth}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:border-indigo-400 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300">
          {busy ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Sync now
        </button>
        <button type="button" onClick={onDisconnect} disabled={busy}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:border-red-400 hover:text-red-600 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300">
          <Unplug size={12} /> Disconnect
        </button>
      </div>
    </div>
  );
}

function ConnectButtons({ providers, purpose, onConnect, busyKey, connectedProviders = [] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {providers.map((p) => {
        const key = `${p.id}:${purpose}`;
        const already = connectedProviders.includes(p.id);
        return (
          <button key={p.id} type="button" disabled={!p.configured || busyKey === key}
            title={p.configured ? undefined : "Not set up on this server yet — an administrator must add its OAuth credentials."}
            onClick={() => onConnect(p.id, purpose)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700">
            {busyKey === key ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
            {already ? `Reconnect ${PROVIDER_NAME[p.id]}` : `Connect ${PROVIDER_NAME[p.id]}`}
            {!p.configured && <span className="text-[11px] opacity-80">· not set up</span>}
          </button>
        );
      })}
    </div>
  );
}

export default function ConnectedAccounts() {
  const toast = useToast();
  const { isAdmin } = useUser();
  const [params, setParams] = useSearchParams();
  const { data, loading, error, refetch } = useApi(() => api.list(), []);
  const [busy, setBusy] = useState(null);

  // The server's redirect after Google/Microsoft: report it once, then clean the URL.
  useEffect(() => {
    const connected = params.get("connected");
    const failed = params.get("error");
    if (!connected && !failed) return;
    if (connected) toast({ message: `${PROVIDER_NAME[connected] ?? connected} connected`, type: "success" });
    if (failed) toast({ message: failed, type: "error" });
    setParams({}, { replace: true });
  }, [params, setParams, toast]);

  const providers = data?.providers ?? [];
  const list = data?.connections ?? [];
  const personal = list.filter((c) => c.purpose === "personal");
  const supportInbox = list.find((c) => c.purpose === "support_inbox") ?? null;
  const anyConfigured = providers.some((p) => p.configured);

  const run = async (key, fn, success) => {
    setBusy(key);
    try {
      const result = await fn();
      if (success) toast({ message: success, type: "success" });
      await refetch();
      return result;
    } catch (e) {
      toast({ message: e?.message ?? "That didn't work", type: "error" });
      return null;
    } finally {
      setBusy(null);
    }
  };

  const connect = async (provider, purpose) => {
    const result = await run(`${provider}:${purpose}`, () => api.start(provider, purpose));
    if (result?.url) window.location.href = result.url; // off to Google / Microsoft
  };
  const sync = (c) => run(c.id, async () => {
    const { result } = await api.sync(c.id);
    if (result && !result.ok) throw new Error(result.error ?? "Sync failed");
    return result;
  }, "Synced");
  const disconnect = (c) => {
    if (!window.confirm(`Disconnect ${c.accountEmail}? ExecUI stops syncing it and deletes its access tokens.`)) return;
    run(c.id, () => api.remove(c.id), "Disconnected");
  };
  const toggle = (c, field) => run(c.id, () => api.update(c.id, { [field]: !c[field] }));

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader title="Connected accounts" subtitle="Connect your email and calendar so ExecUI and ExecAI can work with them" />

      {!loading && !anyConfigured && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>Google and Microsoft aren't set up on this ExecUI server yet, so nothing can be connected. An administrator needs to add the OAuth client credentials.</span>
        </div>
      )}
      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{String(error)}</p>}

      <Card>
        <CardHeader title="Your email & calendar" subtitle="Only you can connect or see this" icon={Mail} />
        <CardBody className="space-y-4">
          <ul className="space-y-1.5 text-sm text-slate-600 dark:text-slate-300">
            <li className="flex gap-2"><CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-500" /> Emails with CRM contacts are logged on their account timeline — subject and a short preview only, never the full message.</li>
            <li className="flex gap-2"><CalendarDays size={15} className="mt-0.5 shrink-0 text-emerald-500" /> Meetings with CRM contacts appear in CRM activities.</li>
            <li className="flex gap-2"><ShieldCheck size={15} className="mt-0.5 shrink-0 text-emerald-500" /> ExecAI can search your email and check your calendar when you ask it to. It can't send, reply or delete.</li>
          </ul>
          {loading && !data ? <div className="h-24 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" /> : (
            <>
              {personal.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {personal.map((c) => (
                    <ConnectionCard key={c.id} connection={c} busy={busy === c.id}
                      onSync={() => sync(c)} onDisconnect={() => disconnect(c)} onToggle={(f) => toggle(c, f)} />
                  ))}
                </div>
              )}
              <ConnectButtons providers={providers} purpose="personal" onConnect={connect} busyKey={busy}
                connectedProviders={personal.map((c) => c.provider)} />
            </>
          )}
        </CardBody>
      </Card>

      {isAdmin && (
        <Card>
          <CardHeader title="Support inbox" subtitle="Admins only · one per organization" icon={LifeBuoy} />
          <CardBody className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Connect the mailbox customers write to (for example support@yourcompany.com). New emails become help-desk tickets;
              a reply that quotes a ticket reference joins that ticket. Mail already in the inbox when you connect is left alone.
            </p>
            {supportInbox && (
              <ConnectionCard connection={supportInbox} busy={busy === supportInbox.id}
                onSync={() => sync(supportInbox)} onDisconnect={() => disconnect(supportInbox)} />
            )}
            <ConnectButtons providers={providers} purpose="support_inbox" onConnect={connect} busyKey={busy}
              connectedProviders={supportInbox ? [supportInbox.provider] : []} />
            <p className="text-xs text-slate-400">Sign in as the support mailbox itself when the provider asks which account to use.</p>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
