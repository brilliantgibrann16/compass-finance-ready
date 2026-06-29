"use client";

/**
 * AuthContext — Global authentication state.
 *
 * Single source of truth for session/user/email-verification. Subscribes to
 * Supabase `onAuthStateChange` when configured; otherwise reads the
 * localStorage / sessionStorage fallback session that signInWithEmail writes.
 *
 * Routes that need gating consume `useAuthContext()` (or wait for AppShell to
 * gate the whole subtree on `status`).
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  getSupabase,
  isSupabaseConfigured,
} from "@/lib/auth/supabaseClient";
import {
  clearSession,
  generateAvatarUrl,
  getSession,
  saveSession,
  type UserSession,
} from "@/lib/auth/useAuth";

export type AuthStatus = "loading" | "authenticated" | "unverified" | "unauthenticated";

interface AuthContextValue {
  status: AuthStatus;
  session: UserSession | null;
  /** Underlying Supabase user (when configured) — useful for `email_confirmed_at` checks. */
  supabaseUser: any | null;
  /** True only when Supabase is configured AND the email is verified, OR when running in mock mode with a session. */
  isVerified: boolean;
  /** Re-read the session from storage / Supabase. Called after sign-in flows. */
  refresh: () => Promise<void>;
  /** Sign the user out and clear all local session storage. */
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readMockSession(): UserSession | null {
  return getSession();
}

function deriveStatus(
  session: UserSession | null,
  supaUser: any | null,
  supaConfigured: boolean,
): AuthStatus {
  if (!session) return "unauthenticated";
  // When Supabase is configured we MUST require email verification.
  if (supaConfigured) {
    if (!supaUser) return "unauthenticated";
    const confirmed = !!(supaUser.email_confirmed_at || supaUser.confirmed_at);
    return confirmed ? "authenticated" : "unverified";
  }
  // Mock mode: presence of a session is the authoritative signal.
  return "authenticated";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<UserSession | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<any | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const supaConfigured = isSupabaseConfigured();
  const mountedRef = useRef(false);

  const applyState = useCallback(
    (nextSession: UserSession | null, nextSupa: any | null) => {
      setSession(nextSession);
      setSupabaseUser(nextSupa);
      setStatus(deriveStatus(nextSession, nextSupa, supaConfigured));
    },
    [supaConfigured],
  );

  const refresh = useCallback(async () => {
    if (supaConfigured) {
      const supabase = await getSupabase();
      if (supabase) {
        const { data } = await supabase.auth.getSession();
        const supaUser = data?.session?.user ?? null;
        if (supaUser) {
          const stored = readMockSession() ?? {
            email: supaUser.email ?? "",
            displayName: String(
              supaUser.user_metadata?.full_name ||
                supaUser.email?.split("@")[0] ||
                "User",
            ),
            avatarUrl:
              supaUser.user_metadata?.avatar_url ||
              generateAvatarUrl(supaUser.email ?? "user"),
            loginAt: new Date().toISOString(),
            rememberMe: true,
            provider:
              supaUser.app_metadata?.provider === "google" ? "google" : "email",
          };
          // Persist the canonical mirror so other code paths see it.
          saveSession(stored);
          applyState(stored, supaUser);
          return;
        }
        applyState(null, null);
        return;
      }
    }
    // Fallback: trust the local mirror only.
    applyState(readMockSession(), null);
  }, [supaConfigured, applyState]);

  const logout = useCallback(async () => {
    if (supaConfigured) {
      const supabase = await getSupabase();
      if (supabase) {
        await supabase.auth.signOut().catch(() => {});
      }
    }
    clearSession();
    applyState(null, null);
  }, [supaConfigured, applyState]);

  useEffect(() => {
    mountedRef.current = true;
    let unsubscribe: (() => void) | undefined;

    (async () => {
      await refresh();
      if (!supaConfigured) return;
      const supabase = await getSupabase();
      if (!supabase || !mountedRef.current) return;
      const { data } = supabase.auth.onAuthStateChange(
        (_event: string, supaSession: any) => {
          const supaUser = supaSession?.user ?? null;
          if (!supaUser) {
            clearSession();
            applyState(null, null);
            return;
          }
          // Mirror to local session for legacy reads.
          const stored: UserSession = {
            email: supaUser.email ?? "",
            displayName: String(
              supaUser.user_metadata?.full_name ||
                supaUser.email?.split("@")[0] ||
                "User",
            ),
            avatarUrl:
              supaUser.user_metadata?.avatar_url ||
              generateAvatarUrl(supaUser.email ?? "user"),
            loginAt: new Date().toISOString(),
            rememberMe: true,
            provider:
              supaUser.app_metadata?.provider === "google" ? "google" : "email",
          };
          saveSession(stored);
          applyState(stored, supaUser);
        },
      );
      unsubscribe = () => data?.subscription?.unsubscribe?.();
    })();

    return () => {
      mountedRef.current = false;
      unsubscribe?.();
    };
  }, [refresh, supaConfigured, applyState]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      session,
      supabaseUser,
      isVerified: status === "authenticated",
      refresh,
      logout,
    }),
    [status, session, supabaseUser, refresh, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuthContext must be used inside <AuthProvider>");
  }
  return ctx;
}
