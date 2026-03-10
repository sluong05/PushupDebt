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
          50:  '#F9FAFB', // cream primary text
          100: '#F3F4F6', // warm soft secondary text
          200: '#9CA3AF', // muted warm gray text
          300: '#6B7280', // dim warm gray / subtle icons
          400: '#374151', // warm gray borders
          500: '#273449', // card background (lighter than page bg)
          600: '#1E293B', // PAGE BACKGROUND
          700: '#16202E', // navbar / darker sections
          800: '#0F1929', // input backgrounds
          900: '#09101A', // overlays / deepest
          950: '#040A10', // near-black
        },
      },
    },
  },
  plugins: [],
};
