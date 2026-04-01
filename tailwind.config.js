/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#4A90E2',
          blue: '#4A90E2',
        },
        'text-primary': '#2D3748',
        'error-red': '#E53E3E',
        'border-gray': '#E2E8F0',
      },
    },
  },
  plugins: [],
}