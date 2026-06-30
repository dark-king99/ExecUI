import { useState, useMemo } from "react";
import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import { useToast } from "../../components/ui/Toast";
import {
  CreditCard, AlertCircle, Check, Zap, Crown, Layers, Sparkles, Lock,
  Users, TrendingUp, Server, BarChart3, Sliders,
} from "lucide-react";
import { useApi, useMutation } from "../../hooks/useApi";
import { account } from "../../services/api";

function currentUser() {
  try { return JSON.parse(localStorage.getItem("user")) || {}; } catch { return {}; }
}
function isAdmin(u) {
  return u?.role === "enterprise_admin" || u?.role === "system_admin";
}

const TIER_STYLE = {
  standard:   { accent: "slate",   icon: Layers,   badge: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300" },
  premium:    { accent: "indigo",  icon: Zap,      badge: "bg-indigo-600 text-white" },
  enterprise: { accent: "violet",  icon: Sparkles, badge: "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300" },
  executive:  { accent: "amber",   icon: Crown,    badge: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300" },
};

const MODULE_META = {
  crm:       { label: "CRM",       icon: Users },
  marketing: { label: "Marketing", icon: TrendingUp },
  services:  { label: "Services",  icon: Layers },
  network:   { label: "Network",   icon: Server },
  analytics: { label: "Analytics", icon: BarChart3 },
};

// Human-readable feature lines from a plan's entitlements.
function planFeatures(plan) {
  const ent = plan.entitlements ?? {};
  const sol = ent.solutions ?? {};
  const lines = [];
  if (sol.crm?.length)       lines.push(`${sol.crm.length === 9 ? "Full" : sol.crm.length} CRM solution${sol.crm.length > 1 ? "s" : ""}`);
  if (sol.marketing?.length) lines.push(`${sol.marketing.length === 7 ? "Full" : sol.marketing.length} Marketing solution${sol.marketing.length > 1 ? "s" : ""}`);
  if (sol.services?.length)  lines.push(`${plan.id === "premium" ? "Core" : "Full"} Services suite`);
  if (sol.network === "all") lines.push("Network Operations");
  if (ent.analyticsSlices?.length) lines.push("Analytics for every active module");
  return lines;
}

function PlanCard({ plan, current, onSelect, loading, canSelect }) {
  const s = TIER_STYLE[plan.id] ?? TIER_STYLE.standard;
  const Icon = s.icon;
  const isCurrent = plan.id === current;
  const features = planFeatures(plan);

  return (
    <div className={`relative flex flex-col rounded-2xl border-2 p-5 transition ${
      isCurrent
        ? "border-emerald-500 bg-emerald-50/60 dark:bg-emerald-900/15"
        : plan.highlighted
        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
        : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
    }`}>
      {plan.highlighted && !isCurrent && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-indigo-600 text-white text-[11px] font-semibold px-3 py-1 rounded-full flex items-center gap-1">
            <Zap size={11} /> Most Popular
          </span>
        </div>
      )}
      {isCurrent && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-emerald-600 text-white text-[11px] font-semibold px-3 py-1 rounded-full">Current Plan</span>
        </div>
      )}

      <div className={`mb-4 ${plan.highlighted || isCurrent ? "mt-2" : ""}`}>
        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${s.badge}`}>
          <Icon size={12} /> {plan.name}
        </span>
        <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">
          ${plan.price.toLocaleString()}<span className="text-sm font-normal text-slate-500">/mo</span>
        </p>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 min-h-[40px]">{plan.tagline}</p>
      </div>

      <ul className="space-y-1.5 flex-1 mb-5">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
            <Check size={14} className="text-emerald-500 shrink-0 mt-0.5" /> {f}
          </li>
        ))}
      </ul>

      <button
        onClick={() => !isCurrent && canSelect && onSelect(plan.id)}
        disabled={isCurrent || loading || !canSelect}
        className={`w-full py-2 rounded-lg text-sm font-medium transition ${
          isCurrent
            ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 cursor-default"
            : !canSelect
            ? "border border-slate-200 dark:border-slate-700 text-slate-400 cursor-not-allowed"
            : plan.highlighted
            ? "bg-indigo-600 hover:bg-indigo-700 text-white"
            : "border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400"
        }`}
      >
        {isCurrent ? "Active" : !canSelect ? "Admin only" : loading ? "Switching…" : "Choose plan"}
      </button>
    </div>
  );
}

function CustomBuilder({ custom, catalog, current, currentSolutions, onSelect, loading, canSelect }) {
  const isCurrent = current === "custom";
  const [selected, setSelected] = useState(() => new Set(isCurrent ? currentSolutions : []));

  const toggle = (key) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const count = selected.size;
  const price = count * custom.unitPrice;
  const meetsMin = count >= custom.minUnits;

  const Group = ({ title, icon: Icon, module, items }) => (
    <div>
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
        <Icon size={13} /> {title}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {items.map((it) => {
          const key = `${module}:${it.id}`;
          const on = selected.has(key);
          return (
            <button
              key={key}
              onClick={() => toggle(key)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm text-left transition ${
                on
                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300"
                  : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-indigo-300"
              }`}
            >
              <span className={`h-4 w-4 rounded flex items-center justify-center shrink-0 ${
                on ? "bg-indigo-600 text-white" : "border border-slate-300 dark:border-slate-600"
              }`}>
                {on && <Check size={11} />}
              </span>
              {it.name}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader
        title={<span className="flex items-center gap-2"><Sliders size={15} /> Build a Custom plan</span>}
        subtitle={`Pick from CRM & Marketing only · minimum ${custom.minUnits} solutions · $${custom.unitPrice} each`}
      />
      <CardBody className="space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Group title="CRM" icon={Users} module="crm" items={catalog.crm} />
          <Group title="Marketing" icon={TrendingUp} module="marketing" items={catalog.marketing} />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="text-sm">
            <span className={`font-semibold ${meetsMin ? "text-slate-900 dark:text-white" : "text-amber-600 dark:text-amber-400"}`}>
              {count} selected
            </span>
            <span className="text-slate-400"> / min {custom.minUnits}</span>
            <span className="mx-2 text-slate-300 dark:text-slate-600">·</span>
            <span className="font-semibold text-slate-900 dark:text-white">${price.toLocaleString()}/mo</span>
          </div>
          <button
            onClick={() => onSelect("custom", [...selected])}
            disabled={!meetsMin || loading || !canSelect}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              !canSelect
                ? "border border-slate-200 dark:border-slate-700 text-slate-400 cursor-not-allowed"
                : meetsMin
                ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                : "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
            }`}
          >
            {!canSelect ? "Admin only" : loading ? "Saving…" : isCurrent ? "Update custom plan" : "Choose Custom"}
          </button>
        </div>
        {!meetsMin && (
          <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
            <AlertCircle size={12} /> Select at least {custom.minUnits} solutions to activate a custom plan.
          </p>
        )}
      </CardBody>
    </Card>
  );
}

export default function Billing() {
  const toast = useToast();
  const me = currentUser();
  const admin = isAdmin(me);

  const { data: billingData, loading: billingLoading, error: billingError, refetch: refetchBilling } = useApi(
    () => account.billing.get(), [], { pollingInterval: 120000 }
  );
  const billing = billingData ?? null;

  const { data: catalogData } = useApi(() => account.billing.plans(), []);
  const plans   = catalogData?.plans ?? [];
  const custom  = catalogData?.custom ?? { id: "custom", unitPrice: 49, minUnits: 8 };
  const catalog = catalogData?.catalog ?? { crm: [], marketing: [], services: [] };

  const currentPlan = billing?.plan ?? "executive";
  const currentSolutions = billing?.customSolutions ?? [];

  const selectMut = useMutation(
    ({ plan, customSolutions }) => account.billing.select({ plan, customSolutions }),
    {
      onSuccess: (data) => {
        toast({ message: `Now on the ${data.planName} plan`, type: "success" });
        // Keep local gating in sync immediately (no re-login required).
        try {
          const u = currentUser();
          localStorage.setItem("user", JSON.stringify({
            ...u, plan: data.plan, planSolutions: data.customSolutions ?? [],
          }));
        } catch { /* ignore */ }
        refetchBilling();
        // Refresh so sidebar/route gating recomputes from the new plan.
        setTimeout(() => window.location.reload(), 600);
      },
      onError: (e) => toast({ message: e.message, type: "error" }),
    }
  );

  const handleSelect = (plan, customSolutions = []) => selectMut.mutate({ plan, customSolutions });

  const activeEnt = billing?.entitlements ?? { sections: [], solutions: {}, analyticsSlices: [] };
  const activeModules = useMemo(
    () => (activeEnt.sections ?? []).filter((s) => MODULE_META[s]),
    [activeEnt]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing & Plans"
        subtitle="Choose the plan that fits your organization. Access scales with your plan."
        icon={CreditCard}
        iconColor="indigo"
        actions={
          billing?.freeEarlyAccess && (
            <span className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
              <Sparkles size={12} /> Free during early access
            </span>
          )
        }
      />

      {billingError && (
        <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
          <AlertCircle size={16} /> {billingError}
        </div>
      )}

      {!admin && (
        <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-700 dark:text-amber-400 text-sm">
          <Lock size={16} /> Only an enterprise admin can change the organization plan. You can view what's included below.
        </div>
      )}

      {/* Current plan summary */}
      <Card>
        <CardHeader title="Your current plan" />
        <CardBody>
          {billingLoading ? (
            <div className="animate-pulse h-16 bg-slate-100 dark:bg-slate-800 rounded-xl" />
          ) : (
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-lg font-bold text-slate-900 dark:text-white">{billing?.planName ?? "—"}</p>
                  <StatusBadge variant="success" label={billing?.status ?? "active"} dot />
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  ${(billing?.price ?? 0).toLocaleString()}/month
                  {billing?.freeEarlyAccess && <span className="text-emerald-600 dark:text-emerald-400"> · billed $0 during early access</span>}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {activeModules.map((m) => {
                    const M = MODULE_META[m];
                    const Icon = M.icon;
                    return (
                      <span key={m} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        <Icon size={11} /> {M.label}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Plan tiers */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Available plans</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {plans.map((p) => (
            <PlanCard
              key={p.id}
              plan={p}
              current={currentPlan}
              onSelect={handleSelect}
              loading={selectMut.loading}
              canSelect={admin}
            />
          ))}
        </div>
      </div>

      {/* Custom builder */}
      <CustomBuilder
        custom={custom}
        catalog={catalog}
        current={currentPlan}
        currentSolutions={currentSolutions}
        onSelect={handleSelect}
        loading={selectMut.loading}
        canSelect={admin}
      />

      <p className="text-xs text-slate-400 dark:text-slate-500 text-center">
        All plans include analytics for the modules they unlock. Sign-up is free during early distribution; payment will be
        collected once early access ends.
      </p>
    </div>
  );
}
