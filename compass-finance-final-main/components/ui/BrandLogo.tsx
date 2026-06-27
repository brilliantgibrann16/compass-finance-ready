"use client";

import { clsx } from "clsx";

/**
 * Compass brand mark — inline SVG compass needle + wordmark.
 * Matches the app icon (NE gold / SW bronze needle, ring, cardinal ticks).
 */

interface BrandLogoProps {
  /** sm = 20px icon, md = 24px, lg = 32px */
  size?: "sm" | "md" | "lg";
  /** Hide the "Compass" wordmark and show only the icon. */
  iconOnly?: boolean;
  className?: string;
}

const SIZES = {
  sm: { icon: 20, text: "text-sm", gap: "gap-1.5" },
  md: { icon: 24, text: "text-base", gap: "gap-2" },
  lg: { icon: 32, text: "text-xl", gap: "gap-2.5" },
} as const;

export function BrandLogo({ size = "md", iconOnly = false, className }: BrandLogoProps) {
  const s = SIZES[size];

  return (
    <div className={clsx("flex items-center", s.gap, className)}>
      <svg
        width={s.icon}
        height={s.icon}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Outer ring */}
        <circle cx="12" cy="12" r="10.5" stroke="#F0B429" strokeWidth="0.7" opacity="0.4" />

        {/* Cardinal tick marks (N, E, S, W) */}
        <line x1="12" y1="1.5" x2="12" y2="3.2" stroke="#F0B429" strokeWidth="0.7" opacity="0.5" strokeLinecap="round" />
        <line x1="22.5" y1="12" x2="20.8" y2="12" stroke="#F0B429" strokeWidth="0.7" opacity="0.5" strokeLinecap="round" />
        <line x1="12" y1="22.5" x2="12" y2="20.8" stroke="#F0B429" strokeWidth="0.7" opacity="0.5" strokeLinecap="round" />
        <line x1="1.5" y1="12" x2="3.2" y2="12" stroke="#F0B429" strokeWidth="0.7" opacity="0.5" strokeLinecap="round" />

        {/* NE needle half — bright gold */}
        <polygon points="11,11 15.8,8.2 13,13" fill="#F0B429" />

        {/* SW needle half — bronze */}
        <polygon points="13,13 8.2,15.8 11,11" fill="#8B6914" />

        {/* Center pivot dot */}
        <circle cx="12" cy="12" r="1.1" fill="#F0B429" />
      </svg>

      {!iconOnly && (
        <span
          className={clsx(
            "font-display font-semibold tracking-tight text-ink",
            s.text,
          )}
        >
          Compass
        </span>
      )}
    </div>
  );
}
