import { useState, useMemo, useEffect } from "react";
import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import { useToast } from "../../components/ui/Toast";
import {
  CreditCard, AlertCircle, Check, Zap, Crown, Layers, Sparkles, Lock, Sprout, Globe,
  Users, TrendingUp, Server, BarChart3, Sliders, ExternalLink, Download, Receipt, Building2,
} from "lucide-react";
import { useApi, useMutation } from "../../hooks/useApi";
import { account } from "../../services/api";
import { useUser } from "../../context/UserContext";
import MarketCard from "./MarketCard";
import { aiLimitFor } from "../../lib/plans";
import { initializePaddleClient, paddleConfigurationError } from "../../lib/paddle";

const STATUS_VARIANT = {
  active: "success", trialing: "success",
  past_due: "warning", paused: "warning", pending: "warning",
  none: "neutral", expired: "warning", canceled: "neutral",
};

const CHECKOUT_CONTEXT_KEY = "paddle-checkout-context";

function invoiceDate(value) {
  return value ? new Date(value).toLocaleDateString() : "Date unavailable";
}

function invoiceAmount(invoice) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: invoice.currency || "USD",
  }).format(Number(invoice.localAmount ?? invoice.amountUsd) || 0);
}

function isAdmin(u) {
  return u?.role === "enterprise_admin" || u?.role === "system_admin";
}

function paddleErrorMessage(error) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  if (error && typeof error === "object") {
    const details = [error.message, error.detail, error.error?.message, error.error?.detail]
      .find((value) => typeof value === "string" && value.trim());
    if (details) return details;
    try {
      const serialized = JSON.stringify(error);
      if (serialized && serialized !== "{}") return serialized;
    } catch {
      // Some SDK error objects may contain circular references.
    }
  }
  return "Paddle returned no error details. Check that the live client token and live price IDs belong to the same Paddle account.";
}

const TIER_STYLE = {
  starter:    { accent: "emerald", icon: Sprout,   badge: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300" },
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

function planPriceId(plan, interval, networkProfile) {
  const intervalPrice = plan.priceIds?.[interval];
  return typeof intervalPrice === "string"
    ? intervalPrice
    : intervalPrice?.[networkProfile === "datacenter" ? "datacenter" : "office"] ?? null;
}

function PlanCard({
  plan, current, currentNetworkProfile = "office", onSelect, loading, canSelect,
  networkProfile = "office", onNetworkProfileChange, billingInterval = "month",
  paddleMode = false, pricePreview = null, priceReady = true, currentBillingInterval = "month",
  selectionDisabledLabel = "Unavailable", trialing = false,
}) {
  const s = TIER_STYLE[plan.id] ?? TIER_STYLE.standard;
  const Icon = s.icon;
  const features = planFeatures(plan);
  // Plans with network (Executive) carry a tier toggle: the network profile is a
  // property of the plan, chosen here rather than inside Network Management.
  const hasNetworkTiers = !!plan.networkDatacenterPrice;
  // `plan.quote` is what THIS tenant would pay — the published list price run
  // through the regional price book. Fall back to the list price only when the
  // server didn't send a quote (an older API, or no session).
  const quote = plan.quote ?? null;
  const listPrice = hasNetworkTiers && networkProfile === "datacenter" ? plan.networkDatacenterPrice : plan.price;
  const price = quote?.usd ?? listPrice;
  const discounted = quote && quote.usd !== quote.listUsd;
  const isCurrentPlan = plan.id === current;
  // "Current" only when the tier also matches, so switching Executive's tier is a real change.
  const isCurrent = isCurrentPlan
    && (!hasNetworkTiers || networkProfile === currentNetworkProfile)
    && (!paddleMode || billingInterval === currentBillingInterval);
  const canStartSubscription = isCurrent && trialing;

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
          {paddleMode
            ? pricePreview?.formattedTotals?.total ?? "Price unavailable"
            : <>${price.toLocaleString()}<span className="text-sm font-normal text-slate-500">/mo</span></>}
        </p>
        {paddleMode ? (
          <p className="mt-0.5 text-xs text-slate-400">
            {billingInterval === "year" ? "Billed yearly" : "Billed monthly"} · tax-inclusive Paddle total
          </p>
        ) : discounted && (
          <p className="mt-0.5 text-xs">
            <span className="text-slate-400 line-through">${quote.listUsd.toLocaleString()}</span>
            <span className="ml-1.5 font-medium text-emerald-600 dark:text-emerald-400">
              {quote.adjustment < 1
                ? `${Math.round((1 - quote.adjustment) * 100)}% off in your market`
                : `${quote.adjustment}× · ${quote.market.segmentLabel.toLowerCase()}`}
            </span>
          </p>
        )}
        {!paddleMode && quote?.localFormatted && (
          /* Labelled every time it is shown: this is NOT the amount charged. */
          <p className="mt-0.5 text-xs text-slate-400"
             title={`Indicative, at rates from ${quote.ratesAsOf}. You are charged in USD.`}>
            ≈ {quote.localFormatted}/mo {quote.currency} · charged in USD
          </p>
        )}
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
        onClick={() => (!isCurrent || canStartSubscription) && canSelect && onSelect(plan.id, [], undefined, hasNetworkTiers ? networkProfile : undefined, billingInterval)}
        disabled={(isCurrent && !canStartSubscription) || loading || !canSelect || (paddleMode && !priceReady)}
        className={`w-full py-2 rounded-lg text-sm font-medium transition ${
          isCurrent && !canStartSubscription
            ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 cursor-default"
            : !canSelect || (paddleMode && !priceReady)
            ? "border border-slate-200 dark:border-slate-700 text-slate-400 cursor-not-allowed"
            : plan.highlighted
            ? "bg-indigo-600 hover:bg-indigo-700 text-white"
            : "border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400"
        }`}
      >
        {isCurrent && !canStartSubscription ? "Active" : !canSelect ? selectionDisabledLabel : paddleMode && !priceReady ? "Price unavailable" : loading ? "Opening checkout…" : canStartSubscription ? "Choose paid plan" : (isCurrentPlan && hasNetworkTiers) ? "Switch tier" : "Choose plan"}
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
  const plans   = useMemo(() => catalogData?.plans ?? [], [catalogData?.plans]);
  const custom  = catalogData?.custom ?? { id: "custom", unitPrice: 49, minUnits: 8, industryPrice: 100 };
  const catalog = catalogData?.catalog ?? { crm: [], marketing: [], services: [], industries: [] };
  const paddleMode = catalogData?.provider?.id === "paddle";
  const paddleBackendConfigured = catalogData?.provider?.configured === true;
  const paddleBackendError = paddleMode && catalogData?.provider && !paddleBackendConfigured
    ? "Paddle backend configuration does not match its environment. For production, set PADDLE_ENV=production with a Live pdl_live_ server API key, then restart the backend."
    : "";
  const [paddle, setPaddle] = useState(null);
  const [paddleInitError, setPaddleInitError] = useState("");
  const [pricePreviews, setPricePreviews] = useState({});
  const [pricePreviewError, setPricePreviewError] = useState("");
  const [billingInterval, setBillingInterval] = useState("month");
  const currentNetworkProfile = billing?.networkProfile ?? "office";
  const [networkProfile, setNetworkProfile] = useState(null);
  const selectedNetworkProfile = networkProfile ?? currentNetworkProfile;
  const countryCode = catalogData?.countryCode;
  const priceTargets = useMemo(() => plans.map((plan) => ({
    planId: plan.id,
    priceId: planPriceId(plan, billingInterval, selectedNetworkProfile),
  })), [plans, billingInterval, selectedNetworkProfile]);
  const pricePreviewScope = `${countryCode ?? "auto"}:${billingInterval}:${selectedNetworkProfile}:${priceTargets.map(({ priceId }) => priceId ?? "-").join(",")}`;
  const activePricePreviewError = pricePreviewError?.scope === pricePreviewScope ? pricePreviewError.message : "";
  const missingPaddlePrice = paddleMode && priceTargets.some(({ priceId }) => !priceId);
  const availablePriceTargets = useMemo(() => priceTargets.filter(({ priceId }) => priceId), [priceTargets]);
  const pricePreviewLoading = paddleMode
    && !!paddle
    && paddleBackendConfigured
    && availablePriceTargets.length > 0
    && availablePriceTargets.some(({ priceId }) => !pricePreviews[`${countryCode ?? "auto"}:${priceId}`])
    && !activePricePreviewError;

  useEffect(() => {
    if (!paddleMode) return undefined;
    let cancelled = false;
    initializePaddleClient(billing?.paddleCustomerId)
      .then((instance) => { if (!cancelled) setPaddle(instance); })
      .catch((error) => { if (!cancelled) setPaddleInitError(error.message); });
    return () => { cancelled = true; };
  }, [paddleMode, billing?.paddleCustomerId]);

  const currentPlan = billing && ["active", "trialing", "past_due", "paused"].includes(billing.status)
    ? billing.plan
    : null;
  const currentSolutions = currentPlan ? billing.customSolutions ?? [] : [];
  const currentIndustry = billing?.industry ?? "general";
  const billingEnabled = billing?.billingEnabled === true;
  const selectionDisabledLabel = !admin
    ? "Admin only"
    : billingLoading
      ? "Loading billing…"
      : billingError || !billing
        ? "Billing unavailable"
        : paddleMode && !paddle
          ? "Paddle unavailable"
          : "Unavailable";
  const [manualInvoice, setManualInvoice] = useState(null);
  const [paymentInstructions, setPaymentInstructions] = useState([]);
  const displayedManualInvoice = manualInvoice ?? billing?.pendingInvoice ?? null;
  const displayedPaymentInstructions = paymentInstructions.length ? paymentInstructions : billing?.paymentInstructions ?? [];

  useEffect(() => {
    if (!paddleMode || !paddle || !paddleBackendConfigured) return undefined;
    let cancelled = false;
    Promise.all(availablePriceTargets.map(async ({ planId, priceId }) => {
      const request = { items: [{ priceId, quantity: 1 }] };
      if (countryCode) request.address = { countryCode };
      const preview = await paddle.PricePreview(request);
      const lineItem = preview.data.details.lineItems[0];
      if (!lineItem?.formattedTotals?.total) {
        throw new Error(`Paddle did not return a formatted total for ${planId}.`);
      }
      const actualInterval = lineItem.price.billingCycle?.interval;
      if (actualInterval !== billingInterval) {
        throw new Error(`The configured ${planId} price is ${actualInterval ?? "non-recurring"}, not ${billingInterval}.`);
      }
      return [`${countryCode ?? "auto"}:${priceId}`, { ...lineItem, priceId }];
    })).then((entries) => {
      if (!cancelled) {
        setPricePreviews((previous) => ({ ...previous, ...Object.fromEntries(entries) }));
      }
    }).catch((error) => {
      if (!cancelled) {
        console.error("Paddle PricePreview failed", error);
        setPricePreviewError({
          scope: pricePreviewScope,
          message: `Paddle could not load localized prices: ${paddleErrorMessage(error)}`,
        });
      }
    });
    return () => { cancelled = true; };
  }, [paddleMode, paddle, paddleBackendConfigured, availablePriceTargets, countryCode, billingInterval, pricePreviewScope]);

  const { data: invoicesData, error: invoicesError } = useApi(
    () => (billingEnabled ? account.billing.invoices() : Promise.resolve([])), [billingEnabled]
  );
  const invoices = invoicesData ?? [];

  const selectMut = useMutation(
    ({ plan, customSolutions, industry, networkProfile, billingInterval }) =>
      account.billing.select({ plan, customSolutions, industry, networkProfile, billingInterval }),
    {
      onSuccess: (data) => {
        if (data.requiresPayment && data.provider === "paddle" && data.sessionId) {
          if (!paddle) {
            toast({ message: paddleConfigurationError() ?? "Paddle checkout is still loading. Please try again.", type: "error" });
            return;
          }
          try {
            paddle.Checkout.open({
              transactionId: data.sessionId,
              ...(me?.email ? { customer: { email: me.email } } : {}),
              settings: {
                displayMode: "overlay",
                variant: "one-page",
                successUrl: `${window.location.origin}/welcome`,
              },
            });
          } catch (error) {
            toast({ message: `Could not open Paddle checkout: ${error.message}`, type: "error" });
          }
          return;
        }
        if (data.requiresPayment && data.checkoutUrl) {
          sessionStorage.setItem(CHECKOUT_CONTEXT_KEY, JSON.stringify({
            successUrl: data.successUrl,
            cancelUrl: data.cancelUrl,
            plan: data.plan,
          }));
          toast({ message: "Redirecting to secure checkout…", type: "info" });
          window.location.href = data.checkoutUrl;
          return;
        }
        if (data.requiresPayment) {
          if (data.invoice) {
            setManualInvoice(data.invoice);
            setPaymentInstructions(data.instructions ?? []);
            refetchBilling();
            toast({ message: "Invoice created. Your plan activates after payment is confirmed.", type: "info" });
            return;
          }
          toast({ message: "The payment provider did not return checkout details. Please try again.", type: "error" });
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
      onError: (e) => {
        refetchBilling();
        toast({ message: e.message, type: "error" });
      },
    }
  );

  const portalMut = useMutation(() => account.billing.portal({}), {
    onSuccess: (data) => {
      if (data.url) window.location.href = data.url;
      else toast({ message: "A customer portal link is not available for this subscription.", type: "info" });
    },
    onError: (e) => toast({ message: e.message, type: "error" }),
  });

  // Poll while Paddle's asynchronous webhook activates the selected plan.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get("checkout");
    if (!checkout) return;
    let cancelled = false;
    if (checkout === "success") {
      toast({ message: "Payment received — your plan is being activated.", type: "success" });
      const context = (() => {
        try { return JSON.parse(sessionStorage.getItem(CHECKOUT_CONTEXT_KEY) || "{}"); }
        catch { return {}; }
      })();
      const delays = [1000, 2000, 3000, 5000, 8000, 12000, 15000, 15000];
      const refreshUntilActive = async () => {
        let refreshError = null;
        for (const delay of delays) {
          await new Promise((resolve) => setTimeout(resolve, delay));
          if (cancelled) return;
          try {
            const latest = await account.billing.get();
            refreshError = null;
            refetchBilling();
            if (["active", "trialing"].includes(latest.status) && (!context.plan || latest.plan === context.plan)) {
              updateUser({ plan: latest.plan, planSolutions: latest.customSolutions ?? [] });
              sessionStorage.removeItem(CHECKOUT_CONTEXT_KEY);
              return;
            }
          } catch (error) {
            refreshError = error;
          }
        }
        if (!cancelled) {
          toast({
            message: refreshError
              ? `Payment status could not be refreshed: ${refreshError.message}`
              : "Payment is still processing. Billing will update when the provider confirms it.",
            type: refreshError ? "warning" : "info",
          });
          refetchBilling();
        }
      };
      refreshUntilActive();
    } else if (checkout === "cancelled") {
      sessionStorage.removeItem(CHECKOUT_CONTEXT_KEY);
      toast({ message: "Checkout cancelled — no changes were made.", type: "info" });
    }
    window.history.replaceState({}, "", "/account/billing");
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelect = (plan, customSolutions = [], industry, netProfile, selectedInterval = billingInterval) =>
    selectMut.mutate({ plan, customSolutions, industry, networkProfile: netProfile, billingInterval: selectedInterval });

  const activeModules = useMemo(
    () => (currentPlan ? billing?.entitlements?.sections ?? [] : []).filter((s) => MODULE_META[s]),
    [billing?.entitlements, currentPlan]
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
          ) : (admin && billing?.subscription && billing?.provider?.capabilities?.customerPortal) ? (
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

      {billing?.status === "trialing" && billing.trialEndsAt && (
        <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-900 dark:border-cyan-800 dark:bg-cyan-900/20 dark:text-cyan-100">
          <p className="font-semibold">Your 14-day trial is active</p>
          <p className="mt-1 text-cyan-800 dark:text-cyan-200">
            Workspace access is available through {new Date(billing.trialEndsAt).toLocaleDateString()}.
            Choose a plan to open Paddle checkout and continue after your trial.
          </p>
        </div>
      )}
      {billing?.status === "expired" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-100" role="alert">
          <p className="font-semibold">Your free trial has ended</p>
          <p className="mt-1">Your account and data are safe. Choose a plan and complete checkout to restore workspace access.</p>
        </div>
      )}
      {new URLSearchParams(window.location.search).get("onboarding") === "1" && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
          Select a plan below to start your subscription. Paddle checkout opens after you choose.
        </div>
      )}

      {billingError && (
        <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
          <AlertCircle size={16} /> {billingError}
        </div>
      )}

      {/* Dunning: surface payment problems only when the provider reports them. */}
      {["past_due", "paused"].includes(billing?.status) && (
        <div className="flex flex-wrap items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded-xl text-sm">
          <AlertCircle size={18} className="text-red-600 dark:text-red-400 shrink-0" />
          <div className="flex-1 min-w-[220px]">
            <p className="font-semibold text-red-700 dark:text-red-300">There's a problem with your payment</p>
            <p className="text-red-600/80 dark:text-red-400/80 text-xs mt-0.5">
              Your subscription needs attention. Open the customer portal to review payment options.
            </p>
          </div>
          {admin && billing?.provider?.capabilities?.customerPortal && (
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

      {billing?.pendingInvoice && (
        <Card>
          <CardHeader title="Payment pending" />
          <CardBody>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Invoice <strong>{billing.pendingInvoice.reference}</strong>
              {` for ${plans.find((plan) => plan.id === billing.pendingInvoice.plan)?.name ?? billing.pendingInvoice.plan}`}
              {" is awaiting payment. Your selected plan will not activate until payment is confirmed."}
            </p>
          </CardBody>
        </Card>
      )}

      {displayedManualInvoice && (
        <Card>
          <CardHeader title="Pay by bank transfer or mobile money" />
          <CardBody className="space-y-4">
            <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-900/20 dark:text-amber-200">
              <p className="font-semibold">Invoice reference: {displayedManualInvoice.reference}</p>
              <p className="mt-1">
                Amount due: {invoiceAmount(displayedManualInvoice)}
                {displayedManualInvoice.dueAt ? ` · due ${invoiceDate(displayedManualInvoice.dueAt)}` : ""}
              </p>
              <p className="mt-2">Include the reference with your transfer. Access activates after the payment is verified.</p>
            </div>
            {displayedPaymentInstructions.map((method) => (
              <div key={method.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                <h3 className="font-medium text-slate-900 dark:text-white">{method.label}</h3>
                <dl className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {method.fields.map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-xs text-slate-500">{label}</dt>
                      <dd className="text-sm text-slate-800 dark:text-slate-200">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </CardBody>
        </Card>
      )}

      {/* Current plan summary */}
      <Card>
        <CardHeader title="Your current plan" />
        <CardBody>
          {billingLoading ? (
            <div className="animate-pulse h-16 bg-slate-100 dark:bg-slate-800 rounded-xl" />
          ) : !billing ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Billing details are unavailable. Plan status and available actions are hidden until they load.
            </p>
          ) : (
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-lg font-bold text-slate-900 dark:text-white">
                    {currentPlan ? billing.planName : billing.status === "pending" ? "Payment pending" : "No active plan"}
                  </p>
                  <StatusBadge
                    variant={STATUS_VARIANT[billing.status] ?? "neutral"}
                    label={billing.status.replace(/_/g, " ")}
                    dot
                  />
                  {billing?.subscription?.cancelAtPeriodEnd && (
                    <StatusBadge variant="warning" label="cancels at period end" />
                  )}
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {currentPlan
                    ? paddleMode ? "Subscription billing is managed by Paddle" : `$${billing.price.toLocaleString()}/month`
                    : billing.status === "expired" ? "Trial ended" : "Select a plan to get started"}
                  {billing?.status === "trialing" && billing.trialEndsAt && (
                    <span className="text-cyan-700 dark:text-cyan-300">
                      {" "}· trial ends {new Date(billing.trialEndsAt).toLocaleDateString()}
                    </span>
                  )}
                  {billing?.freeEarlyAccess && <span className="text-emerald-600 dark:text-emerald-400"> · billed $0 during early access</span>}
                  {billing?.nextRenewal && <span> · renews {billing.nextRenewal}</span>}
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

      {/* Where this org sits in the price book — shown above the tiers, because
          it is what makes the numbers below make sense. */}
      {admin && !paddleMode && <MarketCard />}

      {/* Plan tiers. Five columns now that Starter exists, so the grid steps to
          5 at xl rather than wrapping one card onto its own row. */}
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Available plans</h3>
          {paddleMode && (
            <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5" aria-label="Billing interval">
              {[["month", "Monthly"], ["year", "Yearly"]].map(([interval, label]) => (
                <button
                  key={interval}
                  type="button"
                  onClick={() => setBillingInterval(interval)}
                  aria-pressed={billingInterval === interval}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                    billingInterval === interval
                      ? "bg-indigo-600 text-white"
                      : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
        {paddleMode && (paddleInitError || paddleBackendError || activePricePreviewError || missingPaddlePrice) && (
          <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200" role="alert">
            {paddleInitError || paddleBackendError || activePricePreviewError || "Configure monthly and yearly Paddle price IDs for all tiers in the backend environment."}
          </p>
        )}
        {paddleMode && pricePreviewLoading && (
          <p className="mb-3 text-xs text-slate-500 dark:text-slate-400" role="status">Loading country-localized Paddle prices…</p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5 gap-4">
          {plans.map((p) => {
            const priceId = planPriceId(p, billingInterval, selectedNetworkProfile);
            const preview = priceId ? pricePreviews[`${countryCode ?? "auto"}:${priceId}`] : null;
            return (
              <PlanCard
                key={p.id}
                plan={p}
                current={currentPlan}
                currentNetworkProfile={currentNetworkProfile}
                networkProfile={selectedNetworkProfile}
                onNetworkProfileChange={setNetworkProfile}
                onSelect={handleSelect}
                loading={selectMut.loading}
                billingInterval={billingInterval}
                paddleMode={paddleMode}
                pricePreview={preview ?? null}
                priceReady={!paddleMode || (paddleBackendConfigured && !!paddle && !!preview)}
                currentBillingInterval={billing?.subscription?.billingInterval ?? billing?.interval ?? "month"}
                trialing={billing?.status === "trialing"}
                selectionDisabledLabel={selectionDisabledLabel}
                canSelect={admin && !billingLoading && !billingError && !!billing && (!paddleMode || (paddleBackendConfigured && !!paddle))}
              />
            );
          })}
        </div>
      </div>

      {/* Custom builder */}
      {!paddleMode && <CustomBuilder
        custom={custom}
        catalog={catalog}
        current={currentPlan}
        currentSolutions={currentSolutions}
        currentIndustry={currentIndustry}
        onSelect={handleSelect}
        loading={selectMut.loading}
        canSelect={admin && !billingLoading && !billingError && !!billing}
      />}

      {/* Invoice history is loaded from the active billing provider. */}
      {invoicesError && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          Could not load invoices: {invoicesError}
        </p>
      )}
      {billingEnabled && invoices.length > 0 && (
        <Card>
          <CardHeader title={<span className="flex items-center gap-2"><Receipt size={15} /> Invoices</span>} />
          <CardBody className="space-y-2">
            {invoices.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{inv.reference || inv.id}</p>
                  <p className="text-xs text-slate-400">{invoiceDate(inv.issuedAt)}{inv.plan ? ` · ${inv.plan}` : ""}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-sm text-slate-900 dark:text-white">{invoiceAmount(inv)}</span>
                  <StatusBadge label={inv.status} variant={inv.status === "paid" ? "success" : ["open", "pending", "past_due"].includes(inv.status) ? "warning" : "neutral"} dot />
                  {inv.downloadable && (
                    <button
                      onClick={async () => {
                        const tab = window.open("about:blank", "_blank");
                        if (!tab) {
                          toast({ message: "Allow pop-ups to open the invoice PDF.", type: "error" });
                          return;
                        }
                        tab.opener = null;
                        try {
                          const { url } = await account.billing.invoicePdf(inv.id);
                          tab.location.href = url;
                        } catch (error) {
                          tab.close();
                          toast({ message: error.message, type: "error" });
                        }
                      }}
                      title="Download invoice PDF"
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
        {billingLoading
          ? "Loading billing information…"
          : !billing
            ? "Billing information is unavailable. Plan prices and payment status may not be current."
            : billing.freeEarlyAccess
              ? "All plans include analytics for the modules they unlock. Sign-up is free during early access."
              : "All plans include analytics for the modules they unlock. Plans are billed monthly and can be changed or cancelled anytime."}
      </p>
    </div>
  );
}
