"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { BottomNav } from "@/components/ui/BottomNav";

interface PageLayoutProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

/**
 * Standard page shell: max-width container + PageHeader + BottomNav.
 * Eliminates the repeated <main> wrapper across every route.
 */
export function PageLayout({ title, subtitle, children }: PageLayoutProps) {
  return (
    <main className="mx-auto min-h-screen max-w-md px-5 pb-28 pt-8">
      <PageHeader title={title} subtitle={subtitle} />
      {children}
      <BottomNav />
    </main>
  );
}
