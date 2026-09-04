/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Warm, earthen palette - clay, sand and ink rather than primary blue.
        cream: '#FCFAF7',
        sand: '#F3EDE6',
        ink: {
          DEFAULT: '#1F1B18',
          muted: '#6F655D',
          soft: '#9A8F86',
        },
        clay: {
          50: '#FBF6F3',
          100: '#F4E8E1',
          200: '#E7CFC1',
          300: '#D6AF99',
          400: '#C28C6E',
          500: '#A96F4C',
          600: '#8F5739',
          700: '#74452E',
          800: '#5C3726',
          900: '#4A2D20',
        },
        moss: {
          100: '#E7EDE6',
          500: '#5F7A5B',
          600: '#4B6248',
          700: '#3A4C38',
        },
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'Cambria', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(31,27,24,0.04), 0 8px 24px -12px rgba(31,27,24,0.12)',
        lift: '0 2px 4px rgba(31,27,24,0.04), 0 18px 40px -20px rgba(31,27,24,0.25)',
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.125rem',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.4s ease-out both',
        shimmer: 'shimmer 1.6s infinite',
      },
    },
  },
  plugins: [],
};
