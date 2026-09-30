/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        // Shared with the portfolio: Poppins headings/buttons, Outfit body text.
        // Fredoka One is kept only for the FLAG EXPLORER wordmark.
        heading: ['Poppins', 'system-ui', 'sans-serif'],
        body:    ['Outfit', 'system-ui', 'sans-serif'],
        logo:    ['"Fredoka One"', 'cursive'],
      },
      colors: {
        // ── Navy / teal palette (mirrors the CSS variables in index.css) ───
        'c-navy':      '#0A4B82',   // screen backgrounds
        'c-navy-deep': '#073861',   // text on teal fills
        'c-ink':       '#0B2A4A',   // text on white cards
        'c-teal':      '#2EC4A6',   // main accent
        'c-sky':       '#7CC6F3',   // fields still to fill in
        'c-coral':     '#E8635A',   // wrong answers
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
          '0%, 100%': { boxShadow: '0 0 0 0   rgba(46,196,166,0.00)' },
          '50%':       { boxShadow: '0 0 0 8px rgba(46,196,166,0.30)' },
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
        'btn-bounce': {
          '0%':   { transform: 'scale(1)' },
          '40%':  { transform: 'scale(1.05)' },
          '70%':  { transform: 'scale(0.97)' },
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
        'btn-bounce':    'btn-bounce 400ms ease-in-out both',
      },
    },
  },
  plugins: [],
}
