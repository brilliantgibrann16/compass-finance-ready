"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Confetti } from "@/components/ui/Confetti";
import { PartyPopper } from "lucide-react";

interface DebtFreeCelebrationProps {
  open: boolean;
  onClose: () => void;
}

export function DebtFreeCelebration({ open, onClose }: DebtFreeCelebrationProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <Confetti />
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              className="rounded-xl2 border border-gold/30 bg-bg-raised p-8 text-center shadow-glow"
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: "spring", damping: 20, stiffness: 280 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald/10">
                <PartyPopper size={32} className="text-emerald" />
              </div>
              <h2 className="mt-4 font-display text-xl font-semibold text-ink">You&apos;re debt-free!</h2>
              <p className="mt-2 text-sm text-ink-muted">
                Every installment across SPayLater and GoPay Pinjam is paid off. Nicely done.
              </p>
              <button
                onClick={onClose}
                className="mt-6 w-full rounded-xl bg-gold py-3 font-medium text-bg transition hover:bg-gold/90"
              >
                Keep going
              </button>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
