import { useState } from "react";
import { Settings as SettingsIcon, Network, Cpu, Shield, Globe, AlertCircle, Loader2 } from "lucide-react";
import { useApi } from "../../../hooks/useApi";
import { network } from "../../../services/api";

const settingTabs = [
  { id: "connection", label: "Connection", icon: Network },
  { id: "ipv4",       label: "IPv4",       icon: Globe },
  { id: "ipv6",       label: "IPv6",       icon: Globe },
  { id: "ethernet",   label: "Ethernet",   icon: Cpu },
];

export default function Settings() {
  const [selectedId, setSelectedId] = useState(null);
  const [activeTab, setActiveTab] = useState("connection");

  const { data: profiles, loading, error } = useApi(
    () => network.settings.profiles.list(), [], { pollingInterval: 60000 }
  );

  const allProfiles = profiles ?? [];
  const selectedProfile = allProfiles.find(p => p.id === selectedId) ?? allProfiles[0] ?? null;

  const settings = selectedProfile?.settings?.[activeTab] ?? {};

  const handleSelect = (p) => {
    setSelectedId(p.id);
    setActiveTab("connection");
  };

  return (
    <div className="h-full w-full flex gap-6">
      <div className="w-72 border-r border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-4">
        <div className="flex items-center gap-2 mb-4">
          <SettingsIcon className="h-5 w-5 text-indigo-500" />
          <h2 className="text-lg font-semibold">Connection Profiles</h2>
        </div>

        {loading && (
          <div className="flex justify-center py-4">
            <Loader2 size={18} className="animate-spin text-slate-400" />
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400 p-2 bg-red-50 dark:bg-red-900/20 rounded">
            <AlertCircle size={13} /> {error}
          </div>
        )}

        {!loading && !error && allProfiles.length === 0 && (
          <p className="text-sm text-slate-500">No profiles found.</p>
        )}

        <div className="space-y-2">
          {allProfiles.map((p) => (
            <button
              key={p.id}
              onClick={() => handleSelect(p)}
              className={`w-full text-left px-3 py-2 rounded text-sm transition ${
                selectedProfile?.id === p.id
                  ? "bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300"
                  : "hover:bg-slate-100 dark:hover:bg-white/5"
              }`}
            >
              <div className="font-medium">{p.name}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{p.type}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-white/10 px-4 py-2 bg-white dark:bg-slate-900">
          {settingTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded text-sm ${
                  activeTab === tab.id
                    ? "bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300"
                    : "hover:bg-slate-100 dark:hover:bg-white/5"
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex-1 p-6 overflow-auto bg-slate-50 dark:bg-slate-950">
          {!selectedProfile && !loading && (
            <p className="text-sm text-slate-500">Select a profile to view its settings.</p>
          )}

          {selectedProfile && (
            <div className="max-w-2xl space-y-4">
              <h3 className="text-xl font-semibold">
                {selectedProfile.name} — {activeTab.toUpperCase()}
              </h3>

              {Object.keys(settings).length === 0 && (
                <p className="text-sm text-slate-500">No settings for this tab.</p>
              )}

              {Object.entries(settings).map(([key, value]) => (
                <div key={key} className="grid grid-cols-3 gap-4 items-center">
                  <label className="text-sm font-medium text-slate-600 dark:text-slate-300">
                    {key}
                  </label>

                  {typeof value === "boolean" ? (
                    <input type="checkbox" checked={value} readOnly />
                  ) : (
                    <input
                      type="text"
                      value={String(value ?? "")}
                      readOnly
                      className="col-span-2 px-3 py-2 rounded border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-sm"
                    />
                  )}
                </div>
              ))}

              <div className="mt-8 rounded-lg border border-slate-200 dark:border-white/10 p-4 text-sm bg-white dark:bg-slate-900">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Shield size={16} /> Representation
                </h4>
                <ul className="list-disc pl-5 space-y-1 text-slate-600 dark:text-slate-300">
                  <li>nmcli: nmcli con show "{selectedProfile.settings?.connection?.id ?? selectedProfile.name}"</li>
                  <li>D-Bus: org.freedesktop.NetworkManager.Settings</li>
                  <li>keyfile: /etc/NetworkManager/system-connections/*.nmconnection</li>
                  <li>ifcfg-rh: /etc/sysconfig/network-scripts/ifcfg-*</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
