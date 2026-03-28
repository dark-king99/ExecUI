import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Moon, Sun, Home, Grid, Link as LinkIcon, CreditCard } from "lucide-react";
import { useSidebar } from "./SidebarContext";

function NavItem({ icon: Icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
    >
      <Icon size={16} />
      <span>{label}</span>
    </button>
  );
}

export default function Navbar({ user, onLogout, roleToUse, effectiveRole, setEffectiveRole }) {
  const [open, setOpen] = useState(false);
  const { theme, toggleTheme } = useSidebar();
  const navigate = useNavigate();

  return (
    <header className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center px-6 gap-4 shrink-0">
      {/* SEARCH */}
      <div className="relative">
        <Search size={14} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search…"
          className="pl-8 pr-4 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-52"
        />
      </div>

      {/* LINKS */}
      <nav className="flex items-center gap-1 ml-4">
        <NavItem icon={Grid}      label="Services"  onClick={() => navigate("/crm")} />
        <NavItem icon={LinkIcon}  label="Connect"   onClick={() => navigate("/network")} />
        <NavItem icon={CreditCard} label="Access" onClick={() => navigate("/analytics")} />
        <NavItem icon={CreditCard} label="Tutorial" onClick={() => navigate("/account")} />
      </nav>

      {/* THEME */}
      <button
        onClick={toggleTheme}
        className="ml-auto inline-flex items-center gap-2 rounded-full border border-slate-300 dark:border-slate-700 px-3 py-1 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
      >
        {theme === "dark" ? <Sun size={13} /> : <Moon size={13} />}
        {theme === "dark" ? "Light" : "Dark"}
      </button>

      {/* USER MENU */}
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-semibold hover:bg-indigo-700 transition"
        >
          {user?.name?.[0]?.toUpperCase() || "U"}
        </button>

        {open && (
          <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl text-sm z-50">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800">
              <div className="font-semibold text-slate-900 dark:text-white">{user?.name || "User"}</div>
              <div className="text-xs text-slate-500 mt-0.5">Role: {user?.role || "unknown"}</div>
            </div>
            <div className="py-1">
              <button
                onClick={() => { navigate("/account/profile"); setOpen(false); }}
                className="w-full text-left px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Profile
              </button>
              <button
                onClick={() => { navigate("/account/security"); setOpen(false); }}
                className="w-full text-left px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Settings
              </button>
              <button
                onClick={onLogout}
                className="w-full text-left px-4 py-2 text-red-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
