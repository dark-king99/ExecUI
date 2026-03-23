import { useState } from "react";
import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import { useToast } from "../../components/ui/Toast";
import { ShieldCheck, Smartphone, Globe, LogOut } from "lucide-react";

const sessions = [
  { device: "Chrome on macOS",  location: "New York, US",    lastActive: "Now",       current: true },
  { device: "Safari on iPhone", location: "New York, US",    lastActive: "2h ago",    current: false },
  { device: "Firefox on Linux", location: "Amsterdam, NL",   lastActive: "3 days ago",current: false },
];

export default function Security() {
  const toast = useToast();
  const [mfa, setMfa] = useState(true);
  const [sso, setSso] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader title="Security" subtitle="Manage authentication, sessions and device security" />

      <Card>
        <CardHeader title="Password" icon={ShieldCheck} />
        <CardBody className="space-y-4">
          {["Current Password", "New Password", "Confirm New Password"].map(label => (
            <div key={label}>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{label}</label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          ))}
          <button
            onClick={() => toast({ message: "Password updated", type: "success" })}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg transition"
          >
            Update Password
          </button>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Two-Factor Authentication" icon={Smartphone} />
        <CardBody>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-white">Authenticator App</p>
              <p className="text-xs text-slate-500 mt-0.5">Use an authenticator app for 2FA codes</p>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge label={mfa ? "Enabled" : "Disabled"} variant={mfa ? "success" : "neutral"} dot />
              <button
                onClick={() => { setMfa(m => !m); toast({ message: mfa ? "2FA disabled" : "2FA enabled", type: mfa ? "warning" : "success" }); }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${mfa ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-600"}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${mfa ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-white">SSO / SAML</p>
              <p className="text-xs text-slate-500 mt-0.5">Enterprise single sign-on</p>
            </div>
            <button
              onClick={() => { setSso(s => !s); toast({ message: "SSO settings saved", type: "info" }); }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${sso ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-600"}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${sso ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Active Sessions" icon={Globe} />
        <CardBody className="space-y-3">
          {sessions.map((s, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{s.device}</p>
                  {s.current && <StatusBadge label="Current" variant="success" dot />}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{s.location} · {s.lastActive}</p>
              </div>
              {!s.current && (
                <button
                  onClick={() => toast({ message: "Session revoked", type: "warning" })}
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
