import { useState, useEffect } from "react";
import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import { useToast } from "../../components/ui/Toast";
import { Bell, Save, Loader2, AlertCircle } from "lucide-react";
import { useApi, useMutation } from "../../hooks/useApi";
import { account } from "../../services/api";

const LABELS = {
  incidentAlerts:    "Incident Alerts",
  dealUpdates:       "Deal Updates",
  campaignReports:   "Campaign Reports",
  systemMaintenance: "System Maintenance",
  securityAlerts:    "Security Alerts",
  weeklyDigest:      "Weekly Digest",
};

function Toggle({ on, onChange }) {
  return (
    <button
      onClick={onChange}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${on ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-600"}`}
    >
      <span
        className="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform"
        style={{ transform: on ? "translateX(18px)" : "translateX(2px)" }}
      />
    </button>
  );
}

export default function Notifications() {
  const toast = useToast();
  const [prefs, setPrefs] = useState(null);

  const { data, loading, error } = useApi(() => account.notifications.preferences(), []);

  useEffect(() => {
    if (data) setPrefs({ ...data });
  }, [data]);

  const { mutate: savePrefs, loading: saving } = useMutation(
    (p) => account.notifications.updatePreferences(p),
    {
      onSuccess: () => toast({ message: "Notification preferences saved", type: "success" }),
      onError: (err) => toast({ message: err?.message ?? "Failed to save preferences", type: "error" }),
    }
  );

  const toggle = (key, channel) =>
    setPrefs(p => ({ ...p, [key]: { ...p[key], [channel]: !p[key][channel] } }));

  if (loading && !prefs) {
    return (
      <div className="space-y-6">
        <PageHeader title="Notifications" subtitle="Control how and when you receive alerts" />
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 animate-pulse space-y-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-10 bg-slate-100 dark:bg-slate-700 rounded" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Notifications" subtitle="Control how and when you receive alerts" />
        <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
          <AlertCircle size={16} /> {error}
        </div>
      </div>
    );
  }

  if (!prefs) return null;

  const keys = Object.keys(prefs).filter(k => typeof prefs[k] === "object");

  return (
    <div className="space-y-6">
      <PageHeader title="Notifications" subtitle="Control how and when you receive alerts" />

      <Card>
        <CardHeader title="Notification Preferences" icon={Bell} />
        <CardBody>
          <div className="grid grid-cols-4 gap-4 mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400 px-2">
            <span>Event</span>
            <span className="text-center">Email</span>
            <span className="text-center">In-App</span>
            <span className="text-center">SMS</span>
          </div>
          <div className="space-y-2">
            {keys.map(key => (
              <div key={key} className="grid grid-cols-4 gap-4 items-center p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition">
                <span className="text-sm text-slate-700 dark:text-slate-300">{LABELS[key] ?? key}</span>
                {["email", "inApp", "sms"].map(ch => (
                  <div key={ch} className="flex justify-center">
                    <Toggle on={!!prefs[key][ch]} onChange={() => toggle(key, ch)} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      <button
        onClick={() => savePrefs(prefs)}
        disabled={saving}
        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm px-5 py-2.5 rounded-lg transition"
      >
        {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
        {saving ? "Saving…" : "Save Preferences"}
      </button>
    </div>
  );
}
