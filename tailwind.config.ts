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
          100: "hsl(var(--subtle))",
          200: "hsl(var(--border))",
          300: "hsl(var(--border-strong))",
          400: "hsl(var(--muted-fg))",
          500: "hsl(var(--muted-fg))",
          600: "hsl(var(--fg-muted))",
          700: "hsl(var(--fg))",
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
          DEFAULT: "hsl(0 84% 60%)",
          foreground: "#FFFFFF",
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
