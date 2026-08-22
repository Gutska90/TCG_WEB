import { createContext, createElement, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { AuthTokens, MeView } from "@tcg/types";
import { api, persistTokens, refreshSession } from "./api";
import { track } from "./analytics";
import { clearSessionTokens, getRefreshToken } from "./session";

type AuthState = {
  ready: boolean;
  me: MeView | null;
  signIn: (tokens: AuthTokens) => Promise<MeView>;
  reloadMe: () => Promise<MeView | null>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [me, setMe] = useState<MeView | null>(null);

  async function reloadMe(): Promise<MeView | null> {
    try {
      const next = await api<MeView>("/v1/me");
      setMe(next);
      return next;
    } catch {
      setMe(null);
      return null;
    }
  }

  async function signIn(tokens: AuthTokens): Promise<MeView> {
    await persistTokens(tokens);
    const next = await api<MeView>("/v1/me");
    setMe(next);
    track("login_success");
    return next;
  }

  async function signOut(): Promise<void> {
    try {
      await api("/v1/auth/logout", { method: "POST" });
    } catch {
      // Always clear local credentials.
    } finally {
      await clearSessionTokens();
      setMe(null);
    }
  }

  useEffect(() => {
    void (async () => {
      const refresh = await getRefreshToken();
      if (refresh) {
        const ok = await refreshSession();
        if (ok) await reloadMe();
      }
      setReady(true);
    })();
  }, []);

  const value = useMemo<AuthState>(
    () => ({ ready, me, signIn, reloadMe, signOut }),
    [ready, me],
  );

  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth outside AuthProvider");
  return ctx;
}
