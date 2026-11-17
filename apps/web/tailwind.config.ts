import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#ECEFEC",
        surface: {
          DEFAULT: "#FFFFFF",
          soft: "#F7F9F7",
          sunken: "#F1F4F1",
        },
        line: {
          DEFAULT: "#E7ECE8",
          strong: "#DCE3DD",
        },
        ink: {
          DEFAULT: "#121715",
          muted: "#737B77",
          soft: "#9BA29E",
        },
        brand: {
          50: "#EAF6EF",
          100: "#D3EBDD",
          200: "#A9D8BE",
          300: "#77BE9B",
          400: "#46A177",
          500: "#2C8560",
          600: "#1F6B4B",
          700: "#18553C",
          800: "#123F2D",
          900: "#0D2E21",
        },
      },
      fontFamily: {
        sans: ["var(--font-jakarta)", "system-ui", "Segoe UI", "sans-serif"],
      },
      borderRadius: {
        card: "22px",
        xl2: "18px",
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(18 23 21 / 0.03), 0 12px 28px -18px rgb(18 23 21 / 0.14)",
        shell: "0 24px 60px -30px rgb(18 23 21 / 0.28)",
        lift: "0 18px 40px -24px rgb(18 23 21 / 0.30)",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        fadeIn: "fadeIn 180ms ease-out both",
        slideUp: "slideUp 220ms ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
