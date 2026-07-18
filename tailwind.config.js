/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        forest: '#47775c',
        sage: '#dcebdc',
        cream: '#fff9ed',
        peach: '#ffe5c4',
        terracotta: '#bd6f45',
      },
      boxShadow: {
        soft: '0 10px 30px rgba(71, 119, 92, 0.10)',
      },
    },
  },
  plugins: [],
}
