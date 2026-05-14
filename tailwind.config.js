/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/renderer/index.html",
    "./src/renderer/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        background: "#0d0d12", // Very dark background
        surface: "#141419", // Slightly lighter for panels
        surfaceHover: "#1f1f26",
        foreground: "#f3f4f6", // Light text
        border: "#262630",
        brand: {
          50: "#f3f0ff",
          100: "#e9e3ff",
          200: "#d4c8ff",
          300: "#b5a0ff",
          400: "#9271ff",
          500: "#7445ff", // Primary purple
          600: "#6025ff",
          700: "#5014ea",
          800: "#4310c3",
          900: "#360e9d",
        },
        success: {
          400: "#4ade80",
          500: "#22c55e",
        },
        warning: {
          400: "#facc15",
          500: "#eab308",
        },
        danger: {
          400: "#f87171",
          500: "#ef4444",
        }
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
}
