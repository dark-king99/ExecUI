import { useMemo, useState, useEffect } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Inbox,
  ShieldAlert,
  Upload,
  FileText,
  History,
  BarChart3,
  Lock,
  Unlock,
  UserCheck,
  Eye,
} from "lucide-react";

// ---- MOCK ENTERPRISE CASE DATA ----
const INITIAL_CASES = [
  {
    id: "C-1001",
    customer: "Acme Industries",
    accountId: "A-001",
    dealId: "D-884",
    subject: "Billing discrepancy on last invoice",
    category: "Billing",
    priority: "High",
    status: "Open",
    customerStatus: "Received",
    assigneeRole: "Support",
    assignee: "Support Team",
    createdAt: Date.now() - 1000 * 60 * 60 * 20,
    slaHours: 24,
    notes: [],
    attachments: [],
    audit: [],
    escalated: false,
    locked: false,
    approvalRequired: false,
    approved: false,
  },
  {
    id: "C-1002",
    customer: "Nova Retail",
    accountId: "A-014",
    dealId: "D-901",
    subject: "Email campaign not sending",
    category: "Product",
    priority: "Medium",
    status: "In Progress",
    customerStatus: "Investigating",
    assigneeRole: "Marketing Ops",
    assignee: "Marketing Ops",
    createdAt: Date.now() - 1000 * 60 * 60 * 30,
    slaHours: 48,
    notes: [],
    attachments: [],
    audit: [],
    escalated: false,
    locked: false,
    approvalRequired: true,
    approved: false,
  },
];

// ---- HELPERS ----
function hoursSince(ts) {
  return Math.floor((Date.now() - ts) / (1000 * 60 * 60));
}

export default function Reports() {
  const [cases, setCases] = useState(INITIAL_CASES);
  const [selectedCase, setSelectedCase] = useState(null);
  const [noteInput, setNoteInput] = useState("");
  const [attachmentName, setAttachmentName] = useState("");
  const [showCustomerView, setShowCustomerView] = useState(false);

  // ---- SLA AUTO ESCALATION ----
  useEffect(() => {
    const interval = setInterval(() => {
      setCases((prev) =>
        prev.map((c) => {
          const age = hoursSince(c.createdAt);
          if (!c.escalated && age > c.slaHours) {
            return {
              ...c,
              escalated: true,
              status: "Escalated",
              audit: [
                {
                  id: Date.now(),
                  message: "SLA breached. Case auto-escalated.",
                  time: new Date().toLocaleString(),
                },
                ...c.audit,
              ],
            };
          }
          return c;
        })
      );
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const metrics = useMemo(() => {
    const total = cases.length;
    const open = cases.filter((c) => c.status === "Open").length;
    const inProgress = cases.filter((c) => c.status === "In Progress").length;
    const resolved = cases.filter((c) => c.status === "Resolved").length;
    const escalated = cases.filter((c) => c.status === "Escalated").length;
    return { total, open, inProgress, resolved, escalated };
  }, [cases]);

  const updateCase = (id, updates, auditMessage) => {
    setCases((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              ...updates,
              audit: auditMessage
                ? [
                    {
                      id: Date.now(),
                      message: auditMessage,
                      time: new Date().toLocaleString(),
                    },
                    ...c.audit,
                  ]
                : c.audit,
            }
          : c
      )
    );
    setSelectedCase((prev) =>
      prev && prev.id === id ? { ...prev, ...updates } : prev
    );
  };

  const addNote = () => {
    if (!noteInput.trim() || !selectedCase || selectedCase.locked) return;
    updateCase(
      selectedCase.id,
      {
        notes: [
          { id: Date.now(), text: noteInput, time: new Date().toLocaleString() },
          ...selectedCase.notes,
        ],
      },
      "Internal note added"
    );
    setNoteInput("");
  };

  const addAttachment = () => {
    if (!attachmentName.trim() || !selectedCase || selectedCase.locked) return;
    updateCase(
      selectedCase.id,
      {
        attachments: [
          { id: Date.now(), name: attachmentName, time: new Date().toLocaleString() },
          ...selectedCase.attachments,
        ],
      },
      "Attachment added"
    );
    setAttachmentName("");
  };

  const approveCase = () => {
    updateCase(
      selectedCase.id,
      { approved: true, approvalRequired: false },
      "Manager approved case action"
    );
  };

  const toggleLock = () => {
    updateCase(
      selectedCase.id,
      { locked: !selectedCase.locked },
      selectedCase.locked
        ? "Compliance lock removed"
        : "Case locked for compliance"
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Customer Reports & Complaints</h1>
          <p className="text-slate-500">SLA-driven, audited, compliant case management.</p>
        </div>
        <button
          onClick={() => setShowCustomerView((v) => !v)}
          className="px-3 py-2 rounded border flex items-center gap-2"
        >
          <Eye className="h-4 w-4" />
          {showCustomerView ? "Hide" : "Show"} Customer View
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <KPI icon={Inbox} label="Total" value={metrics.total} />
        <KPI icon={AlertTriangle} label="Open" value={metrics.open} />
        <KPI icon={Clock} label="In Progress" value={metrics.inProgress} />
        <KPI icon={CheckCircle2} label="Resolved" value={metrics.resolved} />
        <KPI icon={ShieldAlert} label="Escalated" value={metrics.escalated} />
      </div>
      {/* Main Layout */}
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
  {/* Case List */}
  <div className="lg:col-span-2 rounded-xl border bg-white dark:bg-slate-900">
    <div className="border-b p-3 font-semibold">Cases</div>
    <div className="divide-y">
      {cases.map((c) => {
        const age = hoursSince(c.createdAt);
        const progress = Math.min(100, Math.round((age / c.slaHours) * 100));
        return (
          <button
            key={c.id}
            onClick={() => setSelectedCase(c)}
            className="w-full text-left p-4 hover:bg-slate-50"
          >
            <div className="font-medium">{c.subject}</div>
            <div className="text-xs text-slate-500">
              {c.customer} • {c.category}
            </div>
            <div className="mt-2 h-2 bg-slate-200 rounded">
              <div
                className={`h-2 rounded ${
                  progress > 100 ? "bg-red-600" : "bg-amber-500"
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </button>
        );
      })}
    </div>
  </div>

  {/* Right Panel */}
  <div className="rounded-xl border bg-white dark:bg-slate-900 p-4">
    {!selectedCase ? (
      <div className="text-sm text-slate-500">
        Select a case to view details.
      </div>
    ) : showCustomerView ? (
      // ✅ CUSTOMER PORTAL MIRROR VIEW
      <div className="space-y-2">
        <div><strong>Case:</strong> {selectedCase.subject}</div>
        <div><strong>Status:</strong> {selectedCase.customerStatus}</div>
        <div><strong>Assigned:</strong> {selectedCase.assigneeRole}</div>
        <div className="text-xs text-slate-500">
          This is what the customer sees in their portal.
        </div>
      </div>
    ) : (
      // ✅ INTERNAL AGENT VIEW
      <div className="space-y-4">
        <div className="font-semibold text-lg">{selectedCase.subject}</div>

        {selectedCase.approvalRequired && !selectedCase.approved && (
          <div className="p-2 bg-amber-100 text-amber-700 rounded text-sm flex items-center gap-2">
            <UserCheck className="h-4 w-4" /> Manager approval required
            <button
              onClick={approveCase}
              className="ml-auto px-2 py-1 bg-emerald-600 text-white rounded text-xs"
            >
              Approve
            </button>
          </div>
        )}

        <button
          onClick={toggleLock}
          className="px-3 py-1 rounded border flex items-center gap-1 text-sm"
        >
          {selectedCase.locked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
          {selectedCase.locked ? "Unlock" : "Lock"}
        </button>

        {/* Notes */}
        <div>
          <div className="font-medium text-sm">Notes</div>
          <div className="flex gap-2 mt-1">
            <input
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              className="flex-1 border rounded px-2 py-1 text-sm"
            />
            <button
              onClick={addNote}
              disabled={selectedCase.locked}
              className="px-3 py-1 rounded bg-indigo-600 text-white text-sm"
            >
              Add
            </button>
          </div>
        </div>

        {/* Attachments */}
        <div>
          <div className="font-medium text-sm flex items-center gap-1">
            <FileText className="h-4 w-4" /> Attachments
          </div>
          <div className="flex gap-2 mt-1">
            <input
              value={attachmentName}
              onChange={(e) => setAttachmentName(e.target.value)}
              className="flex-1 border rounded px-2 py-1 text-sm"
            />
            <button
              onClick={addAttachment}
              disabled={selectedCase.locked}
              className="px-3 py-1 rounded bg-slate-700 text-white text-sm"
            >
              <Upload className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Audit */}
        <div>
          <div className="font-medium text-sm flex items-center gap-1">
            <History className="h-4 w-4" /> Audit Trail
          </div>
          <div className="text-xs space-y-1 max-h-32 overflow-y-auto">
            {selectedCase.audit.map((a) => (
              <div key={a.id}>
                • [{a.time}] {a.message}
              </div>
            ))}
          </div>
        </div>
      </div>
    )}
  </div>
</div>
</div>

);
}

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

  