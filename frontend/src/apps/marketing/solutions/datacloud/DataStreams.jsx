/**
 * Data Streams — where marketing data comes from.
 *
 *   Signup form  a hosted page (or HTML to paste into your site); consent is
 *                recorded only when the person ticks the box
 *   Events API   your servers send events with a secret key, shown once
 *   CSV import   upload a file, map its columns, optionally record consent
 *
 * Everything lands in CRM contacts and the marketing event stream. Counts on
 * this page are what actually arrived.
 */
import { useState } from "react";
import { Share2, Plus, FileText, KeyRound, Upload, Copy, Trash2, Pause, Play, AlertTriangle, CheckCircle2, ExternalLink } from "lucide-react";
import StatusBadge from "../../../../components/ui/StatusBadge";
import { useToast } from "../../../../components/ui/Toast";
import { useApi } from "../../../../hooks/useApi";
import { marketing } from "../../../../services/api";
import { SolutionShell, MetricGrid, Section, Loading, ErrorNote, Modal, Field, TextInput, SelectInput, PrimaryBtn, GhostBtn, Pill, fmtNum } from "../../components/mkt-ui";

const KIND = { form: ["Signup form", FileText], api: ["Events API", KeyRound], csv: ["CSV import", Upload] };
const when = (d) => (d ? new Date(d).toLocaleString() : "Never");
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

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

function CopyBox({ label, value, mono = true }) {
  const toast = useToast();
  return (
    <Field label={label}>
      <div className="flex gap-2">
        <textarea readOnly rows={Math.min(8, String(value).split("\n").length)} value={value} className={`w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 ${mono ? "font-mono" : ""}`} />
        <GhostBtn onClick={() => navigator.clipboard?.writeText(value).then(() => toast({ message: "Copied", type: "success" }))}><Copy size={13} /></GhostBtn>
      </div>
    </Field>
  );
}

const DEFAULT_FORM = { title: "Stay in touch", intro: "", consentText: "Email me news and offers. I can unsubscribe at any time.", button: "Sign up", successMessage: "Thanks — you're on the list.", redirectUrl: "", requireName: false, fields: [] };

function FormConfig({ value, onChange }) {
  const v = value;
  const set = (k, x) => onChange({ ...v, [k]: x });
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Heading"><TextInput value={v.title} onChange={(e) => set("title", e.target.value)} /></Field>
        <Field label="Button"><TextInput value={v.button} onChange={(e) => set("button", e.target.value)} /></Field>
      </div>
      <Field label="Intro (optional)"><TextInput value={v.intro} onChange={(e) => set("intro", e.target.value)} /></Field>
      <Field label="Consent checkbox — people must tick it to be subscribed"><TextInput value={v.consentText} onChange={(e) => set("consentText", e.target.value)} /></Field>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Thank-you message"><TextInput value={v.successMessage} onChange={(e) => set("successMessage", e.target.value)} /></Field>
        <Field label="Or send them to (https://, optional)"><TextInput value={v.redirectUrl ?? ""} onChange={(e) => set("redirectUrl", e.target.value)} placeholder="https://yoursite.com/thanks" /></Field>
      </div>
      <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300"><input type="checkbox" checked={!!v.requireName} onChange={(e) => set("requireName", e.target.checked)} /> Name is required</label>
      <div className="space-y-2">
        <p className="text-xs font-medium text-slate-600 dark:text-slate-300">Extra fields (up to 5, stored on the form.submitted event)</p>
        {(v.fields ?? []).map((f, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2">
            <TextInput value={f.label} placeholder="Label" onChange={(e) => set("fields", v.fields.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
            <TextInput value={f.key} placeholder="key, e.g. company" onChange={(e) => set("fields", v.fields.map((x, j) => (j === i ? { ...x, key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") } : x)))} />
            <label className="flex items-center gap-1 text-xs text-slate-500"><input type="checkbox" checked={!!f.required} onChange={(e) => set("fields", v.fields.map((x, j) => (j === i ? { ...x, required: e.target.checked } : x)))} /> required</label>
            <button type="button" aria-label="Remove field" onClick={() => set("fields", v.fields.filter((_, j) => j !== i))} className="text-slate-400 hover:text-red-500"><Trash2 size={13} /></button>
          </div>
        ))}
        {(v.fields ?? []).length < 5 && <GhostBtn onClick={() => set("fields", [...(v.fields ?? []), { key: "", label: "", required: false }])}><Plus size={13} /> Field</GhostBtn>}
      </div>
    </div>
  );
}

function embedHtml(s) {
  const c = s.config ?? {};
  const fields = [
    `  <label>Email <input type="email" name="email" required></label>`,
    `  <label>Name <input type="text" name="name"${c.requireName ? " required" : ""}></label>`,
    ...(c.fields ?? []).map((f) => `  <label>${esc(f.label)} <input type="text" name="${f.key}"${f.required ? " required" : ""}></label>`),
    `  <div style="position:absolute;left:-10000px" aria-hidden="true"><input name="website" tabindex="-1" autocomplete="off"></div>`,
    ...(c.askConsent !== false ? [`  <label><input type="checkbox" name="consent" value="yes"> ${esc(c.consentText)}</label>`] : []),
    `  <button type="submit">${esc(c.button || "Sign up")}</button>`,
  ];
  return `<form method="post" action="${s.formUrl}">\n${fields.join("\n")}\n</form>`;
}

function Recent({ id }) {
  const { data } = useApi(() => marketing.streams.recent(id), [id], { pollingInterval: 15000 });
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
      <table className="w-full text-sm">
        <thead><tr className="border-b border-slate-100 dark:border-slate-800">{["When", "Event", "Contact", "Detail"].map((h) => <th key={h} className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500">{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {(data ?? []).map((e) => (
            <tr key={e.id}>
              <td className="px-3 py-2 text-xs text-slate-500">{when(e.occurredAt)}</td>
              <td className="px-3 py-2"><Pill color="indigo">{e.type}</Pill></td>
              <td className="px-3 py-2 text-xs text-slate-700 dark:text-slate-200">{e.email}</td>
              <td className="px-3 py-2 text-xs text-slate-500">{e.type === "form.submitted" ? `consent: ${String(e.properties?.consent ?? "").replace("_", " ")}${e.properties?.created ? " · new contact" : ""}` : Object.entries(e.properties ?? {}).filter(([k]) => k !== "sourceId").slice(0, 3).map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`).join(" · ")}</td>
            </tr>
          ))}
          {!data?.length && <tr><td colSpan={4} className="px-3 py-6 text-center text-sm text-slate-400">Nothing received yet.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function CsvImport({ stream, onDone }) {
  const toast = useToast();
  const [file, setFile] = useState(null);
  const [pv, setPv] = useState(null);
  const [mapping, setMapping] = useState({});
  const [consent, setConsent] = useState(false);
  const [evidence, setEvidence] = useState("");
  const [attest, setAttest] = useState(false);
  const [result, setResult] = useState(null);
  const { data: runs, refetch } = useApi(() => marketing.streams.runs(stream.id), [stream.id]);
  const [busy, run] = useRun(toast, async () => { await refetch(); onDone(); });

  const choose = async (f) => {
    setFile(f); setResult(null); setPv(null);
    if (!f) return;
    const r = await run("pv", () => marketing.streams.previewCsv(f));
    if (r) { setPv(r); setMapping(r.mapping); }
  };
  const col = (k, label) => (
    <Field label={label}><SelectInput value={mapping[k] ?? ""} onChange={(e) => setMapping({ ...mapping, [k]: e.target.value || undefined })}>
      <option value="">—</option>{pv.headers.map((h) => <option key={h} value={h}>{h}</option>)}
    </SelectInput></Field>
  );
  return (
    <div className="space-y-3">
      <input type="file" accept=".csv,text/csv" onChange={(e) => choose(e.target.files?.[0] ?? null)} className="text-sm" />
      {pv && (
        <>
          <p className="text-xs text-slate-500">{fmtNum(pv.rows)} rows · columns: {pv.headers.join(", ")}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{col("email", "Email *")}{col("name", "Full name")}{col("first_name", "First name")}{col("last_name", "Last name")}</div>
          <div className="overflow-x-auto rounded-lg border border-slate-200 text-xs dark:border-slate-700">
            <table className="w-full"><thead><tr>{pv.headers.map((h) => <th key={h} className="px-2 py-1 text-left text-slate-500">{h}</th>)}</tr></thead>
              <tbody>{pv.sample.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className="px-2 py-1 text-slate-700 dark:text-slate-200">{c}</td>)}</tr>)}</tbody></table>
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-200"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /> These people agreed to receive marketing email — record their consent</label>
          {consent && (
            <div className="space-y-2 rounded-lg bg-amber-50 p-3 dark:bg-amber-500/10">
              <TextInput value={evidence} onChange={(e) => setEvidence(e.target.value)} placeholder="Where they agreed, e.g. Signed sheet at trade show, Nov 2026" />
              <label className="flex items-start gap-2 text-xs text-amber-900 dark:text-amber-100"><input type="checkbox" checked={attest} onChange={(e) => setAttest(e.target.checked)} className="mt-0.5" /> I confirm every person in this file agreed. People who unsubscribed, bounced or complained before stay that way.</label>
            </div>
          )}
          <PrimaryBtn color="indigo" disabled={!mapping.email || busy === "imp" || (consent && (!attest || evidence.trim().length < 3))}
            onClick={() => run("imp", () => marketing.streams.importCsv(stream.id, file, { mapping, ...(consent ? { consentEvidence: evidence, attested: attest } : {}) }), (r) => `Imported: ${r.created} new, ${r.updated} existing${r.skipped ? `, ${r.skipped} skipped` : ""}`).then((r) => r && setResult(r))}>
            <Upload size={13} /> {busy === "imp" ? "Importing…" : `Import ${fmtNum(pv.rows)} rows`}
          </PrimaryBtn>
        </>
      )}
      {result && (
        <div className="rounded-lg bg-slate-50 p-3 text-xs dark:bg-slate-800/60">
          <p className="font-medium text-slate-800 dark:text-slate-100">{result.created} new contacts · {result.updated} matched existing · {result.consented} consent recorded · {result.skipped} skipped</p>
          {result.errors.length > 0 && <ul className="mt-1 max-h-40 list-disc overflow-y-auto pl-5 text-slate-600 dark:text-slate-300">{result.errors.map((e, i) => <li key={i}>Row {e.row ?? "?"}: {e.error}</li>)}</ul>}
        </div>
      )}
      {runs?.length > 0 && (
        <div className="text-xs">
          <p className="mb-1 font-medium text-slate-600 dark:text-slate-300">Previous imports</p>
          {runs.map((r) => <p key={r.id} className="text-slate-500">{when(r.startedAt)} · {r.fileName ?? "file"} · {r.status} · {r.rows} rows, {r.created} new, {r.updated} existing, {r.consented} consent, {r.skipped} skipped</p>)}
        </div>
      )}
    </div>
  );
}

function StreamDetail({ id, onClose, onChanged }) {
  const toast = useToast();
  const { data: s, refetch } = useApi(() => marketing.streams.get(id), [id]);
  const [cfg, setCfg] = useState(null);
  const [secret, setSecret] = useState(null);
  const [busy, run] = useRun(toast, async () => { await refetch(); onChanged(); });
  if (!s) return <Loading rows={4} />;
  const config = cfg ?? s.config;
  const [label, Icon] = KIND[s.kind];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Icon size={16} className="text-indigo-500" />
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{s.name}</h3>
        <Pill color="indigo">{label}</Pill>
        <StatusBadge label={s.status} variant={s.status === "active" ? "success" : "warning"} dot />
        <div className="ml-auto flex flex-wrap gap-2">
          {s.kind !== "csv" && (s.status === "active"
            ? <GhostBtn onClick={() => run("st", () => marketing.streams.update(id, { status: "paused" }), "Paused")}><Pause size={13} /> Pause</GhostBtn>
            : <GhostBtn onClick={() => run("st", () => marketing.streams.update(id, { status: "active" }), "Active")}><Play size={13} /> Resume</GhostBtn>)}
          <GhostBtn onClick={() => window.confirm("Delete this data stream? Contacts and events it brought in are kept.") && run("del", () => marketing.streams.remove(id), "Deleted").then((r) => r && onClose())}><Trash2 size={13} /> Delete</GhostBtn>
          <GhostBtn onClick={onClose}>Close</GhostBtn>
        </div>
      </div>
      <p className="text-xs text-slate-500">{fmtNum(s.received)} received · {fmtNum(s.rejected)} rejected · last {when(s.lastReceivedAt)}</p>
      {s.lastError && <p className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-200"><AlertTriangle size={14} className="mt-0.5 shrink-0" /> Last rejection: {s.lastError}</p>}

      {s.kind === "form" && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="space-y-3">
            <FormConfig value={config} onChange={setCfg} />
            <PrimaryBtn color="indigo" disabled={!cfg || busy === "save"} onClick={() => run("save", () => marketing.streams.update(id, { config: { ...cfg, redirectUrl: cfg.redirectUrl || null } }), "Form saved").then((r) => r && setCfg(null))}>Save form</PrimaryBtn>
          </div>
          <div className="space-y-3">
            <Field label="Hosted page — link to it or put it in an iframe">
              <a href={s.formUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 break-all text-xs text-indigo-600 hover:underline dark:text-indigo-300">{s.formUrl} <ExternalLink size={11} /></a>
            </Field>
            <CopyBox label="Or paste this HTML into your website (style it as you like)" value={embedHtml(s)} />
            <p className="text-[11px] text-slate-500">Submissions are limited to 5 a minute per visitor. The hidden "website" field catches bots: leave it in.</p>
          </div>
        </div>
      )}

      {s.kind === "api" && (
        <div className="space-y-3">
          {secret && (
            <div className="space-y-2 rounded-lg bg-emerald-50 p-3 dark:bg-emerald-500/10">
              <p className="flex items-center gap-2 text-sm font-medium text-emerald-800 dark:text-emerald-200"><CheckCircle2 size={14} /> Copy this key now — it won't be shown again.</p>
              <CopyBox label="API key" value={secret} />
            </div>
          )}
          <p className="text-xs text-slate-500">Key starting <code>{s.keyPrefix}…</code>. Keep it on your servers — never in a web page or app.</p>
          <CopyBox label="Send events" value={`curl -X POST ${s.endpoint} \\\n  -H "Authorization: Bearer ${secret ?? "<your key>"}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"events":[{"event":"trial_started","email":"ann@example.com","id":"evt-123","properties":{"plan":"pro"}}]}'`} />
          <p className="text-[11px] text-slate-500">Up to 500 events per request, 120 requests a minute. <code>id</code> makes retries safe. Events become <code>custom:&lt;name&gt;</code> for audience rules and journey triggers. Events never record consent.</p>
          <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-200">
            <input type="checkbox" checked={config.createContacts !== false} onChange={(e) => run("cfg", () => marketing.streams.update(id, { config: { createContacts: e.target.checked } }), "Saved")} />
            Create a CRM contact for addresses we haven't seen (otherwise those events are rejected)
          </label>
          <GhostBtn onClick={() => window.confirm("Rotate the key? The current key stops working immediately.") && run("rot", () => marketing.streams.rotateKey(id), "New key created").then((r) => r && setSecret(r.secret))}><KeyRound size={13} /> Rotate key</GhostBtn>
        </div>
      )}

      {s.kind === "csv" && <CsvImport stream={s} onDone={() => { refetch(); onChanged(); }} />}

      {s.kind !== "csv" && <Section title="Latest received" icon={Share2}><Recent id={id} /></Section>}
    </div>
  );
}

export default function DataStreams() {
  const toast = useToast();
  const [open, setOpen] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ name: "", kind: "form", config: DEFAULT_FORM });
  const [created, setCreated] = useState(null);
  const { data: streams, loading, error, refetch } = useApi(() => marketing.streams.list(), [], { pollingInterval: 30000 });
  const { data: ov } = useApi(() => marketing.streams.overview(), [streams?.length]);
  const all = streams ?? [];

  const create = async () => {
    try {
      const r = await marketing.streams.create({ name: form.name, kind: form.kind, ...(form.kind === "form" ? { config: { ...form.config, redirectUrl: form.config.redirectUrl || null } } : {}) });
      setShowNew(false); setForm({ name: "", kind: "form", config: DEFAULT_FORM }); refetch();
      if (r.secret) setCreated(r); else setOpen(r.id);
    } catch (e) { toast({ message: e.message, type: "error" }); }
  };

  const metrics = [
    { label: "Data streams", value: fmtNum(all.length), icon: Share2, color: "indigo" },
    { label: "Active", value: fmtNum(all.filter((s) => s.status === "active").length), icon: CheckCircle2, color: "emerald" },
    { label: "Records received", value: fmtNum(all.reduce((n, s) => n + s.received, 0)), icon: Upload, color: "violet" },
    { label: "Events, last 30 days", value: fmtNum(ov?.events30), icon: FileText, color: "sky" },
  ];

  return (
    <SolutionShell solutionId="datacloud" title="Data Streams" subtitle="Signup forms, an events API and CSV imports — all landing in your CRM contacts and event stream"
      actions={!open && <PrimaryBtn color="indigo" onClick={() => setShowNew(true)}><Plus size={15} /> New data stream</PrimaryBtn>}>
      {showNew && (
        <Modal title="New data stream" onClose={() => setShowNew(false)}
          footer={<><GhostBtn onClick={() => setShowNew(false)}>Cancel</GhostBtn><PrimaryBtn color="indigo" disabled={!form.name.trim()} onClick={create}>Create</PrimaryBtn></>}>
          <Field label="Name *"><TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Website newsletter" /></Field>
          <Field label="Kind"><SelectInput value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
            <option value="form">Signup form</option><option value="api">Events API (server to server)</option><option value="csv">CSV import</option>
          </SelectInput></Field>
          {form.kind === "form" && <FormConfig value={form.config} onChange={(c) => setForm({ ...form, config: c })} />}
        </Modal>
      )}
      {created && (
        <Modal title="API key created" onClose={() => { setOpen(created.id); setCreated(null); }}
          footer={<PrimaryBtn color="indigo" onClick={() => { setOpen(created.id); setCreated(null); }}>I've stored it</PrimaryBtn>}>
          <p className="text-sm text-slate-600 dark:text-slate-300">Copy this key now. Only a fingerprint of it is kept, so it can't be shown again — rotate it if it's lost.</p>
          <CopyBox label="API key" value={created.secret} />
        </Modal>
      )}

      {open ? (
        <Section title="Data stream" icon={Share2}><StreamDetail id={open} onClose={() => { setOpen(null); refetch(); }} onChanged={refetch} /></Section>
      ) : (
        <>
          <MetricGrid items={metrics} cols={4} loading={loading && !streams} />
          <Section title="Data streams" icon={Share2} pad={false}>
            {error && <ErrorNote error={error} />}
            {loading && !streams ? <Loading table /> : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {all.length === 0 && <p className="px-5 py-10 text-center text-sm text-slate-400">No data streams yet. Add a signup form for your website, an API key for your product, or import a CSV.</p>}
                {all.map((s) => {
                  const [label, Icon] = KIND[s.kind];
                  return (
                    <button key={s.id} type="button" onClick={() => setOpen(s.id)} className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <Icon size={16} className="shrink-0 text-indigo-500" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{s.name}</p>
                        <p className="truncate text-xs text-slate-500">{label} · {fmtNum(s.received)} received{s.rejected ? ` · ${fmtNum(s.rejected)} rejected` : ""} · last {when(s.lastReceivedAt)}</p>
                      </div>
                      <StatusBadge label={s.status} variant={s.status === "active" ? "success" : "warning"} dot />
                    </button>
                  );
                })}
              </div>
            )}
          </Section>
        </>
      )}
    </SolutionShell>
  );
}
