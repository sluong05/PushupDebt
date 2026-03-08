/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        navy: {
          50:  '#dce6ff', // primary text
          100: '#b0c5f0', // secondary text
          200: '#7c9be0', // muted text
          300: '#4a6fc0', // dim text / subtle icons
          400: '#2d4e96', // borders
          500: '#243f82', // card background
          600: '#1e3975', // PAGE BACKGROUND (user's color)
          700: '#162d62', // darker sections / navbar
          800: '#0f1f45', // input backgrounds
          900: '#091530', // overlays / deepest
          950: '#04101e', // near-black navy
        },
      },
    },
  },
  plugins: [],
};
