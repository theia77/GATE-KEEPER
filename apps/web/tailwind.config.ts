import type { Config } from "tailwindcss";

// Tailwind tokens mirror packages/shared/src/constants.ts THEME so web/mobile never
// drift on the hardcore-academy palette. Full utilities land in Phase 4.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0b0a09",
        bgRadial: "#1a1613",
        card: "#1f1d1a",
        cardAlt: "#29261f",
        ink: "#f5f1ea",
        inkMuted: "#a39c8f",
        inkFaint: "#8a8377",
        inkGhost: "#6b645a",
        accent: "#ff5b2e",
        accentInk: "#1a0e08",
        gold: "#ffb020",
        danger: "#ff3b30",
        success: "#7cd992",
        hairline: "rgba(255,255,255,0.07)",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
