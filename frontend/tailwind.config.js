/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ipl: {
          blue:   '#003087',
          gold:   '#FFD700',
          dark:   '#0a0e1a',
          card:   '#111827',
          border: '#1f2937',
        },
      },
    },
  },
  plugins: [],
}
