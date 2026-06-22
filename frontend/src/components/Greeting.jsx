import { useApi } from "../hooks/useApi";
import { account } from "../services/api";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

function partOfDay() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const titleCase = (s) =>
  (s ?? "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const initialsOf = (name) =>
  (name ?? "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "?";

/**
 * Greeting — time-of-day greeting that recognises the signed-in employee by
 * name, with their role and department. Fetches the profile once (shared,
 * cached via useApi) so it stays in sync across every launcher.
 */
export default function Greeting({ product, subtitle }) {
  const { data: profile } = useApi(() => account.profile.get(), [], { cacheKey: "account:profile" });

  // Fall back to the locally-stored user so there's no flash before the fetch.
  let stored = {};
  try { stored = JSON.parse(localStorage.getItem("user")) ?? {}; } catch { stored = {}; }

  const fullName = [profile?.firstName ?? stored.firstName, profile?.lastName ?? stored.lastName]
    .filter(Boolean).join(" ").trim() || profile?.name || stored.name || "";
  const role = titleCase(profile?.role ?? stored.role);
  const department = profile?.department ?? stored.department;
  const avatarUrl = profile?.avatarUrl ?? stored.avatarUrl ?? stored.avatar_url;

  const displayName = fullName || (profile?.email ?? stored.email) || "there";
  const meta = [role, department].filter(Boolean).join(" · ");

  return (
    <div className="mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3.5 min-w-0">
          <Avatar className="h-14 w-14 shrink-0 border-2 border-violet-500/30">
            <AvatarImage src={avatarUrl} alt={displayName} />
            <AvatarFallback className="text-lg font-semibold text-violet-500 bg-violet-100 dark:bg-violet-500/15">
              {initialsOf(fullName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white truncate">
              {partOfDay()}, {displayName}
            </h1>
            {meta && <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400 truncate">{meta}</p>}
          </div>
        </div>
        {product && (
          <div className="text-right">
            <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">{product}</div>
            {subtitle && <div className="text-xs text-slate-400 dark:text-slate-500 max-w-xs">{subtitle}</div>}
          </div>
        )}
      </div>
    </div>
  );
}
