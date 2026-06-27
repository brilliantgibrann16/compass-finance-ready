"use client";

import { getSupabase, isSupabaseConfigured } from "./supabaseClient";

/**
 * Auth utilities — Supabase with localStorage fallback.
 *
 * When Supabase is not configured (no env vars), all auth operations
 * fall back to localStorage-based mock sessions — zero cost, no external
 * dependencies.
 */

export interface UserSession {
  email: string;
  displayName: string;
  avatarUrl?: string;
  loginAt: string;
  rememberMe: boolean;
  provider: "email" | "google" | "mock";
}

const SESSION_KEY = "compass_session";

// ── Avatar Generation ─────────────────────────────────────────────────
export function generateAvatarUrl(name: string): string {
  // Generate a deterministic color from the name
  const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const hue = hash % 360;
  const initials = name
    .split(/[\s@]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("");

  // Return a data URI SVG avatar
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
    <rect width="96" height="96" rx="48" fill="hsl(${hue}, 60%, 45%)"/>
    <text x="48" y="48" dy="0.35em" text-anchor="middle" fill="white" font-family="Inter, sans-serif" font-size="36" font-weight="600">${initials}</text>
  </svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

// ── Session Management ────────────────────────────────────────────────
export function getSession(): UserSession | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserSession;
  } catch {
    return null;
  }
}

export function saveSession(session: UserSession): void {
  const raw = JSON.stringify(session);
  if (session.rememberMe) {
    localStorage.setItem(SESSION_KEY, raw);
  } else {
    sessionStorage.setItem(SESSION_KEY, raw);
  }
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(SESSION_KEY);
}

// ── Auth Actions ──────────────────────────────────────────────────────

export async function signInWithEmail(
  email: string,
  password: string,
  rememberMe: boolean,
): Promise<{ success: boolean; error?: string }> {
  if (isSupabaseConfigured()) {
    const supabase = await getSupabase();
    if (supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { success: false, error: error.message };
      const user = data.user;
      saveSession({
        email: user?.email || email,
        displayName: String(user?.user_metadata?.full_name || email.split("@")[0] || "User"),
        avatarUrl: user?.user_metadata?.avatar_url || generateAvatarUrl(email),
        loginAt: new Date().toISOString(),
        rememberMe,
        provider: "email",
      });
      return { success: true };
    }
  }

  // Mock auth fallback
  const session: UserSession = {
    email: email.trim(),
    displayName: email.split("@")[0] || "User",
    avatarUrl: generateAvatarUrl(email),
    loginAt: new Date().toISOString(),
    rememberMe,
    provider: "mock",
  };
  saveSession(session);
  return { success: true };
}

export async function signUpWithEmail(
  email: string,
  password: string,
  displayName: string,
  rememberMe: boolean,
): Promise<{ success: boolean; error?: string }> {
  if (isSupabaseConfigured()) {
    const supabase = await getSupabase();
    if (supabase) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: displayName } },
      });
      if (error) return { success: false, error: error.message };
      const user = data.user;
      saveSession({
        email: user?.email || email,
        displayName: String(displayName || user?.user_metadata?.full_name || email.split("@")[0] || "User"),
        avatarUrl: user?.user_metadata?.avatar_url || generateAvatarUrl(String(displayName || email)),
        loginAt: new Date().toISOString(),
        rememberMe,
        provider: "email",
      });
      return { success: true };
    }
  }

  // Mock auth fallback
  const session: UserSession = {
    email: email.trim(),
    displayName: displayName || email.split("@")[0] || "User",
    avatarUrl: generateAvatarUrl(displayName || email),
    loginAt: new Date().toISOString(),
    rememberMe,
    provider: "mock",
  };
  saveSession(session);
  return { success: true };
}

export async function signInWithGoogle(): Promise<{ success: boolean; error?: string }> {
  if (isSupabaseConfigured()) {
    const supabase = await getSupabase();
    if (supabase) {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
      if (error) return { success: false, error: error.message };
      return { success: true };
    }
  }
  return { success: false, error: "Google Sign-In requires Supabase configuration." };
}

export async function resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
  if (isSupabaseConfigured()) {
    const supabase = await getSupabase();
    if (supabase) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/`,
      });
      if (error) return { success: false, error: error.message };
      return { success: true };
    }
  }
  // Mock fallback
  return { success: true };
}

export async function signOut(): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = await getSupabase();
    if (supabase) {
      await supabase.auth.signOut();
    }
  }
  clearSession();
}
