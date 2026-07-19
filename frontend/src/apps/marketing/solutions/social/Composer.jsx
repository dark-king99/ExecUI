import { useState, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { Sparkles, Send, CalendarClock, Save, Wand2, Image as ImageIcon, Info } from "lucide-react";
import { marketing } from "../../../../services/api";
import { useApi } from "../../../../hooks/useApi";
import { useToast } from "../../../../components/ui/Toast";
import { SolutionShell, PrimaryBtn, GhostBtn, Loading } from "../../components/mkt-ui";
import { platformMeta } from "./platformMeta";

const SOURCE_LABEL = { einstein: "Einstein AI", engagement: "Content Builder", manual: "" };

export default function Composer() {
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const incoming = location.state || {}; // { content, source, mediaUrl } from Einstein / Content Builder

  const { data: platforms, loading: lp } = useApi(() => marketing.social.platforms(), []);
  const { data: accounts, loading: la } = useApi(() => marketing.social.accounts(), []);

  const [content, setContent] = useState(incoming.content || "");
  const [mediaUrl, setMediaUrl] = useState(incoming.mediaUrl || "");
  const [selected, setSelected] = useState([]);
  const [scheduledAt, setScheduledAt] = useState("");
  const [source] = useState(incoming.source || "manual");
  const [busy, setBusy] = useState(false);
  const [improving, setImproving] = useState(false);

  const connected = accounts ?? [];
  const connectedIds = new Set(connected.map((a) => a.platform));
  const list = platforms?.platforms ?? [];

  // Preselect all connected platforms once accounts load.
  useEffect(() => {
    if (connected.length && selected.length === 0) setSelected(connected.map((a) => a.platform));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts]);

  const toggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const improve = async () => {
    if (!content.trim()) return;
    setImproving(true);
    try {
      const res = await marketing.social.improve({ content, platform: selected[0] });
      setContent(res.content);
      toast.success("Caption improved");
    } catch (e) { toast.error(e.message || "Could not improve"); }
    finally { setImproving(false); }
  };

  const submit = async (mode) => {
    if (!content.trim()) return toast.error("Write something first");
    if (selected.length === 0) return toast.error("Choose at least one platform");
    setBusy(true);
    try {
      const payload = { content, mediaUrl: mediaUrl || undefined, platforms: selected, source };
      if (mode === "publish") payload.publishNow = true;
      if (mode === "schedule") {
        if (!scheduledAt) { setBusy(false); return toast.error("Pick a schedule time"); }
        payload.scheduledAt = new Date(scheduledAt).toISOString();
      }
      const res = await marketing.social.createPost(payload);
      if (mode === "publish") {
        const live = Object.values(res.results || {}).some((r) => r.mode === "live");
        toast.success(live ? "Published to your accounts" : "Published (simulated — connect live APIs to post for real)");
      } else {
        toast.success(mode === "schedule" ? "Scheduled" : "Saved to drafts");
      }
      navigate("/marketing/social/calendar");
    } catch (e) { toast.error(e.message || "Could not save"); }
    finally { setBusy(false); }
  };

  if (lp || la) return <SolutionShell solutionId="social"><Loading /></SolutionShell>;

  return (
    <SolutionShell solutionId="social" title="Composer" subtitle="Compose once, publish everywhere.">
      {source !== "manual" && (
        <div className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
          <Sparkles size={12} /> Brought in from {SOURCE_LABEL[source]}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Editor */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={7}
              placeholder="What do you want to share?"
              className="w-full text-sm bg-transparent resize-none focus:outline-none text-slate-900 dark:text-white placeholder:text-slate-400"
            />
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs text-slate-400">{content.length} chars</span>
              <GhostBtn onClick={improve} disabled={improving || !content.trim()}>
                <Wand2 size={14} /> {improving ? "Improving…" : "Improve with AI"}
              </GhostBtn>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1.5 mb-2"><ImageIcon size={13} /> Media URL (optional)</label>
            <input
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
              placeholder="https://…/image.jpg"
              className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
        </div>

        {/* Sidebar: platforms + actions */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">Platforms</p>
            {connected.length === 0 && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                No accounts connected yet. <Link to="/marketing/social/accounts" className="text-violet-600 dark:text-violet-400 font-medium">Connect accounts →</Link>
              </p>
            )}
            <div className="space-y-1.5">
              {list.map((p) => {
                const m = platformMeta(p.id);
                const isConnected = connectedIds.has(p.id);
                const on = selected.includes(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => toggle(p.id)}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg border transition text-left ${
                      on ? "border-violet-400 bg-violet-50 dark:bg-violet-500/10" : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                    }`}
                  >
                    <m.Icon size={16} className={m.color} />
                    <span className="text-sm flex-1 text-slate-700 dark:text-slate-200">{m.name}</span>
                    {!isConnected && <span className="text-[10px] text-slate-400">not linked</span>}
                    {!p.live && isConnected && <span className="text-[10px] text-amber-500">sim</span>}
                    <span className={`h-3.5 w-3.5 rounded-full border ${on ? "bg-violet-500 border-violet-500" : "border-slate-300 dark:border-slate-600"}`} />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3">
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1.5 mb-1"><CalendarClock size={13} /> Schedule (optional)</label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <div className="flex flex-col gap-2">
              <PrimaryBtn onClick={() => submit("publish")} disabled={busy}><Send size={14} /> Publish now</PrimaryBtn>
              <GhostBtn onClick={() => submit("schedule")} disabled={busy}><CalendarClock size={14} /> Schedule</GhostBtn>
              <GhostBtn onClick={() => submit("draft")} disabled={busy}><Save size={14} /> Save draft</GhostBtn>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 flex items-start gap-1.5 px-1">
            <Info size={13} className="shrink-0 mt-0.5" />
            Platforms marked “sim” publish in simulation until their API keys are configured — everything else (queue, analytics, growth) works the same.
          </p>
        </div>
      </div>
    </SolutionShell>
  );
}
