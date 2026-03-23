import { useState } from "react";

export default function CustomerAICopilot({ customer }) {
  // ---- HARD GUARD ----
  if (!customer) {
    return (
      <div className="text-sm text-slate-500">
        Select a customer to use AI Copilot
      </div>
    );
  }

  // ---- LOCAL SAFE STATE ----
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hi! I’m your CRM AI Copilot. Ask me about this customer’s status, risk, or next actions.",
    },
  ]);

  // ---- MOCK AI RESPONSE (DETERMINISTIC) ----
  
  const generateAIResponse = (text) => {
    const lower = text.toLowerCase();

    if (lower.includes("risk")) {
      return customer.lastContactDays > 14
        ? "This customer is currently at risk due to limited recent engagement. A follow-up within 24–48 hours is recommended."
        : "This customer shows low risk with recent engagement activity.";
    }

    if (lower.includes("next") || lower.includes("do")) {
      return "The recommended next action is to send a personalized follow-up and offer assistance related to their recent inquiry.";
    }

    if (lower.includes("summary")) {
      return `${customer.name} has had ${customer.interactions} interactions. The last contact was ${customer.lastContactDays} days ago. Overall engagement is moderate.`;
    }

    return "I can help summarize activity, assess risk, or suggest next actions for this customer.";
  };

  // ---- SEND HANDLER (SAFE) ----
  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage = { role: "user", content: input };
    const aiMessage = {
      role: "assistant",
      content: generateAIResponse(input),
    };

    setMessages((prev) => [...prev, userMessage, aiMessage]);
    setInput("");
  };
  // ---- ACTION LOG (SAFE LOCAL STATE) ----
const [actions, setActions] = useState([]);

// ---- PERMISSION CHECK ----
const canEscalate =
  customer && customer.lastContactDays > 14;

// ---- ACTION HANDLER (GUARDED) ----
const handleAction = (type) => {
  let description = "";

  switch (type) {
    case "create_task":
      description = `Follow-up task created for ${customer.name}`;
      break;

    case "schedule_followup":
      description = `Follow-up scheduled in 48 hours for ${customer.name}`;
      break;

    case "escalate":
      if (!canEscalate) {
        description = "Escalation not required at this time";
        break;
      }
      description = `${customer.name} escalated for admin review`;
      break;

    default:
      return;
  }

  const entry = {
    id: Date.now(),
    type,
    description,
    timestamp: new Date().toLocaleTimeString(),
  };

  setActions((prev) => [entry, ...prev]);

  // Audit stub (backend later)
  console.log("AI ACTION:", entry);
};


  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
      {/* Header */}
      <div>
        <h3 className="font-semibold text-slate-900 dark:text-white">
          AI Copilot
        </h3>
        <p className="text-sm text-slate-500">
          Chat about {customer.name}
        </p>
      </div>

      {/* Chat History */}
      <div className="flex-1 space-y-3 overflow-y-auto max-h-64 pr-1">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`text-sm p-3 rounded-lg max-w-[85%] ${
              msg.role === "user"
                ? "bg-indigo-600 text-white ml-auto"
                : "bg-slate-100 text-slate-800"
            }`}
          >
            {msg.content}
          </div>
        ))}
       

      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about risk, summary, or next action…"
          className="
            flex-1 rounded-lg border px-3 py-2 text-sm
            focus:outline-none focus:ring-2 focus:ring-indigo-500
          "
        />
        <button
          onClick={handleSend}
          className="
            px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm
            hover:bg-indigo-700 transition
          "
        >
          Send
        </button>

        {/* ACTIONS */}
<div className="border-t pt-3 space-y-2">
  <p className="text-xs font-medium text-slate-500">
    AI Actions
  </p>

  <div className="flex flex-wrap gap-2">
    <button
      onClick={() => handleAction("create_task")}
      className="px-3 py-1 rounded bg-slate-200 text-sm hover:bg-slate-300"
    >
      Create Follow-up Task
    </button>

    <button
      onClick={() => handleAction("schedule_followup")}
      className="px-3 py-1 rounded bg-slate-200 text-sm hover:bg-slate-300"
    >
      Schedule Follow-up
    </button>

    <button
      onClick={() => handleAction("escalate")}
      disabled={!canEscalate}
      className={`px-3 py-1 rounded text-sm ${
        canEscalate
          ? "bg-amber-600 text-white hover:bg-amber-700"
          : "bg-slate-100 text-slate-400 cursor-not-allowed"
      }`}
    >
      Escalate
    </button>
  </div>
   {/* ACTION HISTORY */}
{actions.length > 0 && (
  <div className="mt-3 space-y-1">
    <p className="text-xs font-medium text-slate-500">
      Recent AI Actions
    </p>

    <ul className="text-xs text-slate-600 space-y-1">
      {actions.map((a) => (
        <li key={a.id}>
          • {a.description} ({a.timestamp})
        </li>
      ))}
    </ul>
  </div>
)}
</div>



      </div>

      {/* Footer */}
      <p className="text-xs text-slate-400">
        AI responses are simulated for now
      </p>
    </div>
  );
}
