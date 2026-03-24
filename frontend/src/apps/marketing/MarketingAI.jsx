import { useState } from "react";
import { Sparkles, Send, Laptop2Icon, Loader2 } from "lucide-react";
import { useMutation } from "../../hooks/useApi";
import { marketing } from "../../services/api";
import { useToast } from "../../components/ui/Toast";
import MediaPromptPanel from "./MediaPromptPanel";

const MODES = ["content", "campaign", "social", "ads"];

export default function MarketingAI() {
  const toast = useToast();

  const [mode,         setMode]         = useState("content");
  const [prompt,       setPrompt]       = useState("");
  const [output,       setOutput]       = useState(null);
  const [activeModule, setActiveModule] = useState("mediapromptpanel");

  const { mutate: generate, loading: generating } = useMutation(
    (body) => marketing.ai.generate(body),
    {
      onSuccess: (data) => {
        setOutput(data);
        setPrompt("");
      },
      onError: (err) => toast({ message: err?.message ?? "AI generation failed.", type: "error" }),
    }
  );

  const handleGenerate = () => {
    if (!prompt.trim()) {
      toast({ message: "Please enter a prompt first.", type: "warning" });
      return;
    }
    generate({ mode, prompt });
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && e.ctrlKey) handleGenerate();
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="text-indigo-600" />
        <h3 className="font-semibold text-slate-900 dark:text-white">AI Marketing Assistant</h3>
      </div>

      {/* Mode selector */}
      <div className="flex gap-2 mb-3">
        {MODES.map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); setOutput(null); }}
            className={`px-3 py-1 rounded text-sm font-medium transition ${
              mode === m
                ? "bg-indigo-600 text-white"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            {m.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Prompt input */}
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={generating}
        placeholder={`Describe what you want to generate (${mode})… Ctrl+Enter to submit`}
        className="w-full border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm mb-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none disabled:opacity-50"
        rows={3}
      />

      <button
        onClick={handleGenerate}
        disabled={generating || !prompt.trim()}
        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {generating ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        Generate
      </button>

      {/* Output */}
      {output && (
        <div className="mt-5 space-y-4">
          {output.title && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Title</p>
              <p className="font-semibold text-slate-900 dark:text-white">{output.title}</p>
            </div>
          )}

          {output.summary && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Summary</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">{output.summary}</p>
            </div>
          )}

          {output.copy && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Copy</p>
              <div className="rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                {output.copy}
              </div>
            </div>
          )}

          {Array.isArray(output.steps) && output.steps.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Action Steps</p>
              <ol className="list-decimal ml-5 space-y-1">
                {output.steps.map((step, i) => (
                  <li key={i} className="text-sm text-slate-700 dark:text-slate-300">{step}</li>
                ))}
              </ol>
            </div>
          )}

          {output.content && typeof output.content === "string" && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Content</p>
              <div className="rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                {output.content}
              </div>
            </div>
          )}

          <button
            onClick={() => setOutput(null)}
            className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            Clear output
          </button>
        </div>
      )}

      {/* Sub-modules */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-2 px-0 pt-6 pb-0">
        <div
          onClick={() => setActiveModule("mediapromptpanel")}
          className="cursor-pointer transition hover:scale-[1.02]"
        >
          <Section title="Media Prompt Panel" icon={Laptop2Icon}>
            Behavioral rules, dynamic audiences, predictive lookalikes.
          </Section>
        </div>
      </div>

      {activeModule === "mediapromptpanel" && <MediaPromptPanel />}
    </div>
  );
}

function Section({ title, icon: Icon, children }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
      <div className="flex items-center gap-2 font-semibold mb-3">
        <Icon size={18} /> {title}
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-400">{children}</p>
    </div>
  );
}
