"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase, isSupabaseConfigured } from "@/lib/auth/supabaseClient";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Redirecting...");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleCallback = async () => {
      if (!isSupabaseConfigured()) {
        router.replace("/");
        return;
      }

      const supabase = await getSupabase();
      if (!supabase) {
        router.replace("/");
        return;
      }

      try {
        const { data, error } = await supabase.auth.getSessionFromUrl({ storeSession: true });
        if (error) {
          setMessage("Authentication callback failed. Redirecting to home...");
          window.setTimeout(() => router.replace("/"), 1200);
          return;
        }
        if (data?.session) {
          router.replace("/");
          return;
        }
      } catch {
        setMessage("Authentication callback failed. Redirecting to home...");
        window.setTimeout(() => router.replace("/"), 1200);
      }
    };

    void handleCallback();
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
      <p className="max-w-md rounded-xl border border-white/10 bg-slate-900/80 p-6 text-center text-sm text-white/90">
        {message}
      </p>
    </div>
  );
}
