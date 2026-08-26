/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        space: {
          50: '#F5F5F7',
          100: '#A1A1A6',
          200: '#636366',
          300: '#3A3A3C',
          400: '#2C2C2E',
          500: '#1C1C1E',
        },
        moss: {
          DEFAULT: '#4A5D23',
          light: '#5A7028',
          dark: '#3A4A1B',
          glow: 'rgba(74, 93, 35, 0.15)',
        },
        tea: {
          DEFAULT: '#8993A3',
          light: '#9AA3B3',
          dark: '#7A8393',
        },
      },
      fontFamily: {
        display: ['Space Grotesk', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      backdropBlur: {
        'glass-light': '20px',
        'glass-medium': '40px',
        'glass-heavy': '60px',
      },
      borderRadius: {
        'sm': '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '24px',
      },
      boxShadow: {
        'glass-1': '0 2px 8px rgba(0, 0, 0, 0.15)',
        'glass-2': '0 8px 24px rgba(0, 0, 0, 0.25)',
        'glass-3': '0 16px 48px rgba(0, 0, 0, 0.35)',
        'accent-glow': '0 0 20px rgba(74, 93, 35, 0.15)',
      },
    },
  },
  plugins: [],
};
