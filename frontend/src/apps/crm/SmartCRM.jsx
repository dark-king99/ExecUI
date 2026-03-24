import { useState, useCallback } from "react";
import { useApi, useMutation } from "../../hooks/useApi";
import { crm } from "../../services/api";
import { useToast } from "../../components/ui/Toast";
import { SkeletonCard } from "../../components/ui/Skeleton";
import { Bot, Send, Loader2, RefreshCw, User, AlertTriangle, CheckCircle2, ChevronDown } from "lucide-react";

function getEngagementLabel(score) {
  return score >= 10 ? "High" : score >= 5 ? "Medium" : "Low";
}
function getRiskStatus(days) {
  return days > 14 ? "At Risk" : "Healthy";
}

export default function SmartCRM({ role }) {
  const safeRole = role ?? "employee";
  const toast    = useToast();

  // ── Customer list ─────────────────────────────────────────────────
  const {
    data: customers,
    loading: customersLoading,
    error: customersError,
    refetch: refetchCustomers,
  } = useApi(() => crm.customers.list({ limit: 20 }));

  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // ── AI chat ───────────────────────────────────────────────────────
  const [input,    setInput]    = useState("");
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hi! I'm your CRM AI Copilot. Ask me about this customer's status, risk, or next actions." },
  ]);

  const { mutate: sendChat, loading: chatLoading } = useMutation(
    (body) => crm.ai.chat(body),
    {
      onError: (err) => toast({ message: err?.message ?? "AI unavailable.", type: "error" }),
    }
  );

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !selectedCustomer) return;
    const userMsg = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    try {
      const res = await sendChat({ customerId: selectedCustomer.id, message: text });
      setMessages((prev) => [...prev, { role: "assistant", content: res?.reply ?? res?.message ?? "No response." }]);
    } catch {
      // error handled by onError
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // ── Actions ───────────────────────────────────────────────────────
  const { mutate: triggerAction, loading: actionLoading } = useMutation(
    (body) => crm.ai.action(body),
    {
      onSuccess: (res) => toast({ message: res?.message ?? "Action completed.", type: "success" }),
      onError:   (err) => toast({ message: err?.message ?? "Action failed.", type: "error" }),
    }
  );

  const handleAction = (type) => {
    if (!selectedCustomer) return;
    triggerAction({ customerId: selectedCustomer.id, action: type });
  };

  const canEscalate = selectedCustomer ? (selectedCustomer.lastContactDays ?? 0) > 14 : false;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20 p-4 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
            <Bot size={18} /> Smart CRM — AI Copilot
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Role: <strong>{safeRole}</strong></p>
        </div>
        <button
          onClick={refetchCustomers}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        >
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Customer cards */}
      {customersError && (
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
          <AlertTriangle size={14} /> {customersError}
        </div>
      )}

      {customersLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : customers?.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {customers.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setSelectedCustomer(c);
                setMessages([{ role: "assistant", content: `Hi! I'm ready to help with ${c.name}. Ask me about their risk, status, or next actions.` }]);
              }}
              className={`rounded-xl border p-4 text-left space-y-2 transition hover:border-indigo-400 dark:hover:border-indigo-500 ${
                selectedCustomer?.id === c.id
                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
                  <User size={14} className="text-indigo-600 dark:text-indigo-400" />
                </div>
                <p className="font-medium text-slate-900 dark:text-white text-sm">{c.name}</p>
              </div>
              <p className="text-xs text-slate-500">Segment: {c.segment ?? "—"}</p>
              <p className="text-xs text-slate-500">Engagement: {getEngagementLabel(c.interactions ?? 0)}</p>
              <div className="flex items-center gap-1 text-xs">
                {getRiskStatus(c.lastContactDays ?? 0) === "At Risk" ? (
                  <><AlertTriangle size={12} className="text-amber-500" /><span className="text-amber-600 dark:text-amber-400">At Risk</span></>
                ) : (
                  <><CheckCircle2 size={12} className="text-emerald-500" /><span className="text-emerald-600 dark:text-emerald-400">Healthy</span></>
                )}
              </div>
            </button>
          ))}
        </div>
      ) : !customersLoading && !customersError ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-8 text-center text-sm text-slate-500">
          No customers found.
        </div>
      ) : null}

      {/* AI Copilot panel */}
      {selectedCustomer ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 flex flex-col space-y-3">
          <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Bot size={16} /> AI Copilot — {selectedCustomer.name}
          </h3>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`p-3 rounded-xl text-sm ${
                  m.role === "user"
                    ? "bg-indigo-600 text-white ml-auto max-w-[80%]"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white max-w-[80%]"
                }`}
              >
                {m.content}
              </div>
            ))}
            {chatLoading && (
              <div className="bg-slate-100 dark:bg-slate-800 rounded-xl p-3 max-w-[80%]">
                <Loader2 size={14} className="animate-spin text-slate-400" />
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={chatLoading}
              className="flex-1 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
              placeholder="Ask about risk, summary, or next action…"
            />
            <button
              onClick={handleSend}
              disabled={chatLoading || !input.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 rounded-lg disabled:opacity-50 transition"
            >
              {chatLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => handleAction("create_task")}
              disabled={actionLoading}
              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs transition disabled:opacity-50"
            >
              Create Task
            </button>
            <button
              onClick={() => handleAction("schedule_followup")}
              disabled={actionLoading}
              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs transition disabled:opacity-50"
            >
              Schedule Follow-up
            </button>
            <button
              onClick={() => handleAction("escalate")}
              disabled={!canEscalate || actionLoading}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs transition disabled:opacity-40"
            >
              Escalate
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-6 text-center text-sm text-slate-500">
          Select a customer above to activate the AI Copilot.
        </div>
      )}
    </div>
  );
}
