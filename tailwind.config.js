/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        youtube: {
          red: '#FF0000',
          black: '#282828',
          gray: '#909090',
        },
      },
      spacing: {
        '18': '4.5rem',
      },
    },
  },
  plugins: [],
}