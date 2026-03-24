import { useState, useEffect } from "react";
import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import { useToast } from "../../components/ui/Toast";
import { User, Building2, Save, Loader2, AlertCircle } from "lucide-react";
import { useApi, useMutation } from "../../hooks/useApi";
import { account } from "../../services/api";

export default function Profile() {
  const toast = useToast();
  const [form, setForm] = useState(null);

  const { data: profile, loading, error } = useApi(() => account.profile.get(), []);

  useEffect(() => {
    if (profile) setForm({ ...profile });
  }, [profile]);

  const { mutate: saveProfile, loading: saving } = useMutation(
    (data) => account.profile.update(data),
    {
      onSuccess: () => toast({ message: "Profile updated successfully", type: "success" }),
      onError: (err) => toast({ message: err?.message ?? "Failed to save profile", type: "error" }),
    }
  );

  const handleSave = () => {
    if (form) saveProfile(form);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Profile" subtitle="Manage your personal and organization details" />
        <div className="space-y-4">
          {[1, 2].map(i => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 animate-pulse">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/4 mb-4" />
              <div className="space-y-3">
                {[1, 2, 3].map(j => (
                  <div key={j} className="h-9 bg-slate-100 dark:bg-slate-700 rounded" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Profile" subtitle="Manage your personal and organization details" />
        <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
          <AlertCircle size={18} />
          <span className="text-sm">{error}</span>
        </div>
      </div>
    );
  }

  if (!form) return null;

  return (
    <div className="space-y-6">
      <PageHeader title="Profile" subtitle="Manage your personal and organization details" />

      <Card>
        <CardHeader title="Personal Information" icon={User} />
        <CardBody className="space-y-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="h-16 w-16 rounded-full bg-indigo-600 flex items-center justify-center text-white text-2xl font-bold">
              {form.name?.[0] ?? "?"}
            </div>
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">{form.name}</p>
              <p className="text-sm text-slate-500">{form.role}</p>
              <button className="text-xs text-indigo-600 dark:text-indigo-400 mt-1 hover:underline">Change avatar</button>
            </div>
          </div>

          {[
            { key: "name",     label: "Full Name" },
            { key: "email",    label: "Email Address", type: "email" },
            { key: "phone",    label: "Phone Number",  type: "tel" },
            { key: "timezone", label: "Timezone" },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{f.label}</label>
              <input
                type={f.type || "text"}
                value={form[f.key] ?? ""}
                onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          ))}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Organization" icon={Building2} />
        <CardBody className="space-y-4">
          {[
            { key: "company", label: "Company Name" },
            { key: "role",    label: "Your Role" },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{f.label}</label>
              <input
                type="text"
                value={form[f.key] ?? ""}
                onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          ))}
        </CardBody>
      </Card>

      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm px-5 py-2.5 rounded-lg transition"
      >
        {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
        {saving ? "Saving…" : "Save Changes"}
      </button>
    </div>
  );
}
