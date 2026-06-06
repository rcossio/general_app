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
      keyframes: {
        // Two quick up-and-down hops with a little pop, then rest — repeats each cycle.
        'badge-bounce': {
          '0%, 16%, 32%, 100%': { transform: 'translateY(0) scale(1)' },
          '8%, 24%': { transform: 'translateY(-110%) scale(1.2)' },
        },
        // Twinkle for the "fixed" sparkle marker.
        sparkle: {
          '0%, 100%': { transform: 'scale(1) rotate(0deg)', opacity: '1' },
          '50%': { transform: 'scale(1.3) rotate(8deg)', opacity: '0.7' },
        },
      },
      animation: {
        'badge-bounce': 'badge-bounce 3s ease-in-out infinite',
        sparkle: 'sparkle 1.8s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
export default config;
