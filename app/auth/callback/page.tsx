"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const nextUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    router.replace(nextUrl);
  }, [router]);

  return <div className="min-h-screen bg-slate-950 text-white">Redirecting...</div>;
}
