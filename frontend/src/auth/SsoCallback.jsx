/**
 * Landing page for the IdP round-trip.
 *
 * The backend redirects here with a ONE-TIME code (never the session token, so
 * nothing sensitive lands in browser history or referrer headers). We exchange
 * it for the same {token, user} a password login returns, then hand off to the
 * app exactly like the normal login flow does.
 */
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, ShieldCheck, AlertCircle } from "lucide-react";
import { sso, setToken } from "../services/api";
import ExecUIBackground from "../components/ExecUIBackground";
import AnimatedLogo from "../components/AnimatedLogo";

export default function SsoCallback({ onLogin }) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState(params.get("error"));
  const ran = useRef(false); // StrictMode double-invoke guard — the code is single-use

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const code = params.get("code");
    const next = params.get("next") || "/overview";
    if (!code) {
      if (!params.get("error")) setError("No sign-in code was returned by your identity provider.");
      return;
    }

    (async () => {
      try {
        const res = await sso.exchange(code);
        setToken(res.token);
        onLogin?.({ ...res.user, token: res.token });
        navigate(res.redirectTo || next, { replace: true });
      } catch (e) {
        setError(e?.message || "Single Sign-On failed. Please try again.");
      }
    })();
  }, [params, navigate, onLogin]);

  return (
    <div className="relative min-h-screen w-full grid place-items-center bg-white dark:bg-[#0a0a0c] px-6">
      <ExecUIBackground showModules={false} />
      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur p-8 text-center">
        <AnimatedLogo className="h-8 mx-auto mb-6" />
        {error ? (
          <>
            <AlertCircle size={28} className="mx-auto mb-3 text-red-500" />
            <h1 className="text-base font-semibold text-slate-900 dark:text-white">Sign-in failed</h1>
            <p className="mt-1.5 text-sm text-slate-500">{error}</p>
            <button
              onClick={() => navigate("/", { replace: true })}
              className="mt-5 w-full rounded-lg bg-indigo-600 hover:bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white transition"
            >
              Back to sign in
            </button>
          </>
        ) : (
          <>
            <div className="relative mx-auto mb-4 grid h-12 w-12 place-items-center">
              <ShieldCheck size={22} className="text-indigo-500" />
              <Loader2 size={44} className="absolute animate-spin text-indigo-500/30" />
            </div>
            <h1 className="text-base font-semibold text-slate-900 dark:text-white">Completing sign-in…</h1>
            <p className="mt-1.5 text-sm text-slate-500">Verifying your identity with your provider.</p>
          </>
        )}
      </div>
    </div>
  );
}
