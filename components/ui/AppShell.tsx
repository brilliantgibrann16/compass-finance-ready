"use client";

import { useState, useEffect, useCallback } from "react";
import { SplashScreen } from "@/components/ui/SplashScreen";
import { LoginScreen } from "@/components/ui/LoginScreen";

/**
 * AppShell — Global app state orchestrator.
 *
 * Controls the launch sequence:
 *   1. SplashScreen  (2.5s opening animation)
 *   2. LoginScreen   (if no session found in storage)
 *   3. Children      (main app dashboard)
 *
 * Session is stored in localStorage (remember me) or sessionStorage.
 */

type AppPhase = "splash" | "login" | "app";

function hasSession(): boolean {
  if (typeof window === "undefined") return false;
  return !!(
    localStorage.getItem("compass_session") ||
    sessionStorage.getItem("compass_session")
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<AppPhase>("splash");

  const handleSplashFinished = useCallback(() => {
    // After splash, check if user is already authenticated
    if (hasSession()) {
      setPhase("app");
    } else {
      setPhase("login");
    }
  }, []);

  const handleLogin = useCallback(() => {
    setPhase("app");
  }, []);

  // Failsafe: if localStorage has a session and we're somehow stuck on login
  useEffect(() => {
    if (phase === "login" && hasSession()) {
      setPhase("app");
    }
  }, [phase]);

  return (
    <>
      {phase === "splash" && (
        <SplashScreen onFinished={handleSplashFinished} />
      )}

      {phase === "login" && <LoginScreen onLogin={handleLogin} />}

      {phase === "app" && <>{children}</>}
    </>
  );
}
