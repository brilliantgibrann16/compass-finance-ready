"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, LogIn, UserPlus, Mail, ArrowLeft } from "lucide-react";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import {
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle,
  resetPassword,
} from "@/lib/auth/useAuth";

/**
 * LoginScreen — Premium multi-user authentication gateway.
 *
 * Supports three views: sign-in, create-account, forgot-password.
 * Integrates with Supabase when configured, falls back to localStorage mock auth.
 */

interface LoginScreenProps {
  onLogin: () => void;
}

type AuthView = "signin" | "register" | "forgot";

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const { t } = useTranslation();
  const [view, setView] = useState<AuthView>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showRegisterPwd, setShowRegisterPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleSignIn = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");
      setSuccessMsg("");
      if (!email.trim() || !password.trim()) {
        setError(t("enterEmailAndPassword"));
        return;
      }
      setIsLoading(true);
      const result = await signInWithEmail(email.trim(), password, rememberMe);
      setIsLoading(false);
      if (result.success) {
        onLogin();
        return;
      }
      // Verification-required errors are informational, not failures.
      if (result.needsVerification) {
        setSuccessMsg(result.error || "Please verify your email before signing in.");
        // AuthContext picks up the partial session and AppShell flips to the
        // VerifyEmailGate automatically — nothing else to do here.
        onLogin();
        return;
      }
      setError(result.error || "Sign in failed");
    },
    [email, password, rememberMe, onLogin, t],
  );

  const handleRegister = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");
      setSuccessMsg("");
      if (!email.trim() || !password.trim()) {
        setError(t("enterEmailAndPassword"));
        return;
      }
      if (password.length < 8) {
        setError("Password must be at least 8 characters.");
        return;
      }
      if (password !== confirmPwd) {
        setError(t("passwordsDoNotMatch"));
        return;
      }
      setIsLoading(true);
      const result = await signUpWithEmail(email.trim(), password, displayName.trim(), rememberMe);
      setIsLoading(false);
      if (result.success) {
        onLogin();
        return;
      }
      if (result.needsVerification) {
        // Send the user back to the sign-in view with a verification notice
        // — they cannot enter the app until they click the email link.
        setSuccessMsg(result.error || "Account created. Check your inbox to verify your email.");
        setView("signin");
        setPassword("");
        setConfirmPwd("");
        return;
      }
      setError(result.error || "Registration failed");
    },
    [email, password, confirmPwd, displayName, rememberMe, onLogin, t],
  );

  const handleForgotPassword = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");
      if (!email.trim()) {
        setError(t("enterEmail"));
        return;
      }
      setIsLoading(true);
      const result = await resetPassword(email.trim());
      setIsLoading(false);
      if (result.success) {
        setSuccessMsg(t("resetEmailSent"));
      } else {
        setError(result.error || "Reset failed");
      }
    },
    [email, t],
  );

  const handleGoogleSignIn = useCallback(async () => {
    setError("");
    setIsLoading(true);
    const result = await signInWithGoogle();
    setIsLoading(false);
    if (!result.success) {
      // For mock mode, silently fall back to regular sign-in
      setError(result.error || "");
    }
  }, []);

  const switchView = (newView: AuthView) => {
    setView(newView);
    setError("");
    setSuccessMsg("");
  };

  const inputClass =
    "w-full rounded-xl border border-border bg-bg px-4 py-3 text-sm text-ink placeholder-ink-faint transition focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold/30";

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
            {view === "signin" && t("signInSubtitle")}
            {view === "register" && t("createAccountSubtitle")}
            {view === "forgot" && t("resetPasswordSubtitle")}
          </p>
        </div>

        {/* ── Sign In Form ─────────────────────────────────────────── */}
        {view === "signin" && (
          <form onSubmit={handleSignIn} className="aero-glass-glow p-6">
            <div className="mb-4">
              <label htmlFor="login-email" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-muted">
                {t("email")}
              </label>
              <input id="login-email" type="email" autoComplete="email" placeholder="you@example.com"
                value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
            </div>

            <div className="mb-4">
              <label htmlFor="login-password" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-muted">
                {t("password")}
              </label>
              <div className="relative">
                <input id="login-password" type={showPassword ? "text" : "password"} autoComplete="current-password"
                  placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)}
                  className={`${inputClass} pr-11`} />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint transition hover:text-ink-muted"
                  aria-label={showPassword ? "Hide password" : "Show password"}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="mb-5 flex items-center justify-between">
              <label htmlFor="remember-me" className="flex cursor-pointer items-center gap-2 text-xs text-ink-muted">
                <div className="relative">
                  <input id="remember-me" type="checkbox" checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)} className="peer sr-only" />
                  <div className="h-5 w-9 rounded-full border border-border bg-bg transition peer-checked:border-gold peer-checked:bg-gold/20" />
                  <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-ink-faint transition peer-checked:translate-x-4 peer-checked:bg-gold" />
                </div>
                {t("rememberMe")}
              </label>
              <button type="button" onClick={() => switchView("forgot")}
                className="text-xs text-gold/70 transition hover:text-gold">
                {t("forgotPassword")}
              </button>
            </div>

            {error && (
              <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                className="mb-4 text-center text-xs text-coral">{error}</motion.p>
            )}
            {!error && successMsg && (
              <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                className="mb-4 text-center text-xs text-emerald">{successMsg}</motion.p>
            )}

            <button type="submit" disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold py-3.5 font-display font-semibold text-bg transition hover:bg-gold/90 active:scale-[0.98] disabled:opacity-60">
              {isLoading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-bg border-t-transparent" />
              ) : (
                <>
                  <LogIn size={18} />
                  {t("signIn")}
                </>
              )}
            </button>

            {/* Divider */}
            <div className="my-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-border-soft" />
              <span className="text-[10px] uppercase tracking-wider text-ink-faint">{t("orContinueWith")}</span>
              <div className="h-px flex-1 bg-border-soft" />
            </div>

            {/* Google Sign-In */}
            <button type="button" onClick={handleGoogleSignIn}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-border-soft bg-bg py-3 text-sm font-medium text-ink transition hover:border-gold/30 active:scale-[0.98]">
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
                <path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
                <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
                <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
              </svg>
              {t("signInWithGoogle")}
            </button>
          </form>
        )}

        {/* ── Register Form ────────────────────────────────────────── */}
        {view === "register" && (
          <form onSubmit={handleRegister} className="aero-glass-glow p-6">
            <div className="mb-4">
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-muted">
                {t("displayName")}
              </label>
              <input type="text" autoComplete="name" placeholder="Your name"
                value={displayName} onChange={(e) => setDisplayName(e.target.value)} className={inputClass} />
            </div>

            <div className="mb-4">
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-muted">
                {t("email")}
              </label>
              <input type="email" autoComplete="email" placeholder="you@example.com"
                value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
            </div>

            <div className="mb-4">
              <label htmlFor="register-password" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-muted">
                {t("password")}
              </label>
              <div className="relative">
                <input id="register-password" type={showRegisterPwd ? "text" : "password"} autoComplete="new-password" placeholder="••••••••"
                  value={password} onChange={(e) => setPassword(e.target.value)} className={`${inputClass} pr-11`} />
                <button type="button" onClick={() => setShowRegisterPwd((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint transition hover:text-ink-muted"
                  aria-label={showRegisterPwd ? "Hide password" : "Show password"}>
                  {showRegisterPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p className="mt-1 text-[10px] text-ink-faint">Minimum 8 characters.</p>
            </div>

            <div className="mb-5">
              <label htmlFor="register-confirm" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-muted">
                {t("confirmPassword")}
              </label>
              <div className="relative">
                <input id="register-confirm" type={showConfirmPwd ? "text" : "password"} autoComplete="new-password" placeholder="••••••••"
                  value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} className={`${inputClass} pr-11`} />
                <button type="button" onClick={() => setShowConfirmPwd((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint transition hover:text-ink-muted"
                  aria-label={showConfirmPwd ? "Hide password" : "Show password"}>
                  {showConfirmPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                className="mb-4 text-center text-xs text-coral">{error}</motion.p>
            )}

            <button type="submit" disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold py-3.5 font-display font-semibold text-bg transition hover:bg-gold/90 active:scale-[0.98] disabled:opacity-60">
              {isLoading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-bg border-t-transparent" />
              ) : (
                <>
                  <UserPlus size={18} />
                  {t("createAccount")}
                </>
              )}
            </button>
          </form>
        )}

        {/* ── Forgot Password Form ─────────────────────────────────── */}
        {view === "forgot" && (
          <form onSubmit={handleForgotPassword} className="aero-glass-glow p-6">
            <div className="mb-5">
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-muted">
                {t("email")}
              </label>
              <input type="email" autoComplete="email" placeholder="you@example.com"
                value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
            </div>

            {error && (
              <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                className="mb-4 text-center text-xs text-coral">{error}</motion.p>
            )}
            {successMsg && (
              <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                className="mb-4 text-center text-xs text-emerald">{successMsg}</motion.p>
            )}

            <button type="submit" disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold py-3.5 font-display font-semibold text-bg transition hover:bg-gold/90 active:scale-[0.98] disabled:opacity-60">
              {isLoading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-bg border-t-transparent" />
              ) : (
                <>
                  <Mail size={18} />
                  {t("sendResetLink")}
                </>
              )}
            </button>

            <button type="button" onClick={() => switchView("signin")}
              className="mt-4 flex w-full items-center justify-center gap-2 text-sm text-ink-muted transition hover:text-gold">
              <ArrowLeft size={14} />
              {t("backToSignIn")}
            </button>
          </form>
        )}

        {/* Footer navigation */}
        <p className="mt-6 text-center text-xs text-ink-faint">
          {view === "signin" ? (
            <>
              {t("dontHaveAccount")}{" "}
              <button type="button" onClick={() => switchView("register")}
                className="font-medium text-gold/70 transition hover:text-gold">
                {t("createOne")}
              </button>
            </>
          ) : view === "register" ? (
            <>
              {t("alreadyHaveAccount")}{" "}
              <button type="button" onClick={() => switchView("signin")}
                className="font-medium text-gold/70 transition hover:text-gold">
                {t("signInInstead")}
              </button>
            </>
          ) : null}
        </p>
      </motion.div>
    </div>
  );
}
