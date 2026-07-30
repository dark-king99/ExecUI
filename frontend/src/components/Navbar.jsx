import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, Moon, Sun, Home, Layers, Network, BarChart3,
  BookOpen, ChevronDown, LogOut, User2, Shield, CornerDownLeft
} from "lucide-react";
import { useSidebar } from "./SidebarContext";
import { useApi } from "../hooks/useApi";
import { account } from "../services/api";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";

import { searchApp } from "../lib/searchIndex";
import NotificationBell from "./NotificationBell";

function NavItem({ icon: Icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-all duration-150"
    >
      <Icon size={14} className="shrink-0" />
      <span>{label}</span>
    </button>
  );
}

function NavSearch({ user, role }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef(null);
  const results = open ? searchApp(q, user, role) : [];

  useEffect(() => { setActive(0); }, [q]);
  useEffect(() => {
    const onDocClick = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const go = (r) => { if (!r) return; navigate(r.path); setQ(""); setOpen(false); };

  const onKeyDown = (e) => {
    if (!results.length) {
      if (e.key === "Enter" && q.trim()) { setOpen(true); }
      return;
    }
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => (i + 1) % results.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => (i - 1 + results.length) % results.length); }
    else if (e.key === "Enter") { e.preventDefault(); go(results[active]); }
    else if (e.key === "Escape") { setOpen(false); }
  };

  return (
    <div ref={boxRef} className="relative max-w-[240px] w-full">
      <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      <input
        type="text"
        value={q}
        placeholder="Search pages & modules…"
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        className="w-full pl-8 pr-14 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-lg text-slate-700 dark:text-slate-300 placeholder:text-slate-400 focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition"
      />
      {/* Hotkey hint — opens the full-screen command palette */}
      <button
        type="button"
        tabIndex={-1}
        onClick={() => window.dispatchEvent(new CustomEvent("cmdk:open"))}
        title="Open command palette"
        className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-indigo-500 hover:border-indigo-300 transition"
      >
        Ctrl K
      </button>
      {open && q.trim() && (
        <div className="absolute left-0 top-full mt-2 w-[340px] max-w-[80vw] z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl shadow-black/10 dark:shadow-black/30 overflow-hidden animate-scale-in">
          {results.length === 0 ? (
            <p className="px-4 py-5 text-center text-sm text-slate-400">No matches for “{q}”</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto py-1.5">
              {results.map((r, i) => (
                <li key={r.path + r.label}>
                  <button
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(r)}
                    className={`flex w-full items-center gap-3 px-3 py-2 text-left transition ${
                      i === active ? "bg-indigo-50 dark:bg-indigo-500/10" : "hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                      <Search size={13} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-slate-800 dark:text-slate-100">{r.label}</span>
                      <span className="block truncate text-xs text-slate-400">{r.group || r.path}</span>
                    </span>
                    {i === active && <CornerDownLeft size={13} className="shrink-0 text-slate-400" />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default function Navbar({ user, onLogout, roleToUse }) {
  const [open, setOpen]   = useState(false);
  const { theme, toggleTheme } = useSidebar();
  const navigate = useNavigate();

  const { data: profile } = useApi(() => account.profile.get(), [], { cacheKey: "account:profile" });
  const avatarUrl = profile?.avatarUrl ?? user?.avatarUrl ?? null;
  const initials = [user?.firstName?.[0], user?.lastName?.[0]].filter(Boolean).join("").toUpperCase() || "U";

  // `backdrop-blur` makes this header its own stacking context, so the z-index on
  // the menus below only orders them against each other — it can never lift them
  // over a card in <main>. Raising the header itself is what does that.
  return (
    <header className="relative z-50 h-14 shrink-0 bg-white dark:bg-slate-950/95 backdrop-blur-sm border-b border-slate-100 dark:border-slate-800/70 flex items-center px-5 gap-90">

      {/* ── Search ───────────────────────────────────────────────────── */}
      <NavSearch user={user} role={roleToUse ?? user?.role} />

      {/* ── Quick nav ────────────────────────────────────────────────── */}
      <nav className="flex items-center gap-0.5 ml-2">
        <NavItem icon={Layers}   label="Services"  onClick={() => navigate("/services")} />
        <NavItem icon={Network}  label="Network"   onClick={() => navigate("/network")} />
        <NavItem icon={BarChart3} label="Analytics" onClick={() => navigate("/analytics")} />
        <NavItem icon={BookOpen} label="Access"   onClick={() => navigate("/account/billing")} />
      </nav>

      {/* ── Right side ───────────────────────────────────────────────── */}
      <div className="ml-auto flex items-center gap-2">

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          title={theme === "dark" ? "Switch to light" : "Switch to dark"}
          className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        {/* Notifications */}
        <NotificationBell />

        {/* Divider */}
        <div className="w-px h-5 bg-slate-200 dark:bg-slate-800" />

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition group"
          >
            <Avatar className="w-7 h-7 shrink-0">
              <AvatarImage src={avatarUrl} alt={initials} />
              <AvatarFallback className="bg-indigo-600 text-white text-xs font-semibold">{initials}</AvatarFallback>
            </Avatar>
            <div className="hidden sm:block text-left min-w-0 max-w-[120px]">
              <p className="text-xs font-medium text-slate-700 dark:text-slate-200 leading-none truncate">
                {user?.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : user?.email || "User"}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5 truncate capitalize">
                {roleToUse?.replace(/_/g, " ") || "Member"}
              </p>
            </div>
            <ChevronDown size={12} className="text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition shrink-0" />
          </button>

          {open && (
            <>
              {/* Backdrop */}
              <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

              {/* Dropdown */}
              <div className="absolute right-0 mt-2 w-64 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl shadow-black/10 dark:shadow-black/30 overflow-hidden animate-scale-in">
                {/* User info */}
                <div className="px-4 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
                  <Avatar className="w-9 h-9 shrink-0">
                    <AvatarImage src={avatarUrl} alt={initials} />
                    <AvatarFallback className="bg-indigo-600 text-white text-sm font-semibold">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {user?.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : "User"}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-medium rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 capitalize">
                      {roleToUse?.replace(/_/g, " ") || "Member"}
                    </span>
                  </div>
                </div>

                {/* Menu items */}
                <div className="py-1.5">
                  <button
                    onClick={() => { navigate("/account/profile"); setOpen(false); }}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 transition"
                  >
                    <User2 size={14} className="text-slate-400" />
                    My profile
                  </button>
                  <button
                    onClick={() => { navigate("/account/security"); setOpen(false); }}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 transition"
                  >
                    <Shield size={14} className="text-slate-400" />
                    Security & access
                  </button>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800 py-1.5">
                  <button
                    onClick={() => { onLogout(); setOpen(false); }}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 transition"
                  >
                    <LogOut size={14} />
                    Sign out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
