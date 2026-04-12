import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class',
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./modules/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--bg)",
        foreground: "var(--black)",
        surface: "var(--surface)",
        brand: {
          green: "var(--green)",
          photinia: "var(--photinia)",
          "green-light": "var(--green-light)",
          "photinia-light": "var(--photinia-light)",
          "green-dark": "var(--green-dark)",
          "photinia-dark": "var(--photinia-dark)",
          border: "var(--border)",
          gray: "var(--gray)",
          text: "var(--text)",
          black: "var(--black)",
        },
      },
      fontFamily: {
        rubik: ['var(--font-rubik)', 'sans-serif'],
        jakarta: ['var(--font-jakarta)', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
