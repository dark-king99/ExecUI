/**
 * Single source of truth for the signed-in user.
 *
 * App owns the state (and persists it to localStorage); everything below reads
 * it through useUser() instead of parsing localStorage ad hoc. updateUser()
 * patches the user in place — avatar, name, plan changes, etc. propagate to the
 * navbar, sidebars and route guards instantly, no page reload required.
 */
import { createContext, useContext, useMemo } from "react";

const UserContext = createContext(null);

export function readStoredUser() {
  try { return JSON.parse(localStorage.getItem("user")) || null; } catch { return null; }
}

export function UserProvider({ user, setUser, children }) {
  const value = useMemo(() => ({
    user,
    setUser,
    updateUser: (patch) => setUser((u) => (u ? { ...u, ...patch } : u)),
  }), [user, setUser]);
  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const ctx = useContext(UserContext);
  // Fallback for anything rendered outside the provider (defensive only).
  return ctx ?? { user: readStoredUser(), setUser: () => {}, updateUser: () => {} };
}
