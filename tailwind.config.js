/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        forest: 'hsl(var(--color-forest) / <alpha-value>)',
        sage: 'hsl(var(--color-sage) / <alpha-value>)',
        cream: 'hsl(var(--color-canvas) / <alpha-value>)',
        peach: 'hsl(var(--color-peach) / <alpha-value>)',
        terracotta: 'hsl(var(--color-terracotta) / <alpha-value>)',
      },
      boxShadow: {
        soft: '0 10px 30px rgba(71, 119, 92, 0.10)',
      },
    },
  },
  plugins: [],
}
