/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        playfair: ['"Playfair Display"', 'Georgia', 'serif'],
        ibm: ['"IBM Plex Mono"', 'Consolas', 'monospace'],
      },
      colors: {
        gold: '#D4A853',
        navy: '#0d1117',
        'navy-card': '#131929',
        'navy-input': '#0a0f1a',
        'navy-border': '#1e2a3a',
      },
      keyframes: {
        'flag-fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'delta-pop': {
          '0%':   { transform: 'scale(0.65)', opacity: '0' },
          '55%':  { transform: 'scale(1.2)',  opacity: '1' },
          '100%': { transform: 'scale(1)',    opacity: '1' },
        },
        'btn-pulse': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(212,168,83,0)' },
          '50%':       { boxShadow: '0 0 0 7px rgba(212,168,83,0.28)' },
        },
        // Hint letter reveal: pops in with slight overshoot
        'hint-reveal': {
          '0%':   { transform: 'scale(0) rotate(-12deg)', opacity: '0' },
          '60%':  { transform: 'scale(1.2) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'scale(1)',                opacity: '1' },
        },
        // Heart depletion: deflates when a hint is spent
        'heart-deflate': {
          '0%':   { transform: 'scale(1)' },
          '40%':  { transform: 'scale(0.6)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      animation: {
        'flag-fade-in':   'flag-fade-in 300ms ease both',
        'delta-pop':      'delta-pop 280ms ease-out both',
        'btn-pulse':      'btn-pulse 2s ease-in-out infinite',
        'hint-reveal':    'hint-reveal 200ms ease-out both',
        'heart-deflate':  'heart-deflate 300ms ease-in-out both',
      },
    },
  },
  plugins: [],
}

