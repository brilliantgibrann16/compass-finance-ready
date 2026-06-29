"use client";

import { useEffect, useState, useCallback } from "react";
import { CapacitorUpdater } from "@capgo/capacitor-updater";
import { Mail, RefreshCcw, LogOut } from "lucide-react";
import { SplashScreen } from "@/components/ui/SplashScreen";
import { LoginScreen } from "@/components/ui/LoginScreen";
import { useAuthContext } from "@/lib/auth/AuthContext";
import { resendVerificationEmail } from "@/lib/auth/useAuth";

/**
 * AppShell — Global app state orchestrator.
 *
 * Launch sequence:
 *   1. SplashScreen   (≤2.5s opening animation)
 *   2. LoginScreen    (status === "unauthenticated")
 *   3. Verify gate    (status === "unverified") — blocks dashboard access
 *      until the user confirms their email
 *   4. Children       (status === "authenticated")
 *
 * Auth state is driven entirely by AuthContext, which subscribes to
 * Supabase `onAuthStateChange` (or the localStorage fallback). That means
 * sign-out anywhere in the app collapses this gate back to LoginScreen
 * automatically.
 */

export function AppShell({ children }: { children: React.ReactNode }) {
  const { status, session, refresh, logout } = useAuthContext();
  const [splashDone, setSplashDone] = useState(false);

  const handleSplashFinished = useCallback(() => setSplashDone(true), []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    void CapacitorUpdater.notifyAppReady().catch(() => {
      // Ignore web/runtime failures so the native readiness signal stays safe.
    });
  }, []);

  // Surface the splash for at most one auth-resolution cycle. After the
  // initial mount, status leaves "loading" and we stop showing it.
  useEffect(() => {
    if (status !== "loading" && !splashDone) {
      // Splash component already runs on its own timer; nothing to do here.
    }
  }, [status, splashDone]);

  if (!splashDone || status === "loading") {
    return <SplashScreen onFinished={handleSplashFinished} />;
  }

  if (status === "unauthenticated") {
    // Successful login flips status via AuthContext.refresh; we don't need an
    // onLogin callback to mutate local state any more.
    return <LoginScreen onLogin={() => void refresh()} />;
  }

  if (status === "unverified") {
    return <VerifyEmailGate email={session?.email ?? ""} onSignOut={logout} />;
  }

  return <>{children}</>;
}

// ---------------------------------------------------------------------------
// Verify-email gate
// ---------------------------------------------------------------------------

function VerifyEmailGate({
  email,
  onSignOut,
}: {
  email: string;
  onSignOut: () => Promise<void>;
}) {
  const { refresh } = useAuthContext();
  const [busy, setBusy] = useState<"resend" | "check" | "out" | null>(null);
  const [notice, setNotice] = useState<string>("");

  const handleResend = useCallback(async () => {
    setBusy("resend");
    setNotice("");
    const result = await resendVerificationEmail(email);
    setBusy(null);
    setNotice(
      result.success
        ? "Verification email sent. Check your inbox (and spam folder)."
        : result.error || "Could not resend verification email.",
    );
  }, [email]);

  const handleCheck = useCallback(async () => {
    setBusy("check");
    await refresh();
    setBusy(null);
  }, [refresh]);

  const handleOut = useCallback(async () => {
    setBusy("out");
    await onSignOut();
  }, [onSignOut]);

  return (
    <div className="flex min-h-screen items-center justify-center px-5">
      <div className="aero-glass-glow w-full max-w-sm p-6">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gold/10">
          <Mail size={28} className="text-gold" />
        </div>
        <h1 className="text-center font-display text-xl font-semibold text-ink">
          Verify your email
        </h1>
        <p className="mt-2 text-center text-sm text-ink-muted">
          We sent a verification link to{" "}
          <span className="font-medium text-ink">{email || "your inbox"}</span>.
          Click it to unlock your dashboard.
        </p>

        {notice && (
          <p className="mt-4 rounded-lg border border-border-soft bg-bg/40 px-3 py-2 text-center text-xs text-ink-muted">
            {notice}
          </p>
        )}

        <div className="mt-5 space-y-2">
          <button
            type="button"
            onClick={handleCheck}
            disabled={busy !== null}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold py-3 font-display text-sm font-semibold text-bg transition hover:bg-gold/90 active:scale-[0.98] disabled:opacity-60"
          >
            <RefreshCcw size={16} className={busy === "check" ? "animate-spin" : ""} />
            I&rsquo;ve verified — check again
          </button>
          <button
            type="button"
            onClick={handleResend}
            disabled={busy !== null}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-border-soft py-3 text-sm font-medium text-ink-muted transition hover:border-gold/30 hover:text-ink disabled:opacity-60"
          >
            <Mail size={16} />
            {busy === "resend" ? "Sending…" : "Resend verification email"}
          </button>
          <button
            type="button"
            onClick={handleOut}
            disabled={busy !== null}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-coral/20 bg-coral/5 py-3 text-sm font-medium text-coral transition hover:bg-coral/10 disabled:opacity-60"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
