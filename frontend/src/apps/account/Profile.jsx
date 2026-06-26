import { useState, useEffect, useRef } from "react";
import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import { useToast } from "../../components/ui/Toast";
import { User, Building2, Save, Loader2, AlertCircle } from "lucide-react";
import { useApi, useMutation } from "../../hooks/useApi";
import { account } from "../../services/api";

export default function Profile() {
  const toast = useToast();
  const avatarInputRef = useRef(null);
  const [form, setForm] = useState(null);

  function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ message: "Image too large — pick one under 2 MB.", type: "error" });
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      // Stage the image into the form so it persists on Save (and propagates app-wide).
      setForm((p) => ({ ...p, avatarUrl: ev.target.result }));
      toast({ message: "Avatar updated — click Save Changes to apply.", type: "info" });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  const { data: profile, loading, error } = useApi(() => account.profile.get(), []);

  useEffect(() => {
    if (profile) setForm({ ...profile });
  }, [profile]);

  const { mutate: saveProfile, loading: saving } = useMutation(
    (data) => account.profile.update(data),
    {
      onSuccess: (updated) => {
        toast({ message: "Profile updated successfully", type: "success" });
        // Keep the locally-stored user in sync so the sidebar + greeting update.
        try {
          const u = JSON.parse(localStorage.getItem("user")) ?? {};
          localStorage.setItem("user", JSON.stringify({
            ...u,
            firstName: updated.firstName,
            lastName: updated.lastName,
            name: updated.name,
            phone: updated.phone,
            department: updated.department,
            jobTitle: updated.jobTitle,
            role: updated.role ?? u.role,
            avatarUrl: updated.avatarUrl,
            avatar_url: updated.avatarUrl,
          }));
        } catch { /* ignore */ }
      },
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
            <div className="relative">
              {form.avatarUrl ? (
                <img src={form.avatarUrl} alt="avatar" className="h-16 w-16 rounded-full object-cover" />
              ) : (
                <div className="h-16 w-16 rounded-full bg-indigo-600 flex items-center justify-center text-white text-2xl font-bold">
                  {form.name?.[0] ?? "?"}
                </div>
              )}
            </div>
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">{form.name}</p>
              <p className="text-sm text-slate-500">{form.role}</p>
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              <button
                onClick={() => avatarInputRef.current?.click()}
                className="text-xs text-indigo-600 dark:text-indigo-400 mt-1 hover:underline"
              >
                Change avatar
              </button>
            </div>
          </div>

          {[
            { key: "name",       label: "Full Name" },
            { key: "email",      label: "Email Address", type: "email", readOnly: true, hint: "Your login email can't be changed here." },
            { key: "phone",      label: "Phone Number",  type: "tel" },
            { key: "department", label: "Department" },
            { key: "jobTitle",   label: "Job Title" },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{f.label}</label>
              <input
                type={f.type || "text"}
                value={form[f.key] ?? ""}
                readOnly={f.readOnly}
                onChange={f.readOnly ? undefined : (e => setForm(p => ({ ...p, [f.key]: e.target.value })))}
                className={`w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${f.readOnly ? "bg-slate-50 dark:bg-slate-900 text-slate-400 cursor-not-allowed" : "bg-white dark:bg-slate-800"}`}
              />
              {f.hint && <p className="mt-1 text-[11px] text-slate-400">{f.hint}</p>}
            </div>
          ))}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Organization" icon={Building2} subtitle="Managed by your enterprise admin" />
        <CardBody className="space-y-4">
          {[
            { label: "Company",     value: form.enterprise ?? form.tenant?.name },
            { label: "Your Role",   value: (form.role ?? "").replace(/_/g, " ") },
            { label: "Employee ID", value: form.employeeId },
          ].map(f => (
            <div key={f.label}>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{f.label}</label>
              <div className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 capitalize">
                {f.value || "—"}
              </div>
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
