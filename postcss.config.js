/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
  "./public/*.{html,js,css}",
  "./views/*.ejs",
  "./views/upload/*.ejs",
  "./views/content/*.ejs",
  "./views/templates/*.ejs",
  "./public/js/*.js"
],
  theme: {
    extend: {},
  },
  plugins: [],
}
