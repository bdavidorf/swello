import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── Pastel Ocean Blue — beach at dawn ──
        ocean: {
          950: '#0D1C2A',  // deep ocean — body background
          900: '#122534',  // card glass
          800: '#1A3048',  // elevated surface
          700: '#224060',  // borders
          600: '#2E5275',  // muted borders
          500: '#5A8AAA',  // muted icons / placeholder
          400: '#7AAAC8',  // secondary text
          200: '#C0D8EC',  // body text
          50:  '#EAF6FF',  // headings — pale sky
        },
        // ── Powder Blue — primary accent ──
        wave: {
          300: '#A8D8F0',
          400: '#78B8D8',  // powder blue
          500: '#5AAAC8',
          600: '#3A8AAA',
        },
        // ── Ocean Blue — secondary accent ──
        coral: {
          300: '#88C8E0',
          400: '#5AAAC8',  // ocean blue
          500: '#3A8AAA',
          600: '#2A6A8A',
        },
        // ── Sky Light — tertiary highlight ──
        sand: {
          200: '#C8E8F8',
          300: '#A8D8F0',
          400: '#88C8E8',  // sky light blue
          500: '#60A8D0',
          600: '#3A88B8',
        },
        // ── Crowd ──
        crowd: {
          empty:    '#78D0B8',
          light:    '#88C8E0',
          moderate: '#78B8D8',
          crowded:  '#5888B8',
          packed:   '#4A68A8',
        },
      },
      fontFamily: {
        display: ['Bangers', 'Impact', 'system-ui', 'sans-serif'],
        marker:  ['Bangers', 'Impact', 'system-ui', 'sans-serif'],
        syne:    ['Bangers', 'Impact', 'system-ui', 'sans-serif'],
        sans:    ['Bangers', 'Impact', 'system-ui', 'sans-serif'],
        body:    ['Inter', 'system-ui', 'sans-serif'],
        mono:    ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      boxShadow: {
        'warm':    '0 8px 40px rgba(0,0,0,0.45), 0 2px 12px rgba(0,0,0,0.30)',
        'warm-lg': '0 20px 64px rgba(0,0,0,0.55), 0 4px 20px rgba(0,0,0,0.35)',
        'blue':    '0 4px 20px rgba(120,184,216,0.30)',
        'sky':     '0 4px 20px rgba(136,200,232,0.28)',
        'float':   '0 12px 40px rgba(0,0,0,0.45), 0 4px 16px rgba(0,0,0,0.25)',
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
