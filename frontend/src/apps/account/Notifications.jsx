import { useState } from "react";
import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import { useToast } from "../../components/ui/Toast";
import { Bell, Save } from "lucide-react";

const initialPrefs = {
  incidentAlerts:   { email: true,  inApp: true,  sms: true  },
  dealUpdates:      { email: true,  inApp: true,  sms: false },
  campaignReports:  { email: true,  inApp: false, sms: false },
  systemMaintenance:{ email: true,  inApp: true,  sms: false },
  securityAlerts:   { email: true,  inApp: true,  sms: true  },
  weeklyDigest:     { email: true,  inApp: false, sms: false },
};

const labels = {
  incidentAlerts:   "Incident Alerts",
  dealUpdates:      "Deal Updates",
  campaignReports:  "Campaign Reports",
  systemMaintenance:"System Maintenance",
  securityAlerts:   "Security Alerts",
  weeklyDigest:     "Weekly Digest",
};

function Toggle({ on, onChange }) {
  return (
    <button
      onClick={onChange}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${on ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-600"}`}
    >
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${on ? "translate-x-4.5" : "translate-x-0.5"}`}
        style={{ transform: on ? "translateX(18px)" : "translateX(2px)" }} />
    </button>
  );
}

export default function Notifications() {
  const toast = useToast();
  const [prefs, setPrefs] = useState(initialPrefs);

  const toggle = (key, channel) =>
    setPrefs(p => ({ ...p, [key]: { ...p[key], [channel]: !p[key][channel] } }));

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
            {Object.keys(prefs).map(key => (
              <div key={key} className="grid grid-cols-4 gap-4 items-center p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition">
                <span className="text-sm text-slate-700 dark:text-slate-300">{labels[key]}</span>
                {["email", "inApp", "sms"].map(ch => (
                  <div key={ch} className="flex justify-center">
                    <Toggle on={prefs[key][ch]} onChange={() => toggle(key, ch)} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      <button
        onClick={() => toast({ message: "Notification preferences saved", type: "success" })}
        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-5 py-2.5 rounded-lg transition"
      >
        <Save size={15} /> Save Preferences
      </button>
    </div>
  );
}
