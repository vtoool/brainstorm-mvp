import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
    "./src/lib/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1rem",
    },
    extend: {
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
      },
      boxShadow: {
        soft: "0 10px 25px rgba(0, 0, 0, 0.06)",
      },
      colors: {
        accent: {
          50: "#eef2ff",
          100: "#e0e7ff",
          500: "#7c5cff",
          600: "#6b4cff",
        },
      },
    },
  },
  plugins: [],
};

export default config;
