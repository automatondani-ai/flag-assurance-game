/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        fredoka: ['"Fredoka One"', 'cursive'],
        nunito: ['Nunito', 'sans-serif'],
        // Legacy — kept so any remaining ibm/playfair refs compile
        playfair: ['"Fredoka One"', 'cursive'],
        ibm: ['Nunito', 'sans-serif'],
      },
      colors: {
        // ── Carnival palette ──────────────────────────────────────────────
        'c-green':  '#4A9B7F',   // sage/forest green — welcome bg
        'c-navy':   '#1B3A6B',   // deep navy blue — game bg / text on light
        'c-coral':  '#E8635A',   // warm coral — results bg
        'c-sky':    '#5BA4CF',   // sky blue
        'c-yellow': '#F5E6A3',   // pale golden yellow
        'c-teal':   '#2D7D6F',   // darker teal
        'c-cream':  '#FFF8F0',   // warm cream — circle fill, text on dark
        'c-gold':   '#F0C040',   // golden yellow accent
        // ── Legacy dark-theme tokens (kept so any stray refs compile) ─────
        gold:         '#D4A853',
        navy:         '#0d1117',
        'navy-card':  '#131929',
        'navy-input': '#0a0f1a',
        'navy-border':'#1e2a3a',
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
          '0%, 100%': { boxShadow: '0 0 0 0   rgba(240,192,64,0.00)' },
          '50%':       { boxShadow: '0 0 0 8px rgba(240,192,64,0.30)' },
        },
        'hint-reveal': {
          '0%':   { transform: 'scale(0) rotate(-12deg)', opacity: '0' },
          '60%':  { transform: 'scale(1.2) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'scale(1)',                opacity: '1' },
        },
        'heart-deflate': {
          '0%':   { transform: 'scale(1)' },
          '40%':  { transform: 'scale(0.55)' },
          '100%': { transform: 'scale(1)' },
        },
        'fadeSlideIn': {
          'from': { opacity: '0', transform: 'translateY(20px)' },
          'to':   { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'flag-fade-in':  'flag-fade-in 300ms ease both',
        'delta-pop':     'delta-pop 280ms ease-out both',
        'btn-pulse':     'btn-pulse 2s ease-in-out infinite',
        'hint-reveal':   'hint-reveal 200ms ease-out both',
        'heart-deflate': 'heart-deflate 300ms ease-in-out both',
        'phase-enter':   'fadeSlideIn 400ms ease forwards',
      },
    },
  },
  plugins: [],
}
