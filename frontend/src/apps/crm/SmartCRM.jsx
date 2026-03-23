import React, { useState } from "react";

export default function SmartCRM({ role, customer }) {
  const safeRole = role ?? "employee";

  // ---- MOCK UNIFIED CUSTOMER DATA (SAFE, STATIC) ----
  const customers = [
    { id: 1, name: "Alice Johnson", interactions: 14, lastContactDays: 2, segment: "High Value" },
    { id: 2, name: "Bob Smith", interactions: 3, lastContactDays: 21, segment: "Standard" },
    { id: 3, name: "Charlie Davis", interactions: 7, lastContactDays: 9, segment: "Growth" },
  ];

  // ---- AI HELPERS ----
  const getEngagementLabel = (score) => (score >= 10 ? "High" : score >= 5 ? "Medium" : "Low");
  const getRiskStatus = (days) => (days > 14 ? "At Risk" : "Healthy");
  const getNextAction = (c) => {
    if (c.lastContactDays > 14) return "Reach out with a follow-up message";
    if (c.interactions > 10) return "Offer premium or upsell services";
    return "Maintain regular engagement";
  };

  // ---- HARD GUARD ----
  if (!customer) {
    return <div className="text-sm text-slate-500">Select a customer to use AI Copilot</div>;
  }

  // ---- AI CHAT STATE ----
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hi! I’m your CRM AI Copilot. Ask me about this customer’s status, risk, or next actions.",
    },
  ]);

  const generateAIResponse = (text) => {
    const lower = text.toLowerCase();

    if (lower.includes("risk")) {
      return customer.lastContactDays > 14
        ? "This customer is currently at risk due to limited recent engagement."
        : "This customer shows low risk with recent engagement activity.";
    }

    if (lower.includes("next") || lower.includes("do")) {
      return "The recommended next action is to send a personalized follow-up.";
    }

    if (lower.includes("summary")) {
      return `${customer.name} has had ${customer.interactions} interactions. Last contact was ${customer.lastContactDays} days ago.`;
    }

    return "I can help summarize activity, assess risk, or suggest next actions.";
  };

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages((prev) => [...prev, { role: "user", content: input }, { role: "assistant", content: generateAIResponse(input) }]);
    setInput("");
  };

  // ---- ACTIONS ----
  const [actions, setActions] = useState([]);
  const canEscalate = customer.lastContactDays > 14;

  const handleAction = (type) => {
    let description = "";

    if (type === "create_task") description = `Follow-up task created for ${customer.name}`;
    if (type === "schedule_followup") description = `Follow-up scheduled for ${customer.name}`;
    if (type === "escalate") description = canEscalate ? `${customer.name} escalated for review` : "Escalation not required";

    const entry = { id: Date.now(), description, timestamp: new Date().toLocaleTimeString() };
    setActions((prev) => [entry, ...prev]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded border p-4 bg-blue-200">
        <h2 className="font-semibold text-slate-800">Smart CRM — AI Copilot</h2>
        <p className="text-sm">Enhancing customer service for role: <strong>{safeRole}</strong></p>
      </div>

      {/* CUSTOMER CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {customers.map((c) => (
          <div key={c.id} className="rounded-xl border bg-white p-4 space-y-2">
            <p className="font-medium">{c.name}</p>
            <p className="text-sm">Segment: {c.segment}</p>
            <p className="text-sm">Engagement: {getEngagementLabel(c.interactions)}</p>
            <p className="text-sm">Risk: {getRiskStatus(c.lastContactDays)}</p>
            <p className="text-sm text-slate-600">{getNextAction(c)}</p>
          </div>
        ))}
      </div>

      {/* AI COPILOT */}
      <div className="rounded-xl border bg-white p-4 flex flex-col space-y-3">
        <h3 className="font-semibold">AI Copilot — Chat about {customer.name}</h3>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {messages.map((m, i) => (
            <div key={i} className={`p-2 rounded ${m.role === "user" ? "bg-indigo-600 text-white ml-auto" : "bg-slate-100"}`}>
              {m.content}
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 border rounded px-3 py-2 text-sm"
            placeholder="Ask about risk, summary, or next action…"
          />
          <button onClick={handleSend} className="bg-indigo-600 text-white px-4 rounded">Send</button>
        </div>

        {/* ACTIONS */}
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => handleAction("create_task")} className="px-3 py-1 bg-slate-200 rounded">Create Task</button>
          <button onClick={() => handleAction("schedule_followup")} className="px-3 py-1 bg-slate-200 rounded">Schedule Follow-up</button>
          <button onClick={() => handleAction("escalate")} disabled={!canEscalate} className="px-3 py-1 bg-amber-500 text-white rounded disabled:opacity-50">Escalate</button>
        </div>

        {/* ACTION LOG */}
        {actions.length > 0 && (
          <ul className="text-xs text-slate-600">
            {actions.map((a) => (
              <li key={a.id}>• {a.description} ({a.timestamp})</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
