/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        canvas: 'var(--canvas)',
        surface: 'var(--surface)',
        'text-strong': 'var(--text-strong)',
        'text-muted': 'var(--text-muted)',
        border: 'var(--border)',
        'border-strong': 'var(--border-strong)',
        brand: 'var(--brand)',
        navy: 'var(--navy)',
        'navy-strong': 'var(--navy-strong)',
        gold: 'var(--gold)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
