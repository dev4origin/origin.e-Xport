/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: "hsl(var(--card))",
        "card-foreground": "hsl(var(--card-foreground))",
        popover: "hsl(var(--popover))",
        "popover-foreground": "hsl(var(--popover-foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          purple: "#6A4C93",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",

        // Spec Specific Colors - Vars must be HSL in CSS or Hex fallback here
        // Since --action-blue etc are defined as Hex in CSS but unused in HSL way, 
        // we should map them carefully.
        // Wait, in index.css I set --action-blue: #1982C4; (Hex).
        // HSL() wrapper will BREAK Hex values.
        // For spec-specific colors that are static Hex in CSS, we can reference them directly OR use var without HSL.
        // BUT, for consistency I should make everything HSL in CSS or just use vars here.
        // Let's check index.css again. 
        // --action-blue was set to #1982C4. 
        // So "var(--action-blue)" IS CORRECT for those specific ones IF they are Hex.
        // BUT standard Shadcn vars (background, etc) are HSL channels.

        action: {
          DEFAULT: "var(--action-blue)", // Hex in CSS
          blue: "#1982C4",
        },
        success: {
          DEFAULT: "var(--success-green)", // Hex in CSS
          green: "#8AC926",
        },
        warning: {
          DEFAULT: "var(--warning-yellow)", // Hex in CSS
          yellow: "#FFCA3A",
        },
        danger: {
          DEFAULT: "var(--danger-red)", // Hex in CSS
          red: "#FF595E",
        },

        sidebar: {
          DEFAULT: "var(--sidebar-background)", // Hex in CSS
          foreground: "var(--sidebar-foreground)", // Hex
          primary: "var(--sidebar-primary)", // Hex
          "primary-foreground": "var(--sidebar-primary-foreground)", // Hex
          accent: "var(--sidebar-accent)", // Hex
          "accent-foreground": "var(--sidebar-accent-foreground)", // Hex
          border: "var(--sidebar-border)", // Hex
          ring: "var(--sidebar-ring)", // Hex
        },
      },
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", '"San Francisco"', '"Segoe UI"', "Roboto", '"Helvetica Neue"', "sans-serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
}
