import React from "react";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronRight,
  Lock,
  Orbit,
  Sparkles,
  UserRound,
  Users,
  Wand2,
} from "lucide-react";



const trustSignals = [
  "SOC 2-ready infrastructure",
  "Multi-tenant isolation",
  "SSO + MFA included",
  "AI-guided onboarding",
];

const clientRoles = [
  {
    id: "employee",
    title: "Employee",
    description: "Collaborate on pipelines, campaigns, and network tasks.",
  },
  {
    id: "admin",
    title: "Enterprise admin",
    description: "Manage tenants, policies, and access controls at scale.",
  },
];

const tenantCards = [
  {
    id: "client",
    title: "Client workspace",
    description: "Operate your CRM, marketing automation, and network stack.",
    icon: Building2,
    gradient: "from-cyan-500/30 via-sky-500/10 to-transparent",
    cta: "Launch client UI",
  },
  {
    id: "customer",
    title: "Customer portal",
    description: "Track tickets, approvals, and shared campaign performance.",
    icon: Users,
    gradient: "from-fuchsia-500/30 via-rose-500/10 to-transparent",
    cta: "Launch customer UI",
  },
];


export default function Login({ onLogin }) {
  const [mode, setMode] = useState("login");
const [tenant, setTenant] = useState("client");
const [clientRole, setClientRole] = useState("employee");
const [transition, setTransition] = useState("idle");

  const heroCopy = useMemo(() => {
    if (mode === "login") {
      return {
        kicker: "Welcome back",
        title: "Secure login for multi-tenant operations",
        description:
          "Authenticate in seconds with live motion, then route to the client or customer experience.",
      };
    }

    return {
      kicker: "Create your account",
      title: "Modern signup with built-in tenant routing",
      description:
        "Spin up client workspaces or customer portals with guided onboarding and AI-ready security.",
    };
  }, [mode]);

  const handleSubmit = () => {
    onLogin({
      name: "Dev User",
      role: "enterprise_admin",
    });
    
  };
  

  const handleModeSwitch = (next) => {
    if (next === mode) return;
    setTransition("auth");
    setTimeout(() => {
      setMode(next);
      setTransition("idle");
    }, 250);
  };

  const handleTenantSwitch = (next) => {
    if (next === tenant) return;
    setTransition("tenant");
    setTimeout(() => {
      setTenant(next);
      setTransition("idle");
    }, 250);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-20 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl animate-float-slow" />
        <div className="absolute right-0 top-0 h-80 w-80 rounded-full bg-fuchsia-500/20 blur-3xl animate-float" />
        <div className="absolute bottom-0 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-emerald-500/10 blur-[120px] animate-float-slower" />
        <div className="absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/5 animate-spin-slowest" />
      </div>

      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 pb-16 pt-12 lg:flex-row lg:items-center">
        <section className="flex flex-1 flex-col gap-6">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">
            <Sparkles className="h-4 w-4" />
            Artemis Haven Access
          </div>
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/50">
              {heroCopy.kicker}
            </p>
            <h1 className="text-4xl font-semibold leading-tight text-white sm:text-5xl">
              {heroCopy.title}
            </h1>
            <p className="max-w-xl text-base text-slate-300">
              {heroCopy.description}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {trustSignals.map((signal) => (
              <div
                key={signal}
                className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-slate-200"
              >
                <CheckCircle2 className="h-4 w-4 text-cyan-200" />
                {signal}
              </div>
            ))}
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-slate-200">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-white">Live environment status</p>
              <span className="flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-cyan-200">
                <Orbit className="h-3.5 w-3.5" />
                Active
              </span>
            </div>
            <p className="mt-2 text-slate-300">
              CRM data sync, marketing automations, and network telemetry are ready to
              activate once you authenticate.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-cyan-200">
                <Lock className="h-3.5 w-3.5" /> Zero-trust secure
              </span>
              <span className="flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-slate-200">
                <Wand2 className="h-3.5 w-3.5 text-fuchsia-200" /> AI-guided
              </span>
            </div>
          </div>
        </section>

        <section className="flex w-full max-w-xl flex-col gap-6 rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-2xl shadow-black/40 backdrop-blur">
          <div className="relative flex items-center justify-between rounded-full border border-white/10 bg-white/5 p-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
            <span
              className={`absolute inset-y-1 left-1 w-[calc(50%-0.75rem)] rounded-full bg-white transition-all duration-300 ${
                mode === "signup" ? "translate-x-full" : "translate-x-0"
              }`}
            />
            <button
              type="button"
              onClick={handleSubmit}
              className={`relative z-10 flex-1 rounded-full px-4 py-2 transition ${
                mode === "login" ? "text-slate-900" : "text-white/70"
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => handleModeSwitch("signup")}
              className={`relative z-10 flex-1 rounded-full px-4 py-2 transition ${
                mode === "signup" ? "text-slate-900" : "text-white/70"
              }`}
            >
              Sign Up
            </button>
          </div>

          <div
            className={`rounded-2xl border border-white/10 bg-white/5 p-6 transition-all duration-300 ${
              transition === "auth"
                ? "opacity-40 blur-sm"
                : "opacity-100 blur-0"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-white/60">
                  {mode === "login" ? "Welcome back" : "Create account"}
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-white">
                  {mode === "login"
                    ? "Log in to Artemis Haven"
                    : "Start your Artemis Haven journey"}
                </h2>
              </div>
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
                <UserRound className="h-5 w-5 text-cyan-200" />
              </span>
            </div>

            <div className="mt-6 grid gap-4 text-sm text-slate-200">
              <label className="grid gap-2">
                <span className="text-xs uppercase tracking-[0.2em] text-white/60">
                  Work email
                </span>
                <input
                  type="email"
                  placeholder="name@company.com"
                  className="rounded-xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                />
              </label>
              <label className="grid gap-2">
                <span className="text-xs uppercase tracking-[0.2em] text-white/60">
                  Password
                </span>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="rounded-xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                />
              </label>
              {mode === "signup" && (
                <label className="grid gap-2">
                  <span className="text-xs uppercase tracking-[0.2em] text-white/60">
                    Company name
                  </span>
                  <input
                    type="text"
                    placeholder="Artemis Operations"
                    className="rounded-xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                  />
                </label>
              )}
            </div>

            <button
  onClick={handleSubmit}
  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:-translate-y-0.5"
>
  {mode === "login" ? "Continue" : "Create workspace"}
  <ArrowRight className="h-4 w-4" />
</button>


            <p className="mt-4 text-xs text-slate-400">
              {mode === "login"
                ? "Use your SSO credentials or email + password to sign in."
                : "By signing up you agree to the Artemis Haven terms."}
            </p>
          </div>

          <div
            className={`grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 transition-all duration-300 ${
              transition === "tenant"
                ? "opacity-40 blur-sm"
                : "opacity-100 blur-0"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-white/60">
                  Route to tenant UI
                </p>
                <h3 className="mt-2 text-lg font-semibold text-white">
                  Choose your destination
                </h3>
              </div>
              <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-white/60">
                {tenant === "client" ? "Client" : "Customer"}
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {tenantCards.map((card) => {
                const Icon = card.icon;
                const isActive = tenant === card.id;
                return (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => handleTenantSwitch(card.id)}
                    className={`rounded-2xl border border-white/10 bg-linear-to-br ${
                      card.gradient
                    } p-4 text-left transition ${
                      isActive
                        ? "border-cyan-300/60 shadow-lg shadow-cyan-500/20"
                        : "hover:border-white/30"
                    }`}
                  >
                    <Icon className="h-5 w-5 text-white" />
                    <p className="mt-3 text-sm font-semibold text-white">
                      {card.title}
                    </p>
                    <p className="mt-2 text-xs text-slate-200">
                      {card.description}
                    </p>
                  </button>
                );
              })}
            </div>
            {tenant === "client" && mode === "signup" && (
              <div className="grid gap-3">
                <p className="text-xs uppercase tracking-[0.2em] text-white/60">
                  Client role
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {clientRoles.map((role) => (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => setClientRole(role.id)}
                      className={`rounded-xl border border-white/10 px-4 py-3 text-left text-xs transition ${
                        clientRole === role.id
                          ? "border-emerald-300/60 bg-emerald-400/10"
                          : "hover:border-white/30"
                      }`}
                    >
                      <p className="text-sm font-semibold text-white">
                        {role.title}
                      </p>
                      <p className="mt-1 text-slate-300">{role.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <button
  onClick={handleSubmit}
  className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:border-white/40"
>
  {tenantCards.find((card) => card.id === tenant)?.cta}
  <ChevronRight className="h-4 w-4" />
</button>

          </div>
        </section>
      </div>
    </div>
  );
}
