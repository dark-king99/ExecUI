/**
 * IndustrySelect — the org's industry, shown on Home and the Executive Overview
 * so admins are reminded to pick it and everyone can see it.
 *
 * Rules:
 *   • Only an org admin (enterprise_admin / system_admin) can change it — the
 *     backend enforces this too; everyone else sees it read-only.
 *   • It must be covered by the subscription plan. If the plan doesn't include
 *     industry customization, admins get an upgrade prompt instead of a picker.
 *
 * Accepts optional { industry, industryName, planIncludesIndustry } props (the
 * Executive Overview passes these from its dashboard payload so the value is
 * correct even for employees without CRM access); otherwise it reads the shared
 * IndustryContext + the signed-in user's plan.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Check, Lock, Sparkles, ChevronRight, X } from "lucide-react";
import { useUser } from "../context/UserContext";
import { useIndustry } from "../context/IndustryContext";
import { entitlementsFor } from "../lib/plans";
import { useToast } from "./ui/Toast";
import { ADMIN_ROLES } from "../lib/access";


export default function IndustrySelect({
  variant = "card", // "card" (Executive Overview) | "banner" (Home)
  promptOnly = false, // Home: only show the reminder to set it, nothing once set
  industry: industryProp,
  industryName: nameProp,
  planIncludesIndustry: planIncProp,
}) {
  const { user } = useUser();
  const { industryId, catalog, setIndustry, loading } = useIndustry();
  const toast = useToast();
  const navigate = useNavigate();

  const [editing, setEditing] = useState(false);
  const [choice, setChoice] = useState("");
  const [saving, setSaving] = useState(false);

  const isAdmin = ADMIN_ROLES.includes(user?.role);
  const ent = entitlementsFor(user?.plan || "executive", user?.planSolutions || []);
  const planIncludes = planIncProp ?? ent.industry;

  const industry = industryProp ?? industryId;
  const isSet = !!industry && industry !== "general";
  const currentName = nameProp || catalog.find((c) => c.id === industry)?.name || (isSet ? industry : "General");

  if (loading && industryProp == null) return null;

  // Home uses this as a pure reminder: show it only when an admin still needs to
  // pick an industry the plan covers; otherwise render nothing.
  if (promptOnly && (!isAdmin || !planIncludes || isSet)) return null;

  const Shell = ({ tone = "default", children }) => {
    const tones = {
      default: "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900",
      prompt: "border-indigo-200 dark:border-indigo-500/30 bg-indigo-50/60 dark:bg-indigo-500/10",
      locked: "border-amber-200 dark:border-amber-500/30 bg-amber-50/60 dark:bg-amber-500/10",
    };
    return (
      <div className={`rounded-2xl border ${tones[tone]} ${variant === "banner" ? "px-4 py-3" : "p-4"}`}>
        {children}
      </div>
    );
  };

  // Plan doesn't cover industry customization.
  if (!planIncludes) {
    if (!isAdmin) return null;
    return (
      <Shell tone="locked">
        <div className="flex items-center gap-3">
          <Lock size={18} className="text-amber-500 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-900 dark:text-white">Industry customization isn't in your plan</p>
            <p className="text-xs text-slate-500">Upgrade to tailor CRM &amp; Marketing to your industry.</p>
          </div>
          <button
            onClick={() => navigate("/account/billing")}
            className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold px-3 py-1.5"
          >
            Upgrade <ChevronRight size={13} />
          </button>
        </div>
      </Shell>
    );
  }

  const options = [{ id: "general", name: "General (core CRM)" }, ...catalog];

  const save = async () => {
    if (!choice) return;
    setSaving(true);
    try {
      await setIndustry(choice);
      toast.success?.(
        choice === "general"
          ? "Reverted to the general workspace."
          : "Industry set — your CRM & Marketing are now tailored to it."
      );
      setEditing(false);
      setChoice("");
    } catch (e) {
      toast.error?.(e?.message || "Couldn't update the industry.");
    } finally {
      setSaving(false);
    }
  };

  const Picker = ({ onCancel }) => (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={choice}
        onChange={(e) => setChoice(e.target.value)}
        className="min-w-48 flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm px-3 py-1.5 text-slate-900 dark:text-white"
      >
        <option value="" disabled>Choose your industry…</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>{o.name}</option>
        ))}
      </select>
      <button
        onClick={save}
        disabled={!choice || saving}
        className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5"
      >
        <Check size={13} /> {saving ? "Saving…" : "Save"}
      </button>
      {onCancel && (
        <button onClick={onCancel} className="inline-flex items-center gap-1 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 text-xs px-2 py-1.5">
          <X size={13} /> Cancel
        </button>
      )}
    </div>
  );

  // ── Industry not set yet ────────────────────────────────────────────────────
  if (!isSet) {
    if (!isAdmin) {
      return (
        <Shell>
          <div className="flex items-center gap-3">
            <Building2 size={18} className="text-slate-400 shrink-0" />
            <p className="text-sm text-slate-500">
              Your organization hasn't chosen an industry yet — an admin can set it here.
            </p>
          </div>
        </Shell>
      );
    }
    return (
      <Shell tone="prompt">
        <div className="flex items-start gap-3">
          
          <div className="min-w-0 flex-1 space-y-2">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Set your organization's industry</p>
              <p className="text-xs text-slate-500">
                Tailors CRM &amp; Marketing with the right objects and workflows for your business. You can change it anytime.
              </p>
            </div>
            <Picker />
          </div>
        </div>
      </Shell>
    );
  }

  // ── Industry already set ────────────────────────────────────────────────────
  return (
    <Shell>
      <div className="flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-indigo-500/10 shrink-0">
          <Building2 size={17} className="text-indigo-500" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-wide text-slate-400">Industry</p>
          <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{currentName}</p>
        </div>
        {isAdmin && !editing && (
          <button
            onClick={() => { setEditing(true); setChoice(industry); }}
            className="shrink-0 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Change
          </button>
        )}
      </div>
      {isAdmin && editing && (
        <div className="mt-3">
          <Picker onCancel={() => { setEditing(false); setChoice(""); }} />
        </div>
      )}
    </Shell>
  );
}
