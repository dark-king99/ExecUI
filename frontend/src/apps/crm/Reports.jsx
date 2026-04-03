import { useState } from "react";
import {
  AlertTriangle, CheckCircle2, Clock, Inbox, ShieldAlert, FileText,
  History, Lock, Unlock, UserCheck, Eye, AlertCircle, Loader2, Upload,
} from "lucide-react";
import { useApi, useMutation } from "../../hooks/useApi";
import { crm } from "../../services/api";

function hoursSince(ts) {
  return Math.floor((Date.now() - new Date(ts).getTime()) / (1000 * 60 * 60));
}

export default function Reports() {
  const [selectedId, setSelectedId] = useState(null);
  const [noteInput, setNoteInput] = useState("");
  const [showCustomerView, setShowCustomerView] = useState(false);

  const { data: cases, loading, error, refetch } = useApi(
    () => crm.cases.list({ limit: 100 }), [], { pollingInterval: 30000 }
  );
  const { data: selectedCase, refetch: refetchCase } = useApi(
    () => selectedId ? crm.cases.get(selectedId) : Promise.resolve(null),
    [selectedId]
  );

  const { mutate: addNote, loading: addingNote } = useMutation(
    ({ id, text }) => crm.cases.addNote(id, { text }),
    { onSuccess: () => { setNoteInput(""); refetchCase(); } }
  );

  const { mutate: approveCase, loading: approving } = useMutation(
    (id) => crm.cases.approve(id),
    { onSuccess: () => refetchCase() }
  );

  const { mutate: toggleLock, loading: toggling } = useMutation(
    ({ id, locked }) => locked ? crm.cases.unlock(id) : crm.cases.lock(id),
    { onSuccess: () => refetchCase() }
  );

  const allCases = cases ?? [];
  const metrics = {
    total:      allCases.length,
    open:       allCases.filter(c => c.status === "Open").length,
    inProgress: allCases.filter(c => c.status === "In Progress").length,
    resolved:   allCases.filter(c => c.status === "Resolved").length,
    escalated:  allCases.filter(c => c.status === "Escalated").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl text-slate-900 dark:text-white font-semibold">Customer Reports & Complaints</h1>
          <p className="text-slate-500">SLA-driven, audited, compliant case management.</p>
        </div>
        <button
          onClick={() => setShowCustomerView(v => !v)}
          className="px-3 py-2 rounded border border-slate-200 dark:border-slate-800 flex items-center gap-2 text-sm"
        >
          <Eye className="h-4 w-4" /> {showCustomerView ? "Hide" : "Show"} Customer View
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle size={15} /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-5 dark:border-slate-700  gap-4">
        <KPI icon={Inbox}       label="Total"       value={metrics.total} />
        <KPI icon={AlertTriangle} label="Open"      value={metrics.open} />
        <KPI icon={Clock}       label="In Progress"  value={metrics.inProgress} />
        <KPI icon={CheckCircle2} label="Resolved"   value={metrics.resolved} />
        <KPI icon={ShieldAlert} label="Escalated"   value={metrics.escalated} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="border-b border-slate-200 dark:border-slate-800 p-3 text-slate-400 font-semibold">Cases</div>

          {loading && allCases.length === 0 && (
            <div className="p-4 space-y-2 animate-pulse">
              {[1,2,3].map(i => <div key={i} className="h-16 bg-slate-100 dark:bg-slate-700 rounded" />)}
            </div>
          )}

          {!loading && !error && allCases.length === 0 && (
            <p className="p-6 text-sm text-slate-500 text-center">No cases found.</p>
          )}

          <div className="divide-y">
            {allCases.map(c => {
              const age = c.createdAt ? hoursSince(c.createdAt) : 0;
              const progress = c.slaHours ? Math.min(100, Math.round((age / c.slaHours) * 100)) : 0;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={`w-full text-left p-4 hover:bg-slate-50 dark:hover:bg-slate-800 ${selectedId === c.id ? "bg-slate-50 dark:bg-slate-800" : ""}`}
                >
                  <div className="font-medium">{c.subject}</div>
                  <div className="text-xs text-slate-500">{c.customer} • {c.category}</div>
                  {c.slaHours && (
                    <div className="mt-2 h-2 bg-slate-200 dark:bg-slate-700 rounded">
                      <div
                        className={`h-2 rounded ${progress >= 100 ? "bg-red-600" : "bg-amber-500"}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          {!selectedId ? (
            <div className="text-sm text-slate-500">Select a case to view details.</div>
          ) : !selectedCase ? (
            <div className="flex justify-center py-6"><Loader2 size={18} className="animate-spin text-slate-400" /></div>
          ) : showCustomerView ? (
            <div className="space-y-2 text-sm">
              <div><strong>Case:</strong> {selectedCase.subject}</div>
              <div><strong>Status:</strong> {selectedCase.customerStatus}</div>
              <div><strong>Assigned:</strong> {selectedCase.assigneeRole}</div>
              <div className="text-xs text-slate-500">This is what the customer sees in their portal.</div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="font-semibold text-lg">{selectedCase.subject}</div>

              {selectedCase.approvalRequired && !selectedCase.approved && (
                <div className="p-2 bg-amber-100 text-amber-700 rounded text-sm flex items-center gap-2">
                  <UserCheck className="h-4 w-4" /> Manager approval required
                  <button
                    onClick={() => approveCase(selectedCase.id)}
                    disabled={approving}
                    className="ml-auto flex items-center gap-1 px-2 py-1 bg-emerald-600 text-white rounded text-xs disabled:opacity-60"
                  >
                    {approving && <Loader2 size={12} className="animate-spin" />} Approve
                  </button>
                </div>
              )}

              <button
                onClick={() => toggleLock({ id: selectedCase.id, locked: selectedCase.locked })}
                disabled={toggling}
                className="flex items-center gap-1 px-3 py-1 rounded border border-slate-200 dark:border-slate-800 text-sm disabled:opacity-60"
              >
                {selectedCase.locked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                {selectedCase.locked ? "Unlock" : "Lock"}
              </button>

              <div>
                <div className="font-medium text-sm">Notes</div>
                <div className="flex gap-2 mt-1">
                  <input
                    value={noteInput}
                    onChange={e => setNoteInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && noteInput.trim() && addNote({ id: selectedCase.id, text: noteInput })}
                    disabled={selectedCase.locked}
                    className="flex-1 border rounded px-2 py-1 text-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:outline-none"
                  />
                  <button
                    onClick={() => noteInput.trim() && addNote({ id: selectedCase.id, text: noteInput })}
                    disabled={addingNote || selectedCase.locked}
                    className="flex items-center gap-1 px-3 py-1 rounded bg-indigo-600 text-white text-sm disabled:opacity-60"
                  >
                    {addingNote ? <Loader2 size={12} className="animate-spin" /> : null} Add
                  </button>
                </div>
              </div>

              <div>
                <div className="font-medium text-sm flex items-center gap-1">
                  <History className="h-4 w-4" /> Audit Trail
                </div>
                <div className="text-xs space-y-1 max-h-32 overflow-y-auto mt-1">
                  {selectedCase.audit?.map((a, i) => (
                    <div key={a.id ?? i}>• [{a.time}] {a.message}</div>
                  ))}
                  {(!selectedCase.audit || selectedCase.audit.length === 0) && (
                    <div className="text-slate-400">No audit entries.</div>
                  )}
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
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex items-center gap-3">
      <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/40">
        <Icon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
      </div>
      <div>
        <div className="text-xs text-slate-500">{label}</div>
        <div className="text-lg text-slate-900 dark:text-white font-semibold">{value}</div>
      </div>
    </div>
  );
}
