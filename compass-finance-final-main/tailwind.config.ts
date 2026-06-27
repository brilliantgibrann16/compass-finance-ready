import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#0B0E14",
          raised: "#141925",
          hover: "#1C2333",
        },
        border: {
          DEFAULT: "#242B3D",
          soft: "#1A2030",
        },
        gold: {
          DEFAULT: "#F0B429",
          soft: "#F0B42922",
          muted: "#B8862A",
        },
        emerald: {
          DEFAULT: "#34D399",
          soft: "#34D39922",
        },
        coral: {
          DEFAULT: "#F87171",
          soft: "#F8717122",
        },
        ink: {
          DEFAULT: "#F5F3EE",
          muted: "#8A93A6",
          faint: "#5B6478",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Space Grotesk", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "ui-monospace", "monospace"],
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      boxShadow: {
        card: "0 1px 0 0 rgba(255,255,255,0.03) inset, 0 8px 24px -8px rgba(0,0,0,0.5)",
        glow: "0 0 0 1px rgba(240,180,41,0.18), 0 8px 32px -8px rgba(240,180,41,0.25)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.4s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
