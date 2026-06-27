"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { clsx } from "clsx";

interface CardProps extends HTMLMotionProps<"div"> {
  variant?: "default" | "glow";
}

export function Card({ variant = "default", className, children, ...props }: CardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={clsx(
        "p-5",
        variant === "glow" ? "aero-glass-glow" : "aero-glass",
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
}
