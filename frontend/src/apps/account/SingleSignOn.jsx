/**
 * Account → Single Sign-On (admin only, Enterprise/Executive plans).
 *
 * Everything an IT admin needs in one place: connect the identity provider
 * (OIDC or SAML 2.0), map attributes, copy the endpoints their IdP asks for,
 * test the connection before going live, and issue SCIM tokens so joiners /
 * movers / leavers are provisioned automatically.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody } from "../../components/ui/Card";
import { SkeletonCard } from "../../components/ui/Skeleton";
import { useApi } from "../../hooks/useApi";
import { useToast } from "../../components/ui/Toast";
import { useUser } from "../../context/UserContext";
import { sso } from "../../services/api";
import { entitlementsFor } from "../../lib/plans";
import {
  ShieldCheck, Copy, Check, Lock, KeyRound, Plus, Trash2, RefreshCw,
  AlertCircle, ChevronRight, Users, ExternalLink,
} from "lucide-react";

const Field = ({ label, hint, children }) => (
  <label className="block">
    <span className="block text-xs font-medium text-slate-600 dark:text-slate-300">{label}</span>
    {children}
    {hint && <span className="mt-1 block text-[11px] text-slate-400">{hint}</span>}
  </label>
);

const inputCls =
  "mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400";

const Text = ({ value, onChange, ...rest }) => (
  <input className={inputCls} value={value ?? ""} onChange={(e) => onChange(e.target.value)} {...rest} />
);

const Toggle = ({ checked, onChange, label, hint }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className="flex w-full items-start gap-3 rounded-lg border border-slate-200 dark:border-slate-800 p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
  >
    <span className={`mt-0.5 h-5 w-9 shrink-0 rounded-full p-0.5 transition ${checked ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-700"}`}>
      <span className={`block h-4 w-4 rounded-full bg-white transition ${checked ? "translate-x-4" : ""}`} />
    </span>
    <span className="min-w-0">
      <span className="block text-sm font-medium text-slate-800 dark:text-slate-200">{label}</span>
      {hint && <span className="block text-xs text-slate-500">{hint}</span>}
    </span>
  </button>
);

function CopyRow({ label, value }) {
  const [done, setDone] = useState(false);
  if (!value) return null;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setDone(true);
      setTimeout(() => setDone(false), 1500);
    } catch { /* clipboard blocked — the value is selectable anyway */ }
  };
  return (
    <div className="flex items-center gap-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wide text-slate-400">{label}</p>
        <p className="truncate font-mono text-xs text-slate-700 dark:text-slate-300" title={value}>{value}</p>
      </div>
      <button onClick={copy} className="shrink-0 rounded-md p-1.5 text-slate-400 hover:text-indigo-500 hover:bg-white dark:hover:bg-slate-700 transition" title="Copy">
        {done ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
      </button>
    </div>
  );
}

export default function SingleSignOn() {
  const { user } = useUser();
  const toast = useToast();
  const navigate = useNavigate();

  const isAdmin = ["enterprise_admin", "system_admin"].includes(user?.role);
  const ent = entitlementsFor(user?.plan || "executive", user?.planSolutions || []);

  const { data, loading, refetch } = useApi(() => sso.config.get(), [], { immediate: isAdmin && ent.sso });
  const { data: tokenData, refetch: refetchTokens } = useApi(() => sso.scimTokens.list(), [], { immediate: isAdmin && ent.sso });

  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [newToken, setNewToken] = useState(null);

  useEffect(() => {
    if (!data) return;
    setForm({
      protocol: data.protocol || "oidc",
      enabled: !!data.enabled,
      enforced: !!data.enforced,
      jitProvisioning: data.jitProvisioning !== false,
      displayName: data.displayName || "",
      domains: (data.domains || []).join(", "),
      defaultDepartment: data.defaultDepartment || "",
      issuer: data.issuer || "",
      clientId: data.clientId || "",
      clientSecret: "",
      scopes: data.scopes || "openid email profile",
      authorizationUrl: data.authorizationUrl || "",
      tokenUrl: data.tokenUrl || "",
      jwksUrl: data.jwksUrl || "",
      entryPoint: data.entryPoint || "",
      idpIssuer: data.idpIssuer || "",
      idpCert: "",
      logoutUrl: data.logoutUrl || "",
      attrEmail: data.attrEmail || "email",
      attrFirstName: data.attrFirstName || "given_name",
      attrLastName: data.attrLastName || "family_name",
      attrGroups: data.attrGroups || "",
      hasClientSecret: !!data.hasClientSecret,
      hasIdpCert: !!data.hasIdpCert,
    });
  }, [data]);

  // ── Gates ──
  if (!isAdmin) {
    return (
      <div>
        <PageHeader title="Single Sign-On" subtitle="Connect your identity provider." />
        <Card><CardBody>
          <div className="flex items-center gap-3 py-4">
            <Lock size={18} className="text-slate-400" />
            <p className="text-sm text-slate-500">Only an organization administrator can configure Single Sign-On.</p>
          </div>
        </CardBody></Card>
      </div>
    );
  }

  if (!ent.sso) {
    return (
      <div>
        <PageHeader title="Single Sign-On" subtitle="Let your team sign in with your company identity provider." />
        <Card><CardBody>
          <div className="flex flex-col items-start gap-3 py-4 sm:flex-row sm:items-center">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-500/10">
              <Lock size={20} className="text-amber-500" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Available on Enterprise &amp; Executive</p>
              <p className="mt-0.5 text-sm text-slate-500">
                SAML 2.0 / OIDC single sign-on and automated SCIM user provisioning are part of the enterprise identity package.
              </p>
            </div>
            <button onClick={() => navigate("/account/billing")} className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-amber-500 px-3.5 py-2 text-xs font-semibold text-white hover:bg-amber-600">
              Upgrade plan <ChevronRight size={13} />
            </button>
          </div>
        </CardBody></Card>
      </div>
    );
  }

  if (loading || !form) return <div><PageHeader title="Single Sign-On" /><SkeletonCard /></div>;

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const sp = data?.serviceProvider || {};
  const isOidc = form.protocol === "oidc";

  const save = async () => {
    setSaving(true);
    setTestResult(null);
    try {
      const payload = { ...form, domains: form.domains };
      if (!payload.clientSecret) delete payload.clientSecret; // keep the stored one
      if (!payload.idpCert) delete payload.idpCert;
      await sso.config.save(payload);
      toast.success?.("Single Sign-On settings saved.");
      refetch();
    } catch (e) {
      toast.error?.(e?.message || "Couldn't save the SSO configuration.");
    } finally {
      setSaving(false);
    }
  };

  const runTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      setTestResult(await sso.config.test());
    } catch (e) {
      setTestResult({ ok: false, error: e?.message || "Test failed" });
    } finally {
      setTesting(false);
    }
  };

  const createToken = async () => {
    try {
      const res = await sso.scimTokens.create({ name: "SCIM provisioning" });
      setNewToken(res.token);
      refetchTokens();
    } catch (e) {
      toast.error?.(e?.message || "Couldn't create the token.");
    }
  };

  const revokeToken = async (id) => {
    try {
      await sso.scimTokens.revoke(id);
      toast.success?.("Token revoked.");
      refetchTokens();
    } catch (e) {
      toast.error?.(e?.message || "Couldn't revoke the token.");
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Single Sign-On"
        subtitle="Let employees sign in with your company identity provider, and provision accounts automatically."
        actions={
          <div className="flex items-center gap-2">
            <button onClick={runTest} disabled={testing} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:border-indigo-300 disabled:opacity-50">
              <RefreshCw size={13} className={testing ? "animate-spin" : ""} /> Test connection
            </button>
            <button onClick={save} disabled={saving} className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        }
      />

      {testResult && (
        <div className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${testResult.ok
          ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300"
          : "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300"}`}>
          {testResult.ok ? <Check size={16} className="mt-0.5 shrink-0" /> : <AlertCircle size={16} className="mt-0.5 shrink-0" />}
          <span>
            {testResult.ok
              ? `Connection looks good — ${testResult.protocol === "oidc" ? `discovered ${testResult.signingKeys} signing key(s) from ${testResult.issuer}` : `SAML configuration is valid for ${testResult.entryPoint}`}.`
              : testResult.error}
          </span>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        {/* ── Provider configuration ── */}
        <div className="space-y-5 lg:col-span-2">
          <Card><CardBody className="space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-indigo-500" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Identity provider</h3>
            </div>

            <div className="flex rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5">
              {[{ id: "oidc", label: "OIDC / OAuth 2.0" }, { id: "saml", label: "SAML 2.0" }].map((p) => (
                <button key={p.id} onClick={() => set("protocol")(p.id)}
                  className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition ${form.protocol === p.id ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}>
                  {p.label}
                </button>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Button label" hint="Shown on the sign-in page.">
                <Text value={form.displayName} onChange={set("displayName")} placeholder="Log in with Okta" />
              </Field>
              <Field label="Email domains" hint="Comma-separated. Routes these domains to this provider.">
                <Text value={form.domains} onChange={set("domains")} placeholder="acme.com, acme.co.uk" />
              </Field>
            </div>

            {isOidc ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Issuer URL" hint="We auto-discover the endpoints from /.well-known.">
                  <Text value={form.issuer} onChange={set("issuer")} placeholder="https://acme.okta.com" />
                </Field>
                <Field label="Client ID">
                  <Text value={form.clientId} onChange={set("clientId")} placeholder="0oa1b2c3…" />
                </Field>
                <Field label="Client secret" hint={form.hasClientSecret ? "A secret is stored — leave blank to keep it." : "Stored encrypted; never shown again."}>
                  <Text type="password" value={form.clientSecret} onChange={set("clientSecret")} placeholder={form.hasClientSecret ? "••••••••" : ""} autoComplete="new-password" />
                </Field>
                <Field label="Scopes">
                  <Text value={form.scopes} onChange={set("scopes")} placeholder="openid email profile" />
                </Field>
              </div>
            ) : (
              <div className="grid gap-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="IdP sign-on URL" hint="SAML 2.0 HTTP-Redirect endpoint.">
                    <Text value={form.entryPoint} onChange={set("entryPoint")} placeholder="https://acme.okta.com/app/…/sso/saml" />
                  </Field>
                  <Field label="IdP issuer (entity ID)">
                    <Text value={form.idpIssuer} onChange={set("idpIssuer")} placeholder="http://www.okta.com/exk1b2c3" />
                  </Field>
                </div>
                <Field label="IdP signing certificate" hint={form.hasIdpCert ? "A certificate is stored — paste a new one to replace it." : "Paste the X.509 certificate from your IdP."}>
                  <textarea
                    className={`${inputCls} h-24 font-mono text-[11px]`}
                    value={form.idpCert}
                    onChange={(e) => set("idpCert")(e.target.value)}
                    placeholder={form.hasIdpCert ? "•••• stored ••••" : "-----BEGIN CERTIFICATE-----"}
                  />
                </Field>
              </div>
            )}
          </CardBody></Card>

          {/* ── Behaviour ── */}
          <Card><CardBody className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Behaviour</h3>
            <Toggle checked={form.enabled} onChange={set("enabled")}
              label="Enable Single Sign-On" hint="Shows the SSO option on the sign-in page for your domains." />
            <Toggle checked={form.enforced} onChange={set("enforced")}
              label="Require SSO for all employees" hint="Blocks password sign-in. Administrators keep password access so a provider outage can't lock you out." />
            <Toggle checked={form.jitProvisioning} onChange={set("jitProvisioning")}
              label="Create accounts on first sign-in (JIT)" hint="Otherwise a user must already exist (or be provisioned via SCIM)." />
            <Field label="Default department for new users">
              <Text value={form.defaultDepartment} onChange={set("defaultDepartment")} placeholder="e.g. Operations" />
            </Field>
          </CardBody></Card>

          {/* ── Attribute mapping ── */}
          <Card><CardBody className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Attribute mapping</h3>
            <p className="text-xs text-slate-500">Which {isOidc ? "claim" : "SAML attribute"} carries each field. Defaults suit most providers.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Email"><Text value={form.attrEmail} onChange={set("attrEmail")} /></Field>
              <Field label="First name"><Text value={form.attrFirstName} onChange={set("attrFirstName")} /></Field>
              <Field label="Last name"><Text value={form.attrLastName} onChange={set("attrLastName")} /></Field>
              <Field label="Groups" hint="Optional — used for role mapping."><Text value={form.attrGroups} onChange={set("attrGroups")} placeholder="groups" /></Field>
            </div>
          </CardBody></Card>
        </div>

        {/* ── Right column: endpoints + SCIM ── */}
        <div className="space-y-5">
          <Card><CardBody className="space-y-3">
            <div className="flex items-center gap-2">
              <ExternalLink size={15} className="text-indigo-500" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Give these to your IdP</h3>
            </div>
            {isOidc ? (
              <CopyRow label="Redirect URI (callback)" value={sp.oidcRedirectUri} />
            ) : (
              <>
                <CopyRow label="ACS URL (Single Sign-On URL)" value={sp.samlAcsUrl} />
                <CopyRow label="Audience / Entity ID" value={sp.samlEntityId} />
                <CopyRow label="SP metadata" value={sp.samlMetadataUrl} />
              </>
            )}
            <CopyRow label="SCIM base URL" value={sp.scimBaseUrl} />
          </CardBody></Card>

          <Card><CardBody className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users size={15} className="text-indigo-500" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">SCIM provisioning</h3>
              </div>
              <button onClick={createToken} className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-indigo-500">
                <Plus size={12} /> New token
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Lets your directory create, update and deactivate employees automatically.
            </p>

            {newToken && (
              <div className="rounded-lg border border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10 p-3">
                <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">Copy this token now — it is shown only once.</p>
                <p className="mt-1 break-all font-mono text-[11px] text-amber-800 dark:text-amber-200">{newToken}</p>
                <button onClick={() => setNewToken(null)} className="mt-2 text-[11px] font-medium text-amber-700 dark:text-amber-300 hover:underline">Done</button>
              </div>
            )}

            <div className="space-y-1.5">
              {(tokenData?.tokens || []).length === 0 && (
                <p className="py-2 text-xs text-slate-400">No tokens yet.</p>
              )}
              {(tokenData?.tokens || []).map((t) => (
                <div key={t.id} className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-2">
                  <KeyRound size={13} className={t.active ? "text-emerald-500" : "text-slate-300"} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-slate-800 dark:text-slate-200">{t.name}</p>
                    <p className="text-[10px] text-slate-400">
                      ••••{t.last4} · {t.active ? (t.lastUsedAt ? `last used ${new Date(t.lastUsedAt).toLocaleDateString()}` : "never used") : "revoked"}
                    </p>
                  </div>
                  {t.active && (
                    <button onClick={() => revokeToken(t.id)} className="shrink-0 rounded-md p-1.5 text-slate-400 hover:text-red-500" title="Revoke">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </CardBody></Card>
        </div>
      </div>
    </div>
  );
}
