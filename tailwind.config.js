/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        space: {
          50: '#F5F5F0',
          100: '#C8C8C0',
          200: '#8A8A80',
          300: '#4A4A42',
          400: '#2A2A24',
          500: '#121212',
        },
        moss: {
          DEFAULT: '#556B2F',
          light: '#6B8A3A',
          dark: '#3E5020',
          glow: 'rgba(85, 107, 47, 0.20)',
        },
        amber: {
          DEFAULT: '#D4AF37',
          light: '#E0C04A',
          dark: '#B8962E',
          glow: 'rgba(212, 175, 55, 0.15)',
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
        'glass-inset': 'inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        'accent-glow': '0 0 24px rgba(85, 107, 47, 0.25)',
        'amber-glow': '0 0 24px rgba(212, 175, 55, 0.20)',
      },
    },
  },
  plugins: [],
};
