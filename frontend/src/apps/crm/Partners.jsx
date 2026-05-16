import { useState } from "react";
import {
  Users, Calendar, FileText, ShieldCheck, Briefcase, TrendingUp, Building2, UserCheck, AlertCircle, Loader2,
} from "lucide-react";
import { useApi, useMutation } from "../../hooks/useApi";
import { crm } from "../../services/api";
import { useToast } from "../../components/ui/Toast";
import PageHeader from "../../components/ui/PageHeader";
import { Stat } from "../../components/ui/Card";

export default function Partners() {
  const toast = useToast();
  const [selectedPartner, setSelectedPartner] = useState(null);

  const { data: partners, loading: partnersLoading, error: partnersError } = useApi(
    () => crm.partners.list(), [], { pollingInterval: 120000 }
  );
  const { data: meetings, loading: meetingsLoading } = useApi(
    () => crm.meetings.list({ limit: 10 }), [], { pollingInterval: 60000 }
  );

  const allPartners = partners ?? [];
  const allMeetings = meetings ?? [];

  const totalShares = allPartners.reduce((s, p) => s + (p.shares ?? 0), 0);

  const { mutate: scheduleMeeting, loading: scheduling } = useMutation(
    (data) => crm.meetings.create(data),
    {
      onSuccess: () => toast({ message: "Meeting scheduled", type: "success" }),
      onError: (err) => toast({ message: err?.message ?? "Failed to schedule meeting", type: "error" }),
    }
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Partners & Board"
        subtitle="Executive governance, ownership, partners, and board operations."
      />

      {partnersError && (
        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle size={15} /> {partnersError}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Partners"           value={partnersLoading ? "…" : allPartners.length}               icon={Users}       color="indigo" />
        <Stat label="Total Shares"       value={partnersLoading ? "…" : totalShares.toLocaleString()}    icon={TrendingUp}  color="emerald" />
        <Stat label="Upcoming Meetings"  value={meetingsLoading ? "…" : allMeetings.length}              icon={Calendar}    color="sky" />
        <Stat label="Governance"         value="Compliant"                                                 icon={ShieldCheck} color="emerald" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-xl border bg-white dark:bg-slate-900">
          <div className="border-b p-3 text-slate-900 dark:text-white font-semibold flex items-center gap-2">
            <Briefcase className="h-4 w-4" /> Partners & Shareholders
          </div>

          {partnersLoading && allPartners.length === 0 && (
            <div className="p-4 space-y-2 animate-pulse">
              {[1,2,3].map(i => <div key={i} className="h-14 bg-slate-100 dark:bg-slate-700 rounded" />)}
            </div>
          )}

          {!partnersLoading && allPartners.length === 0 && !partnersError && (
            <p className="p-6 text-sm text-slate-500 text-center">No partners found.</p>
          )}

          <div className="divide-y">
            {allPartners.map(p => (
              <button key={p.id} onClick={() => setSelectedPartner(p)} className="w-full text-left p-4 hover:bg-slate-50 dark:hover:bg-slate-800">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-slate-500">{p.type} • {p.ownership}% ownership</div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${p.status === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                    {p.status}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border bg-white dark:bg-slate-900 p-4 space-y-4">
          {!selectedPartner ? (
            <div className="text-sm text-slate-500">Select a partner to view details.</div>
          ) : (
            <>
              <div>
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <UserCheck className="h-5 w-5" /> {selectedPartner.name}
                </h3>
                <p className="text-sm text-slate-500">{selectedPartner.type}</p>
              </div>
              <div className="text-sm space-y-1">
                <div><strong>Shares:</strong> {selectedPartner.shares?.toLocaleString()}</div>
                <div><strong>Ownership:</strong> {selectedPartner.ownership}%</div>
                <div><strong>Status:</strong> {selectedPartner.status}</div>
                {selectedPartner.contact && <div><strong>Contact:</strong> {selectedPartner.contact}</div>}
              </div>
              <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3 text-sm">
                <div className="font-medium flex items-center gap-2"><FileText className="h-4 w-4" /> Governance Notes</div>
                <p className="text-slate-600 dark:text-slate-300 mt-1">
                  This partner participates in board voting, equity decisions, and strategic approvals. All actions are logged for audit.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => scheduleMeeting({ partnerId: selectedPartner.id, title: `Meeting with ${selectedPartner.name}` })}
                  disabled={scheduling}
                  className="flex items-center gap-1.5 px-3 py-1 rounded bg-indigo-600 text-white text-sm disabled:opacity-60"
                >
                  {scheduling && <Loader2 size={13} className="animate-spin" />} Schedule Meeting
                </button>
                <button className="px-3 py-1 rounded border text-sm">View Documents</button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="rounded-xl border bg-white dark:bg-slate-900 p-4">
        <div className="flex items-center gap-2 mb-3 text-slate-900 dark:text-white font-semibold">
          <Calendar className="h-4 w-4" /> Board & Executive Meetings
        </div>
        {meetingsLoading && allMeetings.length === 0 ? (
          <div className="grid grid-cols-2 gap-3 animate-pulse">
            {[1,2].map(i => <div key={i} className="h-16 bg-slate-100 dark:bg-slate-700 rounded" />)}
          </div>
        ) : allMeetings.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {allMeetings.map(m => (
              <div key={m.id} className="p-3 border rounded">
                <div className="font-medium">{m.title}</div>
                <div className="text-xs text-slate-500">{m.date}</div>
                <div className="text-xs mt-1">{m.status}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">No upcoming meetings.</p>
        )}
      </div>
    </div>
  );
}

