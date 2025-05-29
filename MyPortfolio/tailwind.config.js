/** @type {import('tailwindcss').Config} */
export default {
  content: [ 
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./server/**/*.{js,html}"
  ],
  theme: {
    extend: {
      screens: {
        '3xl':'108rem',
        '4xl':'116rem',
      },
    },
    colors: {
      'yellow': {
        100: '#fffacd',
        200: '#ffd700',
      },
      'purple': {
        100: '#a67cba',
        200: '#9370db',
        300: '#6a5acd',
        400: '#47399d',
        500: '#8a2be2',
        600: '#4b0082',
      },
      'pink': {
        100: '#ffb6c1',
        200: '#da70d6',
      },
      'bg-homepage': '#2f2f45',
      'screen-color-gradient': {
        'gradient1': '#7ea0f4',
        'gradient2': '#eac4fa',
      },
      'console-button': '#d9d9d9',
    },
  },
  plugins: [],
}

