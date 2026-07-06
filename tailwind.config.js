/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f0f4ff',
          100: '#e0eaff',
          200: '#c7d7fe',
          300: '#a5b9fc',
          400: '#8194f8',
          500: '#6470f1',
          600: '#4f51e5',
          700: '#4240ca',
          800: '#3737a3',
          900: '#323381',
          950: '#1e1d4c',
        },
        concrete: {
          50:  '#f8f7f4',
          100: '#eeece6',
          200: '#ddd9cf',
          300: '#c6c0b1',
          400: '#aca38f',
          500: '#9a8f7a',
          600: '#8d806c',
          700: '#756a5a',
          800: '#615849',
          900: '#4f493d',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
