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
        ink: "#07101d",
        surface: "#0d1a2d",
        mist: "#b9c4d8",
        gold: "#d8b46b",
        pearl: "#f4ead7",
      },
      fontFamily: {
        sans: ["Montserrat", "Segoe UI", "sans-serif"],
        serif: ["Playfair Display", "Georgia", "serif"],
      },
      boxShadow: {
        glass: "0 20px 80px rgba(7, 16, 29, 0.45)",
      },
      backgroundImage: {
        aura: "radial-gradient(circle at 12% 12%, rgba(216,180,107,0.16), transparent 32%), radial-gradient(circle at 88% 0%, rgba(96,119,171,0.18), transparent 25%), linear-gradient(180deg, #07101d 0%, #0b1424 55%, #0d192c 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
