import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";
export default {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "media",
  theme: {
    extend: {
      fontFamily: { sans: ["-apple-system", "BlinkMacSystemFont", "\"SF Pro Text\"", "\"Segoe UI\"", "Roboto", "\"Helvetica Neue\"", "Arial", "sans-serif"] },
      borderRadius: { "2xl": "18px", "3xl": "24px" },
      colors: {
        brand: { 50: "#EAF3FE", 100: "#D6E8FD", 500: "#0071E3", 600: "#0066CC", 700: "#0058B0", 900: "#0B2A4F" },
        ink: { DEFAULT: "#1D1D1F", 2: "#6E6E73" },
      },
    },
  },
  plugins: [
    typography,
    // "prose-quoteless": drop the curly quotes typography adds around blockquotes
    ({ addUtilities }: { addUtilities: (u: Record<string, Record<string, string>>) => void }) =>
      addUtilities({
        ".prose-quoteless blockquote p:first-of-type::before": { content: "none" },
        ".prose-quoteless blockquote p:last-of-type::after": { content: "none" },
      }),
  ],
} satisfies Config;
