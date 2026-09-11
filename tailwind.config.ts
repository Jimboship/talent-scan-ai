import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        background: "#0b1020",
        panel: "#111827",
        card: "#1f2937",
        primary: {
          50: "#eef4ff",
          100: "#dceaff",
          500: "#5b8def",
          600: "#4477eb"
        }
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(91,141,239,0.5), 0 10px 30px rgba(91,141,239,0.25)"
      }
    }
  },
  darkMode: "class",
  plugins: []
};

export default config;
