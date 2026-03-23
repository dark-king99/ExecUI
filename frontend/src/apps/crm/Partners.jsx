import { useState, useMemo } from "react";
import {
  Users,
  Calendar,
  BarChart3,
  FileText,
  ShieldCheck,
  Briefcase,
  TrendingUp,
  Building2,
  UserCheck,
} from "lucide-react";

// ---- MOCK DATA ----
const PARTNERS = [
  {
    id: "P-001",
    name: "Acme Capital",
    type: "Investor",
    shares: 250000,
    ownership: 25,
    status: "Active",
    contact: "board@acmecap.com",
  },
  {
    id: "P-002",
    name: "Nova Ventures",
    type: "Strategic Partner",
    shares: 150000,
    ownership: 15,
    status: "Active",
    contact: "partners@novaventures.com",
  },
  {
    id: "P-003",
    name: "Founders Pool",
    type: "Founders",
    shares: 400000,
    ownership: 40,
    status: "Locked",
    contact: "founders@company.com",
  },
];

const MEETINGS = [
  {
    id: "M-001",
    title: "Quarterly Board Meeting",
    date: "2026-03-20",
    status: "Scheduled",
  },
  {
    id: "M-002",
    title: "Investment Strategy Review",
    date: "2026-04-05",
    status: "Planned",
  },
];

export default function Partners() {
  const [selectedPartner, setSelectedPartner] = useState(null);

  const totals = useMemo(() => {
    const totalShares = PARTNERS.reduce((sum, p) => sum + p.shares, 0);
    return { totalShares };
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            Partners & Board Command Center
          </h1>
          <p className="text-slate-500">
            Executive governance, ownership, partners, and board operations
          </p>
        </div>
      </div>

      {/* KPI / Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPI icon={Users} label="Partners" value={PARTNERS.length} />
        <KPI icon={TrendingUp} label="Total Shares" value={totals.totalShares.toLocaleString()} />
        <KPI icon={Calendar} label="Upcoming Meetings" value={MEETINGS.length} />
        <KPI icon={ShieldCheck} label="Governance Status" value="Compliant" />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Partner List */}
        <div className="lg:col-span-2 rounded-xl border bg-white dark:bg-slate-900">
          <div className="border-b p-3 font-semibold flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            Partners & Shareholders
          </div>
          <div className="divide-y">
            {PARTNERS.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedPartner(p)}
                className="w-full text-left p-4 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-slate-500">
                      {p.type} • {p.ownership}% ownership
                    </div>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      p.status === "Active"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {p.status}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right Panel */}
        <div className="rounded-xl border bg-white dark:bg-slate-900 p-4 space-y-4">
          {!selectedPartner ? (
            <div className="text-sm text-slate-500">
              Select a partner to view details.
            </div>
          ) : (
            <>
              <div>
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <UserCheck className="h-5 w-5" />
                  {selectedPartner.name}
                </h3>
                <p className="text-sm text-slate-500">
                  {selectedPartner.type}
                </p>
              </div>

              <div className="text-sm space-y-1">
                <div>
                  <strong>Shares:</strong>{" "}
                  {selectedPartner.shares.toLocaleString()}
                </div>
                <div>
                  <strong>Ownership:</strong> {selectedPartner.ownership}%
                </div>
                <div>
                  <strong>Status:</strong> {selectedPartner.status}
                </div>
                <div>
                  <strong>Contact:</strong> {selectedPartner.contact}
                </div>
              </div>

              <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3 text-sm">
                <div className="font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Governance Notes
                </div>
                <p className="text-slate-600 dark:text-slate-300 mt-1">
                  This partner participates in board voting, equity decisions,
                  and strategic approvals. All actions are logged for audit.
                </p>
              </div>

              <div className="flex gap-2">
                <button className="px-3 py-1 rounded bg-indigo-600 text-white text-sm">
                  Schedule Meeting
                </button>
                <button className="px-3 py-1 rounded border text-sm">
                  View Documents
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Board Meetings */}
      <div className="rounded-xl border bg-white dark:bg-slate-900 p-4">
        <div className="flex items-center gap-2 mb-3 font-semibold">
          <Calendar className="h-4 w-4" />
          Board & Executive Meetings
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {MEETINGS.map((m) => (
            <div key={m.id} className="p-3 border rounded">
              <div className="font-medium">{m.title}</div>
              <div className="text-xs text-slate-500">{m.date}</div>
              <div className="text-xs mt-1">{m.status}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---- KPI CARD ----
function KPI({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl border bg-white dark:bg-slate-900 p-4 flex items-center gap-3">
      <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/40">
        <Icon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
      </div>
      <div>
        <div className="text-xs text-slate-500">{label}</div>
        <div className="text-lg font-semibold">{value}</div>
      </div>
    </div>
  );
}