"use client";

import { useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { sanitizeEmail, sanitizeTextInput } from "@/lib/utils/sanitize";

/**
 * LoginScreen — Premium multi-user authentication gateway.
 *
 * This is a robust client-side mockup. On "Sign In" it persists a dummy
 * session to localStorage so the user stays logged in across refreshes.
 * The parent component checks `localStorage.getItem("compass_session")`
 * to decide whether to show this screen or the main dashboard.
 */

interface LoginScreenProps {
  onLogin: () => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Rate-limiting: max 5 attempts per 60 seconds
  const attemptsRef = useRef<number[]>([]);
  const MAX_ATTEMPTS = 5;
  const WINDOW_MS = 60_000;

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setError("");

      // Rate limiting
      const now = Date.now();
      attemptsRef.current = attemptsRef.current.filter((t) => now - t < WINDOW_MS);
      if (attemptsRef.current.length >= MAX_ATTEMPTS) {
        setError("Too many attempts. Please wait a moment.");
        return;
      }
      attemptsRef.current.push(now);

      // Input validation
      const sanitizedEmail = sanitizeEmail(email);
      const sanitizedPassword = sanitizeTextInput(password, 128);

      if (!sanitizedEmail) {
        setError("Please enter a valid email address.");
        return;
      }
      if (!sanitizedPassword || sanitizedPassword.length < 1) {
        setError("Please enter your password.");
        return;
      }

      setIsLoading(true);

      // Simulate network delay for premium feel
      setTimeout(() => {
        const session = {
          email: sanitizedEmail,
          displayName: sanitizedEmail.split("@")[0] || "User",
          loginAt: new Date().toISOString(),
          rememberMe,
        };

        if (rememberMe) {
          localStorage.setItem("compass_session", JSON.stringify(session));
        } else {
          sessionStorage.setItem("compass_session", JSON.stringify(session));
        }

        setIsLoading(false);
        onLogin();
      }, 800);
    },
    [email, password, rememberMe, onLogin]
  );

  return (
    <div className="flex min-h-screen items-center justify-center px-5">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-sm"
      >
        {/* Brand header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center">
            <svg
              width={48}
              height={48}
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="12" cy="12" r="10.5" stroke="#F0B429" strokeWidth="0.5" opacity="0.5" />
              <line x1="12" y1="1.5" x2="12" y2="3.2" stroke="#F0B429" strokeWidth="0.7" opacity="0.6" strokeLinecap="round" />
              <line x1="22.5" y1="12" x2="20.8" y2="12" stroke="#F0B429" strokeWidth="0.7" opacity="0.6" strokeLinecap="round" />
              <line x1="12" y1="22.5" x2="12" y2="20.8" stroke="#F0B429" strokeWidth="0.7" opacity="0.6" strokeLinecap="round" />
              <line x1="1.5" y1="12" x2="3.2" y2="12" stroke="#F0B429" strokeWidth="0.7" opacity="0.6" strokeLinecap="round" />
              <polygon points="11,11 15.8,8.2 13,13" fill="#F0B429" />
              <polygon points="13,13 8.2,15.8 11,11" fill="#8B6914" />
              <circle cx="12" cy="12" r="1.1" fill="#F0B429" />
            </svg>
          </div>
          <h1 className="font-display text-2xl font-semibold text-ink">
            Compass Finance
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Sign in to your command center
          </p>
        </div>

        {/* Login card */}
        <form onSubmit={handleSubmit} className="aero-glass-glow p-6">
          {/* Email field */}
          <div className="mb-4">
            <label
              htmlFor="login-email"
              className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-muted"
            >
              Email
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-border bg-bg px-4 py-3 text-sm text-ink placeholder-ink-faint transition focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold/30"
            />
          </div>

          {/* Password field */}
          <div className="mb-4">
            <label
              htmlFor="login-password"
              className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-muted"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-border bg-bg px-4 py-3 pr-11 text-sm text-ink placeholder-ink-faint transition focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold/30"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint transition hover:text-ink-muted"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Remember me toggle */}
          <div className="mb-5 flex items-center justify-between">
            <label
              htmlFor="remember-me"
              className="flex cursor-pointer items-center gap-2 text-xs text-ink-muted"
            >
              <div className="relative">
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="h-5 w-9 rounded-full border border-border bg-bg transition peer-checked:border-gold peer-checked:bg-gold/20" />
                <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-ink-faint transition peer-checked:translate-x-4 peer-checked:bg-gold" />
              </div>
              Remember me
            </label>
            <button
              type="button"
              className="text-xs text-gold/70 transition hover:text-gold"
            >
              Forgot password?
            </button>
          </div>

          {/* Error message */}
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 text-center text-xs text-coral"
            >
              {error}
            </motion.p>
          )}

          {/* Sign in button */}
          <button
            type="submit"
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold py-3.5 font-display font-semibold text-bg transition hover:bg-gold/90 active:scale-[0.98] disabled:opacity-60"
          >
            {isLoading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-bg border-t-transparent" />
            ) : (
              <>
                <LogIn size={18} />
                Sign In
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-ink-faint">
          Don&apos;t have an account?{" "}
          <button
            type="button"
            className="font-medium text-gold/70 transition hover:text-gold"
          >
            Create one
          </button>
        </p>
      </motion.div>
    </div>
  );
}
