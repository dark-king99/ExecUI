import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Check, Copy, Loader2, ShieldCheck } from "lucide-react";
import { account, setToken } from "../services/api";
import { initializePaddleClient, paddleConfigurationError } from "../lib/paddle";
import AnimatedLogo from "../components/AnimatedLogo";

export const ENTERPRISE_ONBOARDING_KEY = "execui-enterprise-onboarding";

function readOnboarding() {
  try {
    const value = JSON.parse(sessionStorage.getItem(ENTERPRISE_ONBOARDING_KEY) || "null");
    return value?.token && value?.user ? value : null;
  } catch {
    return null;
  }
}

function priceIdFor(plan, interval, networkProfile) {
  const value = plan.priceIds?.[interval];
  return typeof value === "string"
    ? value
    : value?.[networkProfile === "datacenter" ? "datacenter" : "office"] ?? null;
}

export default function EnterpriseOnboarding() {
  const navigate = useNavigate();
  const [onboarding] = useState(readOnboarding);
  const [catalog, setCatalog] = useState(null);
  const [paddle, setPaddle] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [loading, setLoading] = useState(() => Boolean(onboarding));
  const [selectedPlan, setSelectedPlan] = useState(() => readOnboarding()?.selectedPlan ?? "starter");
  const [billingInterval, setBillingInterval] = useState(() => readOnboarding()?.billingInterval ?? "month");
  const [networkProfile, setNetworkProfile] = useState(() => readOnboarding()?.networkProfile ?? "office");
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pricePreviews, setPricePreviews] = useState({});
  const [pricePreviewError, setPricePreviewError] = useState("");

  useEffect(() => {
    if (!onboarding) return undefined;

    setToken(onboarding.token);
    let cancelled = false;
    account.billing.plans().then(async (planCatalog) => {
      if (cancelled) return;
      setCatalog(planCatalog);
      if (planCatalog.provider?.id === "paddle") {
        const paddleInstance = await initializePaddleClient();
        if (cancelled) return;
        setPaddle(paddleInstance);
      }
    }).catch((error) => {
      if (!cancelled) setLoadError(error.message || "Could not load the plan and payment options.");
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [onboarding]);

  const selectedPlanData = useMemo(
    () => catalog?.plans?.find((plan) => plan.id === selectedPlan) ?? null,
    [catalog, selectedPlan],
  );
  const selectedPriceId = selectedPlanData
    ? priceIdFor(selectedPlanData, billingInterval, networkProfile)
    : null;
  const paddleMode = catalog?.provider?.id === "paddle";
  const configured = catalog?.provider?.configured === true;
  const paddleError = paddleMode && !paddle
    ? paddleConfigurationError() ?? "Paddle checkout is not available."
    : "";
  const checkoutConfigurationError = !paddleMode
    ? "Paddle checkout is not enabled for this environment. The workspace stays locked until checkout is configured."
    : !configured
      ? "Paddle's server configuration is incomplete. The workspace stays locked until checkout is configured."
      : paddleError;
  const checkoutReady = paddleMode && configured && !!paddle && !!selectedPriceId;

  useEffect(() => {
    if (!paddleMode || !paddle || !catalog?.plans?.length) return undefined;
    let cancelled = false;
    const targets = catalog.plans.map((plan) => ({
      priceId: priceIdFor(plan, billingInterval, networkProfile),
    })).filter(({ priceId }) => priceId);
    Promise.all(targets.map(async ({ priceId }) => {
      const request = { items: [{ priceId, quantity: 1 }] };
      if (catalog.countryCode) request.address = { countryCode: catalog.countryCode };
      const preview = await paddle.PricePreview(request);
      const lineItem = preview.data.details.lineItems[0];
      if (!lineItem?.formattedUnitTotals?.total) {
        throw new Error("Paddle did not return a localized plan price.");
      }
      return [priceId, lineItem.formattedUnitTotals.total];
    })).then((entries) => {
      if (!cancelled) {
        setPricePreviews((previous) => ({ ...previous, ...Object.fromEntries(entries) }));
        setPricePreviewError("");
      }
    }).catch((error) => {
      if (!cancelled) setPricePreviewError(error.message || "Could not load Paddle plan prices.");
    });
    return () => { cancelled = true; };
  }, [catalog, paddle, paddleMode, billingInterval, networkProfile]);

  const choosePlan = async () => {
    if (!selectedPlanData || submitting) return;
    setActionError("");
    setSubmitting(true);
    try {
      if (!checkoutReady) {
        throw new Error(checkoutConfigurationError || "Select a configured Paddle plan before continuing.");
      }
      sessionStorage.setItem(ENTERPRISE_ONBOARDING_KEY, JSON.stringify({
        ...onboarding,
        selectedPlan,
        billingInterval,
        networkProfile,
      }));

      const result = await account.billing.select({
        plan: selectedPlan,
        billingInterval,
        networkProfile: selectedPlanData.network ? networkProfile : "office",
      });

      if (result.requiresPayment && result.provider === "paddle" && result.sessionId) {
        paddle.Checkout.open({
          transactionId: result.sessionId,
          ...(onboarding.user.email ? { customer: { email: onboarding.user.email } } : {}),
          settings: {
            displayMode: "overlay",
            variant: "one-page",
            successUrl: `${window.location.origin}/welcome?onboarding=1`,
            cancelUrl: `${window.location.origin}/onboarding?checkout=cancelled`,
          },
        });
        setSubmitting(false);
        return;
      }

      if (result.requiresPayment && result.checkoutUrl) {
        window.location.assign(result.checkoutUrl);
        return;
      }

      if (result.requiresPayment) {
        throw new Error("The payment provider did not return checkout details. Please try again.");
      }

      throw new Error("Checkout was not started. Your workspace remains locked until Paddle confirms your selected plan.");
    } catch (error) {
      setActionError(error.message || "Could not start checkout.");
      setSubmitting(false);
    }
  };

  const checkoutCancelled = new URLSearchParams(window.location.search).get("checkout") === "cancelled";

  return (
    <main className="relative min-h-screen overflow-y-auto bg-slate-50 px-4 py-10 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between">
          <AnimatedLogo className="h-8" />
          {onboarding && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
              <ShieldCheck size={14} /> Your 14-day trial is included
            </span>
          )}
        </div>

        {!onboarding ? (
          <section className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h1 className="text-xl font-semibold">Enterprise onboarding unavailable</h1>
            <p className="mt-3 text-sm text-slate-500">This onboarding session has expired. Create your enterprise again or sign in.</p>
            <button onClick={() => navigate("/", { replace: true })} className="mt-5 rounded-lg bg-cyan-700 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-600">
              Return to sign in
            </button>
          </section>
        ) : (
          <>
            <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <h1 className="text-2xl font-semibold">Checkout: choose your plan</h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Select a plan to start your subscription. Paddle won’t charge you during the 14-day free trial.
              </p>
              <div className="mt-4 flex flex-wrap gap-x-8 gap-y-3 text-sm">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">Enterprise code</p>
                  <p className="font-mono font-semibold">{onboarding.enterpriseCode}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">Admin employee ID</p>
                  <p className="font-mono font-semibold">{onboarding.employeeId}</p>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(onboarding.enterpriseCode);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                  className="inline-flex items-center gap-1.5 self-center rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <Copy size={13} /> {copied ? "Copied" : "Copy enterprise code"}
                </button>
              </div>
            </section>

            {checkoutCancelled && (
              <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                Checkout was cancelled. Your 14-day trial is still available; choose a plan whenever you’re ready.
              </p>
            )}
            {(loadError || actionError || (!loading && checkoutConfigurationError)) && (
              <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-200" role="alert">
                {loadError || actionError || checkoutConfigurationError || "Paddle backend configuration is incomplete. Please contact support."}
              </p>
            )}

            {loading ? (
              <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
                <Loader2 size={17} className="animate-spin" /> Loading plans and secure checkout…
              </div>
            ) : (
              <>
                {paddleMode && (
                  <div className="mb-4 flex justify-end">
                    <div className="inline-flex rounded-lg border border-slate-200 p-0.5 dark:border-slate-700" aria-label="Billing interval">
                      {[["month", "Monthly"], ["year", "Yearly"]].map(([interval, label]) => (
                        <button
                          key={interval}
                          type="button"
                          onClick={() => setBillingInterval(interval)}
                          aria-pressed={billingInterval === interval}
                          className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                            billingInterval === interval ? "bg-cyan-700 text-white" : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {(catalog?.plans ?? []).map((plan) => {
                    const isSelected = selectedPlan === plan.id;
                    const networkPlan = !!plan.networkDatacenterPrice;
                    const planPrice = networkPlan && networkProfile === "datacenter"
                      ? plan.networkDatacenterPrice
                      : plan.price;
                    const planPriceId = priceIdFor(plan, billingInterval, networkProfile);
                    return (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => setSelectedPlan(plan.id)}
                        aria-pressed={isSelected}
                        className={`relative rounded-2xl border-2 p-5 text-left transition ${
                          isSelected
                            ? "border-cyan-700 bg-cyan-50/70 shadow-md dark:border-cyan-500 dark:bg-cyan-950/40"
                            : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600"
                        }`}
                      >
                        {isSelected && <Check size={17} className="absolute right-4 top-4 text-cyan-700 dark:text-cyan-300" />}
                        <span className="text-xs font-semibold uppercase tracking-wide text-cyan-800 dark:text-cyan-300">{plan.name}</span>
                        <p className="mt-3 text-2xl font-bold">
                          {paddleMode && planPriceId
                            ? pricePreviews[planPriceId] ?? `${Number(planPrice).toLocaleString()} USD`
                            : `$${Number(planPrice).toLocaleString()}`}
                          <span className="ml-1 text-sm font-normal text-slate-500">/{billingInterval === "year" ? "year" : "month"}</span>
                        </p>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{plan.tagline}</p>
                        <p className="mt-4 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                          $0 today · starts billing after 14 days
                        </p>
                        {networkPlan && (
                          <span className="mt-3 inline-flex rounded-md bg-slate-100 p-0.5 dark:bg-slate-800">
                            {[["office", "Office"], ["datacenter", "Datacenter"]].map(([profile, label]) => (
                              <span
                                key={profile}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setSelectedPlan(plan.id);
                                  setNetworkProfile(profile);
                                }}
                                className={`rounded px-2 py-1 text-[11px] ${
                                  networkProfile === profile ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white" : "text-slate-500"
                                }`}
                              >
                                {label}
                              </span>
                            ))}
                          </span>
                        )}
                        {paddleMode && !planPriceId && (
                          <p className="mt-3 text-xs text-rose-600 dark:text-rose-400">Paddle price not configured</p>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-6 flex flex-col items-center gap-3">
                  <p className="max-w-2xl text-center text-xs text-slate-500 dark:text-slate-400">
                    A payment method may be requested to activate the subscription. No subscription charge is due today; billing begins after the 14-day trial.
                  </p>
                  {pricePreviewError && (
                    <p className="text-center text-xs text-amber-700 dark:text-amber-300" role="status">
                      Localized Paddle prices could not be loaded; the final total is shown in checkout.
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={choosePlan}
                    disabled={submitting || !selectedPlanData || !checkoutReady}
                    className="inline-flex min-w-56 items-center justify-center gap-2 rounded-lg bg-cyan-800 px-6 py-3 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting ? <Loader2 size={16} className="animate-spin" /> : <>Start free trial & continue to checkout <ArrowRight size={15} /></>}
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}
