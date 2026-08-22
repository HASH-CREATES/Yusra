/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        "deep-carbon": "#0A0A0C",
        "glass-surface": "rgba(20, 20, 24, 0.7)",
        "refractive-edge": "rgba(255, 255, 255, 0.12)",
        "text-primary": "#FFFFFF",
        "text-muted": "#8E8E93",
        "ice-cyan": "#00F0FF",
        "interactive-glow": "rgba(0, 240, 255, 0.15)",
      },
      fontFamily: {
        "space-grotesk": ["Space Grotesk", "sans-serif"],
        inter: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};