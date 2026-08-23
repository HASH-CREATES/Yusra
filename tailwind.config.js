/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // JARVIS — Deep Carbon + Ice Cyan + Neutral + Status
        "deep-carbon": "#0A0A0C",
        "deep-2": "#111113",
        "deep-3": "#191A1E",
        "glass-surface": "rgba(18, 20, 24, 0.72)",
        "glass-strong": "rgba(22, 24, 28, 0.90)",
        "refractive-edge": "rgba(255, 255, 255, 0.08)",
        "refractive-strong": "rgba(255, 255, 255, 0.13)",
        "text-primary": "#FFFFFF",
        "text-muted": "#8E8E93",
        "text-faint": "#5A5A60",
        // JARVIS core — Ice Cyan only as accent, no violet/pink
        "ice-cyan": "#00F0FF",
        "ice-cyan-2": "#00D4FF",
        "ice-glow": "rgba(0, 240, 255, 0.16)",
        "ice-subtle": "rgba(0, 240, 255, 0.07)",
        // Status — amber / emerald only
        "jarvis-amber": "#FFB800",
        "jarvis-amber-glow": "rgba(255,184,0,0.14)",
        "jarvis-emerald": "#00E5A0",
        "jarvis-emerald-glow": "rgba(0,229,160,0.14)",
        "interactive-glow": "rgba(0, 240, 255, 0.12)",
      },
      fontFamily: {
        "space-grotesk": ["Space Grotesk", "sans-serif"],
        inter: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      boxShadow: {
        "glass": "0 8px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.05)",
        "glow-cyan": "0 0 36px rgba(0,240,255,0.14), 0 0 80px rgba(0,240,255,0.06)",
        "glow-amber": "0 0 28px rgba(255,184,0,0.18)",
      },
      keyframes: {
        scan: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(200%)" },
        },
        pulseCyan: {
          "0%,100%": { opacity: "0.55", boxShadow: "0 0 12px rgba(0,240,255,0.25)" },
          "50%": { opacity: "1", boxShadow: "0 0 22px rgba(0,240,255,0.45)" },
        },
        hudIn: {
          "0%": { opacity: "0", transform: "translateY(8px) scale(0.98)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
      },
      animation: {
        scan: "scan 3.2s linear infinite",
        pulseCyan: "pulseCyan 2.2s ease-in-out infinite",
        hudIn: "hudIn 0.32s ease-out",
      },
      backdropBlur: { "40": "40px" },
    },
  },
  plugins: [],
};
