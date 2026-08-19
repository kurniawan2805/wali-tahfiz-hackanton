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
        canvas: 'hsl(var(--color-canvas) / <alpha-value>)',
        surface: 'hsl(var(--color-surface) / <alpha-value>)',
        'surface-raised': 'hsl(var(--color-surface-raised) / <alpha-value>)',
        'surface-muted': 'hsl(var(--color-surface-muted) / <alpha-value>)',
        ink: 'hsl(var(--color-ink) / <alpha-value>)',
        muted: 'hsl(var(--color-muted) / <alpha-value>)',
        border: 'hsl(var(--color-border) / <alpha-value>)',
        hero: 'hsl(var(--color-hero) / <alpha-value>)',
        'surface-warm': 'hsl(var(--color-surface-warm) / <alpha-value>)',
        'surface-warning': 'hsl(var(--color-surface-warning) / <alpha-value>)',
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
