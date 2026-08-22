/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Deep Carbon base
        "deep-carbon": "#0A0A0C",
        "deep-2": "#111113",
        "deep-3": "#18181B",
        "glass-surface": "rgba(20, 20, 24, 0.68)",
        "glass-strong": "rgba(24, 24, 28, 0.88)",
        "refractive-edge": "rgba(255, 255, 255, 0.10)",
        "refractive-strong": "rgba(255, 255, 255, 0.16)",
        "text-primary": "#FFFFFF",
        "text-muted": "#8E8E93",
        "text-faint": "#5A5A60",
        // Aurora palette — Ice Cyan core + violet/pink/amber accents
        "ice-cyan": "#00F0FF",
        "ice-cyan-2": "#00D4FF",
        "ice-glow": "rgba(0, 240, 255, 0.18)",
        "yusra-violet": "#7C5CFF",
        "yusra-violet-2": "#9B7FFF",
        "yusra-pink": "#FF3B8A",
        "yusra-amber": "#FFB800",
        "yusra-emerald": "#00E5A0",
        "interactive-glow": "rgba(0, 240, 255, 0.15)",
      },
      fontFamily: {
        "space-grotesk": ["Space Grotesk", "sans-serif"],
        inter: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      boxShadow: {
        "glass": "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
        "glow-cyan": "0 0 40px rgba(0,240,255,0.15), 0 0 80px rgba(124,92,255,0.08)",
        "glow-violet": "0 0 32px rgba(124,92,255,0.25)",
      },
      keyframes: {
        aurora: {
          "0%": { transform: "translate(0,0) scale(1)" },
          "50%": { transform: "translate(20px,-10px) scale(1.05)" },
          "100%": { transform: "translate(0,0) scale(1)" },
        },
        float: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        pulseGlow: {
          "0%,100%": { opacity: "0.6", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.04)" },
        },
      },
      animation: {
        aurora: "aurora 18s ease-in-out infinite",
        float: "float 6s ease-in-out infinite",
        shimmer: "shimmer 2s linear infinite",
        pulseGlow: "pulseGlow 2.5s ease-in-out infinite",
      },
      backdropBlur: { "40": "40px" },
    },
  },
  plugins: [],
};
