import { useEffect, useMemo, useState } from "react";
import { initializePaddleClient, paddleConfigurationError } from "../../lib/paddle";

export default function Checkout() {
  const [loadError, setLoadError] = useState("");
  const { transactionId, fallback, setupError } = useMemo(() => {
    const fallback = {
      successUrl: `${window.location.origin}/welcome`,
      cancelUrl: `${window.location.origin}/account/billing?checkout=cancelled`,
    };
    const transactionId = new URLSearchParams(window.location.search).get("_ptxn");
    const setupError = (!transactionId ? "This checkout link is incomplete. Return to Billing and try again." : "")
      || paddleConfigurationError();
    return { transactionId, fallback, setupError };
  }, []);
  const error = setupError || loadError;

  useEffect(() => {
    if (setupError) return;
    let cancelled = false;
    initializePaddleClient()
      .then((paddle) => {
        if (cancelled) return;
        paddle.Checkout.open({
          transactionId,
          settings: {
            displayMode: "overlay",
            variant: "one-page",
            successUrl: fallback.successUrl,
            cancelUrl: fallback.cancelUrl,
          },
        });
      })
      .catch((loadError) => {
        if (!cancelled) setLoadError(loadError.message || "Unable to open Paddle checkout.");
      });

    return () => { cancelled = true; };
  }, [fallback, setupError, transactionId]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-6 dark:bg-slate-950">
      <section className="max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Secure checkout</h1>
        <p className={`mt-3 text-sm ${error ? "text-rose-600 dark:text-rose-400" : "text-slate-500 dark:text-slate-400"}`} role={error ? "alert" : "status"}>
          {error || "Loading Paddle checkout…"}
        </p>
        {error && (
          <a className="mt-5 inline-block text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400" href="/account/billing">
            Return to Billing
          </a>
        )}
      </section>
    </main>
  );
}
