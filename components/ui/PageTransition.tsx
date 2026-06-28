"use client";

import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

/**
 * PageTransition — per-route enter animation.
 *
 * IMPORTANT: this must NOT use `AnimatePresence mode="wait"`.
 *
 * In the Next.js App Router, a client navigation (`router.push`) swaps the
 * `children` subtree synchronously — the previous route is unmounted by React
 * before AnimatePresence can run its exit animation. With `mode="wait"` the
 * incoming route then mounts but its enter tween never starts, so the wrapper
 * is left frozen at its `initial` style (`opacity: 0`). The page is fully
 * rendered in the DOM but invisible — the "blank/white screen of death" seen
 * when tapping the bottom-nav tabs inside the Capacitor webview.
 *
 * A plain keyed `motion.div` is the canonical App Router pattern: changing
 * `key` on a route change remounts the node, which deterministically replays
 * the mount (enter) animation from `initial` -> `animate`. There is no exit
 * tween to strand, so the resting state (`opacity: 1`) is always reached.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
