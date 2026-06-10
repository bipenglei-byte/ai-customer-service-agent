import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#1f2933",
        mist: "#f4f7f6",
        moss: "#3f6f5f",
        coral: "#d96f55",
        gold: "#c6923d"
      },
      boxShadow: {
        panel: "0 18px 45px rgba(31, 41, 51, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
