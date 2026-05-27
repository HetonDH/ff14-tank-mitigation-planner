import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        panel: "#121826",
        ink: "#e5edf7",
        line: "#263244",
      },
      boxShadow: {
        glow: "0 0 24px rgba(56, 189, 248, 0.18)",
      },
    },
  },
  plugins: [],
} satisfies Config;
