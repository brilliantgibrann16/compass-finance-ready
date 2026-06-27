"use client";

/**
 * Full-screen loading spinner displayed while Zustand hydrates from localStorage.
 * Previously duplicated across every page component.
 */
export function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-gold" />
    </div>
  );
}
