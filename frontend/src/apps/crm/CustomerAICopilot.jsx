import { useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { useMutation } from "../../hooks/useApi";
import { crm } from "../../services/api";

export default function CustomerAICopilot({ customer }) {
  if (!customer) {
    return (
      <div className="text-sm text-slate-500">Select a customer to use AI Copilot</div>
    );
  }

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hi! I'm your CRM AI Copilot. Ask me about this customer's status, risk, or next actions.",
    },
  ]);

  const { mutate: sendChat, loading: chatLoading } = useMutation(
    (body) => crm.ai.chat(body),
    {
      onSuccess: (res) => {
        setMessages(prev => [...prev, { role: "assistant", content: res?.reply ?? res?.message ?? "No response." }]);
      },
      onError: (err) => {
        setMessages(prev => [...prev, { role: "assistant", content: `Error: ${err?.message ?? "Failed to get response."}` }]);
      },
    }
  );

  const { mutate: runAction, loading: actionLoading } = useMutation(
    (body) => crm.ai.action(body),
    {
      onSuccess: (res) => {
        setMessages(prev => [...prev, { role: "assistant", content: res?.message ?? "Action completed." }]);
      },
      onError: (err) => {
        setMessages(prev => [...prev, { role: "assistant", content: `Action failed: ${err?.message ?? "Unknown error."}` }]);
      },
    }
  );

  const handleSend = () => {
    if (!input.trim() || chatLoading) return;
    const userMessage = { role: "user", content: input };
    setMessages(prev => [...prev, userMessage]);
    sendChat({ customerId: customer.id, message: input });
    setInput("");
  };

  const handleAction = (type) => {
    runAction({ customerId: customer.id, type });
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
      <div>
        <h3 className="font-semibold text-slate-900 dark:text-white">AI Copilot</h3>
        <p className="text-sm text-slate-500">Chat about {customer.name}</p>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto max-h-64 pr-1">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`text-sm p-3 rounded-lg max-w-[85%] ${
              msg.role === "user"
                ? "bg-indigo-600 text-white ml-auto"
                : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
            }`}
          >
            {msg.content}
          </div>
        ))}
        {chatLoading && (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Loader2 size={14} className="animate-spin" /> Thinking…
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSend()}
          placeholder="Ask about risk, summary, or next action…"
          className="flex-1 rounded-lg border px-3 py-2 text-sm bg-white dark:bg-slate-900 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          onClick={handleSend}
          disabled={chatLoading || !input.trim()}
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700 disabled:opacity-60 transition"
        >
          Send
        </button>
      </div>

      <div className="border-t pt-3 space-y-2">
        <p className="text-xs font-medium text-slate-500">AI Actions</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleAction("create_task")}
            disabled={actionLoading}
            className="px-3 py-1 rounded bg-slate-200 dark:bg-slate-700 text-sm hover:bg-slate-300 dark:hover:bg-slate-600 disabled:opacity-60"
          >
            Create Follow-up Task
          </button>
          <button
            onClick={() => handleAction("schedule_followup")}
            disabled={actionLoading}
            className="px-3 py-1 rounded bg-slate-200 dark:bg-slate-700 text-sm hover:bg-slate-300 dark:hover:bg-slate-600 disabled:opacity-60"
          >
            Schedule Follow-up
          </button>
          <button
            onClick={() => handleAction("escalate")}
            disabled={actionLoading}
            className="px-3 py-1 rounded bg-amber-600 text-white text-sm hover:bg-amber-700 disabled:opacity-60"
          >
            Escalate
          </button>
          {actionLoading && <Loader2 size={16} className="animate-spin text-slate-400 self-center" />}
        </div>
      </div>
    </div>
  );
}
