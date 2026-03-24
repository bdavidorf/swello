import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── Inverted ocean scale: 950 = lightest (sand bg), 50 = darkest (text) ──
        // All existing ocean-* class names work unchanged — they just flip to light
        ocean: {
          950: '#FDFBF7',  // sand white — page & component backgrounds
          900: '#F0F6F2',  // pale seafoam — card interiors
          800: '#E2EEEB',  // soft seafoam — input backgrounds, subtle fills
          700: '#C0D5CC',  // seafoam border — dividers
          600: '#91AFAA',  // muted sea — subtle UI elements
          500: '#5E8A86',  // mid teal — placeholder text, icons
          400: '#4A7A7A',  // sea glass — secondary text, muted labels
          200: '#2E5454',  // deep teal — primary body text
          50:  '#1C3535',  // deep slate — headings, strong text
        },
        // ── Wave: soft sea glass teal replaces electric cyan ──
        wave: {
          300: '#C8ECEE',  // pale sea glass
          400: '#A8DADC',  // sea glass teal — primary accent
          500: '#78BEC2',  // deeper sea glass
          600: '#56A0A4',  // dark sea glass
        },
        // ── Coral: warm accent for energy/highlights ──
        coral: {
          200: '#FFDAD4',
          300: '#FFB8AC',
          400: '#FF9A8B',  // primary coral accent
          500: '#F07060',
          600: '#D85040',
        },
        // ── Sand: warm neutrals ──
        sand: {
          50:  '#FDFBF7',
          100: '#F7F0E2',
          200: '#EDD9BB',
          300: '#D9B888',
          400: '#C49A60',
          500: '#A87840',
        },
        // ── Surf condition colors (softened for light theme) ──
        surf: {
          flat:     '#9CA8A4',
          small:    '#A8C8DC',
          medium:   '#78BEC2',
          solid:    '#68B880',
          overhead: '#F5C060',
          xxl:      '#FF9A8B',
        },
        // ── Crowd level colors ──
        crowd: {
          empty:    '#68B880',
          light:    '#90C855',
          moderate: '#F5B040',
          crowded:  '#F08060',
          packed:   '#C07898',
        },
      },
      fontFamily: {
        display: ['Inter', 'system-ui', 'sans-serif'],
        mono:    ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      backgroundImage: {
        'page-bg':     'radial-gradient(ellipse at 15% 0%, rgba(168,218,220,0.22) 0%, transparent 55%), radial-gradient(ellipse at 85% 100%, rgba(255,209,148,0.18) 0%, transparent 55%)',
        'mint-blue':   'linear-gradient(135deg, #B8F0D4 0%, #A9C7E8 100%)',
        'sunset-sky':  'linear-gradient(90deg, #FFD194 0%, #A9C7E8 100%)',
        'glass':       'linear-gradient(145deg, rgba(255,255,255,0.82) 0%, rgba(240,250,248,0.72) 100%)',
        'coral-warm':  'linear-gradient(135deg, #FFB8AC 0%, #FF9A8B 100%)',
      },
      boxShadow: {
        'glass':      '0 8px 32px rgba(100,160,150,0.10), 0 2px 8px rgba(100,160,150,0.07), inset 0 1px 0 rgba(255,255,255,0.85)',
        'glass-lg':   '0 16px 48px rgba(100,160,150,0.14), 0 4px 16px rgba(100,160,150,0.09), inset 0 1px 0 rgba(255,255,255,0.9)',
        'coral-glow': '0 4px 20px rgba(255,154,139,0.40)',
        'sea-glow':   '0 4px 20px rgba(168,218,220,0.45)',
        'card':       '0 8px 32px rgba(100,160,150,0.10), 0 2px 8px rgba(100,160,150,0.07)',
        'wave':       '0 4px 20px rgba(168,218,220,0.35)',
        'wave-lg':    '0 8px 32px rgba(168,218,220,0.40)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'wave-in':    'waveIn 0.6s ease-out forwards',
        'fade-up':    'fadeUp 0.5s ease-out forwards',
        'sun-flare':  'sunFlare 2.5s ease-in-out infinite',
        'grain':      'grain 8s steps(10) infinite',
      },
      keyframes: {
        waveIn: {
          '0%':   { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeUp: {
          '0%':   { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        sunFlare: {
          '0%, 100%': { boxShadow: '0 4px 20px rgba(169,199,232,0.45), 0 2px 8px rgba(184,240,212,0.35)' },
          '50%':      { boxShadow: '0 6px 32px rgba(169,199,232,0.65), 0 4px 16px rgba(255,209,148,0.40)' },
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
