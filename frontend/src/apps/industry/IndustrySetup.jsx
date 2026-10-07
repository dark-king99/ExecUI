import { useState } from "react";
import { Check, Layers, Building } from "lucide-react";
import { useIndustry } from "../../context/IndustryContext";
import { useUser } from "../../context/UserContext";
import { useToast } from "../../components/ui/Toast";
import { INDUSTRY_UI } from "./industries.config";
import { colorOf } from "../crm/solutions.config";
import { PrimaryBtn } from "../crm/components/crm-ui";
import { isAdminUser } from "../../lib/access";

const GENERAL_CARD = {
  id: "general",
  name: "General (Core CRM only)",
  icon: Layers,
  color: "slate",
  tagline: "No industry module",
  description: "Just the standard CRM — leads, accounts, opportunities, forecasting, service and analytics.",
};

export default function IndustrySetup() {
  const { industryId, catalog, setIndustry, loading } = useIndustry();
  const { user } = useUser();
  const toast = useToast();
  const isAdmin = isAdminUser(user);

  const [selected, setSelected] = useState(industryId);
  const [saving, setSaving] = useState(false);

  const cards = [
    GENERAL_CARD,
    ...catalog.map((c) => ({
      id: c.id,
      name: c.name,
      objects: c.objects,
      ...(INDUSTRY_UI[c.id] ?? { icon: Building, color: "sky", tagline: "Industry module", description: "" }),
    })),
  ];

  const save = async () => {
    setSaving(true);
    try {
      await setIndustry(selected);
      toast.success(selected === "general" ? "Switched to core CRM" : "Industry module enabled");
    } catch (e) {
      toast.error(e.message || "Could not update industry");
    } finally {
      setSaving(false);
    }
  };

  const dirty = selected !== industryId;

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Industry</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Choose your company's sector to unlock industry-specific modules on top of the core CRM.
          Your existing CRM data and features are never affected.
        </p>
      </div>

      {!isAdmin && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
          Only an administrator can change the company's industry. You're viewing the current selection.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => {
          const c = colorOf(card.color);
          const Icon = card.icon;
          const active = selected === card.id;
          const current = industryId === card.id;
          return (
            <button
              key={card.id}
              disabled={!isAdmin}
              onClick={() => setSelected(card.id)}
              className={`relative text-left rounded-2xl border-2 p-5 transition ${
                active
                  ? "border-orange-500 bg-orange-50/50 dark:bg-orange-500/10"
                  : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700"
              } ${!isAdmin ? "cursor-default opacity-90" : ""}`}
            >
              {current && (
                <span className="absolute top-3 right-3 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                  Current
                </span>
              )}
              <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${c.grad ?? "from-slate-400 to-slate-500"} flex items-center justify-center shadow-sm mb-3`}>
                <Icon size={20} className="text-white" />
              </div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-semibold text-slate-900 dark:text-white">{card.name}</h3>
                {active && <Check size={15} className="text-orange-500" />}
              </div>
              <p className={`text-xs font-medium mt-0.5 ${c.text ?? "text-slate-500"}`}>{card.tagline}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed line-clamp-3">{card.description}</p>
              {card.objects?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  {card.objects.slice(0, 6).map((o) => (
                    <span key={o.id} className="text-[11px] px-2 py-0.5 rounded-md bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400">{o.name}</span>
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {isAdmin && (
        <div className="flex items-center gap-3">
          <PrimaryBtn onClick={save} disabled={!dirty || saving || loading}>
            {saving ? "Saving…" : dirty ? "Save industry" : "Saved"}
          </PrimaryBtn>
          {dirty && <span className="text-sm text-slate-400">Switching to <strong>{cards.find((c) => c.id === selected)?.name}</strong></span>}
        </div>
      )}
    </div>
  );
}
