/**
 * Email Studio — real email campaigns.
 *
 * Campaigns: write, preview, test, schedule or send; watch real delivery
 * numbers. Status is whatever the engine says happened — a button never sets
 * it directly. Setup: sending domains (with their DNS records) and the legal
 * footer. Subscribers: who has consented, and the audiences campaigns go to.
 */
import { useEffect, useMemo, useState } from "react";
import { Mail, Plus, Send, Pause, Play, Ban, Copy, Trash2, RefreshCw, CheckCircle2, AlertTriangle, Globe, Users, CalendarClock, FlaskConical } from "lucide-react";
import StatusBadge from "../../../../components/ui/StatusBadge";
import { useToast } from "../../../../components/ui/Toast";
import { useApi } from "../../../../hooks/useApi";
import { marketing } from "../../../../services/api";
import { SolutionShell, Section, Loading, ErrorNote, Field, TextInput, SelectInput, PrimaryBtn, GhostBtn, fmtNum } from "../../components/mkt-ui";

const STATUS_VARIANT = { draft: "neutral", scheduled: "indigo", running: "info", paused: "warning", completed: "success", failed: "danger", cancelled: "neutral" };
const when = (d) => (d ? new Date(d).toLocaleString() : "—");
const STARTER = `<h1 style="font-family:Arial,sans-serif">Hello {{first_name}},</h1>
<p style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6">Write your message here.</p>
<p><a href="https://example.com" style="background:#111;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;font-family:Arial,sans-serif">Call to action</a></p>`;

function useRun(toast, after) {
  const [busy, setBusy] = useState(null);
  const run = async (key, fn, ok) => {
    setBusy(key);
    try { const r = await fn(); if (ok) toast({ message: typeof ok === "function" ? ok(r) : ok, type: "success" }); await after?.(); return r; }
    catch (e) { toast({ message: e.message, type: "error" }); return null; }
    finally { setBusy(null); }
  };
  return [busy, run];
}

// ── Campaign editor / detail ─────────────────────────────────────────────────
function Campaign({ id, domains, audiences, onChanged, onClose }) {
  const toast = useToast();
  const { data: c, refetch } = useApi(() => marketing.email.campaign(id), [id]);
  const { data: ready, refetch: recheck } = useApi(() => marketing.email.readiness(id), [id, c?.updatedAt]);
  const live = c && c.status !== "draft";
  const { data: stats, refetch: restat } = useApi(() => (live ? marketing.email.stats(id) : Promise.resolve(null)), [id, c?.status], { pollingInterval: live && ["running", "scheduled"].includes(c?.status) ? 5000 : null });
  const { data: deliveries } = useApi(() => (live ? marketing.email.deliveries(id, { limit: 100 }) : Promise.resolve([])), [id, c?.status, stats?.accepted]);
  const [form, setForm] = useState(null);
  const [at, setAt] = useState("");
  const [busy, run] = useRun(toast, async () => { await refetch(); await recheck(); await restat?.(); onChanged(); });

  useEffect(() => { if (c && c.status === "draft") setForm({ name: c.name, subject: c.subject ?? "", previewText: c.previewText ?? "", fromName: c.fromName ?? "", fromLocalPart: c.fromLocalPart ?? "", replyTo: c.replyTo ?? "", sendingDomainId: c.sendingDomainId ?? "", audienceId: c.audienceId ?? "", htmlBody: c.htmlBody ?? STARTER }); }, [c]);
  if (!c) return <Loading rows={4} />;
  const f = form ?? {};
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const domain = domains.find((d) => d.id === (f.sendingDomainId || c.sendingDomainId));

  const save = () => run("save", () => marketing.email.update(id, form), "Draft saved");
  const sendNow = async () => {
    await save();
    const r = await marketing.email.readiness(id).catch(() => null);
    if (!r?.ready) return toast({ message: r?.problems?.join(" ") || "This campaign isn't ready to send.", type: "error" });
    if (!window.confirm(`Send "${c.name}" now to ${r.audience.sendable} subscribed contact${r.audience.sendable === 1 ? "" : "s"}? This can be paused but not undone.`)) return;
    run("send", () => marketing.email.send(id), (x) => `Sending to ${x.queued} recipients`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{c.name}</h3>
        <StatusBadge label={c.status} variant={STATUS_VARIANT[c.status] ?? "neutral"} dot />
        {c.scheduledAt && c.status === "scheduled" && <span className="text-xs text-slate-500">for {when(c.scheduledAt)}</span>}
        <div className="ml-auto flex flex-wrap gap-2">
          <GhostBtn onClick={() => run("dup", () => marketing.email.duplicate(id), "Copied as a new draft")}><Copy size={13} /> Duplicate</GhostBtn>
          {["draft", "completed", "failed", "cancelled"].includes(c.status) && (
            <GhostBtn onClick={() => window.confirm("Delete this campaign and its delivery history?") && run("del", () => marketing.email.remove(id), "Deleted").then((r) => r && onClose())}><Trash2 size={13} /> Delete</GhostBtn>
          )}
          <GhostBtn onClick={onClose}>Close</GhostBtn>
        </div>
      </div>
      {c.lastError && <p className="flex items-start gap-2 rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"><AlertTriangle size={15} className="mt-0.5 shrink-0" /> {c.lastError}</p>}

      {c.status === "draft" && form && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="space-y-3">
            <Field label="Campaign name"><TextInput value={f.name} onChange={(e) => set("name", e.target.value)} /></Field>
            <Field label="Subject"><TextInput value={f.subject} onChange={(e) => set("subject", e.target.value)} placeholder="e.g. {{first_name}}, our new branch is open" /></Field>
            <Field label="Preview text (shown after the subject in inboxes)"><TextInput value={f.previewText} onChange={(e) => set("previewText", e.target.value)} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="From name"><TextInput value={f.fromName} onChange={(e) => set("fromName", e.target.value)} placeholder="Acme" /></Field>
              <Field label="Reply-to (optional)"><TextInput value={f.replyTo} onChange={(e) => set("replyTo", e.target.value)} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="From address"><TextInput value={f.fromLocalPart} onChange={(e) => set("fromLocalPart", e.target.value)} placeholder="news" /></Field>
              <Field label="@ Sending domain"><SelectInput value={f.sendingDomainId} onChange={(e) => set("sendingDomainId", e.target.value)}>
                <option value="">Choose…</option>
                {domains.map((d) => <option key={d.id} value={d.id}>{d.domain}{d.status !== "verified" ? ` (${d.status})` : ""}</option>)}
              </SelectInput></Field>
            </div>
            <Field label="Audience"><SelectInput value={f.audienceId} onChange={(e) => set("audienceId", e.target.value)}>
              <option value="">Choose…</option>
              {audiences.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.kind})</option>)}
            </SelectInput></Field>
            <Field label="Email body (HTML) — {{first_name}} {{name}} {{email}} {{unsubscribe_url}}">
              <textarea rows={12} value={f.htmlBody} onChange={(e) => set("htmlBody", e.target.value)} spellCheck={false}
                className="w-full rounded-lg border border-slate-200 bg-white p-3 font-mono text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" />
            </Field>
          </div>
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Preview{domain ? ` · from ${f.fromLocalPart || "…"}@${domain.domain}` : ""}</p>
            {/* sandboxed: no scripts, no same-origin access */}
            <iframe title="Email preview" sandbox="" srcDoc={f.htmlBody} className="h-96 w-full rounded-lg border border-slate-200 bg-white dark:border-slate-700" />
            <p className="text-[11px] text-slate-400">A footer with the unsubscribe link and your postal address is added to every email automatically.</p>
            <div className={`rounded-lg p-3 text-sm ${ready?.ready ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300" : "bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200"}`}>
              {ready?.ready
                ? <p className="flex items-center gap-2"><CheckCircle2 size={15} /> Ready — {fmtNum(ready.audience.sendable)} subscribed recipient{ready.audience.sendable === 1 ? "" : "s"} ({fmtNum(ready.audience.members)} in the audience).</p>
                : <ul className="list-disc space-y-0.5 pl-5">{(ready?.problems ?? []).map((p) => <li key={p}>{p}</li>)}{ready && !ready.problems.length && <li>No one in this audience has email consent yet.</li>}</ul>}
              <p className="mt-1 text-[11px] opacity-80">Save the draft to re-check.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <PrimaryBtn disabled={busy === "save"} onClick={save}>Save draft</PrimaryBtn>
              <GhostBtn disabled={busy === "test"} onClick={async () => { await save(); run("test", () => marketing.email.test(id), (r) => `Test sent to ${r.to}`); }}><FlaskConical size={13} /> Send test to me</GhostBtn>
            </div>
            <div className="flex flex-wrap items-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
              <Field label="Schedule for"><TextInput type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} /></Field>
              <GhostBtn disabled={!at || busy === "sched"} onClick={async () => { await save(); run("sched", () => marketing.email.schedule(id, new Date(at).toISOString()), "Scheduled"); }}><CalendarClock size={13} /> Schedule</GhostBtn>
              <PrimaryBtn disabled={busy === "send"} onClick={sendNow}><Send size={13} /> Send now</PrimaryBtn>
            </div>
          </div>
        </div>
      )}

      {live && (
        <>
          <div className="flex flex-wrap gap-2">
            {c.status === "scheduled" && <GhostBtn onClick={() => run("u", () => marketing.email.unschedule(id), "Back to draft")}>Unschedule</GhostBtn>}
            {c.status === "running" && <GhostBtn onClick={() => run("p", () => marketing.email.pause(id), "Paused")}><Pause size={13} /> Pause</GhostBtn>}
            {c.status === "paused" && <GhostBtn onClick={() => run("r", () => marketing.email.resume(id), "Resumed")}><Play size={13} /> Resume</GhostBtn>}
            {["scheduled", "running", "paused"].includes(c.status) && <GhostBtn onClick={() => window.confirm("Cancel? Unsent recipients won't get it.") && run("c", () => marketing.email.cancel(id), "Cancelled")}><Ban size={13} /> Cancel</GhostBtn>}
          </div>
          {stats && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
              {[["Recipients", stats.recipients], ["Waiting", stats.queued], ["Accepted", stats.accepted], ["Delivered", stats.delivered], ["Opened", stats.opened], ["Clicked", stats.clicked], ["Bounced", stats.bounced], ["Unsubscribed", stats.unsubscribed]].map(([l, v]) => (
                <div key={l} className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
                  <p className="text-lg font-semibold text-slate-900 dark:text-white">{fmtNum(v)}</p>
                  <p className="text-[11px] text-slate-500">{l}</p>
                </div>
              ))}
            </div>
          )}
          {stats && <p className="text-[11px] text-slate-400">{stats.note} Opens rely on a tracking pixel and are approximate. Failed: {fmtNum(stats.failed)} · Skipped: {fmtNum(stats.skipped)} · Complaints: {fmtNum(stats.complained)}</p>}
          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-100 dark:border-slate-800">{["Recipient", "Status", "Sent", "Delivered", "Opened", "Clicked", "Note"].map((h) => <th key={h} className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {(deliveries ?? []).map((d) => (
                  <tr key={d.id}>
                    <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{d.email}</td>
                    <td className="px-3 py-2"><StatusBadge label={d.status} variant={{ delivered: "success", sent: "info", bounced: "danger", complained: "danger", failed: "danger", skipped: "neutral", queued: "neutral", sending: "info" }[d.status] ?? "neutral"} /></td>
                    <td className="px-3 py-2 text-xs text-slate-500">{when(d.sentAt)}</td>
                    <td className="px-3 py-2 text-xs text-slate-500">{when(d.deliveredAt)}</td>
                    <td className="px-3 py-2 text-xs text-slate-500">{when(d.openedAt)}</td>
                    <td className="px-3 py-2 text-xs text-slate-500">{when(d.clickedAt)}</td>
                    <td className="px-3 py-2 text-xs text-slate-500">{d.lastError ?? ""}</td>
                  </tr>
                ))}
                {!deliveries?.length && <tr><td colSpan={7} className="px-3 py-6 text-center text-sm text-slate-400">No recipients yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// ── Setup: domains + settings ────────────────────────────────────────────────
function Setup() {
  const toast = useToast();
  const { data: domains, refetch } = useApi(() => marketing.email.domains(), []);
  const { data: settings, refetch: reload } = useApi(() => marketing.email.settings(), []);
  const [form, setForm] = useState(null);
  const [name, setName] = useState("");
  const [busy, run] = useRun(toast, async () => { await refetch(); await reload(); });
  useEffect(() => { if (settings) setForm({ postalAddress: settings.postalAddress ?? "", defaultFromName: settings.defaultFromName ?? "", replyTo: settings.replyTo ?? "" }); }, [settings]);

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <Section title="Sending domains" subtitle="Email goes out from a domain you own, once its DNS records are in place" icon={Globe}>
        <div className="space-y-3">
          {(domains ?? []).map((d) => (
            <div key={d.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-slate-900 dark:text-white">{d.domain}</p>
                <StatusBadge label={d.status} variant={d.status === "verified" ? "success" : d.status === "failed" ? "danger" : "warning"} dot />
                <span className={`text-[11px] ${d.dmarcFound ? "text-emerald-600" : "text-amber-600"}`}>DMARC {d.dmarcFound ? "found" : "not found"}</span>
                <div className="ml-auto flex gap-2">
                  <GhostBtn disabled={busy === d.id} onClick={() => run(d.id, () => marketing.email.checkDomain(d.id), (r) => `${r.domain}: ${r.status}`)}><RefreshCw size={13} /> Check DNS</GhostBtn>
                  <GhostBtn onClick={() => window.confirm(`Remove ${d.domain}?`) && run(`rm${d.id}`, () => marketing.email.removeDomain(d.id), "Removed")}><Trash2 size={13} /></GhostBtn>
                </div>
              </div>
              {d.status !== "verified" && (
                <div className="mt-2 overflow-x-auto">
                  <p className="mb-1 text-xs text-slate-500">Add these records at your DNS host, then press Check DNS:</p>
                  <table className="w-full font-mono text-[11px]">
                    <tbody>
                      {[...(d.records ?? []), ...(d.dmarcFound ? [] : [{ record: "DMARC (recommended)", type: d.dmarcRecommended.type, name: d.dmarcRecommended.name, value: d.dmarcRecommended.value }])].map((r, i) => (
                        <tr key={i} className="align-top"><td className="pr-2 text-slate-500">{r.record}</td><td className="pr-2">{r.type}</td><td className="pr-2 break-all">{r.name}</td><td className="break-all text-slate-700 dark:text-slate-300">{r.value}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
          <div className="flex gap-2">
            <TextInput placeholder="mail.yourcompany.com" value={name} onChange={(e) => setName(e.target.value)} />
            <PrimaryBtn disabled={!name.trim() || busy === "add"} onClick={() => run("add", () => marketing.email.addDomain(name.trim()), "Domain added — publish its DNS records").then((r) => r && setName(""))}><Plus size={13} /> Add</PrimaryBtn>
          </div>
        </div>
      </Section>
      <Section title="Email settings" subtitle="Used in every marketing email" icon={Mail}>
        {!form ? <Loading rows={2} /> : (
          <div className="space-y-3">
            <Field label="Postal address (required by anti-spam laws; shown in the footer)">
              <TextInput value={form.postalAddress} onChange={(e) => setForm({ ...form, postalAddress: e.target.value })} placeholder="1 Broad Street, Monrovia, Liberia" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Default from name"><TextInput value={form.defaultFromName} onChange={(e) => setForm({ ...form, defaultFromName: e.target.value })} /></Field>
              <Field label="Default reply-to"><TextInput value={form.replyTo} onChange={(e) => setForm({ ...form, replyTo: e.target.value })} /></Field>
            </div>
            <PrimaryBtn disabled={busy === "set"} onClick={() => run("set", () => marketing.email.saveSettings(form), "Saved")}>Save</PrimaryBtn>
          </div>
        )}
      </Section>
    </div>
  );
}

// ── Subscribers + audiences ──────────────────────────────────────────────────
const FIELDS = [
  ["email", "Email", ["contains", "ends_with", "equals", "not_contains"]],
  ["name", "Name", ["contains", "equals", "not_contains"]],
  ["created", "Added to CRM", ["within_days", "after", "before"]],
  ["consent", "Email consent", ["is", "is_not"]],
  ["event", "Email activity", ["within_days", "never"]],
];
const CMP = { contains: "contains", ends_with: "ends with", equals: "is", not_contains: "doesn't contain", within_days: "in the last (days)", after: "after", before: "before", is: "is", is_not: "is not", never: "never" };

function AudienceEditor({ audience, onSaved }) {
  const toast = useToast();
  const initial = audience.definition?.rules?.length ? audience.definition : { op: "and", rules: [{ field: "email", cmp: "contains", value: "" }] };
  const [tree, setTree] = useState(initial);
  const { data: preview, refetch } = useApi(() => marketing.audiences.preview(audience.id), [audience.id, audience.updatedAt]);
  const [busy, run] = useRun(toast, async () => { await refetch(); onSaved(); });
  const setRule = (i, patch) => setTree((t) => ({ ...t, rules: t.rules.map((r, j) => (j === i ? { ...r, ...patch } : r)) }));

  return (
    <div className="space-y-2 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
      <div className="flex items-center gap-2 text-sm">
        <span className="font-medium text-slate-900 dark:text-white">{audience.name}</span>
        <span className="text-xs text-slate-500">{preview ? `${fmtNum(preview.members)} contacts · ${fmtNum(preview.sendable)} can receive email` : "…"}</span>
        <SelectInput value={tree.op} onChange={(e) => setTree({ ...tree, op: e.target.value })} aria-label="Match"><option value="and">match all</option><option value="or">match any</option></SelectInput>
      </div>
      {tree.rules.map((r, i) => {
        const def = FIELDS.find(([k]) => k === r.field) ?? FIELDS[0];
        return (
          <div key={i} className="flex flex-wrap items-center gap-2">
            <SelectInput value={r.field} onChange={(e) => setRule(i, { field: e.target.value, cmp: FIELDS.find(([k]) => k === e.target.value)[2][0], value: "" })}>{FIELDS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</SelectInput>
            <SelectInput value={r.cmp} onChange={(e) => setRule(i, { cmp: e.target.value })}>{def[2].map((c) => <option key={c} value={c}>{CMP[c]}</option>)}</SelectInput>
            {r.field === "consent" ? (
              <SelectInput value={r.value || "subscribed"} onChange={(e) => setRule(i, { value: e.target.value })}>{["subscribed", "unsubscribed", "bounced", "complained", "none"].map((v) => <option key={v} value={v}>{v === "none" ? "not recorded" : v}</option>)}</SelectInput>
            ) : r.field === "event" ? (
              <>
                <SelectInput value={r.type || "email.opened"} onChange={(e) => setRule(i, { type: e.target.value })}>{["email.opened", "email.clicked", "email.delivered", "email.bounced", "email.unsubscribed"].map((v) => <option key={v} value={v}>{v.replace("email.", "")}</option>)}</SelectInput>
                {r.cmp === "within_days" && <TextInput type="number" min={1} value={r.value} onChange={(e) => setRule(i, { value: Number(e.target.value) })} />}
              </>
            ) : (
              <TextInput type={["after", "before"].includes(r.cmp) ? "date" : r.cmp === "within_days" ? "number" : "text"} value={r.value} onChange={(e) => setRule(i, { value: r.cmp === "within_days" ? Number(e.target.value) : e.target.value })} />
            )}
            <button type="button" onClick={() => setTree((t) => ({ ...t, rules: t.rules.filter((_, j) => j !== i) }))} className="text-slate-400 hover:text-red-500"><Trash2 size={13} /></button>
          </div>
        );
      })}
      <div className="flex gap-2">
        <GhostBtn onClick={() => setTree((t) => ({ ...t, rules: [...t.rules, { field: "email", cmp: "contains", value: "" }] }))}><Plus size={13} /> Rule</GhostBtn>
        <PrimaryBtn disabled={busy === "save"} onClick={() => run("save", () => marketing.audiences.setDefinition(audience.id, { kind: "dynamic", definition: { ...tree, rules: tree.rules.map((r) => (r.field === "consent" && !r.value ? { ...r, value: "subscribed" } : r.field === "event" && !r.type ? { ...r, type: "email.opened" } : r)) } }), "Audience saved")}>Save rules</PrimaryBtn>
      </div>
      {preview?.sample?.length > 0 && <p className="text-[11px] text-slate-500">e.g. {preview.sample.slice(0, 5).map((s) => s.email).join(", ")}</p>}
    </div>
  );
}

function Subscribers({ audiences, refetchAudiences }) {
  const toast = useToast();
  const { data: summary, refetch } = useApi(() => marketing.consent.summary(), []);
  const [emails, setEmails] = useState("");
  const [evidence, setEvidence] = useState("");
  const [attest, setAttest] = useState(false);
  const [name, setName] = useState("");
  const [busy, run] = useRun(toast, async () => { await refetch(); await refetchAudiences(); });

  return (
    <div className="space-y-4">
      <Section title="Email consent" subtitle="Marketing email only goes to contacts marked subscribed" icon={Users}>
        {summary && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            {[["CRM contacts", summary.contacts], ["Subscribed", summary.subscribed], ["Not recorded", summary.noConsentRecorded], ["Unsubscribed", summary.unsubscribed], ["Bounced", summary.bounced], ["Complained", summary.complained], ["Suppressed", summary.suppressed]].map(([l, v]) => (
              <div key={l} className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60"><p className="text-lg font-semibold text-slate-900 dark:text-white">{fmtNum(v)}</p><p className="text-[11px] text-slate-500">{l}</p></div>
            ))}
          </div>
        )}
        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium text-slate-800 dark:text-slate-100">Record consent you already have</p>
          <textarea rows={3} value={emails} onChange={(e) => setEmails(e.target.value)} placeholder="Email addresses, one per line or comma-separated" className="w-full rounded-lg border border-slate-200 bg-white p-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
          <TextInput value={evidence} onChange={(e) => setEvidence(e.target.value)} placeholder="Where they agreed, e.g. Website newsletter form, 2026" />
          <label className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300"><input type="checkbox" checked={attest} onChange={(e) => setAttest(e.target.checked)} className="mt-0.5" /> These people agreed to receive marketing email from us. Only addresses that match a CRM contact are recorded.</label>
          <PrimaryBtn disabled={!attest || !emails.trim() || evidence.trim().length < 3 || busy === "imp"} onClick={() => run("imp", () => marketing.consent.import({ emails, evidence, status: "subscribed" }), (r) => `Recorded ${r.recorded} of ${r.requested}${r.unmatchedCount ? ` — ${r.unmatchedCount} aren't CRM contacts` : ""}`).then((r) => r && setEmails(""))}>Record consent</PrimaryBtn>
        </div>
      </Section>
      <Section title="Audiences" subtitle="Who a campaign goes to — counted live from your CRM" icon={Users}>
        <div className="space-y-3">
          {audiences.filter((a) => a.kind === "dynamic").map((a) => <AudienceEditor key={a.id} audience={a} onSaved={refetchAudiences} />)}
          <div className="flex gap-2">
            <TextInput placeholder="New audience name" value={name} onChange={(e) => setName(e.target.value)} />
            <PrimaryBtn disabled={!name.trim()} onClick={() => run("new", () => marketing.audiences.create({ name: name.trim(), kind: "dynamic" }), "Audience created — add its rules").then((r) => r && setName(""))}><Plus size={13} /> Add</PrimaryBtn>
          </div>
        </div>
      </Section>
    </div>
  );
}

export default function EmailStudio() {
  const toast = useToast();
  const [tab, setTab] = useState("campaigns");
  const [open, setOpen] = useState(null);
  const { data: campaigns, loading, error, refetch } = useApi(() => marketing.email.campaigns(), [], { pollingInterval: 15000 });
  const { data: domains } = useApi(() => marketing.email.domains(), [tab]);
  const { data: audiences, refetch: refetchAudiences } = useApi(() => marketing.audiences.list(), []);
  const [busy, run] = useRun(toast, refetch);
  const counts = useMemo(() => (campaigns ?? []).reduce((m, c) => ({ ...m, [c.status]: (m[c.status] ?? 0) + 1 }), {}), [campaigns]);

  return (
    <SolutionShell solutionId="engagement" title="Email Studio" subtitle="Email campaigns sent through your verified domain, only to people who agreed"
      actions={tab === "campaigns" && <PrimaryBtn disabled={busy === "new"} onClick={() => run("new", () => marketing.email.create({ name: `Campaign ${new Date().toLocaleDateString()}` })).then((c) => c && setOpen(c.id))}><Plus size={15} /> New campaign</PrimaryBtn>}>
      <div className="flex gap-1 rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
        {[["campaigns", "Campaigns"], ["setup", "Sending setup"], ["subscribers", "Subscribers & audiences"]].map(([k, l]) => (
          <button key={k} type="button" onClick={() => setTab(k)} className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium ${tab === k ? "bg-white shadow-sm dark:bg-slate-700" : "text-slate-500"}`}>{l}</button>
        ))}
      </div>

      {tab === "campaigns" && (open ? (
        <Section title="Campaign" icon={Mail}><Campaign id={open} domains={domains ?? []} audiences={audiences ?? []} onChanged={refetch} onClose={() => setOpen(null)} /></Section>
      ) : (
        <Section title="Campaigns" subtitle={Object.entries(counts).map(([s, n]) => `${n} ${s}`).join(" · ") || "None yet"} icon={Mail} pad={false}>
          {error && <ErrorNote error={error} />}
          {loading && !campaigns ? <Loading table /> : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {(campaigns ?? []).length === 0 && <p className="px-5 py-10 text-center text-sm text-slate-400">No email campaigns yet. Set up a sending domain, record consent, then create one.</p>}
              {(campaigns ?? []).map((c) => (
                <button key={c.id} type="button" onClick={() => setOpen(c.id)} className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{c.name}</p>
                    <p className="truncate text-xs text-slate-500">{c.subject || "No subject yet"}{c.status === "scheduled" ? ` · ${when(c.scheduledAt)}` : c.sendCompletedAt ? ` · finished ${when(c.sendCompletedAt)}` : ""}</p>
                    {c.lastError && <p className="truncate text-xs text-rose-600">{c.lastError}</p>}
                  </div>
                  <StatusBadge label={c.status} variant={STATUS_VARIANT[c.status] ?? "neutral"} dot />
                </button>
              ))}
            </div>
          )}
        </Section>
      ))}
      {tab === "setup" && <Setup />}
      {tab === "subscribers" && <Subscribers audiences={audiences ?? []} refetchAudiences={refetchAudiences} />}
    </SolutionShell>
  );
}
