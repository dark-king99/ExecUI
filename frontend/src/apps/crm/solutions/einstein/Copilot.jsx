import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, Loader2, Bot, User } from "lucide-react";
import { useMutation } from "../../../../hooks/useApi";
import { crm } from "../../../../services/api";
import { SolutionShell, Section } from "../../components/crm-ui";

const SUGGESTIONS = [
  "How healthy is my pipeline?",
  "Which customers are at risk of churn?",
  "How do I qualify this lead?",
  "Help me with my forecast",
];

// Minimal **bold** + newline renderer for the AI reply.
function Rich({ text }) {
  return (
    <>
      {text.split("\n").map((line, i) => (
        <p key={i} className={line.trim() === "" ? "h-2" : "mb-1 last:mb-0"}>
          {line.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
            part.startsWith("**") && part.endsWith("**")
              ? <strong key={j} className="font-semibold text-slate-900 dark:text-white">{part.slice(2, -2)}</strong>
              : <span key={j}>{part}</span>
          )}
        </p>
      ))}
    </>
  );
}

export default function Copilot() {
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Hi, I'm your Sales Cloud **Einstein Copilot**. Ask me about pipeline health, customer risk, lead qualification, or forecasting." },
  ]);
  const [input, setInput] = useState("");
  const scrollRef = useRef(null);
  const { mutate, loading } = useMutation((message) => crm.ai.chat({ message }), {
    onSuccess: (r) => setMessages((m) => [...m, { role: "assistant", text: r?.reply ?? "…" }]),
    onError: () => setMessages((m) => [...m, { role: "assistant", text: "Sorry, I couldn't process that. Try again." }]),
  });

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages, loading]);

  const send = (text) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setMessages((m) => [...m, { role: "user", text: msg }]);
    setInput("");
    mutate(msg);
  };

  return (
    <SolutionShell solutionId="einstein" title="Einstein Copilot" subtitle="Your AI sales assistant for deals, pipeline, and strategy">
      <Section pad={false} className="flex flex-col" >
        <div ref={scrollRef} className="flex-1 max-h-[26rem] overflow-y-auto p-5 space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${m.role === "user" ? "bg-slate-200 dark:bg-slate-700" : "bg-gradient-to-br from-teal-500 to-emerald-600"}`}>
                {m.role === "user" ? <User size={15} className="text-slate-600 dark:text-slate-300" /> : <Bot size={15} className="text-white" />}
              </div>
              <div className={`text-sm rounded-xl px-4 py-2.5 max-w-[80%] ${m.role === "user" ? "bg-teal-600 text-white" : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200"}`}>
                <Rich text={m.text} />
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center"><Bot size={15} className="text-white" /></div>
              <div className="bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-3"><Loader2 size={15} className="animate-spin text-slate-400" /></div>
            </div>
          )}
        </div>

        <div className="px-5 pt-3 flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button key={s} onClick={() => send(s)} className="text-xs px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-teal-400 transition">{s}</button>
          ))}
        </div>

        <div className="p-4 flex items-center gap-2">
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Ask Einstein…"
            className="flex-1 text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500" />
          <button onClick={() => send()} disabled={loading || !input.trim()} className="flex items-center gap-1.5 text-sm px-4 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white transition">
            <Send size={15} /> Send
          </button>
        </div>
      </Section>
    </SolutionShell>
  );
}
