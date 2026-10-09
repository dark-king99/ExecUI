import { CheckCircle2 } from "lucide-react";

export default function Welcome() {
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
