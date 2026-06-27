"use client";

import { useEffect, useState } from "react";

/**
 * SplashScreen — Premium opening animation displayed on app launch.
 *
 * Sequence:
 *   0.0s – 2.0s  Fade-in + scale-up logo/text with glowing aurora pulse
 *   2.0s – 2.5s  Fade-out entire overlay
 *   2.5s         Calls `onFinished()` so the parent can unmount this layer
 *
 * All animations are pure CSS @keyframes — no JS animation loops, no
 * runtime RAF overhead, no framer-motion dependency (keeps the critical
 * path tiny for Capacitor cold-boot).
 */

interface SplashScreenProps {
  /** Called once the full 2.5s animation has completed. */
  onFinished: () => void;
}

export function SplashScreen({ onFinished }: SplashScreenProps) {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Start fade-out at 2.0s, call onFinished at 2.5s
    const fadeTimer = setTimeout(() => setFadeOut(true), 2000);
    const doneTimer = setTimeout(() => onFinished(), 2500);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, [onFinished]);

  return (
    <div
      className={`splash-overlay ${fadeOut ? "splash-fade-out" : ""}`}
      aria-hidden="true"
    >
      {/* Ambient aurora glow rings */}
      <div className="splash-aurora splash-aurora-1" />
      <div className="splash-aurora splash-aurora-2" />
      <div className="splash-aurora splash-aurora-3" />

      {/* Centered logo + wordmark */}
      <div className="splash-content">
        {/* Compass SVG — larger version of BrandLogo for the splash */}
        <div className="splash-icon">
          <svg
            width={72}
            height={72}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Outer ring */}
            <circle
              cx="12" cy="12" r="10.5"
              stroke="#F0B429" strokeWidth="0.5" opacity="0.5"
            />
            {/* Cardinal tick marks */}
            <line x1="12" y1="1.5" x2="12" y2="3.2" stroke="#F0B429" strokeWidth="0.7" opacity="0.6" strokeLinecap="round" />
            <line x1="22.5" y1="12" x2="20.8" y2="12" stroke="#F0B429" strokeWidth="0.7" opacity="0.6" strokeLinecap="round" />
            <line x1="12" y1="22.5" x2="12" y2="20.8" stroke="#F0B429" strokeWidth="0.7" opacity="0.6" strokeLinecap="round" />
            <line x1="1.5" y1="12" x2="3.2" y2="12" stroke="#F0B429" strokeWidth="0.7" opacity="0.6" strokeLinecap="round" />
            {/* NE needle — bright gold */}
            <polygon points="11,11 15.8,8.2 13,13" fill="#F0B429" />
            {/* SW needle — bronze */}
            <polygon points="13,13 8.2,15.8 11,11" fill="#8B6914" />
            {/* Center pivot */}
            <circle cx="12" cy="12" r="1.1" fill="#F0B429" />
          </svg>
        </div>

        <h1 className="splash-title">Compass Finance</h1>
        <p className="splash-subtitle">Your daily money command center</p>

        {/* Loading bar */}
        <div className="splash-loader">
          <div className="splash-loader-bar" />
        </div>
      </div>
    </div>
  );
}
