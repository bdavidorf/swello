import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── Golden Hour Charcoal — warm, textured dark ──
        ocean: {
          950: '#1A1A1B',  // deep charcoal body
          900: '#1E1C1A',  // card bg
          800: '#252220',  // elevated surface
          700: '#302C28',  // borders
          600: '#4A4440',  // muted borders
          500: '#8A7868',  // muted icons / placeholder
          400: '#A89880',  // secondary text
          200: '#C8B090',  // body text
          50:  '#F0E2C8',  // warm cream — headings
        },
        // ── Burnt Orange — primary energy accent ──
        wave: {
          300: '#EC9A84',
          400: '#E07A5F',  // Burnt Orange
          500: '#C05A40',
          600: '#A04030',
        },
        // ── Muted Teal — secondary accent ──
        coral: {
          300: '#6A9AC0',
          400: '#3D5A80',  // Muted Teal
          500: '#2A4060',
          600: '#1A2E48',
        },
        // ── Sandy Gold — tertiary warmth ──
        sand: {
          200: '#E8D4A0',
          300: '#D4B870',
          400: '#D4A853',  // Sandy Gold
          500: '#B08030',
          600: '#886018',
        },
        // ── Crowd ──
        crowd: {
          empty:    '#6BAA6B',
          light:    '#8BC050',
          moderate: '#D4A853',
          crowded:  '#E07A5F',
          packed:   '#C040A0',
        },
      },
      fontFamily: {
        display: ['Bangers', 'Impact', 'system-ui', 'sans-serif'],
        marker:  ['Permanent Marker', 'cursive'],
        syne:    ['Syne', 'system-ui', 'sans-serif'],
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        mono:    ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      boxShadow: {
        'warm':    '0 8px 40px rgba(0,0,0,0.45), 0 2px 12px rgba(0,0,0,0.30)',
        'warm-lg': '0 20px 64px rgba(0,0,0,0.55), 0 4px 20px rgba(0,0,0,0.35)',
        'orange':  '0 4px 20px rgba(224,122,95,0.35)',
        'teal':    '0 4px 20px rgba(61,90,128,0.35)',
        'gold':    '0 4px 20px rgba(212,168,83,0.30)',
        'float':   '0 12px 40px rgba(0,0,0,0.50), 0 4px 16px rgba(0,0,0,0.30)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-up':    'fadeUp 0.5s ease-out forwards',
        'grain':      'grain 8s steps(10) infinite',
        'float':      'float 3s ease-in-out infinite',
      },
      keyframes: {
        fadeUp: { '0%': { opacity: '0', transform: 'translateY(14px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        float:  { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-4px)' } },
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
