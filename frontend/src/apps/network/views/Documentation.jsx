import { useState } from "react";
import { BookOpen, FileText, Settings, Terminal, Database, Folder } from "lucide-react";

const docs = [
  {
    id: "overview",
    title: "Overview",
    icon: BookOpen,
    content: (
      <>
        <h2 className="text-2xl font-semibold mb-4">Network Management Documentation</h2>
        <p className="mb-4">
          This documentation describes how network connections, devices, and settings are
          represented and managed within the Network module. It mirrors real-world concepts
          used by NetworkManager, including connection profiles, setting groups, and their
          representations across different interfaces.
        </p>
        <p>
          You will find references to <strong>nmcli</strong>, <strong>D-Bus</strong>, and the
          two main configuration formats: <strong>keyfile</strong> and{" "}
          <strong>ifcfg-rh</strong>.
        </p>
      </>
    ),
  },
  {
    id: "profiles",
    title: "Connection Profiles",
    icon: Settings,
    content: (
      <>
        <h2 className="text-2xl font-semibold mb-4">Connection Profiles</h2>
        <p className="mb-4">
          A connection profile describes how to connect a device to a network. Each profile
          contains one or more setting groups such as <code>connection</code>, <code>ipv4</code>,
          <code>ipv6</code>, and <code>ethernet</code>.
        </p>
        <p>
          Profiles can be created, modified, and activated through the UI, via <code>nmcli</code>,
          or over D-Bus.
        </p>
      </>
    ),
  },
  {
    id: "settings-groups",
    title: "Settings Groups",
    icon: Folder,
    content: (
      <>
        <h2 className="text-2xl font-semibold mb-4">Settings Groups</h2>
        <p className="mb-4">
          Each connection profile contains multiple setting groups. Common groups include:
        </p>
        <ul className="list-disc pl-6 mb-4">
          <li><strong>connection</strong> — General profile metadata</li>
          <li><strong>ipv4</strong> — IPv4 configuration (addresses, routes, DNS)</li>
          <li><strong>ipv6</strong> — IPv6 configuration</li>
          <li><strong>ethernet</strong> — Ethernet device options</li>
          <li><strong>wifi</strong> — Wireless configuration (if applicable)</li>
          <li><strong>vpn</strong> — VPN-specific options</li>
        </ul>
        <p>
          Each group contains properties which are stored as key/value pairs.
        </p>
      </>
    ),
  },
  {
    id: "nmcli",
    title: "nmcli",
    icon: Terminal,
    content: (
      <>
        <h2 className="text-2xl font-semibold mb-4">nmcli</h2>
        <p className="mb-4">
          <code>nmcli</code> is the command-line interface for managing NetworkManager. It can be
          used to create, modify, delete, and activate connection profiles.
        </p>
        <pre className="bg-slate-100 dark:bg-slate-900 p-4 rounded mb-4 text-sm">
{`nmcli con show
nmcli con show "Office LAN"
nmcli con mod "Office LAN" ipv4.method manual`}
        </pre>
        <p>
          All changes performed with <code>nmcli</code> are immediately reflected in the
          underlying configuration storage.
        </p>
      </>
    ),
  },
  {
    id: "dbus",
    title: "D-Bus",
    icon: Database,
    content: (
      <>
        <h2 className="text-2xl font-semibold mb-4">D-Bus</h2>
        <p className="mb-4">
          NetworkManager exposes a D-Bus API that allows applications to manage connections and
          devices programmatically. This API is used by graphical tools and system services.
        </p>
        <p>
          The main service is: <code>org.freedesktop.NetworkManager</code>
        </p>
      </>
    ),
  },
  {
    id: "keyfile",
    title: "keyfile Format",
    icon: FileText,
    content: (
      <>
        <h2 className="text-2xl font-semibold mb-4">keyfile Format</h2>
        <p className="mb-4">
          The <strong>keyfile</strong> format is NetworkManager’s native storage format. Each
          connection is stored as a <code>.nmconnection</code> file under:
        </p>
        <pre className="bg-slate-100 dark:bg-slate-900 p-4 rounded mb-4 text-sm">
{`/etc/NetworkManager/system-connections/`}
        </pre>
        <p>
          The file contains INI-style sections corresponding to setting groups.
        </p>
      </>
    ),
  },
  {
    id: "ifcfg",
    title: "ifcfg-rh Format",
    icon: FileText,
    content: (
      <>
        <h2 className="text-2xl font-semibold mb-4">ifcfg-rh Format</h2>
        <p className="mb-4">
          The <strong>ifcfg-rh</strong> format is compatible with Fedora/RHEL network scripts.
          Files are typically stored under:
        </p>
        <pre className="bg-slate-100 dark:bg-slate-900 p-4 rounded mb-4 text-sm">
{`/etc/sysconfig/network-scripts/ifcfg-*`}
        </pre>
        <p>
          NetworkManager can read and write this format for compatibility purposes.
        </p>
      </>
    ),
  },
];

export default function Documentation() {
  const [activeId, setActiveId] = useState("overview");
  const activeDoc = docs.find((d) => d.id === activeId);

  return (
    <div className="h-full w-full flex">
      {/* Sidebar */}
      <div className="w-72 border-r border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-4">
        <h2 className="text-lg font-semibold mb-4">Documentation</h2>
        <div className="space-y-1">
          {docs.map((d) => {
            const Icon = d.icon;
            return (
              <button
                key={d.id}
                onClick={() => setActiveId(d.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded text-sm text-left ${
                  activeId === d.id
                    ? "bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300"
                    : "hover:bg-slate-100 dark:hover:bg-white/5"
                }`}
              >
                <Icon size={16} />
                {d.title}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-8 overflow-auto bg-slate-50 dark:bg-slate-950">
        <div className="max-w-3xl prose dark:prose-invert">
          {activeDoc?.content}
        </div>
      </div>
    </div>
  );
}
