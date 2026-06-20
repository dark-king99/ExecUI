import React, { useState } from "react";
import {
  ArrowRight, Building2, CheckCircle2, BarChart3, Network, Users,
  Megaphone, AlertCircle, Loader2, Eye, EyeOff, Shield, Copy, KeyRound,
} from "lucide-react";
import { auth, setToken } from "../services/api";

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

function InputField({ label, type = "text", value, onChange, onKeyDown, placeholder, autoComplete, hint }) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  const resolvedType = isPassword ? (show ? "text" : "password") : type;
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</label>
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
          <button type="button" tabIndex={-1} onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition">
            {show ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        )}
      </div>
      {hint && <p className="text-[11px] text-slate-600">{hint}</p>}
    </div>
  );
}

export default function Login({ onLogin }) {
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
  const [created, setCreated] = useState(null); // enterprise-created success state
  const [copied, setCopied] = useState(false);

  const finish = (response) => {
    setToken(response.token);
    onLogin({ ...response.user, token: response.token });
  };

  const handleSubmit = async () => {
    setApiError(null);
    try {
      if (mode === "signin") {
        if (!email.trim() || !password.trim() || !employeeId.trim()) {
          return setApiError("Email, password and employee ID are required.");
        }
        setSubmitting(true);
        finish(await auth.login({ email, password, employeeId }));
      } else if (mode === "enterprise") {
        if (!company.trim() || !email.trim() || !password.trim()) {
          return setApiError("Company name, email and password are required.");
        }
        setSubmitting(true);
        const res = await auth.signup({ company, email, password, firstName, lastName });
        setCreated({ token: res.token, user: res.user, enterpriseCode: res.enterpriseCode ?? res.user?.enterpriseCode, employeeId: res.user?.employeeId });
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

  const switchMode = (m) => { setMode(m); setApiError(null); };
  const handleKeyDown = (e) => { if (e.key === "Enter") handleSubmit(); };

  const heading = {
    signin:     { title: "Welcome back", sub: "Sign in with your email, password, and employee ID." },
    enterprise: { title: "Create your enterprise", sub: "The first account is your organization. You become its admin." },
    employee:   { title: "Join your enterprise", sub: "Use the enterprise code and employee ID your admin gave you." },
  }[mode];

  return (
    <div className="min-h-screen w-full flex bg-slate-950">
      {/* ── LEFT: Brand panel ── */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[520px] shrink-0 flex-col relative overflow-hidden bg-gradient-to-br from-indigo-950 via-slate-950 to-slate-950 border-r border-slate-800/60">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-20 -left-20 h-72 w-72 rounded-full bg-indigo-600/15 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-violet-600/10 blur-3xl" />
        </div>
        <div className="absolute inset-0 bg-dot-pattern opacity-50" />
        <div className="relative z-10 flex flex-col h-full px-10 py-12">
          <div className="flex items-center gap-3 mb-14">
            <div className="h-9 w-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <Building2 size={18} className="text-white" />
            </div>
            <div>
              <p className="text-base font-semibold text-white leading-none">ExecUI</p>
              <p className="text-[11px] text-indigo-300/70 mt-0.5">Enterprise Platform</p>
            </div>
          </div>
          <div className="mb-10">
            <h1 className="text-3xl xl:text-4xl font-semibold text-white leading-tight mb-4">Your enterprise<br />command center.</h1>
            <p className="text-slate-400 text-sm leading-relaxed max-w-xs">One organization, every team — CRM, marketing, network operations, and AI-powered analytics, together.</p>
          </div>
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
          <div className="mt-10 pt-8 border-t border-slate-800/60">
            <div className="flex flex-wrap gap-2">
              {badges.map((b) => (
                <span key={b} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800/60 border border-slate-700/40 text-[11px] font-medium text-slate-400">
                  <Shield size={10} className="text-indigo-400" />{b}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT: Auth form ── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 overflow-y-auto">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center"><Building2 size={16} className="text-white" /></div>
            <span className="text-base font-semibold text-white">ExecUI</span>
          </div>

          {created ? (
            /* ── Enterprise created success ── */
            <div>
              <div className="h-12 w-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mb-5">
                <CheckCircle2 size={24} className="text-emerald-400" />
              </div>
              <h2 className="text-2xl font-semibold text-white mb-1">Enterprise created</h2>
              <p className="text-sm text-slate-500 mb-6">Save these — your team needs the enterprise code to join, and you'll sign in with your employee ID.</p>

              <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 divide-y divide-slate-700/50 mb-6">
                <div className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-slate-500">Enterprise Code</p>
                    <p className="text-lg font-semibold text-white font-mono">{created.enterpriseCode}</p>
                  </div>
                  <button
                    onClick={() => { navigator.clipboard?.writeText(created.enterpriseCode); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
                    className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-700/50 transition"
                  >
                    {copied ? <CheckCircle2 size={13} className="text-emerald-400" /> : <Copy size={13} />}{copied ? "Copied" : "Copy"}
                  </button>
                </div>
                <div className="px-4 py-3">
                  <p className="text-[11px] uppercase tracking-wider text-slate-500">Your Admin Employee ID</p>
                  <p className="text-lg font-semibold text-white font-mono">{created.employeeId}</p>
                </div>
              </div>

              <button onClick={() => finish(created)} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition">
                Continue to workspace <ArrowRight size={15} />
              </button>
            </div>
          ) : (
            <>
              <div className="mb-7">
                <h2 className="text-2xl font-semibold text-white mb-1">{heading.title}</h2>
                <p className="text-sm text-slate-500">{heading.sub}</p>
              </div>

              {/* Mode tabs */}
              <div className="grid grid-cols-3 bg-slate-800/50 rounded-xl p-1 mb-7 border border-slate-700/40">
                {MODES.map((m) => (
                  <button key={m.id} type="button" onClick={() => switchMode(m.id)}
                    className={`py-2 rounded-lg text-xs font-medium transition-all duration-200 ${mode === m.id ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"}`}>
                    {m.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-col gap-4">
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
                  <InputField label="Employee ID" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} onKeyDown={handleKeyDown} placeholder="EMP-0001"
                    hint={mode === "employee" ? "The ID your admin assigned you." : undefined} />
                )}

                <InputField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={handleKeyDown} placeholder="••••••••" autoComplete={mode === "signin" ? "current-password" : "new-password"} />

                {apiError && (
                  <div className="flex items-start gap-2.5 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-400">
                    <AlertCircle size={15} className="shrink-0 mt-0.5" /><span>{apiError}</span>
                  </div>
                )}

                <button type="button" onClick={handleSubmit} disabled={submitting}
                  className="mt-1 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-sm font-semibold transition-all duration-150 disabled:opacity-50 shadow-lg shadow-indigo-900/30 hover:-translate-y-0.5">
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : (
                    <>
                      {mode === "signin" ? "Sign in" : mode === "enterprise" ? "Create enterprise" : "Activate account"}
                      <ArrowRight size={15} />
                    </>
                  )}
                </button>
              </div>

              <div className="mt-6 flex items-center gap-2 text-xs text-slate-600">
                <KeyRound size={12} className="text-slate-500" />
                {mode === "signin" && <span>Every account signs in with email + password + employee ID.</span>}
                {mode === "enterprise" && <span>Already have an enterprise? <button onClick={() => switchMode("signin")} className="text-indigo-400 hover:text-indigo-300 font-medium">Sign in</button></span>}
                {mode === "employee" && <span>Don't have an ID yet? Ask your admin to add you.</span>}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
