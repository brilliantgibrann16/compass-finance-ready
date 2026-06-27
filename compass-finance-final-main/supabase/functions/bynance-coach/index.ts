// Supabase Edge Function: bynance-coach
// Secure server-side proxy for the AI coach. Holds the provider secret and
// validates the caller's Supabase JWT so only authenticated users can spend
// AI tokens. The client never sees the provider key or talks to the provider.

import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function languageInstruction(locale: string): string {
  if (locale === "id") return "Respond in Bahasa Indonesia with a warm, professional youth tone.";
  if (locale === "es") return "Respond in Spanish.";
  if (locale === "ar") return "Respond in Arabic.";
  return "Respond in English.";
}

