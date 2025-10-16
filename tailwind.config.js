module.exports = {
  content: [
    "./views/**/*.{ejs,html}",
    "./public/**/*.js",
    "./*.{ejs,html,js}"
  ],
  theme: { extend: {} },
  safelist: [
    // modal + overlay + arbitrary utilities we use
    "fixed","inset-0","z-50","bg-black/50",
    "left-1/2","top-1/2","-translate-x-1/2","-translate-y-1/2",
    "w-[600px]","max-w-[calc(100vw-32px)]","max-h-[80vh]","overflow-y-auto",
    "rounded-[8px]","shadow-[0_10px_30px_rgba(0,0,0,0.2)]","p-5",
    "sticky","top-0","border-b","text-center","font-semibold"
  ],
  plugins: [],
};
  