/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
          950: "#0b0f19",
        },
        surface: {
          primary: "#0B0C0E",
          secondary: "#0F1014",
          tertiary: "#131419",
          border: "#222328",
        },
        architectural: {
          canvas: "#0B0C0E",
          card: "#0F1014",
          elevated: "#131419",
          subtle: "#111216",
          border: "#222328",
          borderSubtle: "#1E1F24",
          hover: "#181920",
        },
        cyanGlow: "#06b6d4",
        emeraldGlow: "#10b981",
        amberGlow: "#f59e0b",
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        serif: ['"Instrument Serif"', "Georgia", "serif"],
        mono: ["JetBrains Mono", "Fira Code", "Menlo", "monospace"],
      },
      boxShadow: {
        glow: "0 0 25px -5px rgba(99, 102, 241, 0.25)",
        "glow-cyan": "0 0 25px -5px rgba(6, 182, 212, 0.25)",
        "glow-emerald": "0 0 25px -5px rgba(16, 185, 129, 0.25)",
      },
    },
  },
  plugins: [],
};
