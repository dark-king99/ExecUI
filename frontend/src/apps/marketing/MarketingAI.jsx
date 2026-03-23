import { useState } from "react";
import { Sparkles, Send, Laptop2Icon } from "lucide-react";
import MediaPromptPanel from "../marketing/MediaPromptPanel";

export default function MarketingAI() {
  const [mode, setMode] = useState("content");
  const [prompt, setPrompt] = useState("");
  const [output, setOutput] = useState(null);
  const [activeModule, setActiveModule] = useState("mediapromptpanel")

  const runMockAI = () => {
    // TEMP: mock AI response
    setOutput({
      title: "AI Generated Campaign",
      summary: "This is a sample AI-generated marketing output.",
      steps: [
        "Define target audience",
        "Craft key message",
        "Choose distribution channels",
        "Schedule campaign"
      ]
    });
  };

  return (
  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="text-indigo-600" />
        <h3 className="font-semibold  text-slate-900 dark:text-white">
          AI Marketing Assistant
        </h3>
      </div>

      {/* MODE SELECTOR */}
      <div className="flex gap-2 mb-3">
        {["content", "campaign", "social", "ads"].map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-3 py-1 rounded text-sm ${
              mode === m
                ? "bg-indigo-600 text-white"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            {m.replace("_", " ").toUpperCase()}
          </button>
        ))}
      </div>

      {/* PROMPT INPUT */}
      <textarea
        value={prompt}
        onChange={e => setPrompt(e.target.value)}
        placeholder={`Describe what you want to generate (${mode})...`}
        className="w-full border rounded-md p-2 text-sm mb-3"
        rows={3}
      />

      <button
        onClick={runMockAI}
        className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-md text-sm"
      >
        <Send size={16} />
        Generate
      </button>

      {output && (
          <div className="mt-2">
            <pre>{output}</pre>
  
            {typeof onAttach === "function" && (
              <button
                onClick={() =>
                  onAttach(prev => ({
                    ...prev,
                    content: {
                      ...(prev?.content || {}),
                      copy: output
                    }
                  }))
                }
              >
                Attach
              </button>
            )}
    </div>
        
      )}
<div className="grid grid-cols-1 xl:grid-cols-3 gap-2 px-0 pt-6 pb-0 ">
          
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
      <p className="text-sm text-slate-600 dark:text-slate-400">
        {children}
      </p>
    </div>
  );
}
