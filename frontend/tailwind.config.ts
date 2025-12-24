import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          500: "#1D4ED8",
          600: "#1E3A8A"
        }
      },
      fontFamily: {
        display: ["Poppins", "system-ui", "sans-serif"],
        body: ["Inter", "system-ui", "sans-serif"]
      },
      backgroundImage: {
        "hero-grid": "linear-gradient(135deg, rgba(13,25,54,0.7), rgba(10,56,96,0.7))"
      }
    }
  },
  plugins: []
};

export default config;
