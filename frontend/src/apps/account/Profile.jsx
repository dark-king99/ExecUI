import { useState } from "react";
import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import { useToast } from "../../components/ui/Toast";
import { User, Building2, Save } from "lucide-react";

export default function Profile() {
  const toast = useToast();
  const [form, setForm] = useState({
    name: "Artemis Haven",
    email: "admin@artemishaven.io",
    phone: "+1 (555) 820-4400",
    company: "Artemis Haven Inc.",
    role: "Enterprise Admin",
    timezone: "America/New_York",
  });

  const save = () => toast({ message: "Profile updated successfully", type: "success" });

  return (
    <div className="space-y-6">
      <PageHeader title="Profile" subtitle="Manage your personal and organization details" />

      <Card>
        <CardHeader title="Personal Information" icon={User} />
        <CardBody className="space-y-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="h-16 w-16 rounded-full bg-indigo-600 flex items-center justify-center text-white text-2xl font-bold">
              {form.name[0]}
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
                value={form[f.key]}
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
                value={form[f.key]}
                onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          ))}
        </CardBody>
      </Card>

      <button
        onClick={save}
        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-5 py-2.5 rounded-lg transition"
      >
        <Save size={15} /> Save Changes
      </button>
    </div>
  );
}
