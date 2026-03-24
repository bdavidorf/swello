import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── Warm stone scale — 950=lightest card tone, 50=deepest text ──
        ocean: {
          950: '#EDE7DF',  // warm linen — light fills, subtle highlights
          900: '#DDD6CC',  // warm stone — card/component backgrounds
          800: '#CAC3B8',  // medium — input fills, secondary areas
          700: '#A8A09A',  // warm border / dividers
          600: '#807870',  // muted icons, placeholder text
          500: '#5E5650',  // secondary text
          400: '#3C3630',  // readable muted text
          200: '#221C18',  // body text (warm near-black)
          50:  '#12100C',  // headings (almost black)
        },
        // ── Muted dusty teal — much less saturated than before ──
        wave: {
          300: '#8ABCBE',
          400: '#6A9A9C',  // primary teal accent (desaturated)
          500: '#4E7A7C',
          600: '#366062',
        },
        // ── Muted terracotta / dusty coral ──
        coral: {
          200: '#D8B8A8',
          300: '#C49880',
          400: '#B07860',  // primary warm accent (muted terracotta)
          500: '#8E5E48',
          600: '#6E4434',
        },
        // ── Sandy warm tones ──
        sand: {
          50:  '#F5EEE6',
          100: '#EDE4D8',
          200: '#D8CCBC',
          300: '#C0AE98',
          400: '#A89078',
          500: '#8A7058',
        },
        // ── Surf conditions (muted to match palette) ──
        surf: {
          flat:     '#8A8480',
          small:    '#7A9CB0',
          medium:   '#5E8A8C',
          solid:    '#5E9268',
          overhead: '#C4904A',
          xxl:      '#B07860',
        },
        // ── Crowd ──
        crowd: {
          empty:    '#5E9268',
          light:    '#7A9C42',
          moderate: '#C4904A',
          crowded:  '#C07050',
          packed:   '#9A6880',
        },
      },
      fontFamily: {
        display: ['Inter', 'system-ui', 'sans-serif'],
        mono:    ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      backgroundImage: {
        'mint-blue':  'linear-gradient(135deg, #7ABCA0 0%, #7AAEC8 100%)',
        'glass':      'linear-gradient(145deg, rgba(237,231,223,0.80) 0%, rgba(221,214,204,0.75) 100%)',
        'warm-glow':  'radial-gradient(ellipse at center, rgba(176,120,96,0.12) 0%, transparent 70%)',
      },
      boxShadow: {
        'glass':      '0 8px 32px rgba(50,38,28,0.10), 0 2px 8px rgba(50,38,28,0.07), inset 0 1px 0 rgba(255,248,240,0.70)',
        'glass-lg':   '0 16px 48px rgba(50,38,28,0.12), 0 4px 16px rgba(50,38,28,0.08), inset 0 1px 0 rgba(255,248,240,0.80)',
        'teal-glow':  '0 4px 20px rgba(106,154,156,0.35)',
        'coral-glow': '0 4px 20px rgba(176,120,96,0.35)',
        'card':       '0 8px 32px rgba(50,38,28,0.10), 0 2px 8px rgba(50,38,28,0.07)',
        'wave':       '0 4px 20px rgba(106,154,156,0.30)',
        'wave-lg':    '0 8px 32px rgba(106,154,156,0.35)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'wave-in':    'waveIn 0.6s ease-out forwards',
        'fade-up':    'fadeUp 0.5s ease-out forwards',
        'sun-flare':  'sunFlare 2.5s ease-in-out infinite',
        'grain':      'grain 8s steps(10) infinite',
      },
      keyframes: {
        waveIn:  { '0%': { opacity: '0', transform: 'translateY(20px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        fadeUp:  { '0%': { opacity: '0', transform: 'translateY(12px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        sunFlare: {
          '0%, 100%': { boxShadow: '0 4px 20px rgba(106,154,156,0.35), 0 2px 8px rgba(122,174,200,0.25)' },
          '50%':      { boxShadow: '0 6px 30px rgba(106,154,156,0.55), 0 4px 14px rgba(196,144,74,0.30)' },
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
