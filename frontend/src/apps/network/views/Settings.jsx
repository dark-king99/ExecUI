import { useState } from "react";
import { Settings as SettingsIcon, Network, Cpu, Shield, Globe } from "lucide-react";

const profiles = [
  {
    id: "eth0",
    name: "Ethernet - Office LAN",
    type: "ethernet",
    settings: {
      connection: {
        id: "Office LAN",
        autoconnect: true,
        interface: "eth0",
      },
      ipv4: {
        method: "auto",
        address: "192.168.1.10/24",
        gateway: "192.168.1.1",
        dns: "8.8.8.8, 1.1.1.1",
      },
      ipv6: {
        method: "ignore",
      },
      ethernet: {
        mtu: 1500,
        mac: "00:1A:2B:3C:4D:5E",
      },
    },
  },
  {
    id: "vpn1",
    name: "Site-to-Site VPN",
    type: "vpn",
    settings: {
      connection: {
        id: "Site VPN",
        autoconnect: false,
        interface: "tun0",
      },
      ipv4: {
        method: "manual",
        address: "10.10.0.2/24",
        gateway: "10.10.0.1",
        dns: "10.10.0.1",
      },
      ipv6: {
        method: "auto",
      },
      ethernet: {
        mtu: 1400,
        mac: "",
      },
    },
  },
];

const settingTabs = [
  { id: "connection", label: "Connection", icon: Network },
  { id: "ipv4", label: "IPv4", icon: Globe },
  { id: "ipv6", label: "IPv6", icon: Globe },
  { id: "ethernet", label: "Ethernet", icon: Cpu },
];

export default function Settings() {
  const [selectedProfile, setSelectedProfile] = useState(profiles[0]);
  const [activeTab, setActiveTab] = useState("connection");

  const settings = selectedProfile.settings[activeTab];

  return (
    <div className="h-full w-full flex gap-6">
      {/* Profiles Sidebar */}
      <div className="w-72 border-r border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-4">
        <div className="flex items-center gap-2 mb-4">
          <SettingsIcon className="h-5 w-5 text-indigo-500" />
          <h2 className="text-lg font-semibold">Connection Profiles</h2>
        </div>

        <div className="space-y-2">
          {profiles.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setSelectedProfile(p);
                setActiveTab("connection");
              }}
              className={`w-full text-left px-3 py-2 rounded text-sm transition ${
                selectedProfile.id === p.id
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

      {/* Settings Panel */}
      <div className="flex-1 flex flex-col">
        {/* Tabs */}
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

        {/* Properties Editor */}
        <div className="flex-1 p-6 overflow-auto bg-slate-50 dark:bg-slate-950">
          <div className="max-w-2xl space-y-4">
            <h3 className="text-xl font-semibold">
              {selectedProfile.name} — {activeTab.toUpperCase()}
            </h3>

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
                    value={value}
                    readOnly
                    className="col-span-2 px-3 py-2 rounded border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-sm"
                  />
                )}
              </div>
            ))}

            {/* Context Info */}
            <div className="mt-8 rounded-lg border border-slate-200 dark:border-white/10 p-4 text-sm bg-white dark:bg-slate-900">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Shield size={16} /> Representation
              </h4>
              <ul className="list-disc pl-5 space-y-1 text-slate-600 dark:text-slate-300">
                <li>nmcli: nmcli con show "{selectedProfile.settings.connection.id}"</li>
                <li>D-Bus: org.freedesktop.NetworkManager.Settings</li>
                <li>keyfile: /etc/NetworkManager/system-connections/*.nmconnection</li>
                <li>ifcfg-rh: /etc/sysconfig/network-scripts/ifcfg-*</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
