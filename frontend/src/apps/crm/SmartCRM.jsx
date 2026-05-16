import { useState, useRef, useEffect } from "react";
import { Bot, Send, Sparkles, RefreshCw, AlertCircle, Lightbulb, Zap } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import { Card, CardHeader, CardBody } from "../../components/ui/Card";
import { SkeletonTable } from "../../components/ui/Skeleton";
import { useToast } from "../../components/ui/Toast";
import { useApi, useMutation } from "../../hooks/useApi";
import { crm } from "../../services/api";

const QUICK_PROMPTS = [
  "Summarize my top 5 deals at risk",
  "Which leads need follow-up today?",
  "What's my forecast vs quota this quarter?",
  "Show me the accounts with the highest churn risk",
  "Generate a call plan for my next big deal",
  "Which reps are below 70% attainment?",
];

const QUICK_ACTIONS = [
  { label: "Refresh Summaries", icon: RefreshCw, action: "summaries" },
  { label: "Prioritize Leads", icon: Zap, action: "prioritize_leads" },
  { label: "Deal Insights", icon: Lightbulb, action: "deal_insights" },
];

function ChatMessage({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${isUser ? "bg-orange-600" : "bg-slate-200 dark:bg-slate-700"}`}>
        {isUser ? <span className="text-white text-xs font-bold">U</span> : <Bot size={14} className="text-slate-600 dark:text-slate-300" />}
      </div>
      <div className={`max-w-[80%] rounded-xl px-4 py-3 text-sm ${isUser ? "bg-orange-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white"}`}>
        {msg.content}
      </div>
    </div>
  );
}

export default function SmartCRM({ role }) {
  const toast = useToast();
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hello! I'm your Smart CRM AI. Ask me anything about your pipeline, deals, leads, or accounts. I can help you prioritize, analyze, and take action." }
  ]);
  const [input, setInput] = useState("");
  const [tab, setTab] = useState("chat");
  const bottomRef = useRef(null);
  const { data: summaries, loading: sumLoading, refetch: refetchSummaries } = useApi(() => crm.ai.summaries({ type: "overview" }), [], { pollingInterval: 300000 });

  const { mutate: sendMessage, loading: chatLoading } = useMutation((body) => crm.ai.chat(body), {
    onSuccess: (result) => {
      setMessages(prev => [...prev, { role: "assistant", content: result?.message ?? result?.response ?? "Here's what I found..." }]);
    },
    onError: (e) => {
      setMessages(prev => [...prev, { role: "assistant", content: `Sorry, I encountered an error: ${e?.message ?? "Unknown error"}` }]);
    },
  });

  const { mutate: runAction } = useMutation((body) => crm.ai.action(body), {
    onSuccess: (result) => {
      setMessages(prev => [...prev, { role: "assistant", content: result?.message ?? result?.summary ?? "Action completed." }]);
      setTab("chat");
    },
    onError: (e) => toast({ message: e?.message ?? "Action failed", type: "error" }),
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatLoading]);

  function submit() {
    if (!input.trim() || chatLoading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    sendMessage({ message: userMsg, context: { role } });
  }

  const allSummaries = summaries ?? {};

  return (
    <div className="space-y-6">
      <PageHeader title="Smart CRM" subtitle="AI-powered sales intelligence and automated insights"
        actions={
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-orange-500" />
            <span className="text-sm text-slate-600 dark:text-slate-300 font-medium">AI-Powered</span>
          </div>
        }
      />

      <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden w-fit">
        {["chat", "insights", "actions"].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-1.5 text-sm font-medium capitalize transition ${tab === t ? "bg-orange-600 text-white" : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>{t}</button>
        ))}
      </div>

      {tab === "chat" && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-3">
            <Card>
              <div className="flex flex-col h-[520px]">
                <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-200 dark:border-slate-800">
                  <Bot size={16} className="text-orange-600" />
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">CRM Assistant</span>
                  <div className="ml-auto h-2 w-2 rounded-full bg-emerald-500" />
                </div>
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  {messages.map((m, i) => <ChatMessage key={i} msg={m} />)}
                  {chatLoading && (
                    <div className="flex gap-3">
                      <div className="h-7 w-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0"><Bot size={14} className="text-slate-600 dark:text-slate-300" /></div>
                      <div className="bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-3 flex gap-1.5 items-center">
                        {[0, 1, 2].map(i => <div key={i} className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
                      </div>
                    </div>
                  )}
                  <div ref={bottomRef} />
                </div>
                <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex gap-2">
                    <input
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && !e.shiftKey && submit()}
                      placeholder="Ask about your deals, leads, pipeline…"
                      className="flex-1 text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    <button onClick={submit} disabled={!input.trim() || chatLoading} className="p-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white rounded-lg transition">
                      <Send size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <div className="space-y-3">
            <Card>
              <CardBody className="space-y-2">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Quick Prompts</h3>
                {QUICK_PROMPTS.map((p, i) => (
                  <button key={i} onClick={() => setInput(p)} className="w-full text-left text-xs text-slate-600 dark:text-slate-300 px-3 py-2 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:text-orange-600 border border-slate-100 dark:border-slate-800 transition">
                    {p}
                  </button>
                ))}
              </CardBody>
            </Card>
          </div>
        </div>
      )}

      {tab === "insights" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={refetchSummaries} className="flex items-center gap-1.5 text-xs border border-slate-200 dark:border-slate-700 text-slate-500 px-3 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"><RefreshCw size={13} /> Refresh Insights</button>
          </div>
          {sumLoading ? <SkeletonTable rows={6} /> : Object.keys(allSummaries).length === 0 ? (
            <Card>
              <CardBody>
                <div className="flex flex-col items-center py-10 text-slate-500">
                  <Sparkles size={32} className="text-orange-400 mb-3" />
                  <p className="text-sm">AI insights are being generated…</p>
                  <p className="text-xs text-slate-400 mt-1">This may take a moment</p>
                </div>
              </CardBody>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(allSummaries).map(([key, val]) => (
                <Card key={key}>
                  <CardHeader title={key.replace(/([A-Z])/g, " $1").trim()} icon={Lightbulb} />
                  <CardBody>
                    <p className="text-sm text-slate-700 dark:text-slate-300">{typeof val === "string" ? val : JSON.stringify(val)}</p>
                  </CardBody>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "actions" && (
        <div className="space-y-4">
          <Card>
            <CardHeader title="AI-Powered Actions" icon={Zap} subtitle="Let AI take intelligent actions on your behalf" />
            <CardBody>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {QUICK_ACTIONS.map(({ label, icon: Icon, action }) => (
                  <button key={action} onClick={() => { setMessages(prev => [...prev, { role: "user", content: label }]); runAction({ action }); setTab("chat"); }}
                    className="flex flex-col items-center gap-3 p-6 bg-slate-50 dark:bg-slate-800 rounded-xl hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:border-orange-300 border border-slate-200 dark:border-slate-700 transition group">
                    <div className="h-12 w-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center group-hover:bg-orange-200 dark:group-hover:bg-orange-900/50 transition">
                      <Icon size={22} className="text-orange-600" />
                    </div>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-orange-600 transition text-center">{label}</span>
                  </button>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}
