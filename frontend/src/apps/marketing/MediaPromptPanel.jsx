import { useState } from "react";
import { Image, Video, Copy, Sparkles } from "lucide-react";

export default function MediaPromptPanel() {
  const [type, setType] = useState("image");
  const [industry, setIndustry] = useState("");
  const [goal, setGoal] = useState("");
  const [style, setStyle] = useState("");
  const [result, setResult] = useState(null);

  const generatePrompt = () => {
    if (!industry || !goal) return;

    if (type === "image") {
      setResult({
        title: "Image Generation Prompt",
        prompt: `
High-quality ${style || "modern"} advertisement image for a ${industry} company.
Marketing goal: ${goal}.
Visual style: clean, professional, cinematic lighting.
Include strong brand presence, minimal text, high contrast.
Aspect ratio: 4:5 (social media).
Photorealistic, ultra-detailed.
        `.trim()
      });
    } else {
      setResult({
        title: "Video Generation Prompt",
        prompt: `
Short-form marketing video (15–30 seconds) for a ${industry} brand.
Goal: ${goal}.
Style: ${style || "modern, engaging"}.
Scenes:
1. Attention-grabbing hook in first 3 seconds
2. Product/service value demonstration
3. Emotional or aspirational moment
4. Clear call-to-action at the end
Format optimized for Instagram Reels / TikTok.
Cinematic transitions, subtitles, brand colors.
        `.trim()
      });
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="text-pink-600" />
        <h3 className="font-semibold text-slate-900 dark:text-white">
          AI Media Prompt Generator
        </h3>
      </div>

      {/* TYPE */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => setType("image")}
          className={`flex items-center gap-1 px-3 py-1 rounded text-sm ${
            type === "image"
              ? "bg-pink-600 text-slate-900 dark:text-white"
              : ""
          }`}
        >
          <Image size={16} /> Image
        </button>

        <button
          onClick={() => setType("video")}
          className={`flex items-center gap-1 px-3 py-1 rounded text-sm ${
            type === "video"
              ? "bg-pink-600 text-slate-900 dark:text-white"
              : ""
          }`}
        >
          <Video size={16} /> Video
        </button>
      </div>

      {/* INPUTS */}
      <div className="grid gap-3 mb-3">
        <input
          value={industry}
          onChange={e => setIndustry(e.target.value)}
          placeholder="Industry (e.g. SaaS, Real Estate, Fashion)"
          className="border rounded p-2 text-sm"
        />
        <input
          value={goal}
          onChange={e => setGoal(e.target.value)}
          placeholder="Campaign goal (e.g. Lead generation, Brand awareness)"
          className="border rounded p-2 text-sm"
        />
        <input
          value={style}
          onChange={e => setStyle(e.target.value)}
          placeholder="Style (optional – cinematic, minimal, luxury)"
          className="border rounded p-2 text-sm"
        />
      </div>

      <button
        onClick={generatePrompt}
        className="flex items-center gap-2 bg-pink-600 text-slate-900 dark:text-white px-4 py-2 rounded text-sm"
      >
        <Copy size={16} />
        Generate Prompt
      </button>
      {typeof onAttach === "function" && (
              <button
                onClick={() =>
                  onAttach(prev => ({
                    ...prev,
                    content: {
                      ...(prev?.content || {}),
                      media: result
                    }
                  }))
                }
              >
                Attach
              </button>
            )}

      </div>
  );
}
