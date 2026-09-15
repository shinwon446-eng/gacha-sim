import type { Config } from "tailwindcss";

/**
 * 시네마틱 다크 아키텍처 토큰.
 * 크림슨은 고임팩트 CTA 와 최상위 등급 트리거 전용. 그 외 모든 표면은 무채색.
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#080808",
        canvas: "#141414",
        surface: "#181818",
        elevation: "#1f1f1f",
        crimson: "#E50914",
        hairline: "rgba(255,255,255,0.08)",
        /** @deprecated crimson 사용. 전환 기간 동안만 유지된다. */
        accent: "#E50914",
      },
      scale: {
        "130": "1.3",
      },
      fontFamily: {
        display: ["var(--font-display)", "Oswald", "Impact", "sans-serif"],
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"],
      },
      transitionTimingFunction: {
        cine: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      transitionDuration: {
        "600": "600ms",
        "700": "700ms",
        "800": "800ms",
      },
      keyframes: {
        ticker: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        /** 필름 그레인 지터 — 미세 이동만, 밝기 변화 없음 */
        grain: {
          "0%, 100%": { transform: "translate3d(0, 0, 0)" },
          "10%": { transform: "translate3d(-2%, -3%, 0)" },
          "20%": { transform: "translate3d(-8%, 2%, 0)" },
          "30%": { transform: "translate3d(4%, -6%, 0)" },
          "40%": { transform: "translate3d(-3%, 5%, 0)" },
          "50%": { transform: "translate3d(-8%, 3%, 0)" },
          "60%": { transform: "translate3d(5%, 0, 0)" },
          "70%": { transform: "translate3d(-3%, -4%, 0)" },
          "80%": { transform: "translate3d(2%, 6%, 0)" },
          "90%": { transform: "translate3d(-6%, -2%, 0)" },
        },
        /** 셔터 스윕 — 위에서 아래로 닫히고 열리는 1축 스케일 */
        shutter: {
          "0%": { transform: "scaleY(0)", transformOrigin: "top" },
          "45%": { transform: "scaleY(1)", transformOrigin: "top" },
          "55%": { transform: "scaleY(1)", transformOrigin: "bottom" },
          "100%": { transform: "scaleY(0)", transformOrigin: "bottom" },
        },
        /** 프로젝터 램프 불안정 — 불투명도 스터터 */
        flicker: {
          "0%, 100%": { opacity: "1" },
          "12%": { opacity: "0.82" },
          "14%": { opacity: "1" },
          "42%": { opacity: "0.68" },
          "45%": { opacity: "1" },
          "62%": { opacity: "0.88" },
          "64%": { opacity: "1" },
        },
        /** 스캔라인 드리프트 — 수직 이동 */
        scanline: {
          "0%": { transform: "translateY(0)" },
          "100%": { transform: "translateY(4px)" },
        },
      },
      animation: {
        ticker: "ticker 45s linear infinite",
        grain: "grain 1.2s steps(6, end) infinite",
        shutter: "shutter 700ms cubic-bezier(0.16, 1, 0.3, 1) forwards",
        flicker: "flicker 2.8s linear infinite",
        scanline: "scanline 320ms linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
