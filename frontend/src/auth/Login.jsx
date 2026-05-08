import React, { useMemo, useState } from "react";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronRight,
  Lock,
  BarChart3,
  Network,
  Users,
  Megaphone,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  Shield,
} from "lucide-react";
import { auth, setToken } from "../services/api";

// ─── Brand panel data ────────────────────────────────────────────────────────

const features = [
  { icon: Users,     label: "CRM & Pipeline",         desc: "Unify customer data and drive revenue growth." },
  { icon: Megaphone, label: "Marketing Automation",    desc: "Orchestrate campaigns across every channel." },
  { icon: Network,   label: "Network Operations",      desc: "Monitor and protect critical infrastructure." },
  { icon: BarChart3, label: "Analytics & Intelligence", desc: "AI-powered insights for faster decisions." },
];

const badges = [
  "SOC 2 Ready",
  "Multi-tenant",
  "SSO + MFA",
  "Zero-trust",
];

// ─── Tenant options ───────────────────────────────────────────────────────────

const tenantOptions = [
  {
    id: "client",
    label: "Client workspace",
    desc: "CRM, marketing, and network operations.",
    icon: Building2,
    accent: "border-indigo-500/60 bg-indigo-500/5",
    activeRing: "ring-2 ring-indigo-500/40",
  },
  {
    id: "customer",
    label: "Customer portal",
    desc: "Tickets, approvals, and campaign tracking.",
    icon: Users,
    accent: "border-violet-500/60 bg-violet-500/5",
    activeRing: "ring-2 ring-violet-500/40",
  },
];

const clientRoles = [
  { id: "employee",         label: "Employee",         desc: "Collaborate on pipelines and campaigns." },
  { id: "enterprise_admin", label: "Enterprise Admin",  desc: "Manage tenants, policies, and access." },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function InputField({ label, type = "text", value, onChange, onKeyDown, placeholder, autoComplete, rightAction }) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  const resolvedType = isPassword ? (show ? "text" : "password") : type;

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
        {label}
      </label>
      <div className="relative">
        <input
          type={resolvedType}
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="w-full bg-slate-800/60 border border-slate-700/60 rounded-lg px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 transition-all duration-150"
        />
        {isPassword && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShow((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
          >
            {show ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Login({ onLogin }) {
  const [mode,       setMode]       = useState("login");
  const [tenant,     setTenant]     = useState("client");
  const [clientRole, setClientRole] = useState("employee");
  const [transitioning, setTransitioning] = useState(false);

  // form
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [company,  setCompany]  = useState("");

  // request
  const [submitting, setSubmitting] = useState(false);
  const [apiError,   setApiError]   = useState(null);

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      setApiError("Email and password are required.");
      return;
    }
    setSubmitting(true);
    setApiError(null);

    try {
      const payload =
        mode === "login"
          ? { email, password, tenant }
          : { email, password, company, tenant, role: clientRole };

      const response = await auth[mode === "login" ? "login" : "signup"](payload);
      setToken(response.token);
      onLogin({ ...response.user, token: response.token });
    } catch (err) {
      setApiError(err?.message ?? "Authentication failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleModeSwitch = (next) => {
    if (next === mode || transitioning) return;
    setApiError(null);
    setTransitioning(true);
    setTimeout(() => { setMode(next); setTransitioning(false); }, 220);
  };

  const handleKeyDown = (e) => { if (e.key === "Enter") handleSubmit(); };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen w-full flex bg-slate-950">

      {/* ── LEFT: Brand panel ───────────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[520px] shrink-0 flex-col relative overflow-hidden bg-gradient-to-br from-indigo-950 via-slate-950 to-slate-950 border-r border-slate-800/60">

        {/* Subtle radial glows */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-20 -left-20 h-72 w-72 rounded-full bg-indigo-600/15 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-violet-600/10 blur-3xl" />
        </div>

        {/* Dot grid */}
        <div className="absolute inset-0 bg-dot-pattern opacity-50" />

        <div className="relative z-10 flex flex-col h-full px-10 py-12">

          {/* Logo */}
          <div className="flex items-center gap-3 mb-14">
            <div className="h-9 w-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <Building2 size={18} className="text-white" />
            </div>
            <div>
              <p className="text-base font-semibold text-white leading-none">ExecUI</p>
              <p className="text-[11px] text-indigo-300/70 mt-0.5">Enterprise Platform</p>
            </div>
          </div>

          {/* Hero text */}
          <div className="mb-10">
            <h1 className="text-3xl xl:text-4xl font-semibold text-white leading-tight mb-4">
              Your enterprise<br />command center.
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
              One platform for CRM, marketing automation, network operations, and AI-powered analytics.
            </p>
          </div>

          {/* Feature list */}
          <div className="flex flex-col gap-5 mb-auto">
            {features.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-start gap-4">
                <div className="h-9 w-9 rounded-lg bg-slate-800/80 border border-slate-700/50 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon size={16} className="text-indigo-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-200 leading-none mb-1">{label}</p>
                  <p className="text-xs text-slate-500">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Trust badges */}
          <div className="mt-10 pt-8 border-t border-slate-800/60">
            <div className="flex flex-wrap gap-2">
              {badges.map((b) => (
                <span
                  key={b}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800/60 border border-slate-700/40 text-[11px] font-medium text-slate-400"
                >
                  <Shield size={10} className="text-indigo-400" />
                  {b}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT: Auth form ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 overflow-y-auto">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Building2 size={16} className="text-white" />
            </div>
            <span className="text-base font-semibold text-white">ExecUI</span>
          </div>

          {/* Page heading */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-1">
              {mode === "login" ? "Welcome back" : "Create your account"}
            </h2>
            <p className="text-sm text-slate-500">
              {mode === "login"
                ? "Sign in to access your workspace."
                : "Set up your enterprise workspace in minutes."}
            </p>
          </div>

          {/* Mode tabs */}
          <div className="flex items-center bg-slate-800/50 rounded-xl p-1 mb-8 border border-slate-700/40">
            {["login", "signup"].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => handleModeSwitch(m)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  mode === m
                    ? "bg-indigo-600 text-white shadow-sm shadow-indigo-900/50"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {m === "login" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>

          {/* Form fields */}
          <div
            className={`flex flex-col gap-4 transition-all duration-200 ${
              transitioning ? "opacity-40 blur-sm" : "opacity-100 blur-0"
            }`}
          >
            <InputField
              label="Work email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="name@company.com"
              autoComplete="email"
            />

            <InputField
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="••••••••"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />

            {mode === "signup" && (
              <InputField
                label="Company name"
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Acme Corporation"
                autoComplete="organization"
              />
            )}

            {/* Error */}
            {apiError && (
              <div className="flex items-start gap-2.5 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-400">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <span>{apiError}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="mt-2 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-sm font-semibold transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-900/30 hover:shadow-indigo-900/50 hover:-translate-y-0.5"
            >
              {submitting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  {mode === "login" ? "Sign in" : "Create workspace"}
                  <ArrowRight size={15} />
                </>
              )}
            </button>

            {/* Mode switcher link */}
            <p className="text-center text-xs text-slate-500">
              {mode === "login" ? (
                <>
                  Don't have an account?{" "}
                  <button
                    type="button"
                    onClick={() => handleModeSwitch("signup")}
                    className="text-indigo-400 hover:text-indigo-300 font-medium transition"
                  >
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => handleModeSwitch("login")}
                    className="text-indigo-400 hover:text-indigo-300 font-medium transition"
                  >
                    Sign in
                  </button>
                </>
              )}
            </p>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 my-7">
            <div className="flex-1 h-px bg-slate-800" />
            <span className="text-xs text-slate-600 uppercase tracking-widest">Workspace</span>
            <div className="flex-1 h-px bg-slate-800" />
          </div>

          {/* Tenant selector */}
          <div className="flex flex-col gap-3">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Select your destination
            </p>
            <div className="grid grid-cols-2 gap-3">
              {tenantOptions.map(({ id, label, desc, icon: Icon, accent, activeRing }) => {
                const active = tenant === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTenant(id)}
                    className={`flex flex-col items-start gap-2 p-4 rounded-xl border text-left transition-all duration-150 ${
                      active
                        ? `${accent} ${activeRing}`
                        : "border-slate-800/80 bg-slate-900/50 hover:border-slate-700"
                    }`}
                  >
                    <Icon size={16} className={active ? "text-indigo-400" : "text-slate-500"} />
                    <div>
                      <p className={`text-sm font-medium leading-none mb-1 ${active ? "text-slate-100" : "text-slate-400"}`}>
                        {label}
                      </p>
                      <p className="text-[11px] text-slate-600 leading-snug">{desc}</p>
                    </div>
                    {active && (
                      <CheckCircle2 size={13} className="text-indigo-400 mt-auto self-end" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Client role picker – only on signup for client workspace */}
            {tenant === "client" && mode === "signup" && (
              <div className="mt-1 flex flex-col gap-2">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Client role
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {clientRoles.map(({ id, label, desc }) => {
                    const active = clientRole === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setClientRole(id)}
                        className={`flex flex-col items-start gap-1 px-3 py-3 rounded-lg border text-left transition-all duration-150 ${
                          active
                            ? "border-emerald-500/50 bg-emerald-500/5 ring-1 ring-emerald-500/30"
                            : "border-slate-800 bg-slate-900/40 hover:border-slate-700"
                        }`}
                      >
                        <p className={`text-xs font-semibold ${active ? "text-emerald-400" : "text-slate-400"}`}>
                          {label}
                        </p>
                        <p className="text-[10px] text-slate-600 leading-snug">{desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Workspace CTA */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl border border-slate-700/60 bg-slate-800/50 hover:bg-slate-700/50 hover:border-slate-600 text-slate-300 text-sm font-medium transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <>
                  {tenant === "client" ? "Launch client workspace" : "Launch customer portal"}
                  <ChevronRight size={14} className="text-slate-500" />
                </>
              )}
            </button>
          </div>

          {/* Footer */}
          <p className="mt-8 text-center text-[11px] text-slate-700">
            {mode === "login"
              ? "Use your SSO credentials or email + password."
              : "By signing up you agree to the Artemis Haven terms of service."}
          </p>
        </div>
      </div>
    </div>
  );
}
