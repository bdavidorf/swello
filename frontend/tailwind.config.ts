import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── Midnight Oceanic scale ──
        ocean: {
          950: '#0C1420',  // body background — deep inky ocean
          900: '#0F1E2E',  // card background
          800: '#152840',  // elevated surface
          700: '#1A3050',  // borders
          600: '#264462',  // muted borders
          500: '#3A5870',  // muted icons / placeholder
          400: '#6A8AA0',  // secondary text
          200: '#9AAABB',  // body text
          50:  '#EDE8DC',  // headings — warm parchment (magazine paper)
        },
        // ── Electric Seafoam — use ONLY for highlights/good conditions ──
        wave: {
          300: '#5AFFF2',
          400: '#1AFFD0',  // Electric Seafoam
          500: '#00C4A8',
          600: '#008870',
        },
        // ── Safety Orange — use ONLY for CTAs and poor/critical ──
        coral: {
          300: '#FF8A5A',
          400: '#FF6B2B',  // Safety Orange
          500: '#E04A18',
          600: '#B03210',
        },
        // ── Surf conditions ──
        surf: {
          flat:     '#3A5870',
          small:    '#6AACCC',
          medium:   '#1AFFD0',
          solid:    '#4AE090',
          overhead: '#FF9A40',
          xxl:      '#FF6B2B',
        },
        // ── Crowd ──
        crowd: {
          empty:    '#4AE090',
          light:    '#6ACA50',
          moderate: '#FF9A40',
          crowded:  '#FF6B2B',
          packed:   '#E040A0',
        },
      },
      fontFamily: {
        display: ['Archivo Black', 'Impact', 'system-ui', 'sans-serif'],
        serif:   ['Lora', 'Georgia', 'serif'],
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        mono:    ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      boxShadow: {
        'glass':      '0 8px 40px rgba(0,0,0,0.40), 0 2px 10px rgba(0,0,0,0.25)',
        'glass-lg':   '0 20px 60px rgba(0,0,0,0.50), 0 4px 20px rgba(0,0,0,0.30)',
        'seafoam':    '0 4px 20px rgba(26,255,208,0.25)',
        'orange':     '0 4px 20px rgba(255,107,43,0.30)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-up':    'fadeUp 0.5s ease-out forwards',
        'grain':      'grain 8s steps(10) infinite',
        'seaflare':   'seaflare 2.5s ease-in-out infinite',
      },
      keyframes: {
        fadeUp: { '0%': { opacity: '0', transform: 'translateY(12px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        seaflare: {
          '0%, 100%': { boxShadow: '0 4px 20px rgba(26,255,208,0.25), 0 2px 8px rgba(26,255,208,0.12)' },
          '50%':      { boxShadow: '0 6px 32px rgba(26,255,208,0.50), 0 4px 14px rgba(255,107,43,0.18)' },
        },
        grain: {
          '0%, 100%': { transform: 'translate(0, 0)' },
          '10%': { transform: 'translate(-2%, -3%)' },
          '20%': { transform: 'translate(3%, 2%)' },
          '30%': { transform: 'translate(-1%, 4%)' },
          '40%': { transform: 'translate(4%, -1%)' },
          '50%': { transform: 'translate(-3%, 3%)' },
          '60%': { transform: 'translate(2%, -4%)' },
          '70%': { transform: 'translate(-4%, 1%)' },
          '80%': { transform: 'translate(1%, -2%)' },
          '90%': { transform: 'translate(-2%, 4%)' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config
