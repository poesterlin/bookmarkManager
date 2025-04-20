/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{svelte,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#FFF1F6',
          100: '#FFE2ED',
          200: '#FFC5DB',
          300: '#FFA0C2',
          400: '#FF80AA',
          500: '#FF6B98', // Main primary color
          600: '#FF4782',
          700: '#FF2D6F',
          800: '#FF1A5D',
          900: '#FF0047',
        },
        secondary: {
          50: '#F4F0FC',
          100: '#E9E1F9',
          200: '#D3C4F3',
          300: '#BEA7ED',
          400: '#B093E6',
          500: '#A17FE0', // Main secondary color
          600: '#8F67D9',
          700: '#7D50D2',
          800: '#6B38CB',
          900: '#5920C4',
        },
        accent: {
          50: '#EEFCFA',
          100: '#D5F7F1',
          200: '#AEEFE4',
          300: '#86E6D7',
          400: '#5EEAD4', // Main accent color
          500: '#36D6C3',
          600: '#24B6A5',
          700: '#1A8A7E',
          800: '#136E64',
          900: '#0B544D',
        },
      },
      fontFamily: {
        sans: ['Nunito', 'ui-sans-serif', 'system-ui'],
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
}