/**
 * Single source of truth for the signed-in user.
 *
 * App owns the state (and persists it to localStorage); everything below reads
 * it through useUser() instead of parsing localStorage ad hoc. updateUser()
 * patches the user in place — avatar, name, plan changes, etc. propagate to the
 * navbar, sidebars and route guards instantly, no page reload required.
 *
 * `role` here is the **effective** role, not the stored one. A system admin can
 * preview the product as another role; if that preview left admin-only pages
 * visible it wouldn't be a preview. Every gate reads this one value, so the
 * sidebar, the routes and each page can't disagree about who the viewer is.
 */
import { createContext, useContext, useMemo } from "react";
import { isAdminRole } from "../lib/access";

const UserContext = createContext(null);

export function readStoredUser() {
  try { return JSON.parse(localStorage.getItem("user")) || null; } catch { return null; }
}

export function UserProvider({ user, setUser, effectiveRole, children }) {
  const value = useMemo(() => {
    const role = effectiveRole ?? user?.role ?? null;
    return {
      user,
      setUser,
      role,
      isAdmin: isAdminRole(role),
      updateUser: (patch) => setUser((u) => (u ? { ...u, ...patch } : u)),
    };
  }, [user, setUser, effectiveRole]);
  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (ctx) return ctx;
  // Fallback for anything rendered outside the provider (defensive only).
  const stored = readStoredUser();
  return {
    user: stored,
    setUser: () => {},
    updateUser: () => {},
    role: stored?.role ?? null,
    isAdmin: isAdminRole(stored?.role),
  };
}
