import type { Config } from 'tailwindcss'

export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
    "./src/client/**/*.{vue,js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--color-primary)',
          600: 'var(--color-primary)'
        },
        secondary: {
          DEFAULT: 'var(--color-secondary)',
          600: 'var(--color-secondary)'
        }
      }
    }
  },
  plugins: []
} satisfies Config