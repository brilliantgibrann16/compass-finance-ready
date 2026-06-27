"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 flex items-center gap-3"
    >
      <Link
        href="/"
        aria-label="Back to dashboard"
        className="rounded-full border border-border-soft p-2 text-ink-muted transition hover:border-gold/30 hover:text-gold"
      >
        <ChevronLeft size={20} />
      </Link>
      <div>
        <h1 className="font-display text-xl font-semibold text-ink">{title}</h1>
        {subtitle && <p className="text-sm text-ink-muted">{subtitle}</p>}
      </div>
    </motion.div>
  );
}
