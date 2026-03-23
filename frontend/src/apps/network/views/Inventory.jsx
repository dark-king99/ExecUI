import { useState, useMemo } from "react";
import { Search, Server, Router, HardDrive, Cloud, Monitor } from "lucide-react";

// Mock inventory data (later this comes from API)
const initialDevices = [
  {
    id: 1,
    name: "Core Server 01",
    type: "Server",
    status: "Online",
    ip: "10.0.0.10",
    location: "Data Center A",
    lastSeen: "Just now",
  },
  {
    id: 2,
    name: "Edge Router",
    type: "Router",
    status: "Online",
    ip: "10.0.0.1",
    location: "HQ",
    lastSeen: "1 min ago",
  },
  {
    id: 3,
    name: "Switch 24p",
    type: "Switch",
    status: "Warning",
    ip: "10.0.1.5",
    location: "Floor 2",
    lastSeen: "5 min ago",
  },
  {
    id: 4,
    name: "Workstation-17",
    type: "Endpoint",
    status: "Offline",
    ip: "10.0.2.23",
    location: "Remote",
    lastSeen: "2 hours ago",
  },
  {
    id: 5,
    name: "Cloud Node EU",
    type: "Cloud",
    status: "Online",
    ip: "172.16.0.5",
    location: "EU-West",
    lastSeen: "Just now",
  },
];

export default function Inventory() {
  const [devices] = useState(initialDevices);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");

  const filteredDevices = useMemo(() => {
    return devices.filter((d) => {
      const matchesSearch =
        d.name.toLowerCase().includes(search.toLowerCase()) ||
        d.ip.includes(search);

      const matchesType = filterType === "All" || d.type === filterType;
      const matchesStatus = filterStatus === "All" || d.status === filterStatus;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [devices, search, filterType, filterStatus]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Network Inventory</h1>
        <p className="text-slate-500">
          Manage and track all devices, servers, endpoints, and cloud nodes.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2 border rounded px-3 py-2">
          <Search size={16} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or IP..."
            className="outline-none bg-transparent text-sm"
          />
        </div>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="border rounded px-3 py-2 text-sm"
        >
          <option value="All">All Types</option>
          <option value="Server">Server</option>
          <option value="Router">Router</option>
          <option value="Switch">Switch</option>
          <option value="Endpoint">Endpoint</option>
          <option value="Cloud">Cloud</option>
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border rounded px-3 py-2 text-sm"
        >
          <option value="All">All Status</option>
          <option value="Online">Online</option>
          <option value="Warning">Warning</option>
          <option value="Offline">Offline</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border rounded">
        <table className="w-full text-sm">
          <thead className="border-b">
            <tr className="text-left">
              <th className="p-3">Name</th>
              <th className="p-3">Type</th>
              <th className="p-3">Status</th>
              <th className="p-3">IP</th>
              <th className="p-3">Location</th>
              <th className="p-3">Last Seen</th>
            </tr>
          </thead>
          <tbody>
            {filteredDevices.map((d) => (
              <tr key={d.id} className="border-b hover:bg-slate-50 cursor-pointer">
                <td className="p-3 font-medium">{d.name}</td>
                <td className="p-3">{d.type}</td>
                <td className="p-3">
                  <StatusBadge status={d.status} />
                </td>
                <td className="p-3">{d.ip}</td>
                <td className="p-3">{d.location}</td>
                <td className="p-3 text-slate-500">{d.lastSeen}</td>
              </tr>
            ))}
            {filteredDevices.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-slate-500">
                  No devices found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  let color = "bg-slate-400";
  if (status === "Online") color = "bg-green-500";
  if (status === "Warning") color = "bg-amber-500";
  if (status === "Offline") color = "bg-red-500";

  return (
    <span className="inline-flex items-center gap-2">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      {status}
    </span>
  );
}
