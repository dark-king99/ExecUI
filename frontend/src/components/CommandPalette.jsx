/**
 * Command palette — Ctrl+K / Cmd+K from anywhere in the app (it's mounted at
 * the layout level, so it works even in module views that hide the navbar).
 * Searches every navigable destination the signed-in user may access, keeps
 * the last few visited entries as "Recent", and navigates on Enter/click.
 */
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Search, CornerDownLeft, Clock } from "lucide-react";
import { searchApp, SEARCH_INDEX } from "../lib/searchIndex";
import { accessFor } from "../lib/access";
import { useUser } from "../context/UserContext";

const RECENTS_KEY = "cmdk-recents";

function readRecents() {
  try { return JSON.parse(localStorage.getItem(RECENTS_KEY)) ?? []; } catch { return []; }
}
function pushRecent(path) {
  const next = [path, ...readRecents().filter((p) => p !== path)].slice(0, 5);
  localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
}

export default function CommandPalette() {
  const navigate = useNavigate();
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const allowed = useMemo(() => accessFor(user).sections, [user]);

  // Global hotkey: Ctrl+K / Cmd+K toggles, Escape closes. The navbar search's
  // "Ctrl K" chip fires cmdk:open for mouse users.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("cmdk:open", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("cmdk:open", onOpen);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setQuery(""); setActive(0);
      // Focus after the portal paints.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const results = useMemo(() => {
    if (query.trim()) return searchApp(query, allowed);
    // Empty query → recent destinations the user still has access to.
    const byPath = new Map(SEARCH_INDEX.map((e) => [e.path, e]));
    return readRecents()
      .map((p) => byPath.get(p))
      .filter((e) => e && (e.section == null || allowed.includes(e.section)))
      .map((e) => ({ ...e, recent: true }));
  }, [query, allowed]);

  useEffect(() => setActive(0), [results.length, query]);

  const go = useCallback((entry) => {
    if (!entry) return;
    pushRecent(entry.path);
    setOpen(false);
    navigate(entry.path);
  }, [navigate]);

  const onInputKey = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); go(results[active]); }
  };

  // Keep the active row visible while arrowing through a long list.
  useEffect(() => {
    listRef.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] bg-slate-950/40 dark:bg-black/60 backdrop-blur-[2px]"
      onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
    >
      <div className="w-full max-w-xl mx-4 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900 shadow-2xl shadow-slate-950/25">
        {/* Input row */}
        <div className="flex items-center gap-3 px-4 border-b border-slate-100 dark:border-slate-800">
          <Search size={16} className="text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKey}
            placeholder="Jump to a page, solution or setting…"
            className="flex-1 py-3.5 text-sm bg-transparent outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
          <kbd className="text-[10px] px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-400">esc</kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[46vh] overflow-y-auto py-1.5">
          {results.length === 0 && (
            <p className="px-4 py-6 text-sm text-slate-400 text-center">
              {query.trim() ? "No matches — try another word." : "Type to search, or revisit pages to build your recents."}
            </p>
          )}
          {results.map((r, i) => (
            <button
              key={`${r.path}-${i}`}
              onMouseEnter={() => setActive(i)}
              onClick={() => go(r)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                i === active ? "bg-indigo-50 dark:bg-indigo-500/10" : ""
              }`}
            >
              {r.recent
                ? <Clock size={14} className="text-slate-400 shrink-0" />
                : <Search size={14} className="text-slate-300 dark:text-slate-600 shrink-0" />}
              <span className="flex-1 min-w-0">
                <span className={`block text-sm truncate ${i === active ? "text-indigo-700 dark:text-indigo-300 font-medium" : "text-slate-800 dark:text-slate-200"}`}>
                  {r.label}
                </span>
                <span className="block text-[11px] text-slate-400 truncate">{r.group ?? r.path}</span>
              </span>
              {i === active && <CornerDownLeft size={13} className="text-indigo-400 shrink-0" />}
            </button>
          ))}
        </div>

        {/* Footer hints */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 select-none">
          <span><kbd className="px-1 py-0.5 rounded border border-slate-200 dark:border-slate-700">↑↓</kbd> navigate</span>
          <span><kbd className="px-1 py-0.5 rounded border border-slate-200 dark:border-slate-700">↵</kbd> open</span>
          <span className="ml-auto"><kbd className="px-1 py-0.5 rounded border border-slate-200 dark:border-slate-700">Ctrl K</kbd> anywhere</span>
        </div>
      </div>
    </div>,
    document.body
  );
}
