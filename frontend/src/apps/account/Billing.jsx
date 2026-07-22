import { useState, useMemo, useEffect } from "react";
import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import { useToast } from "../../components/ui/Toast";
import {
  CreditCard, AlertCircle, Check, Zap, Crown, Layers, Sparkles, Lock,
  Users, TrendingUp, Server, BarChart3, Sliders, ExternalLink, Download, Receipt, Building2,
} from "lucide-react";
import { useApi, useMutation } from "../../hooks/useApi";
import { account } from "../../services/api";
import { useUser } from "../../context/UserContext";
import { aiLimitFor } from "../../lib/plans";

const STATUS_VARIANT = {
  active: "success", trialing: "success",
  past_due: "warning", unpaid: "warning", incomplete: "warning",
  canceled: "neutral", incomplete_expired: "neutral",
};

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
  if (sol.marketing?.length) lines.push(`${sol.marketing.length === 8 ? "Full" : sol.marketing.length} Marketing solution${sol.marketing.length > 1 ? "s" : ""}`);
  if (sol.services?.length)  lines.push(`${plan.id === "premium" ? "Core" : "Full"} Services suite`);
  if (sol.network === "all") lines.push("Network Operations");
  if (plan.industry) lines.push("Industry customization");
  if (ent.analyticsSlices?.length) lines.push("Analytics for every active module");
  const ai = plan.ai ?? aiLimitFor(plan.id);
  if (ai) lines.push(`${ai.toLocaleString()} AI assists / month`);
  return lines;
}

function PlanCard({ plan, current, currentNetworkProfile = "office", onSelect, loading, canSelect, networkProfile = "office", onNetworkProfileChange }) {
  const s = TIER_STYLE[plan.id] ?? TIER_STYLE.standard;
  const Icon = s.icon;
  const features = planFeatures(plan);
  // Plans with network (Executive) carry a tier toggle: the network profile is a
  // property of the plan, chosen here rather than inside Network Management.
  const hasNetworkTiers = !!plan.networkDatacenterPrice;
  const price = hasNetworkTiers && networkProfile === "datacenter" ? plan.networkDatacenterPrice : plan.price;
  const isCurrentPlan = plan.id === current;
  // "Current" only when the tier also matches, so switching Executive's tier is a real change.
  const isCurrent = isCurrentPlan && (!hasNetworkTiers || networkProfile === currentNetworkProfile);

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
          ${price.toLocaleString()}<span className="text-sm font-normal text-slate-500">/mo</span>
        </p>
        {hasNetworkTiers && (
          <div className="mt-2">
            <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5">
              {[["office", "Small office"], ["datacenter", "Enterprise"]].map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => onNetworkProfileChange?.(v)}
                  disabled={!canSelect}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
                    networkProfile === v
                      ? "bg-amber-500 text-white"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  } ${!canSelect ? "cursor-not-allowed" : ""}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Network tier</p>
          </div>
        )}
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
        onClick={() => !isCurrent && canSelect && onSelect(plan.id, [], undefined, hasNetworkTiers ? networkProfile : undefined)}
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
        {isCurrent ? "Active" : !canSelect ? "Admin only" : loading ? "Switching…" : (isCurrentPlan && hasNetworkTiers) ? "Switch tier" : "Choose plan"}
      </button>
    </div>
  );
}

function CustomBuilder({ custom, catalog, current, currentSolutions, currentIndustry, onSelect, loading, canSelect }) {
  const isCurrent = current === "custom";
  const [selected, setSelected] = useState(() => new Set(isCurrent ? currentSolutions : []));
  const [industry, setIndustry] = useState(isCurrent ? (currentIndustry && currentIndustry !== "general" ? currentIndustry : "") : "");

  const toggle = (key) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const industries = catalog.industries ?? [];
  const count = selected.size;
  const industryAddon = industry ? custom.industryPrice : 0;
  const price = count * custom.unitPrice + industryAddon;
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
        subtitle={`Pick from CRM & Marketing only · minimum ${custom.minUnits} solutions · $${custom.unitPrice} each · optional industry +$${custom.industryPrice}`}
      />
      <CardBody className="space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Group title="CRM" icon={Users} module="crm" items={catalog.crm} />
          <Group title="Marketing" icon={TrendingUp} module="marketing" items={catalog.marketing} />
        </div>

        {/* Industry customization add-on */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
            <Building2 size={13} /> Industry customization
            <span className="ml-1 normal-case font-normal text-slate-400">optional · +${custom.industryPrice}/mo</span>
          </p>
          <select
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className="w-full sm:w-80 text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">No industry customization</option>
            {industries.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="text-sm">
            <span className={`font-semibold ${meetsMin ? "text-slate-900 dark:text-white" : "text-amber-600 dark:text-amber-400"}`}>
              {count} selected
            </span>
            <span className="text-slate-400"> / min {custom.minUnits}</span>
            {industry && <><span className="mx-2 text-slate-300 dark:text-slate-600">·</span><span className="text-slate-500">+ industry</span></>}
            <span className="mx-2 text-slate-300 dark:text-slate-600">·</span>
            <span className="font-semibold text-slate-900 dark:text-white">${price.toLocaleString()}/mo</span>
          </div>
          <button
            onClick={() => onSelect("custom", [...selected], industry || "general")}
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
  const { user: me, updateUser } = useUser();
  const admin = isAdmin(me);

  const { data: billingData, loading: billingLoading, error: billingError, refetch: refetchBilling } = useApi(
    () => account.billing.get(), [], { pollingInterval: 120000 }
  );
  const billing = billingData ?? null;

  const { data: catalogData } = useApi(() => account.billing.plans(), []);
  const plans   = catalogData?.plans ?? [];
  const custom  = catalogData?.custom ?? { id: "custom", unitPrice: 49, minUnits: 8, industryPrice: 100 };
  const catalog = catalogData?.catalog ?? { crm: [], marketing: [], services: [], industries: [] };

  const currentPlan = billing?.plan ?? "executive";
  const currentSolutions = billing?.customSolutions ?? [];
  const currentIndustry = billing?.industry ?? "general";
  const currentNetworkProfile = billing?.networkProfile ?? "office";
  const billingEnabled = billing?.billingEnabled ?? false;

  // Executive's network tier (office | datacenter) — mirrors the current plan,
  // and is the ONLY place it's chosen (Network Management just reflects it).
  const [networkProfile, setNetworkProfile] = useState("office");
  useEffect(() => { setNetworkProfile(currentNetworkProfile); }, [currentNetworkProfile]);

  const { data: invoicesData } = useApi(
    () => (billingEnabled ? account.billing.invoices() : Promise.resolve([])), [billingEnabled]
  );
  const invoices = invoicesData ?? [];

  const selectMut = useMutation(
    ({ plan, customSolutions, industry, networkProfile }) => account.billing.select({ plan, customSolutions, industry, networkProfile }),
    {
      onSuccess: (data) => {
        // PAID mode: Stripe returns a Checkout URL — send the admin to pay.
        if (data.requiresPayment && data.checkoutUrl) {
          toast({ message: "Redirecting to secure checkout…", type: "info" });
          window.location.href = data.checkoutUrl;
          return;
        }
        // FREE mode: the plan is active immediately. Patching the shared user
        // context re-renders the sidebar and route guards — no reload needed.
        toast({ message: `Now on the ${data.planName} plan`, type: "success" });
        updateUser({ plan: data.plan, planSolutions: data.customSolutions ?? [] });
        refetchBilling();
        // Tell the Network module its plan-derived profile may have changed.
        window.dispatchEvent(new Event("network:profile-changed"));
      },
      onError: (e) => toast({ message: e.message, type: "error" }),
    }
  );

  const portalMut = useMutation(() => account.billing.portal({}), {
    onSuccess: (data) => {
      if (data.url) window.location.href = data.url;
      else toast({ message: "The customer portal needs a live Stripe key.", type: "info" });
    },
    onError: (e) => toast({ message: e.message, type: "error" }),
  });

  // Handle the return trip from Stripe Checkout.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get("checkout");
    if (!checkout) return;
    if (checkout === "success") {
      toast({ message: "Payment received — your plan is being activated.", type: "success" });
      // The webhook applies the plan; refetch a moment later and sync gating.
      setTimeout(async () => {
        refetchBilling();
        try {
          const b = await account.billing.get();
          updateUser({ plan: b.plan, planSolutions: b.customSolutions ?? [] });
        } catch { /* billing poll will catch up */ }
      }, 2500);
    } else if (checkout === "cancelled") {
      toast({ message: "Checkout cancelled — no changes were made.", type: "info" });
    }
    window.history.replaceState({}, "", "/account/billing");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelect = (plan, customSolutions = [], industry, netProfile) =>
    selectMut.mutate({ plan, customSolutions, industry, networkProfile: netProfile });

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
          billing?.freeEarlyAccess ? (
            <span className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
              <Sparkles size={12} /> Free during early access
            </span>
          ) : (admin && billing?.subscription) ? (
            <button
              onClick={() => portalMut.mutate()}
              disabled={portalMut.loading}
              className="flex items-center gap-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm px-4 py-2 rounded-lg hover:border-indigo-400 transition"
            >
              <ExternalLink size={14} /> {portalMut.loading ? "Opening…" : "Manage subscription"}
            </button>
          ) : null
        }
      />

      {billingError && (
        <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
          <AlertCircle size={16} /> {billingError}
        </div>
      )}

      {/* Dunning: a failed payment puts the subscription in past_due/unpaid —
          surface it loudly with a one-click path to fix the card. */}
      {["past_due", "unpaid", "incomplete"].includes(billing?.status) && (
        <div className="flex flex-wrap items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded-xl text-sm">
          <AlertCircle size={18} className="text-red-600 dark:text-red-400 shrink-0" />
          <div className="flex-1 min-w-[220px]">
            <p className="font-semibold text-red-700 dark:text-red-300">There's a problem with your payment</p>
            <p className="text-red-600/80 dark:text-red-400/80 text-xs mt-0.5">
              Your last charge didn't go through. Update your payment method to keep the {billing?.planName} plan active —
              otherwise the subscription will be cancelled and the plan drops to Standard at the end of the paid period.
            </p>
          </div>
          {admin && (
            <button
              onClick={() => portalMut.mutate()}
              disabled={portalMut.loading}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-60"
            >
              {portalMut.loading ? "Opening…" : "Update payment method"}
            </button>
          )}
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
                  <StatusBadge
                    variant={STATUS_VARIANT[billing?.status] ?? "success"}
                    label={(billing?.status ?? "active").replace(/_/g, " ")}
                    dot
                  />
                  {billing?.subscription?.cancelAtPeriodEnd && (
                    <StatusBadge variant="warning" label="cancels at period end" />
                  )}
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  ${(billing?.price ?? 0).toLocaleString()}/month
                  {billing?.freeEarlyAccess && <span className="text-emerald-600 dark:text-emerald-400"> · billed $0 during early access</span>}
                  {billing?.nextRenewal && <span> · renews {billing.nextRenewal}</span>}
                </p>
                {billing?.paymentMethod?.last4 && (
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                    <CreditCard size={12} /> {billing.paymentMethod.brand?.toUpperCase()} ···· {billing.paymentMethod.last4}
                    {billing.paymentMethod.expiry && ` · exp ${billing.paymentMethod.expiry}`}
                  </p>
                )}
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

              {/* AI assist usage this month */}
              {billing?.ai && (
                <div className="w-full sm:w-64">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="inline-flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-300">
                      <Sparkles size={12} className="text-indigo-500" /> AI assists this month
                    </span>
                    <span className="text-slate-400">
                      {billing.ai.used.toLocaleString()} / {billing.ai.limit.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        billing.ai.remaining === 0 ? "bg-rose-500" : billing.ai.used / billing.ai.limit > 0.8 ? "bg-amber-500" : "bg-indigo-500"
                      }`}
                      style={{ width: `${Math.min(100, billing.ai.limit ? (billing.ai.used / billing.ai.limit) * 100 : 0)}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] text-slate-400">
                    {billing.ai.configured
                      ? `${billing.ai.remaining.toLocaleString()} left · resets ${billing.ai.period ? "monthly" : ""}`
                      : "Included with your plan · resets monthly"}
                  </p>
                </div>
              )}
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
              currentNetworkProfile={currentNetworkProfile}
              networkProfile={networkProfile}
              onNetworkProfileChange={setNetworkProfile}
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
        currentIndustry={currentIndustry}
        onSelect={handleSelect}
        loading={selectMut.loading}
        canSelect={admin}
      />

      {/* Invoices (paid mode only) */}
      {billingEnabled && invoices.length > 0 && (
        <Card>
          <CardHeader title={<span className="flex items-center gap-2"><Receipt size={15} /> Invoices</span>} />
          <CardBody className="space-y-2">
            {invoices.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{inv.id}</p>
                  <p className="text-xs text-slate-400">{inv.date}{inv.plan ? ` · ${inv.plan}` : ""}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-sm text-slate-900 dark:text-white">{inv.amount}</span>
                  <StatusBadge label={inv.status} variant={inv.status === "paid" ? "success" : inv.status === "open" ? "warning" : "neutral"} dot />
                  {(inv.hostedUrl || inv.pdfUrl) && (
                    <button
                      onClick={() => window.open(inv.hostedUrl || inv.pdfUrl, "_blank")}
                      title="View invoice"
                      className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
                    >
                      <Download size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      )}

      <p className="text-xs text-slate-400 dark:text-slate-500 text-center">
        {billingEnabled
          ? "All plans include analytics for the modules they unlock. Plans are billed monthly and can be changed or cancelled anytime."
          : "All plans include analytics for the modules they unlock. Sign-up is free during early distribution; payment will be collected once early access ends."}
      </p>
    </div>
  );
}
