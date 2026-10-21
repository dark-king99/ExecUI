import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Loader2 } from "lucide-react";
import { account, setToken } from "../../services/api";
import { ENTERPRISE_ONBOARDING_KEY } from "../../auth/EnterpriseOnboarding";

export default function Welcome({ onEnter }) {
  const navigate = useNavigate();
  const [onboarding] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem(ENTERPRISE_ONBOARDING_KEY) || "null");
    } catch {
      return null;
    }
  });
  const [status, setStatus] = useState(onboarding?.selectedPlan ? "checking" : "waiting");
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!onboarding?.token || !onboarding?.selectedPlan) return undefined;
    setToken(onboarding.token);
    let cancelled = false;
    const delays = [0, 1000, 2000, 3000, 5000, 8000, 12000, 15000, 15000, 15000, 15000];
    const checkSubscription = async () => {
      for (const delay of delays) {
        if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
        if (cancelled) return;
        try {
          const billing = await account.billing.get();
          if (billing.planConfirmed && billing.plan === onboarding.selectedPlan) {
            sessionStorage.removeItem(ENTERPRISE_ONBOARDING_KEY);
            onEnter({ ...onboarding.user, token: onboarding.token, plan: billing.plan, planSolutions: billing.customSolutions ?? [] });
            navigate("/home", { replace: true });
            return;
          }
          setError("");
        } catch (checkError) {
          setError(checkError.message || "Could not check the subscription status.");
        }
      }
      if (!cancelled) setStatus("pending");
    };
    checkSubscription();
    return () => { cancelled = true; };
  }, [navigate, onboarding, onEnter, retry]);

  if (onboarding?.token && onboarding?.selectedPlan) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-50 px-6 dark:bg-slate-950">
        <section className="max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {status !== "pending" ? <Loader2 size={42} className="mx-auto animate-spin text-cyan-700" /> : <CheckCircle2 size={42} className="mx-auto text-emerald-500" />}
          <h1 className="mt-4 text-2xl font-semibold text-slate-900 dark:text-white">
            {status === "pending" ? "Subscription confirmation is taking longer than expected" : "Confirming your free trial"}
          </h1>
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400" role={error ? "alert" : "status"}>
            {error || (status === "pending"
              ? "Your workspace will open as soon as Paddle confirms the subscription. You can retry the status check or return to plan selection."
              : "Paddle is confirming your subscription. Your plan includes a 14-day free trial, so no subscription charge is due today.")}
          </p>
          {status === "pending" && (
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                onClick={() => { setStatus("checking"); setRetry((value) => value + 1); }}
                className="rounded-lg bg-cyan-800 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700"
              >
                Check again
              </button>
              <button
                onClick={() => navigate("/onboarding", { replace: true })}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Return to plan selection
              </button>
            </div>
          )}
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-6 dark:bg-slate-950">
      <section className="max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <CheckCircle2 size={42} className="mx-auto text-emerald-500" />
        <h1 className="mt-4 text-2xl font-semibold text-slate-900 dark:text-white">Thank you for subscribing</h1>
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
          Paddle is confirming your payment. Your organization’s plan will update as soon as confirmation arrives.
        </p>
        <a
          className="mt-6 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          href="/account/billing"
        >
          Return to billing
        </a>
      </section>
    </main>
  );
}
