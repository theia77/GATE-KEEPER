import type { Config } from "tailwindcss";

// Tailwind tokens mirror packages/shared/src/constants.ts THEME so web/mobile never
// drift on the hardcore-academy palette. Full utilities land in Phase 4.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0b0a09",
        card: "#1f1d1a",
        cardAlt: "#29261f",
        accent: "#ff5b2e",
        gold: "#ffb020",
        danger: "#ff3b30",
        success: "#7cd992",
      },
      fontFamily: {
        display: ["'Barlow Condensed'", "sans-serif"],
        body: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
