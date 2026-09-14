import type { Config } from "tailwindcss";

// 넷플릭스 다크 시네마틱 팔레트
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#141414",
        surface: "#181818",
        elevation: "#232323",
        accent: "#E50914",
        gold: "#FFD700",
      },
      scale: {
        "130": "1.3",
      },
      fontFamily: {
        sans: [
          '"Netflix Sans"',
          '"Helvetica Neue"',
          '"Segoe UI"',
          '"Apple SD Gothic Neo"',
          '"Malgun Gothic"',
          "sans-serif",
        ],
      },
      keyframes: {
        ticker: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        holo: {
          "0%": { transform: "translateX(-120%) rotate(12deg)" },
          "100%": { transform: "translateX(220%) rotate(12deg)" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 24px 0 rgba(255,215,0,0.35)" },
          "50%": { boxShadow: "0 0 64px 8px rgba(255,215,0,0.75)" },
        },
        floaty: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
      },
      animation: {
        ticker: "ticker 45s linear infinite",
        shimmer: "shimmer 3s linear infinite",
        holo: "holo 2.4s ease-in-out infinite",
        pulseGlow: "pulseGlow 1.8s ease-in-out infinite",
        floaty: "floaty 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
