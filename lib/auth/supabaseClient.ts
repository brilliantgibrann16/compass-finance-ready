/**
 * Supabase Client — Authentication & Database Backend
 *
 * To activate Supabase integration:
 * 1. Install: npm install @supabase/supabase-js
 * 2. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local
 * 3. Enable Google OAuth in Supabase Auth settings
 *
 * When the package is not installed or env vars are not set,
 * the app falls back to localStorage-based mock auth.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { createClient } from "@supabase/supabase-js";

let supabaseInstance: any = undefined;
const RESOLVED = Symbol("resolved");

function createSupabaseClient(): any {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return null;
  try {
    return createClient(url, key);
  } catch {
    return null;
  }
}

export async function getSupabase(): Promise<any> {
  if (supabaseInstance === undefined) {
    supabaseInstance = createSupabaseClient() ?? RESOLVED;
  }
  return supabaseInstance === RESOLVED ? null : supabaseInstance;
}

export function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

// ── Public (publishable) config — safe to ship in the client bundle ──────
// NOTE: the anon key is a *public* publishable key. It is NOT a secret and is
// safe to expose. Provider secrets (e.g. the Bynara model key) must NEVER be
// placed in NEXT_PUBLIC_* — they live only inside Supabase Edge Functions.

export function getSupabaseUrl(): string {
  return (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim().replace(/\/$/, "");
}

export function getSupabaseAnonKey(): string {
  return (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
}

/** URL of a deployed Supabase Edge Function by name (empty string if unconfigured). */
export function getEdgeFunctionUrl(name: string): string {
  const base = getSupabaseUrl();
  if (!base) return "";
  return `${base}/functions/v1/${name}`;
}

/**
 * Resolve the current user's Supabase access token (JWT) for authenticated
 * requests to Edge Functions / PostgREST. Falls back to the public anon key
 * when no session exists so unauthenticated reads still work where allowed.
 * Returns an empty string only when Supabase is not configured at all.
 */
export async function getAccessToken(): Promise<string> {
  if (!isSupabaseConfigured()) return "";
  try {
    const supabase = await getSupabase();
    if (supabase) {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      if (token) return token as string;
    }
  } catch {
    // Session lookup failed — fall back to the public anon key below.
  }
  return getSupabaseAnonKey();
}
