import { useState, useEffect } from "react";
import { Building2, Copy, Check, Users, UserCheck, Mail, ShieldCheck, Save } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import { Card, CardHeader, CardBody, Stat } from "../../components/ui/Card";
import { SkeletonCard } from "../../components/ui/Skeleton";
import { useToast } from "../../components/ui/Toast";
import { useApi, useMutation } from "../../hooks/useApi";
import { enterprise } from "../../services/api";
import BrandingCard from "./BrandingCard";
import DangerZone from "./DangerZone";

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }) : "—");

export default function OrganizationProfile() {
  const toast = useToast();
  const { data: org, loading, refetch } = useApi(() => enterprise.organization.get(), []);
  const [name, setName] = useState("");
  const [copied, setCopied] = useState(false);
  const { mutate: save, loading: saving } = useMutation((d) => enterprise.organization.update(d), {
    onSuccess: () => { toast({ message: "Organization updated", type: "success" }); refetch(); },
    onError: (e) => toast({ message: e?.message ?? "Failed", type: "error" }),
  });

  useEffect(() => { if (org?.name) setName(org.name); }, [org?.name]);

  const m = org?.members ?? {};
  const copyCode = () => {
    if (!org?.code) return;
    navigator.clipboard?.writeText(org.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Organization" subtitle="Your enterprise account — visible to admins only. Personal settings live under Profile." />

      {loading && !org ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Members" value={m.total ?? 0} icon={Users} color="indigo" />
          <Stat label="Active" value={m.active ?? 0} icon={UserCheck} color="emerald" />
          <Stat label="Invited" value={m.invited ?? 0} icon={Mail} color="amber" />
          <Stat label="Admins" value={m.admins ?? 0} icon={ShieldCheck} color="violet" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Enterprise details" icon={Building2} />
          <CardBody className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Organization name</label>
              <div className="flex items-center gap-2">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="flex-1 text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={() => name.trim() && save({ name })}
                  disabled={saving || !name.trim() || name === org?.name}
                  className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white transition"
                >
                  <Save size={14} /> {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-xs text-slate-400">Workspace slug</div>
                <div className="text-slate-700 dark:text-slate-200 font-mono text-xs mt-0.5 truncate">{org?.slug ?? "—"}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Plan</div>
                <div className="text-slate-700 dark:text-slate-200 mt-0.5">{org?.plan ?? "—"}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Created</div>
                <div className="text-slate-700 dark:text-slate-200 mt-0.5">{fmtDate(org?.createdAt)}</div>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Enterprise join code" subtitle="Employees need this code to join" icon={Copy} />
          <CardBody>
            <div className="rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/60 dark:bg-indigo-900/20 p-5 flex items-center justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-indigo-500 dark:text-indigo-400">Enterprise Code</div>
                <div className="text-2xl font-bold text-indigo-700 dark:text-indigo-300 font-mono mt-1">{org?.code ?? "—"}</div>
              </div>
              <button onClick={copyCode} className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition">
                {copied ? <Check size={15} /> : <Copy size={15} />}{copied ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 leading-relaxed">
              Share this code with new employees. To onboard someone, add them under <span className="font-medium">Members</span> with an Employee ID, then give them this code — they complete signup with their ID, email, and a password.
            </p>
          </CardBody>
        </Card>
      </div>

      <BrandingCard />

      <DangerZone orgName={org?.name} />
    </div>
  );
}
