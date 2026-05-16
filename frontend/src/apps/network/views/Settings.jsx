import { useState } from "react";
import { Settings as SettingsIcon, Network, Cpu, Shield, Globe, AlertCircle, Loader2, Save, RefreshCw } from "lucide-react";
import PageHeader from "../../../components/ui/PageHeader";
import { Card, CardHeader, CardBody } from "../../../components/ui/Card";
import StatusBadge from "../../../components/ui/StatusBadge";
import { SkeletonTable } from "../../../components/ui/Skeleton";
import { useToast } from "../../../components/ui/Toast";
import { useApi, useMutation } from "../../../hooks/useApi";
import { network } from "../../../services/api";

const SETTING_TABS = [
  { id: "connection", label: "Connection", icon: Network },
  { id: "ipv4",       label: "IPv4",       icon: Globe },
  { id: "ipv6",       label: "IPv6",       icon: Globe },
  { id: "ethernet",   label: "Ethernet",   icon: Cpu },
  { id: "security",   label: "Security",   icon: Shield },
];

export default function Settings() {
  const toast = useToast();
  const [selectedId, setSelectedId] = useState(null);
  const [activeTab, setActiveTab] = useState("connection");

  const { data: profiles, loading, error, refetch } = useApi(() => network.settings.profiles.list(), [], { pollingInterval: 120000 });
  const { data: globalSettings, loading: gLoading } = useApi(() => network.settings.get(), [], { pollingInterval: 120000 });

  const { mutate: saveProfile } = useMutation((d) => network.settings.profiles.update(d.id, d), {
    onSuccess: () => { toast({ message: "Settings saved", type: "success" }); },
    onError: (e) => toast({ message: e?.message ?? "Failed to save", type: "error" }),
  });
  const { mutate: saveGlobal } = useMutation((d) => network.settings.update(d), {
    onSuccess: () => { toast({ message: "Global settings saved", type: "success" }); },
    onError: (e) => toast({ message: e?.message ?? "Failed to save", type: "error" }),
  });

  const allProfiles = profiles ?? [];
  const selectedProfile = allProfiles.find(p => p.id === selectedId) ?? allProfiles[0] ?? null;
  const settings = selectedProfile?.settings?.[activeTab] ?? {};
  const global = globalSettings ?? {};

  return (
    <div className="space-y-6">
      <PageHeader title="Network Settings" subtitle="Configure connection profiles, IP settings, and security"
        actions={<button onClick={refetch} className="flex items-center gap-1.5 text-xs border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"><RefreshCw size={13} /> Refresh</button>}
      />

      {error && <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"><AlertCircle size={15} />{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-500 uppercase tracking-wider">Connection Profiles</div>
            {loading ? (
              <div className="p-4"><SkeletonTable rows={4} /></div>
            ) : allProfiles.length === 0 ? (
              <p className="p-4 text-sm text-slate-500 text-center">No profiles available.</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {allProfiles.map((p) => (
                  <button key={p.id} onClick={() => { setSelectedId(p.id); setActiveTab("connection"); }} className={`w-full flex items-center justify-between px-4 py-3 text-left transition ${selectedProfile?.id === p.id ? "bg-emerald-50 dark:bg-emerald-900/10" : "hover:bg-slate-50 dark:hover:bg-slate-800/50"}`}>
                    <div>
                      <div className={`text-sm font-medium ${selectedProfile?.id === p.id ? "text-emerald-700 dark:text-emerald-400" : "text-slate-900 dark:text-white"}`}>{p.name}</div>
                      {p.type && <div className="text-xs text-slate-400 capitalize">{p.type}</div>}
                    </div>
                    {p.active && <StatusBadge label="Active" variant="success" dot />}
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="lg:col-span-3 space-y-4">
          {selectedProfile ? (
            <Card>
              <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex gap-0.5">
                  {SETTING_TABS.map(({ id, label, icon: Icon }) => (
                    <button key={id} onClick={() => setActiveTab(id)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${activeTab === id ? "bg-emerald-600 text-white" : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"}`}>
                      <Icon size={12} />{label}
                    </button>
                  ))}
                </div>
                <button onClick={() => saveProfile({ ...selectedProfile, id: selectedProfile.id })} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition"><Save size={12} />Save</button>
              </div>
              <CardBody>
                {Object.keys(settings).length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-6">No {activeTab} settings available for this profile.</p>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(settings).map(([key, value]) => (
                      <div key={key} className="grid grid-cols-2 gap-4 items-center pb-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
                        <label className="text-sm text-slate-600 dark:text-slate-400 capitalize">{key.replace(/_/g, " ").replace(/([A-Z])/g, " $1").trim()}</label>
                        {typeof value === "boolean" ? (
                          <div className={`inline-flex items-center gap-1.5 text-sm font-medium ${value ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}`}>
                            <div className={`h-4 w-8 rounded-full transition-colors ${value ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"}`}>
                              <div className={`h-4 w-4 rounded-full bg-white shadow transition-transform ${value ? "translate-x-4" : ""}`} />
                            </div>
                            {value ? "Enabled" : "Disabled"}
                          </div>
                        ) : (
                          <div className="text-sm font-medium text-slate-900 dark:text-white">{String(value)}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          ) : (
            <div className="flex items-center justify-center h-48 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-slate-400">
              <div className="text-center">
                <SettingsIcon size={32} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                <p className="text-sm">Select a profile to configure settings.</p>
              </div>
            </div>
          )}

          {Object.keys(global).length > 0 && (
            <Card>
              <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-800">
                <div className="text-sm font-semibold text-slate-900 dark:text-white">Global Network Settings</div>
                <button onClick={() => saveGlobal(global)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition"><Save size={12} />Save</button>
              </div>
              <CardBody>
                {gLoading ? <SkeletonTable rows={4} /> : (
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(global).filter(([, v]) => v != null && typeof v !== "object").map(([key, value]) => (
                      <div key={key} className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
                        <div className="text-xs text-slate-400 mb-0.5 capitalize">{key.replace(/_/g, " ").replace(/([A-Z])/g, " $1").trim()}</div>
                        <div className="text-sm font-medium text-slate-900 dark:text-white">{String(value)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
