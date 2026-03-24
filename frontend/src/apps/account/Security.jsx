import { useState } from "react";
import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import { useToast } from "../../components/ui/Toast";
import { ShieldCheck, Smartphone, Globe, LogOut, Loader2, AlertCircle } from "lucide-react";
import { useApi, useMutation } from "../../hooks/useApi";
import { account } from "../../services/api";

export default function Security() {
  const toast = useToast();
  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });

  const { data: security, loading: secLoading, error: secError, refetch: refetchSec } = useApi(
    () => account.security.get(), [], {}
  );
  const { data: sessions, loading: sessionsLoading, error: sessionsError, refetch: refetchSessions } = useApi(
    () => account.security.sessions.list(), [], { pollingInterval: 60000 }
  );

  const mfaEnabled = security?.mfa?.enabled ?? false;

  const { mutate: changePassword, loading: changingPw } = useMutation(
    (data) => account.security.changePassword(data),
    {
      onSuccess: () => {
        toast({ message: "Password updated", type: "success" });
        setPasswords({ current: "", next: "", confirm: "" });
      },
      onError: (err) => toast({ message: err?.message ?? "Failed to update password", type: "error" }),
    }
  );

  const { mutate: toggleMfa, loading: togglingMfa } = useMutation(
    () => mfaEnabled ? account.security.mfa.disable() : account.security.mfa.enable(),
    {
      onSuccess: () => { toast({ message: mfaEnabled ? "2FA disabled" : "2FA enabled", type: mfaEnabled ? "warning" : "success" }); refetchSec(); },
      onError: (err) => toast({ message: err?.message ?? "Failed to update 2FA", type: "error" }),
    }
  );

  const { mutate: revokeSession } = useMutation(
    (id) => account.security.sessions.revoke(id),
    {
      onSuccess: () => { toast({ message: "Session revoked", type: "warning" }); refetchSessions(); },
      onError: (err) => toast({ message: err?.message ?? "Failed to revoke session", type: "error" }),
    }
  );

  const handlePasswordSubmit = () => {
    if (!passwords.current || !passwords.next) return;
    if (passwords.next !== passwords.confirm) {
      toast({ message: "Passwords do not match", type: "error" }); return;
    }
    changePassword({ currentPassword: passwords.current, newPassword: passwords.next });
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Security" subtitle="Manage authentication, sessions and device security" />

      <Card>
        <CardHeader title="Password" icon={ShieldCheck} />
        <CardBody className="space-y-4">
          {[
            { label: "Current Password", field: "current" },
            { label: "New Password",     field: "next" },
            { label: "Confirm New Password", field: "confirm" },
          ].map(({ label, field }) => (
            <div key={field}>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{label}</label>
              <input
                type="password"
                value={passwords[field]}
                onChange={e => setPasswords(p => ({ ...p, [field]: e.target.value }))}
                placeholder="••••••••"
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          ))}
          <button
            onClick={handlePasswordSubmit}
            disabled={changingPw}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm px-4 py-2 rounded-lg transition"
          >
            {changingPw && <Loader2 size={14} className="animate-spin" />}
            Update Password
          </button>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Two-Factor Authentication" icon={Smartphone} />
        <CardBody>
          {secError && (
            <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 mb-3">
              <AlertCircle size={15} /> {secError}
            </div>
          )}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-white">Authenticator App</p>
              <p className="text-xs text-slate-500 mt-0.5">Use an authenticator app for 2FA codes</p>
            </div>
            <div className="flex items-center gap-3">
              {!secLoading && <StatusBadge label={mfaEnabled ? "Enabled" : "Disabled"} variant={mfaEnabled ? "success" : "neutral"} dot />}
              <button
                onClick={() => toggleMfa()}
                disabled={togglingMfa || secLoading}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-60 ${mfaEnabled ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-600"}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${mfaEnabled ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>
          </div>

          {security?.sso !== undefined && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">SSO / SAML</p>
                <p className="text-xs text-slate-500 mt-0.5">Enterprise single sign-on</p>
              </div>
              <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${security.sso?.enabled ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-600"}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${security.sso?.enabled ? "translate-x-6" : "translate-x-1"}`} />
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Active Sessions" icon={Globe} />
        <CardBody className="space-y-3">
          {sessionsError && (
            <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
              <AlertCircle size={15} /> {sessionsError}
            </div>
          )}

          {sessionsLoading && !sessions && (
            <div className="space-y-2 animate-pulse">
              {[1, 2, 3].map(i => <div key={i} className="h-14 bg-slate-100 dark:bg-slate-700 rounded-xl" />)}
            </div>
          )}

          {!sessionsLoading && !sessionsError && sessions?.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-4">No active sessions found.</p>
          )}

          {sessions?.map((s, i) => (
            <div key={s.id ?? i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{s.device}</p>
                  {s.current && <StatusBadge label="Current" variant="success" dot />}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{s.location} · {s.lastActive}</p>
              </div>
              {!s.current && (
                <button
                  onClick={() => revokeSession(s.id)}
                  className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 hover:underline"
                >
                  <LogOut size={13} /> Revoke
                </button>
              )}
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}
