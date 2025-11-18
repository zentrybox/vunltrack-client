import type { Config } from "tailwindcss";

// Note: Tailwind v4 primarily uses CSS-driven theming.
// We keep a minimal config for content scanning and dark mode.
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      boxShadow: {
        glow: "0 0 0 2px rgba(0, 229, 255, 0.15), 0 8px 30px rgba(0, 229, 255, 0.08)",
        "inner-glow": "inset 0 0 0 1px rgba(0,229,255,0.15)",
      },
      animation: {
        "radar-sweep": "radar-sweep 5s linear infinite",
        "pulse-soft": "pulse-soft 2.2s ease-in-out infinite",
        shimmer: "shimmer 1.6s linear infinite",
        shine: "shine 1.2s linear 1",
      },
      keyframes: {
        "radar-sweep": {
          to: { transform: "rotate(360deg)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "0.7" },
          "50%": { opacity: "1" },
        },
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        shine: {
          "0%": { transform: "translateX(-120%)" },
          "100%": { transform: "translateX(120%)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
