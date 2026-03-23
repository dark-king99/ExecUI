import { useState } from "react";
import AlertTable from "./AlertTable";
import { Search } from "lucide-react";

const initialAlerts = [
  { id: 1, time: "2026-02-16 09:12", device: "Core Server 01", message: "High CPU usage detected", severity: "Critical", status: "Open" },
  { id: 2, time: "2026-02-16 08:55", device: "Switch 24p", message: "Packet loss above threshold", severity: "Warning", status: "Acknowledged" },
  { id: 3, time: "2026-02-15 22:10", device: "Cloud Node EU", message: "Backup completed successfully", severity: "Info", status: "Resolved" },
];

export default function Alerts() {
  const [alerts] = useState(initialAlerts);
  const [search, setSearch] = useState("");
  const [filterSeverity, setFilterSeverity] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Network Alerts</h1>
        <p className="text-slate-500">Monitor and triage issues across your network.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 border rounded px-3 py-2 bg-white dark:bg-slate-900">
          <Search size={16} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search alerts..."
            className="outline-none bg-transparent text-sm"
          />
        </div>

        <select
          value={filterSeverity}
          onChange={(e) => setFilterSeverity(e.target.value)}
          className="border rounded px-3 py-2 text-sm bg-white dark:bg-slate-900"
        >
          <option value="All">All Severities</option>
          <option value="Critical">Critical</option>
          <option value="Warning">Warning</option>
          <option value="Info">Info</option>
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border rounded px-3 py-2 text-sm bg-white dark:bg-slate-900"
        >
          <option value="All">All Statuses</option>
          <option value="Open">Open</option>
          <option value="Acknowledged">Acknowledged</option>
          <option value="Resolved">Resolved</option>
        </select>
      </div>

      <AlertTable
        alerts={alerts}
        search={search}
        filterSeverity={filterSeverity}
        filterStatus={filterStatus}
        onRowClick={(a) => console.log("Clicked alert:", a)}
      />
    </div>
  );
}
