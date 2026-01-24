/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          300: '#E6D5A8',
          400: '#E6C86E',
          500: '#D4AF37',
          600: '#B8960A',
        },
      },
      backgroundImage: {
        'dark-gradient': 'linear-gradient(135deg, #060606 0%, #0b0b10 50%, #101018 100%)',
      },
      boxShadow: {
        'glow': '0 0 20px rgba(212, 175, 55, 0.3)',
        'glow-lg': '0 0 40px rgba(212, 175, 55, 0.4)',
      },
    },
  },
  plugins: [],
}
