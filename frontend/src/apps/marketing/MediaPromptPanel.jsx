import { useState } from "react";
import { Image, Video, Copy, Sparkles, CheckCircle2 } from "lucide-react";

const INDUSTRIES = [
  "SaaS / Software", "Real Estate", "Fashion & Apparel", "Healthcare",
  "Finance & Banking", "E-commerce", "Education", "Travel & Hospitality",
  "Food & Beverage", "Automotive",
];

const GOALS = [
  "Lead generation", "Brand awareness", "Product launch",
  "Retargeting / re-engagement", "App installs", "Event promotion",
];

const STYLES = [
  "Cinematic", "Minimal & clean", "Luxury / premium", "Bold & energetic",
  "Friendly & approachable", "Corporate / professional",
];

export default function MediaPromptPanel() {
  const [type,     setType]     = useState("image");
  const [industry, setIndustry] = useState("");
  const [goal,     setGoal]     = useState("");
  const [style,    setStyle]    = useState("");
  const [copied,   setCopied]   = useState(false);
  const [result,   setResult]   = useState(null);

  const canGenerate = industry.trim() && goal.trim();

  const generatePrompt = () => {
    if (!canGenerate) return;

    if (type === "image") {
      setResult({
        title: "Image Generation Prompt",
        prompt: `High-quality ${style || "modern"} advertisement image for a ${industry} company.\nMarketing goal: ${goal}.\nVisual style: clean, professional, cinematic lighting.\nInclude strong brand presence, minimal text, high contrast.\nAspect ratio: 4:5 (social media optimised).\nPhotorealistic, ultra-detailed, 8K resolution.`,
      });
    } else {
      setResult({
        title: "Video Generation Prompt",
        prompt: `Short-form marketing video (15–30 seconds) for a ${industry} brand.\nGoal: ${goal}.\nStyle: ${style || "modern, engaging"}.\n\nScene breakdown:\n1. Hook (0–3s): Attention-grabbing visual that stops the scroll\n2. Problem (3–8s): Relatable pain point the audience recognises\n3. Solution (8–20s): Product/service value demonstration\n4. Emotion (20–25s): Aspirational or social proof moment\n5. CTA (25–30s): Clear call-to-action with urgency\n\nFormat: Instagram Reels / TikTok (9:16)\nProduction: Cinematic transitions, on-screen text, brand colour palette, subtitles.`,
      });
    }
    setCopied(false);
  };

  const handleCopy = () => {
    if (!result?.prompt) return;
    navigator.clipboard.writeText(result.prompt).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const inputCls =
    "w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-500 transition";

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="text-pink-600" size={18} />
        <h3 className="font-semibold text-slate-900 dark:text-white">AI Media Prompt Generator</h3>
      </div>

      {/* Type selector */}
      <div className="flex gap-2 mb-4">
        {[{ id: "image", label: "Image", Icon: Image }, { id: "video", label: "Video", Icon: Video }].map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => { setType(id); setResult(null); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              type === id
                ? "bg-pink-600 text-white"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* Inputs */}
      <div className="grid gap-3 mb-4">
        <div>
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Industry *</label>
          <select value={industry} onChange={e => setIndustry(e.target.value)} className={inputCls}>
            <option value="">Select an industry…</option>
            {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Campaign Goal *</label>
          <select value={goal} onChange={e => setGoal(e.target.value)} className={inputCls}>
            <option value="">Select a goal…</option>
            {GOALS.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Visual Style <span className="text-slate-400">(optional)</span></label>
          <select value={style} onChange={e => setStyle(e.target.value)} className={inputCls}>
            <option value="">Choose a style…</option>
            {STYLES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

      {/* INPUTS */}
      <div className="grid gap-3 mb-3">
        <input
          value={industry}
          onChange={e => setIndustry(e.target.value)}
          placeholder="Industry (e.g. SaaS, Real Estate, Fashion)"
          className="border border-slate-200 dark:border-slate-800 rounded p-2 text-sm"
        />
        <input
          value={goal}
          onChange={e => setGoal(e.target.value)}
          placeholder="Campaign goal (e.g. Lead generation, Brand awareness)"
          className="border border-slate-200 dark:border-slate-800 rounded p-2 text-sm"
        />
        <input
          value={style}
          onChange={e => setStyle(e.target.value)}
          placeholder="Style (optional – cinematic, minimal, luxury)"
          className="border border-slate-200 dark:border-slate-800 rounded p-2 text-sm"
        />

      </div>

      <button
        onClick={generatePrompt}
        disabled={!canGenerate}
        className="flex items-center gap-2 bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Sparkles size={14} />
        Generate Prompt
      </button>

      {/* Result */}
      {result && (
        <div className="mt-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{result.title}</p>
            <button
              onClick={handleCopy}
              className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg transition ${
                copied
                  ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {copied ? <><CheckCircle2 size={12} /> Copied!</> : <><Copy size={12} /> Copy</>}
            </button>
          </div>
          <pre className="rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed font-mono">
            {result.prompt}
          </pre>
          <button
            onClick={() => setResult(null)}
            className="mt-2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
