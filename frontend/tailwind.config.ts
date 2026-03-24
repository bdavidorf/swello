import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── Deep ocean dark scale — 950=deepest bg, 50=brightest text ──
        ocean: {
          950: '#0A1628',  // deep navy — body background
          900: '#0E1E38',  // card background
          800: '#142540',  // elevated card
          700: '#1E3554',  // borders
          600: '#2A4A6A',  // muted borders / dividers
          500: '#4A7090',  // icons, placeholder text
          400: '#6A90AC',  // muted text
          200: '#A8C4D8',  // body text
          50:  '#E0EEF8',  // headings (near white, cool tint)
        },
        // ── Electric teal accent ──
        wave: {
          300: '#4AEAE0',
          400: '#00CFC0',  // primary teal
          500: '#00A898',
          600: '#007A6E',
        },
        // ── Coral / fiery accent ──
        coral: {
          300: '#FF8060',
          400: '#FF6040',  // primary coral
          500: '#E04020',
          600: '#B03010',
        },
        // ── Surf conditions ──
        surf: {
          flat:     '#4A7090',
          small:    '#6ABCCC',
          medium:   '#00CFC0',
          solid:    '#4AE080',
          overhead: '#FF9A40',
          xxl:      '#FF6040',
        },
        // ── Crowd ──
        crowd: {
          empty:    '#4AE080',
          light:    '#6ACA50',
          moderate: '#FF9A40',
          crowded:  '#FF6040',
          packed:   '#E040A0',
        },
      },
      fontFamily: {
        display: ['Bebas Neue', 'system-ui', 'sans-serif'],
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        mono:    ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      backgroundImage: {
        'teal-coral': 'linear-gradient(135deg, #00CFC0 0%, #FF6040 100%)',
        'deep-glass': 'linear-gradient(145deg, rgba(14,30,56,0.90) 0%, rgba(10,22,40,0.85) 100%)',
      },
      boxShadow: {
        'glass':      '0 8px 32px rgba(0,0,0,0.28), 0 2px 8px rgba(0,0,0,0.18), inset 0 1px 0 rgba(0,207,192,0.08)',
        'glass-lg':   '0 16px 48px rgba(0,0,0,0.35), 0 4px 16px rgba(0,0,0,0.22), inset 0 1px 0 rgba(0,207,192,0.10)',
        'teal-glow':  '0 4px 20px rgba(0,207,192,0.30)',
        'coral-glow': '0 4px 20px rgba(255,96,64,0.30)',
        'card':       '0 8px 32px rgba(0,0,0,0.28), 0 2px 8px rgba(0,0,0,0.18)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'wave-in':    'waveIn 0.6s ease-out forwards',
        'fade-up':    'fadeUp 0.5s ease-out forwards',
        'teal-flare': 'tealFlare 2.5s ease-in-out infinite',
        'grain':      'grain 8s steps(10) infinite',
      },
      keyframes: {
        waveIn:    { '0%': { opacity: '0', transform: 'translateY(20px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        fadeUp:    { '0%': { opacity: '0', transform: 'translateY(12px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        tealFlare: {
          '0%, 100%': { boxShadow: '0 4px 20px rgba(0,207,192,0.30), 0 2px 8px rgba(0,207,192,0.15)' },
          '50%':      { boxShadow: '0 6px 32px rgba(0,207,192,0.55), 0 4px 14px rgba(255,96,64,0.20)' },
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
