import { useState, useRef, useEffect, useCallback } from "react";
import { useApi, useMutation } from "../../hooks/useApi";
import { crm } from "../../services/api";
import { useToast } from "../../components/ui/Toast";
import {
  Bot, Send, Loader2, RefreshCw, User, Sparkles,
  TrendingUp, Users, AlertTriangle, CheckCircle2,
  ChevronDown, X, Lightbulb, Target, BarChart3,
  ClipboardList, Zap, BookOpen,
} from "lucide-react";

// ── Topic chips ──────────────────────────────────────────────────────────────
const TOPICS = [
  { label: "Pipeline Health",      prompt: "Give me an overview of pipeline health and what to watch.",         icon: TrendingUp },
  { label: "Lead Qualification",   prompt: "How should I qualify leads effectively? What framework works best?", icon: Target },
  { label: "At-Risk Customers",    prompt: "How do I identify and handle at-risk customers?",                    icon: AlertTriangle },
  { label: "Sales Forecasting",    prompt: "Explain sales forecasting best practices and categories.",           icon: BarChart3 },
  { label: "Follow-Up Cadence",    prompt: "What's the optimal follow-up cadence for B2B deals?",               icon: ClipboardList },
  { label: "Win / Loss Analysis",  prompt: "What are the top reasons deals are lost and how to address them?",  icon: BarChart3 },
  { label: "CRM Best Practices",   prompt: "Give me the top CRM best practices for a high-performing team.",    icon: BookOpen },
  { label: "What is a CRM?",       prompt: "What is a CRM and why is it important for sales teams?",            icon: Lightbulb },
];

// ── Message renderer — converts **bold**, bullet "•", and "\n" to JSX ────────
function MessageContent({ text }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-1 text-sm leading-relaxed">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1" />;

        // Render inline **bold**
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        const rendered = parts.map((p, j) =>
          p.startsWith("**") && p.endsWith("**")
            ? <strong key={j} className="font-semibold">{p.slice(2, -2)}</strong>
            : p
        );

        // Bullet points
        if (line.startsWith("•") || line.match(/^\d+\./)) {
          return <div key={i} className="flex gap-2"><span className="shrink-0 mt-0.5">›</span><span>{rendered}</span></div>;
        }
        return <p key={i}>{rendered}</p>;
      })}
    </div>
  );
}

// ── Customer context pill ────────────────────────────────────────────────────
function CustomerPill({ customer, onClear }) {
  if (!customer) return null;
  return (
    <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 rounded-full px-3 py-1 text-xs text-indigo-700 dark:text-indigo-300">
      <User size={11} />
      <span className="font-medium">{customer.name}</span>
      <button onClick={onClear} className="hover:text-indigo-900 dark:hover:text-white ml-0.5">
        <X size={11} />
      </button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function SmartCRM() {
  const toast = useToast();
  const bottomRef   = useRef(null);
  const inputRef    = useRef(null);

  const [input,            setInput]            = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerOpen,     setCustomerOpen]      = useState(false);
  const [messages,         setMessages]          = useState([
    {
      role: "assistant",
      content: "Hi! I'm **SmartCRM AI** — your intelligent CRM copilot.\n\nI can help you with:\n• Pipeline health and deal strategy\n• Customer risk and churn prevention\n• Lead qualification frameworks\n• Sales forecasting and quota tracking\n• Follow-up cadences and task automation\n• CRM best practices and playbooks\n\nAsk me anything, or pick a topic from the sidebar to get started.",
    },
  ]);

  // ── Data ────────────────────────────────────────────────────────────────────
  const { data: customers, loading: customersLoading } = useApi(() => crm.customers.list({ limit: 50 }));
  const { data: pipelineSummary } = useApi(() => crm.pipeline.summary());
  const { data: forecastSummary } = useApi(() => crm.forecast.summary());

  // ── AI chat mutation ────────────────────────────────────────────────────────
  const { mutate: sendChat, loading: chatLoading } = useMutation(
    (body) => crm.ai.chat(body),
    { onError: (err) => toast({ message: err?.message ?? "AI unavailable.", type: "error" }) }
  );

  // ── Auto-scroll ─────────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatLoading]);

  // ── Send message ─────────────────────────────────────────────────────────────
  const handleSend = useCallback(async (text) => {
    const msg = (text ?? input).trim();
    if (!msg || chatLoading) return;
    setInput("");

    const userMsg = { role: "user", content: msg };
    setMessages(prev => [...prev, userMsg]);

    try {
      const body = { message: msg };
      if (selectedCustomer) body.customerId = selectedCustomer.id;
      const res = await sendChat(body);
      const reply = res?.reply ?? res?.message ?? "I'm here to help — could you rephrase that?";
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch {
      // handled by onError
    }
  }, [input, chatLoading, selectedCustomer, sendChat]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleTopic = (prompt) => {
    handleSend(prompt);
    inputRef.current?.focus();
  };

  const handleSelectCustomer = (c) => {
    setSelectedCustomer(c);
    setCustomerOpen(false);
    setMessages(prev => [
      ...prev,
      {
        role: "assistant",
        content: `Customer context set to **${c.name}**.\n\nI can now answer questions specific to this account. For example:\n• What is ${c.name}'s engagement level?\n• Are there any risk signals for this account?\n• What's the recommended next action for ${c.name}?`,
      },
    ]);
  };

  const handleClearCustomer = () => {
    setSelectedCustomer(null);
    setMessages(prev => [
      ...prev,
      { role: "assistant", content: "Customer context cleared. I'm back to general CRM mode — ask me anything." },
    ]);
  };

  const atRiskCount  = (customers ?? []).filter(c => (c.lastContactDays ?? 0) > 14).length;
  const healthyCount = (customers ?? []).filter(c => (c.lastContactDays ?? 0) <= 14).length;

  return (
    <div className="h-full flex gap-4 min-h-0">

      {/* ── Left: Chat panel ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-0 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-slate-900">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-indigo-600">
              <Bot size={16} className="text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-white text-sm">SmartCRM AI</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">CRM Intelligence Copilot</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {selectedCustomer && <CustomerPill customer={selectedCustomer} onClear={handleClearCustomer} />}
            <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Online
            </span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 min-h-0">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
              {/* Avatar */}
              <div className={`h-7 w-7 rounded-full shrink-0 flex items-center justify-center ${
                m.role === "user"
                  ? "bg-indigo-600"
                  : "bg-gradient-to-br from-indigo-500 to-purple-600"
              }`}>
                {m.role === "user"
                  ? <User size={13} className="text-white" />
                  : <Bot size={13} className="text-white" />
                }
              </div>

              {/* Bubble */}
              <div className={`max-w-[78%] px-4 py-3 rounded-2xl ${
                m.role === "user"
                  ? "bg-indigo-600 text-white rounded-tr-sm"
                  : "bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-tl-sm border border-slate-100 dark:border-slate-700"
              }`}>
                {m.role === "user"
                  ? <p className="text-sm">{m.content}</p>
                  : <MessageContent text={m.content} />
                }
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {chatLoading && (
            <div className="flex gap-3">
              <div className="h-7 w-7 rounded-full shrink-0 bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <Bot size={13} className="text-white" />
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={chatLoading}
              rows={1}
              placeholder="Ask anything about your CRM, pipeline, customers…"
              className="flex-1 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 resize-none leading-relaxed"
              style={{ maxHeight: "120px" }}
              onInput={(e) => {
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
              }}
            />
            <button
              onClick={() => handleSend()}
              disabled={chatLoading || !input.trim()}
              className="h-10 w-10 flex items-center justify-center rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              {chatLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-1.5">Enter to send · Shift+Enter for new line</p>
        </div>
      </div>

      {/* ── Right: Context sidebar ───────────────────────────────────────────── */}
      <div className="w-72 shrink-0 flex flex-col gap-4 overflow-y-auto">

        {/* CRM Stats */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={14} className="text-indigo-500" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">CRM Overview</h3>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 p-2.5">
              <div className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{healthyCount}</div>
              <div className="text-xs text-emerald-600 dark:text-emerald-500 flex items-center gap-1">
                <CheckCircle2 size={10} /> Healthy
              </div>
            </div>
            <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 p-2.5">
              <div className="text-lg font-bold text-amber-700 dark:text-amber-400">{atRiskCount}</div>
              <div className="text-xs text-amber-600 dark:text-amber-500 flex items-center gap-1">
                <AlertTriangle size={10} /> At Risk
              </div>
            </div>
            {forecastSummary?.target != null && (
              <div className="col-span-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 p-2.5">
                <div className="text-xs text-indigo-500 dark:text-indigo-400 mb-0.5">Forecast Commit</div>
                <div className="text-sm font-bold text-indigo-700 dark:text-indigo-300">
                  ${Number(forecastSummary.committed ?? 0).toLocaleString()}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Customer context selector */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="flex items-center gap-2 mb-2">
            <User size={14} className="text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Customer Context</h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
            Optionally select a customer to focus the AI on their specific account.
          </p>

          {selectedCustomer ? (
            <div className="flex items-center justify-between bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 rounded-lg px-3 py-2">
              <div>
                <p className="text-sm font-medium text-indigo-700 dark:text-indigo-300">{selectedCustomer.name}</p>
                <p className="text-xs text-indigo-500 dark:text-indigo-400">{selectedCustomer.email ?? "No email"}</p>
              </div>
              <button onClick={handleClearCustomer} className="text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-200">
                <X size={14} />
              </button>
            </div>
          ) : (
            <div className="relative">
              <button
                onClick={() => setCustomerOpen(o => !o)}
                className="w-full flex items-center justify-between border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-indigo-400 dark:hover:border-indigo-500 transition"
              >
                <span>Select customer…</span>
                <ChevronDown size={14} className={`transition-transform ${customerOpen ? "rotate-180" : ""}`} />
              </button>
              {customerOpen && (
                <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-52 overflow-y-auto">
                  {customersLoading ? (
                    <div className="flex justify-center py-4">
                      <Loader2 size={16} className="animate-spin text-slate-400" />
                    </div>
                  ) : (customers ?? []).length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-4">No customers found.</p>
                  ) : (
                    (customers ?? []).map(c => (
                      <button
                        key={c.id}
                        onClick={() => handleSelectCustomer(c)}
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-700 transition text-sm"
                      >
                        <div className="h-6 w-6 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center shrink-0">
                          <User size={11} className="text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900 dark:text-white truncate">{c.name}</p>
                          {c.email && <p className="text-xs text-slate-500 truncate">{c.email}</p>}
                        </div>
                        {(c.lastContactDays ?? 0) > 14 && (
                          <AlertTriangle size={12} className="text-amber-500 shrink-0 ml-auto" />
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick topics */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap size={14} className="text-amber-500" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Quick Topics</h3>
          </div>
          <div className="space-y-1.5">
            {TOPICS.map(({ label, prompt, icon: Icon }) => (
              <button
                key={label}
                onClick={() => handleTopic(prompt)}
                disabled={chatLoading}
                className="w-full flex items-center gap-2.5 text-left px-3 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-700 dark:hover:text-indigo-300 transition disabled:opacity-40 group"
              >
                <Icon size={13} className="text-slate-400 group-hover:text-indigo-500 shrink-0 transition" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Clear chat */}
        <button
          onClick={() => setMessages([{
            role: "assistant",
            content: "Chat cleared. How can I help you with your CRM today?",
          }])}
          className="flex items-center justify-center gap-2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 py-2 transition"
        >
          <RefreshCw size={12} /> Clear conversation
        </button>
      </div>
    </div>
  );
}
