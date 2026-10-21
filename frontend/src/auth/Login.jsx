import React, { useState, useEffect, useRef } from "react";
import {
  ArrowRight, BarChart3, Network, Users,
  Megaphone, AlertCircle, Loader2, Eye, EyeOff, Shield, KeyRound, Sun, Moon,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { auth, sso, setToken } from "../services/api";
import { track } from "../lib/analytics";
import ExecUIBackground from "../components/ExecUIBackground";
import AnimatedLogo from "../components/AnimatedLogo";
import { ENTERPRISE_ONBOARDING_KEY } from "./EnterpriseOnboarding";

// ─── Brand panel data ────────────────────────────────────────────────────────
const features = [
  { icon: Users,     label: "CRM & Pipeline",          desc: "Unify customer data and drive revenue growth." },
  { icon: Megaphone, label: "Marketing Automation",     desc: "Orchestrate campaigns across every channel." },
  { icon: Network,   label: "Network Operations",       desc: "Monitor and protect critical infrastructure." },
  { icon: BarChart3, label: "Analytics & Intelligence", desc: "AI-powered insights for faster decisions." },
];
const badges = ["SOC 2 Ready", "Multi-tenant", "SSO + MFA", "Zero-trust"];

const MODES = [
  { id: "signin",     label: "Sign In" },
  { id: "enterprise", label: "Create Enterprise" },
  { id: "employee",   label: "Join Enterprise" },
];

// ─── Theme (the auth screen runs outside the app's SidebarProvider) ───────────
function useTheme() {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem("theme") || "dark"; } catch { return "dark"; }
  });
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    try { localStorage.setItem("theme", theme); } catch { /* ignore */ }
  }, [theme]);
  return [theme, () => setTheme((t) => (t === "dark" ? "light" : "dark"))];
}

// ─── Cursor-following glow + ring ─────────────────────────────────────────────
function CursorGlow() {
  const glow = useRef(null);
  const ring = useRef(null);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia("(pointer: fine)").matches) return;
    let mx = window.innerWidth / 2, my = window.innerHeight / 2;
    let gx = mx, gy = my, rx = mx, ry = my, raf;
    const onMove = (e) => { mx = e.clientX; my = e.clientY; };
    window.addEventListener("pointermove", onMove);
    const tick = () => {
      gx += (mx - gx) * 0.10; gy += (my - gy) * 0.10;
      rx += (mx - rx) * 0.30; ry += (my - ry) * 0.30;
      if (glow.current) glow.current.style.transform = `translate3d(${gx}px,${gy}px,0) translate(-50%,-50%)`;
      if (ring.current) ring.current.style.transform = `translate3d(${rx}px,${ry}px,0) translate(-50%,-50%)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("pointermove", onMove); };
  }, []);
  return (
    <>
      <div ref={glow} className="pointer-events-none fixed left-0 top-0 z-30 h-72 w-72 rounded-full bg-indigo-500/15 blur-[90px] dark:bg-indigo-400/15" />
      <div ref={ring} className="pointer-events-none fixed left-0 top-0 z-[60] hidden h-7 w-7 rounded-full border border-indigo-400/50 lg:block dark:border-white/40" />
    </>
  );
}

// ─── Scroll-reveal wrapper (IntersectionObserver) ─────────────────────────────
function Reveal({ children, className = "", delay = 0 }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect(); } },
      { threshold: 0.1 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms`, transitionTimingFunction: "cubic-bezier(0.22,1,0.36,1)" }}
      className={`transition-all duration-700 ${shown ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"} ${className}`}
    >
      {children}
    </div>
  );
}

function InputField({ label, type = "text", value, onChange, onKeyDown, placeholder, autoComplete, hint }) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  const resolvedType = isPassword ? (show ? "text" : "password") : type;
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</label>
      <div className="relative">
        <input
          type={resolvedType}
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="w-full bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-lg px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 transition-all duration-150"
        />
        {isPassword && (
          <button type="button" tabIndex={-1} onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition">
            {show ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        )}
      </div>
      {hint && <p className="text-[11px] text-slate-400 dark:text-slate-600">{hint}</p>}
    </div>
  );
}

export default function Login({ onLogin }) {
  const navigate = useNavigate();
  const [theme, toggleTheme] = useTheme();
  const [mode, setMode] = useState("signin");

  // shared form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [company, setCompany] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [enterpriseCode, setEnterpriseCode] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [mfaStep, setMfaStep] = useState(false); // password OK, awaiting TOTP code
  const [mfaCode, setMfaCode] = useState("");
  const [ssoBusy, setSsoBusy] = useState(false);
  const [ssoNote, setSsoNote] = useState(null);

  // Pointer parallax for the background blobs.
  const layers = useRef([]);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia("(pointer: fine)").matches) return;
    let tx = 0, ty = 0, cx = 0, cy = 0, raf;
    const onMove = (e) => { tx = e.clientX / window.innerWidth - 0.5; ty = e.clientY / window.innerHeight - 0.5; };
    window.addEventListener("pointermove", onMove);
    const tick = () => {
      cx += (tx - cx) * 0.05; cy += (ty - cy) * 0.05;
      layers.current.forEach((el, i) => { if (el) { const d = (i + 1) * 22; el.style.transform = `translate(${cx * d}px, ${cy * d}px)`; } });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("pointermove", onMove); };
  }, []);

  const finish = (response) => {
    setToken(response.token);
    track("logged_in", { role: response.user?.role, method: mode });
    onLogin({ ...response.user, token: response.token });
  };

  const handleSubmit = async () => {
    setApiError(null);
    try {
      if (mode === "signin") {
        if (!email.trim() || !password.trim() || !employeeId.trim()) {
          return setApiError("Email, password and employee ID are required.");
        }
        if (mfaStep && mfaCode.length !== 6) {
          return setApiError("Enter the 6-digit code from your authenticator app.");
        }
        setSubmitting(true);
        const res = await auth.login({ email, password, employeeId, ...(mfaStep ? { mfaCode } : {}) });
        // Account has 2FA: credentials are valid, now ask for the TOTP code.
        if (res.mfaRequired) { setMfaStep(true); return; }
        finish(res);
      } else if (mode === "enterprise") {
        if (!company.trim() || !email.trim() || !password.trim()) {
          return setApiError("Company name, email and password are required.");
        }
        setSubmitting(true);
        const res = await auth.signup({ company, email, password, firstName, lastName });
        const onboarding = {
          token: res.token,
          user: res.user,
          enterpriseCode: res.enterpriseCode ?? res.user?.enterpriseCode,
          employeeId: res.user?.employeeId,
        };
        setToken(res.token);
        sessionStorage.setItem(ENTERPRISE_ONBOARDING_KEY, JSON.stringify(onboarding));
        navigate("/onboarding", { replace: true });
      } else {
        if (!enterpriseCode.trim() || !employeeId.trim() || !email.trim() || !password.trim()) {
          return setApiError("Enterprise code, employee ID, email and password are required.");
        }
        setSubmitting(true);
        finish(await auth.employeeSignup({ enterpriseCode, employeeId, email, password }));
      }
    } catch (err) {
      setApiError(err?.message ?? "Authentication failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const switchMode = (m) => { setMode(m); setApiError(null); setMfaStep(false); setMfaCode(""); };
  const handleKeyDown = (e) => { if (e.key === "Enter") handleSubmit(); };

  // ── Enterprise SSO ─────────────────────────────────────────────────────────
  // Look up the org's identity provider by work-email domain (or the enterprise
  // code already typed), then hand the browser to it. Deliberately says nothing
  // about whether an account exists.
  const startSso = async () => {
    setApiError(null);
    setSsoNote(null);
    setSsoBusy(true);
    try {
      const res = await sso.discover({ email, code: enterpriseCode });
      if (res?.sso && res.tenantId) {
        track("sso_login_started", { protocol: res.protocol });
        window.location.assign(sso.startUrl(res.tenantId, "/overview"));
        return;
      }
      setSsoNote(
        email || enterpriseCode
          ? "No Single Sign-On is configured for that organization. Sign in with your email, password and employee ID instead."
          : "Enter your work email above, then choose “Sign in with SSO”."
      );
    } catch (e) {
      setSsoNote(e?.message || "Couldn't reach the Single Sign-On service.");
    } finally {
      setSsoBusy(false);
    }
  };

  const heading = {
    signin:     { title: "Welcome back", sub: "Sign in with your email, password, and employee ID." },
    enterprise: { title: "Create your enterprise", sub: "The first account is your organization. You become its admin." },
    employee:   { title: "Join your enterprise", sub: "Use the enterprise code and employee ID your admin gave you." },
  }[mode];
  const activeIndex = MODES.findIndex((m) => m.id === mode);

  return (
    <div className="relative isolate min-h-screen w-full flex bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <CursorGlow />

      {/* Shared ExecUI ambient animation behind the whole sign-in screen. */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <ExecUIBackground showModules={false} />
      </div>

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        title={theme === "dark" ? "Switch to light" : "Switch to dark"}
        className="fixed right-5 top-5 z-50 flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white/70 text-slate-500 backdrop-blur transition hover:text-slate-800 dark:border-slate-700/60 dark:bg-slate-800/60 dark:text-slate-400 dark:hover:text-slate-100"
      >
        {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
      </button>

      {/* ── LEFT: Brand panel (transparent — the shared ambient shows through) ── */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[520px] shrink-0 flex-col relative z-10 overflow-hidden border-r border-slate-200/60 dark:border-slate-800/60">
        <div className="relative z-10 flex flex-col h-full px-10 py-12">
          <div className="mb-14 animate-slide-up">
            <AnimatedLogo className="h-10" float />
            <p className="text-[11px] text-teal-800 dark:text-teal-00/70 mt-2 ml-1 tracking-wide">Enterprise Platform</p>
          </div>
          <div className="mb-10">
            <h1 className="text-3xl xl:text-4xl font-semibold text-slate-900 dark:text-white leading-tight mb-4 animate-slide-up delay-75">
              Your enterprise<br />
              <span className="bg-gradient-to-r from-cyan-600 via-teal-500 to-cyan-600 bg-clip-text text-transparent animate-gradient dark:from-cyan-300 dark:via-white dark:to-teal-300">command center.</span>
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed max-w-xs animate-slide-up delay-150">One organization, every team — CRM, marketing, network operations, and AI-powered analytics, together.</p>
          </div>
          <div className="flex flex-col gap-5 mb-auto">
            {features.map(({ icon: Icon, label, desc }, i) => (
              <div key={label} className="flex items-start gap-4 animate-slide-right" style={{ animationDelay: `${260 + i * 90}ms` }}>
                <div className="h-9 w-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 mt-0.5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-400 hover:shadow-md dark:bg-slate-800/80 dark:border-slate-700/50 dark:hover:border-cyan-500/50">
                  <Icon size={16} className="text-cyan-500 dark:text-cyan-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-none mb-1">{label}</p>
                  <p className="text-xs text-slate-500">{desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-10 pt-8 border-t border-slate-200 dark:border-slate-800/60 animate-fade-in delay-700">
            <div className="flex flex-wrap gap-2">
              {badges.map((b) => (
                <span key={b} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-[11px] font-medium text-slate-500 transition-colors hover:border-indigo-400 hover:text-slate-700 dark:bg-slate-800/60 dark:border-slate-700/40 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:border-indigo-500/40">
                  <Shield size={10} className="text-indigo-500 dark:text-indigo-400" />{b}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT: Auth form ── */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-6 py-12 overflow-y-auto">
        <Reveal className="w-full max-w-md">
          <div className="flex items-center justify-between mb-8 lg:hidden">
            <AnimatedLogo className="h-8" />
          </div>

          <>
              <div key={`head-${mode}`} className="mb-7 animate-slide-up">
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-1">{heading.title}</h2>
                <p className="text-sm text-slate-500">{heading.sub}</p>
              </div>

              {/* Mode tabs with a sliding indicator */}
              <div className="relative grid grid-cols-3 bg-slate-100 dark:bg-slate-800/50 rounded-xl p-1 mb-7 border border-slate-200 dark:border-slate-700/40">
                <span
                  className="absolute top-1 bottom-1 rounded-lg bg-teal-600 shadow-sm shadow-cyan-900/40 transition-transform duration-300 ease-out"
                  style={{ left: "0.25rem", width: "calc((100% - 0.5rem) / 3)", transform: `translateX(${activeIndex * 100}%)` }}
                />
                {MODES.map((m) => (
                  <button key={m.id} type="button" onClick={() => switchMode(m.id)}
                    className={`relative z-10 py-2 rounded-lg text-xs font-medium transition-colors duration-200 ${mode === m.id ? "text-white" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"}`}>
                    {m.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-col gap-4">
                <div key={`fields-${mode}`} className="flex flex-col gap-4 stagger">
                  {mode === "enterprise" && (
                    <>
                      <InputField label="Company name" value={company} onChange={(e) => setCompany(e.target.value)} onKeyDown={handleKeyDown} placeholder="Acme Corporation" autoComplete="organization" />
                      <div className="grid grid-cols-2 gap-3">
                        <InputField label="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} onKeyDown={handleKeyDown} placeholder="Jane" />
                        <InputField label="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} onKeyDown={handleKeyDown} placeholder="Doe" />
                      </div>
                    </>
                  )}

                  {mode === "employee" && (
                    <InputField label="Enterprise code" value={enterpriseCode} onChange={(e) => setEnterpriseCode(e.target.value.toUpperCase())} onKeyDown={handleKeyDown} placeholder="ACME-9F3K" hint="Ask your enterprise admin for this code." />
                  )}

                  <InputField label="Work email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={handleKeyDown} placeholder="name@company.com" autoComplete="email" />

                  {(mode === "signin" || mode === "employee") && (
                    <InputField label="Employee ID" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} onKeyDown={handleKeyDown} placeholder="Your Employee ID"
                      hint={mode === "employee" ? "The ID your admin assigned you." : undefined} />
                  )}

                  <InputField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={handleKeyDown} placeholder="••••••••" autoComplete={mode === "signin" ? "current-password" : "new-password"} />

                  {mode === "signin" && mfaStep && (
                    <InputField
                      label="Two-factor code"
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      onKeyDown={handleKeyDown}
                      placeholder="123456"
                      autoComplete="one-time-code"
                      hint="Enter the 6-digit code from your authenticator app."
                    />
                  )}
                </div>

                {apiError && (
                  <div className="flex items-start gap-2.5 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-sm text-red-600 dark:text-red-400 animate-shake">
                    <AlertCircle size={15} className="shrink-0 mt-0.5" /><span>{apiError}</span>
                  </div>
                )}

                <button type="button" onClick={handleSubmit} disabled={submitting}
                  className="group relative mt-1 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-teal-600 hover:bg-cyan-500 active:bg-cyan-700 text-white text-sm font-semibold transition-all duration-150 disabled:opacity-50 shadow-lg shadow-cyan-900/30 hover:-translate-y-0.5 overflow-hidden">
                  <span className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-white/25 blur-md -translate-x-full transition-transform duration-700 ease-out group-hover:translate-x-[400%]" />
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : (
                    <>
                      {mode === "signin" ? (mfaStep ? "Verify code" : "Sign in") : mode === "enterprise" ? "Create enterprise" : "Activate account"}
                      <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </button>

                {/* Enterprise Single Sign-On — resolves the org's IdP from the
                    work email domain (or enterprise code) and hands off to it. */}
                {mode === "signin" && !mfaStep && (
                  <div className="pt-1">
                    <div className="flex items-center gap-3 py-1">
                      <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                      <span className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-600">or</span>
                      <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                    </div>
                    <button
                      type="button"
                      onClick={startSso}
                      disabled={ssoBusy}
                      className="mt-1 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition disabled:opacity-50"
                    >
                      {ssoBusy ? <Loader2 size={15} className="animate-spin" /> : <Shield size={15} className="text-indigo-500" />}
                      {ssoBusy ? "Checking…" : "Sign in with SSO"}
                    </button>
                    {ssoNote && <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{ssoNote}</p>}
                  </div>
                )}
              </div>

              <div className="mt-6 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-600">
                <KeyRound size={12} className="text-slate-400 dark:text-slate-500" />
                {mode === "signin" && <span>Every account signs in with email + password + employee ID.</span>}
                {mode === "enterprise" && <span>Already have an enterprise? <button onClick={() => switchMode("signin")} className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 font-medium">Sign in</button></span>}
                {mode === "employee" && <span>Don't have an ID yet? Ask your admin to add you.</span>}
              </div>
            </>
          )}
        </Reveal>
      </div>
    </div>
  );
}
