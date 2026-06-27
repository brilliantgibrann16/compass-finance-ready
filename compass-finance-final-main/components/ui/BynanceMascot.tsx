"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { MessageCircle, X, Sparkles } from "lucide-react";
import Link from "next/link";

/**
 * BynanceMascot — Floating interactive companion widget.
 *
 * Renders the Bynance 3D mascot as a floating button on the dashboard.
 * Tap to open animated speech bubble with localized greeting.
 * Serves as a portal to the AI Coach page.
 */

export function BynanceMascot() {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useTranslation();

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  return (
    <div className="fixed bottom-24 right-4 z-30 flex flex-col items-end gap-3">
      {/* Speech Bubble */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="w-64 rounded-2xl border border-border-soft bg-bg-raised p-4 shadow-xl"
          >
            {/* Close button */}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute right-2 top-2 rounded-full p-1 text-ink-faint transition hover:bg-bg-hover hover:text-ink-muted"
              aria-label={t("bynanceClose")}
            >
              <X size={14} />
            </button>

            {/* Greeting */}
            <div className="mb-3 flex items-start gap-2.5">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gold/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/bynance.png"
                  alt="Bynance"
                  className="h-7 w-7 object-contain"
                />
              </div>
              <div>
                <p className="text-xs font-semibold text-gold">Bynance</p>
                <p className="mt-0.5 text-sm leading-relaxed text-ink">
                  {t("bynanceGreeting")}
                </p>
              </div>
            </div>

            {/* CTA to Coach */}
            <Link href="/coach">
              <motion.button
                whileTap={{ scale: 0.97 }}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold py-2.5 text-sm font-semibold text-bg transition hover:bg-gold/90"
              >
                <Sparkles size={14} />
                {t("bynanceTalkTo")}
              </motion.button>
            </Link>

            {/* Speech triangle */}
            <div className="absolute -bottom-2 right-6 h-4 w-4 rotate-45 border-b border-r border-border-soft bg-bg-raised" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Mascot Button */}
      <motion.button
        onClick={handleToggle}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        className="group relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-gold/30 bg-bg-raised shadow-lg shadow-gold/10 transition-all hover:border-gold/60 hover:shadow-gold/25"
        aria-label="Bynance Assistant"
      >
        {/* Glow ring */}
        <motion.div
          className="absolute inset-0 rounded-full bg-gradient-to-br from-gold/20 via-transparent to-emerald/10"
          animate={{
            opacity: [0.4, 0.7, 0.4],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Mascot Image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/bynance.png"
          alt="Bynance mascot"
          className="relative z-10 h-12 w-12 object-contain drop-shadow-lg"
        />

        {/* Notification dot when closed */}
        {!isOpen && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -right-0.5 -top-0.5 z-20 flex h-5 w-5 items-center justify-center rounded-full bg-gold shadow-sm"
          >
            <MessageCircle size={10} className="text-bg" />
          </motion.div>
        )}
      </motion.button>
    </div>
  );
}
