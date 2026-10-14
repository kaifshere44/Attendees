/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        yankees: {
          blue: '#1C2841',
        },
        burlywood: {
          DEFAULT: '#DEB887',
        },
        light: {
          bg: '#F7F5F0',
        },
      },
    },
  },
  plugins: [],
}
