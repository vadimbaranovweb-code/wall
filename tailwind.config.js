/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono: ['"DM Mono"', 'monospace'],
      },
      colors: {
        canvas: '#F4F2EE',
        ink: {
          DEFAULT: '#1A1814',
          60: 'rgba(26,24,20,0.6)',
          30: 'rgba(26,24,20,0.3)',
          20: 'rgba(26,24,20,0.2)',
          10: 'rgba(26,24,20,0.1)',
        },
        card: {
          DEFAULT: '#FFFEF9',
          hover: '#FFFDF4',
        },
        accent: {
          DEFAULT: '#FF5733',
          light: '#FFF0ED',
        },
        wall: {
          teal:   '#2DD4BF',
          amber:  '#F59E0B',
          violet: '#8B5CF6',
          rose:   '#F43F5E',
          sky:    '#0EA5E9',
          lime:   '#84CC16',
        },
      },
      boxShadow: {
        card:         '0 1px 3px rgba(26,24,20,0.08), 0 1px 2px rgba(26,24,20,0.06)',
        'card-hover': '0 4px 12px rgba(26,24,20,0.12), 0 2px 4px rgba(26,24,20,0.08)',
        'card-drag':  '0 20px 40px rgba(26,24,20,0.18), 0 8px 16px rgba(26,24,20,0.12)',
        'card-selected': '0 0 0 2px #FF5733, 0 4px 12px rgba(26,24,20,0.12)',
      },
      borderRadius: {
        card: '10px',
      },
      keyframes: {
        'pop-in': {
          '0%':   { opacity: '0', transform: 'scale(0.88) translateY(8px)' },
          '100%': { opacity: '1', transform: 'scale(1)   translateY(0)' },
        },
        'fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        'pop-in':  'pop-in  0.2s cubic-bezier(0.34,1.56,0.64,1) both',
        'fade-in': 'fade-in 0.15s ease both',
      },
    },
  },
  plugins: [],
}
