import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";
export default {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "media",
  theme: {
    extend: {
      colors: {
        brand: { 50: "#eef6ff", 100: "#d9eaff", 500: "#2f6fdd", 600: "#2458b8", 700: "#1d4690", 900: "#13294f" },
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
