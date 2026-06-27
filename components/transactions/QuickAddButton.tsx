"use client";

import { motion } from "framer-motion";
import { Plus } from "lucide-react";

export function QuickAddButton({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      aria-label="Quick add transaction"
      className="fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-gold text-bg shadow-glow"
      whileTap={{ scale: 0.92 }}
      whileHover={{ scale: 1.05 }}
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
    >
      <Plus size={26} strokeWidth={2.5} />
    </motion.button>
  );
}
