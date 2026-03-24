import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ocean: {
          950: '#030b17',
          900: '#071428',
          800: '#0d2040',
          700: '#123055',
          600: '#1a4a7a',
          500: '#2563a8',
          400: '#6aa3d4',
          200: '#b8d4f0',
          50:  '#e8f4ff',
        },
        wave: {
          300: '#33e0d6',
          400: '#00d4c8',
          500: '#00a89e',
          600: '#007d75',
        },
        sand: {
          400: '#f4c77a',
          500: '#f0a840',
        },
        // Surf condition colors
        surf: {
          flat:     '#4a5568',
          small:    '#2563eb',
          medium:   '#0891b2',
          solid:    '#059669',
          overhead: '#d97706',
          xxl:      '#dc2626',
        },
        crowd: {
          empty:    '#10b981',
          light:    '#84cc16',
          moderate: '#f59e0b',
          crowded:  '#ef4444',
          packed:   '#9333ea',
        },
      },
      fontFamily: {
        display: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      backgroundImage: {
        'ocean-gradient': 'linear-gradient(135deg, #030b17 0%, #071428 50%, #0d2040 100%)',
        'card-gradient': 'linear-gradient(145deg, #0d2040 0%, #071428 100%)',
        'wave-glow': 'radial-gradient(ellipse at center, rgba(0,212,200,0.15) 0%, transparent 70%)',
      },
      boxShadow: {
        'wave': '0 4px 32px rgba(0, 212, 200, 0.08)',
        'wave-lg': '0 8px 48px rgba(0, 212, 200, 0.15)',
        'card': '0 2px 20px rgba(0, 0, 0, 0.4)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'wave-in': 'waveIn 0.6s ease-out forwards',
        'fade-up': 'fadeUp 0.5s ease-out forwards',
      },
      keyframes: {
        waveIn: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config
