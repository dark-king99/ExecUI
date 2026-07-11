import { useNavigate } from "react-router-dom";
import { ArrowUpRight, ShieldCheck } from "lucide-react";

// Marketing-site footer, shared by the Home landing page and the Privacy Policy
// page. Groups the real product surfaces + the legal/account links, and closes
// with a copyright bar. Every link points at a route that actually exists.
const COLUMNS = [
  {
    heading: "Product",
    links: [
      { label: "CRM · Sales Cloud", to: "/crm" },
      { label: "Marketing Cloud", to: "/marketing" },
      { label: "Network Operations", to: "/network" },
      { label: "Business Services", to: "/services" },
      { label: "Analytics", to: "/analytics" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "Executive Overview", to: "/overview" },
      { label: "Access & Plans", to: "/account/billing" },
      { label: "Integrations", to: "/account/integrations" },
      { label: "Workspace", to: "/account/workspace" },
    ],
  },
  {
    heading: "Account",
    links: [
      { label: "Profile", to: "/account/profile" },
      { label: "Security & MFA", to: "/account/security" },
      { label: "Notifications", to: "/account/notifications" },
      { label: "Messaging", to: "/account/messaging" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Privacy Policy", to: "/privacy" },
      { label: "Data & Security", to: "/privacy#security" },
      { label: "Employee Privacy", to: "/privacy#employees" },
    ],
  },
];

export default function Footer() {
  const navigate = useNavigate();
  const year = new Date().getFullYear();

  return (
    <footer className="relative z-10 border-t border-slate-200 bg-white/60 dark:border-white/10 dark:bg-white/[0.02]">
      <div className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-6">
          {/* Brand */}
          <div className="col-span-2">
            <button
              onClick={() => navigate("/home")}
              className="flex items-center transition-transform hover:scale-[1.02]"
            >
              <img
                src="/execui-logo.png"
                alt="ExecUI"
                className="h-8 w-auto object-contain"
                draggable="false"
              />
            </button>
            <p className="mt-4 max-w-xs text-sm text-slate-500 dark:text-slate-400">
              One operating layer for the enterprise — CRM, marketing, network,
              analytics and business services, unified and secured per tenant.
            </p>
            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <ShieldCheck size={13} />
              Tenant-isolated · encrypted · SOC-style controls
            </div>
          </div>

          {/* Link columns */}
          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {col.heading}
              </h4>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <button
                      onClick={() => navigate(l.to)}
                      className="group inline-flex items-center gap-1 text-sm text-slate-600 transition hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400"
                    >
                      {l.label}
                      <ArrowUpRight
                        size={12}
                        className="opacity-0 transition group-hover:opacity-100"
                      />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-slate-200 pt-6 dark:border-white/10 sm:flex-row">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            © {year} ExecUI. All rights reserved.
          </p>
          <div className="flex items-center gap-5 text-xs text-slate-400 dark:text-slate-500">
            <button onClick={() => navigate("/privacy")} className="transition hover:text-slate-700 dark:hover:text-slate-200">
              Privacy Policy
            </button>
            <button onClick={() => navigate("/privacy#security")} className="transition hover:text-slate-700 dark:hover:text-slate-200">
              Security
            </button>
            <button onClick={() => navigate("/account/billing")} className="transition hover:text-slate-700 dark:hover:text-slate-200">
              Plans
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
