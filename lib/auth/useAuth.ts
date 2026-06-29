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

// ── Local credential validation (mock-mode safety net) ────────────────
// When Supabase isn't configured we must NOT silently accept any email/password
// pair — that's the original "bypass" bug. We instead require:
//   1) a syntactically valid email,
//   2) a password ≥ 8 chars,
//   3) that the password matches what was registered for that email locally.
// Registered credentials live in localStorage under MOCK_USERS_KEY; the
// password is stored as a SHA-256 hex digest, not in clear text.

const MOCK_USERS_KEY = "compass_mock_users";
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface MockUserRecord {
  email: string;
  displayName: string;
  passwordHash: string;
  emailVerified: boolean;
  createdAt: string;
}

async function sha256Hex(input: string): Promise<string> {
  if (typeof window !== "undefined" && window.crypto?.subtle) {
    const buf = await window.crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(input),
    );
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  // Last-resort fallback: deterministic, non-cryptographic digest. Mock mode only.
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) | 0;
  }
  return `fb_${(h >>> 0).toString(16)}`;
}

function readMockUsers(): Record<string, MockUserRecord> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(MOCK_USERS_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeMockUsers(users: Record<string, MockUserRecord>): void {
  localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(users));
}

export async function signInWithEmail(
  email: string,
  password: string,
  rememberMe: boolean,
): Promise<{ success: boolean; error?: string; needsVerification?: boolean }> {
  const cleanEmail = email.trim().toLowerCase();
  if (!EMAIL_REGEX.test(cleanEmail)) {
    return { success: false, error: "Please enter a valid email address." };
  }
  if (!password || password.length < 8) {
    return { success: false, error: "Password must be at least 8 characters." };
  }

  if (isSupabaseConfigured()) {
    const supabase = await getSupabase();
    if (supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });
      if (error) return { success: false, error: error.message };
      const user = data.user;
      const emailConfirmed = !!(user?.email_confirmed_at || user?.confirmed_at);
      saveSession({
        email: user?.email || cleanEmail,
        displayName: String(user?.user_metadata?.full_name || cleanEmail.split("@")[0] || "User"),
        avatarUrl: user?.user_metadata?.avatar_url || generateAvatarUrl(cleanEmail),
        loginAt: new Date().toISOString(),
        rememberMe,
        provider: "email",
      });
      if (!emailConfirmed) {
        return {
          success: false,
          needsVerification: true,
          error: "Please verify your email before signing in. Check your inbox.",
        };
      }
      return { success: true };
    }
  }

  // ── Mock fallback: validate against locally-registered credentials ──
  const users = readMockUsers();
  const record = users[cleanEmail];
  if (!record) {
    return { success: false, error: "No account found for this email." };
  }
  const hash = await sha256Hex(password);
  if (hash !== record.passwordHash) {
    return { success: false, error: "Incorrect email or password." };
  }
  if (!record.emailVerified) {
    return {
      success: false,
      needsVerification: true,
      error: "Please verify your email before signing in. (Mock mode: open the dev console and call window.__compassVerify('"+cleanEmail+"'))",
    };
  }
  const session: UserSession = {
    email: cleanEmail,
    displayName: record.displayName || cleanEmail.split("@")[0] || "User",
    avatarUrl: generateAvatarUrl(record.displayName || cleanEmail),
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
): Promise<{ success: boolean; error?: string; needsVerification?: boolean }> {
  const cleanEmail = email.trim().toLowerCase();
  if (!EMAIL_REGEX.test(cleanEmail)) {
    return { success: false, error: "Please enter a valid email address." };
  }
  if (!password || password.length < 8) {
    return { success: false, error: "Password must be at least 8 characters." };
  }

  if (isSupabaseConfigured()) {
    const supabase = await getSupabase();
    if (supabase) {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: { full_name: displayName },
          emailRedirectTo:
            typeof window !== "undefined" ? `${window.location.origin}/` : undefined,
        },
      });
      if (error) return { success: false, error: error.message };
      const user = data.user;
      // Supabase returns a session only when email confirmation is disabled.
      // If `data.session` is null, an email has been dispatched and we must
      // BLOCK login until the user clicks the verification link.
      if (!data.session) {
        return {
          success: false,
          needsVerification: true,
          error: "Account created. Check your inbox to verify your email.",
        };
      }
      saveSession({
        email: user?.email || cleanEmail,
        displayName: String(displayName || user?.user_metadata?.full_name || cleanEmail.split("@")[0] || "User"),
        avatarUrl: user?.user_metadata?.avatar_url || generateAvatarUrl(String(displayName || cleanEmail)),
        loginAt: new Date().toISOString(),
        rememberMe,
        provider: "email",
      });
      return { success: true };
    }
  }

  // ── Mock fallback: persist hashed credentials with emailVerified=false ──
  const users = readMockUsers();
  if (users[cleanEmail]) {
    return { success: false, error: "An account with this email already exists." };
  }
  const passwordHash = await sha256Hex(password);
  users[cleanEmail] = {
    email: cleanEmail,
    displayName: displayName.trim() || cleanEmail.split("@")[0] || "User",
    passwordHash,
    emailVerified: false,
    createdAt: new Date().toISOString(),
  };
  writeMockUsers(users);

  // Expose a dev-only verification helper so the user can complete the flow
  // without a live email provider. Production paths (Supabase) handle this
  // through the real verification link.
  if (typeof window !== "undefined") {
    (window as unknown as { __compassVerify?: (e: string) => boolean }).__compassVerify = (
      target: string,
    ) => verifyMockEmail(target);
  }

  return {
    success: false,
    needsVerification: true,
    error:
      "Account created. Verify your email to sign in. (Mock mode: run window.__compassVerify('" +
      cleanEmail +
      "') in the console.)",
  };
}

/** Mock-mode email verification — flips `emailVerified` for the local user. */
export function verifyMockEmail(email: string): boolean {
  const cleanEmail = email.trim().toLowerCase();
  const users = readMockUsers();
  const record = users[cleanEmail];
  if (!record) return false;
  record.emailVerified = true;
  writeMockUsers(users);
  return true;
}

/** Whether the currently-stored mock user has verified their email. */
export function isMockEmailVerified(email: string): boolean {
  return !!readMockUsers()[email.trim().toLowerCase()]?.emailVerified;
}

export async function signInWithGoogle(): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      error:
        "Google Sign-In is unavailable: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set, and the Google provider must be enabled in Supabase Auth.",
    };
  }
  const supabase = await getSupabase();
  if (!supabase) {
    return {
      success: false,
      error:
        "Supabase client failed to load. Run `npm install @supabase/supabase-js` and reload.",
    };
  }
  // Round-trip to Google then back to the app root, where AuthContext picks
  // up the session via onAuthStateChange.
  const redirectTo =
    typeof window !== "undefined" ? `${window.location.origin}/` : undefined;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      queryParams: { access_type: "offline", prompt: "consent" },
    },
  });
  if (error) return { success: false, error: error.message };
  // The browser is redirected away by Supabase — control rarely returns here.
  return { success: true };
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
  // Mock fallback — surface the request without leaking which emails exist.
  return { success: true };
}

export async function resendVerificationEmail(
  email: string,
): Promise<{ success: boolean; error?: string }> {
  if (isSupabaseConfigured()) {
    const supabase = await getSupabase();
    if (supabase) {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email.trim().toLowerCase(),
      });
      if (error) return { success: false, error: error.message };
      return { success: true };
    }
  }
  return { success: true };
}

export async function signOut(): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = await getSupabase();
    if (supabase) {
      await supabase.auth.signOut().catch(() => {});
    }
  }
  clearSession();
}
