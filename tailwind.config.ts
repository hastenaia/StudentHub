import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gray: {
          50: "hsl(var(--subtle-2))",
          100: "hsl(var(--subtle))",
          200: "hsl(var(--border))",
          300: "hsl(var(--border-strong))",
          400: "hsl(var(--muted-fg))",
          500: "hsl(var(--muted-fg))",
          600: "hsl(var(--fg-muted))",
          700: "hsl(var(--fg))",
        },
        emerald: {
          50: "hsl(var(--c-emerald-50))",
          100: "hsl(var(--c-emerald-100))",
          200: "hsl(var(--c-emerald-200))",
          600: "hsl(var(--c-emerald-600))",
          700: "hsl(var(--c-emerald-700))",
        },
        sky: {
          50: "hsl(var(--c-sky-50))",
          100: "hsl(var(--c-sky-100))",
          200: "hsl(var(--c-sky-200))",
          600: "hsl(var(--c-sky-600))",
          700: "hsl(var(--c-sky-700))",
          900: "hsl(var(--c-sky-900))",
        },
        amber: {
          50: "hsl(var(--c-amber-50))",
          100: "hsl(var(--c-amber-100))",
          200: "hsl(var(--c-amber-200))",
          600: "hsl(var(--c-amber-600))",
          700: "hsl(var(--c-amber-700))",
          800: "hsl(var(--c-amber-800))",
        },
        purple: {
          50: "hsl(var(--c-purple-50))",
          100: "hsl(var(--c-purple-100))",
          300: "hsl(var(--c-purple-300))",
          600: "hsl(var(--c-purple-600))",
          700: "hsl(var(--c-purple-700))",
        },
        red: {
          50: "hsl(var(--c-red-50))",
          100: "hsl(var(--c-red-100))",
          200: "hsl(var(--c-red-200))",
          600: "hsl(var(--c-red-600))",
          700: "hsl(var(--c-red-700))",
          800: "hsl(var(--c-red-800))",
          900: "hsl(var(--c-red-900))",
        },
        green: {
          50: "hsl(var(--c-green-50))",
          200: "hsl(var(--c-green-200))",
          600: "hsl(var(--c-green-600))",
          800: "hsl(var(--c-green-800))",
        },
        orange: {
          50: "hsl(var(--c-orange-50))",
          700: "hsl(var(--c-orange-700))",
        },
        yellow: {
          100: "hsl(var(--c-yellow-100))",
          200: "hsl(var(--c-yellow-200))",
        },
        brand: {
          royal: "#0033A0",
          "royal-dark": "#002478",
          sky: "#87CEEB",
          white: "#FFFFFF",
          gray: "hsl(var(--surface-muted))",
          dark: "hsl(var(--fg))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "#0033A0",
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#87CEEB",
          foreground: "#1A1A1A",
        },
        destructive: {
          // red-600, matching the button's pre-token color (white text keeps 4.5:1)
          DEFAULT: "hsl(0 72.2% 50.6%)",
          foreground: "#FFFFFF",
          hover: "hsl(0 73.7% 41.8%)",
        },
        success: {
          DEFAULT: "hsl(161.4 93.5% 30.4%)",
          hover: "hsl(162.9 93.5% 24.3%)",
        },
        muted: {
          DEFAULT: "hsl(var(--surface-muted))",
          foreground: "hsl(var(--muted-fg))",
        },
        accent: {
          DEFAULT: "hsl(var(--subtle))",
          foreground: "hsl(var(--royal-text))",
        },
        card: {
          DEFAULT: "hsl(var(--surface))",
          foreground: "hsl(var(--fg))",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        lg: "0.75rem",
        md: "0.5rem",
        sm: "0.375rem",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.2s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
