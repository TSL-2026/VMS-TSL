/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#ADD8E6",
        secondary: "#90EE90",
        background: "#F0F8FF",
      }
    },
  },
  plugins: [],
}