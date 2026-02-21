/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './lib/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        aniva: {
          bg: '#0a0a0a',
          surface: '#141414',
          border: '#2a2a2a',
          primary: '#a855f7',
          'primary-dark': '#7c3aed',
          secondary: '#ec4899',
          text: '#ffffff',
          muted: '#9ca3af',
        },
      },
      fontFamily: {
        sans: ['System'],
      },
    },
  },
  plugins: [],
};
