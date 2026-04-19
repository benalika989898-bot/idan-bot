/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,tsx}",
    "./src/components/**/*.{js,ts,tsx}",
    "./src/screens/**/*.{js,ts,tsx}",
    "./src/shared/**/*.{js,ts,tsx}",
  ],

  presets: [require("nativewind/preset")],
  theme: {
    extend: {},
  },
  plugins: [],
};
