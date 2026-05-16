import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, Bot, Copy, RefreshCw, Zap } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import { Card, CardHeader, CardBody } from "../../components/ui/Card";
import { useToast } from "../../components/ui/Toast";
import { useMutation } from "../../hooks/useApi";
import { marketing } from "../../services/api";

const MODES = [
  { id: "content", label: "Content Copy", desc: "Blog posts, landing pages, ad copy" },
  { id: "campaign", label: "Campaign Brief", desc: "Full campaign strategy and messaging" },
  { id: "social", label: "Social Posts", desc: "Platform-specific social content" },
  { id: "ads", label: "Ad Creative", desc: "Headlines, descriptions, CTAs" },
  { id: "email", label: "Email", desc: "Subject lines, body copy, CTAs" },
  { id: "seo", label: "SEO Content", desc: "Keyword-optimized content and meta" },
];

const QUICK_PROMPTS = {
  content:  ["Write a product launch blog post", "Create a landing page for enterprise SaaS", "Write a case study outline"],
  campaign: ["Plan a Q4 demand gen campaign", "Create an ABM campaign for Fortune 500s", "Design a product launch campaign"],
  social:   ["Write 5 LinkedIn posts for our new feature", "Create Twitter thread on industry trends", "Generate Instagram captions"],
  ads:      ["Write Google Ads for our enterprise product", "Create Facebook ad copy for lead gen", "Generate display ad headlines"],
  email:    ["Write a nurture sequence for trial users", "Create a re-engagement email campaign", "Write a product announcement email"],
  seo:      ["Write SEO meta for our pricing page", "Create keyword-rich product descriptions", "Optimize FAQ section content"],
};

export default function MarketingAI() {
  const toast = useToast();
  const [mode, setMode] = useState("content");
  const [prompt, setPrompt] = useState("");
  const [output, setOutput] = useState(null);
  const [history, setHistory] = useState([]);
  const textareaRef = useRef(null);

  const { mutate: generate, loading } = useMutation((body) => marketing.ai.generate(body), {
    onSuccess: (result) => {
      const text = result?.content ?? result?.output ?? result?.text ?? JSON.stringify(result);
      setOutput(text);
      setHistory(prev => [{ mode, prompt, output: text, at: new Date().toLocaleTimeString() }, ...prev.slice(0, 9)]);
      setPrompt("");
    },
    onError: (e) => toast({ message: e?.message ?? "Generation failed", type: "error" }),
  });

  function submit() {
    if (!prompt.trim() || loading) return;
    generate({ mode, prompt: prompt.trim() });
  }

  function copyOutput() {
    if (!output) return;
    navigator.clipboard.writeText(output).then(() => toast({ message: "Copied to clipboard", type: "success" }));
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Marketing AI" subtitle="AI-powered content generation for every marketing channel"
        actions={<div className="flex items-center gap-2"><Sparkles size={16} className="text-violet-500" /><span className="text-sm text-slate-600 dark:text-slate-300 font-medium">Powered by AI</span></div>}
      />

      {/* Mode selector */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {MODES.map(m => (
          <button key={m.id} onClick={() => { setMode(m.id); setOutput(null); }} className={`p-3 rounded-xl border text-left transition ${mode === m.id ? "border-violet-500 bg-violet-50 dark:bg-violet-900/20" : "border-slate-200 dark:border-slate-800 hover:border-violet-300"}`}>
            <div className={`text-sm font-semibold mb-0.5 ${mode === m.id ? "text-violet-700 dark:text-violet-400" : "text-slate-900 dark:text-white"}`}>{m.label}</div>
            <div className="text-xs text-slate-400 leading-tight">{m.desc}</div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Input + output */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardBody className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Your prompt</label>
                <textarea
                  ref={textareaRef}
                  rows={5}
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && e.metaKey && submit()}
                  placeholder={`Describe what you want to create for ${MODES.find(m2 => m2.id === mode)?.label.toLowerCase()}…`}
                  className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">⌘+Enter to generate</span>
                <button onClick={submit} disabled={!prompt.trim() || loading} className="flex items-center gap-2 text-sm px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white rounded-lg transition">
                  {loading ? <><RefreshCw size={14} className="animate-spin" /> Generating…</> : <><Send size={14} /> Generate</>}
                </button>
              </div>
            </CardBody>
          </Card>

          {output && (
            <Card>
              <CardHeader title="Generated Output" icon={Sparkles} actions={
                <button onClick={copyOutput} className="flex items-center gap-1.5 text-xs border border-slate-200 dark:border-slate-700 text-slate-500 px-3 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition">
                  <Copy size={12} /> Copy
                </button>
              } />
              <CardBody>
                <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed font-mono bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                  {output}
                </div>
              </CardBody>
            </Card>
          )}
        </div>

        {/* Quick prompts + history */}
        <div className="space-y-4">
          <Card>
            <CardBody className="space-y-2">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Quick Prompts</h3>
              {(QUICK_PROMPTS[mode] ?? []).map((p, i) => (
                <button key={i} onClick={() => setPrompt(p)} className="w-full text-left text-xs text-slate-600 dark:text-slate-300 px-3 py-2 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-900/20 hover:text-violet-600 border border-slate-100 dark:border-slate-800 transition">
                  {p}
                </button>
              ))}
            </CardBody>
          </Card>

          {history.length > 0 && (
            <Card>
              <CardBody>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Recent Generations</h3>
                <div className="space-y-2">
                  {history.map((h, i) => (
                    <button key={i} onClick={() => { setOutput(h.output); setMode(h.mode); }} className="w-full text-left p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition">
                      <div className="text-xs font-medium text-slate-900 dark:text-white truncate">{h.prompt}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{h.mode} • {h.at}</div>
                    </button>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
