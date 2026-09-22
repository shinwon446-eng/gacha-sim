import type { Config } from "tailwindcss";

/**
 * GACHAFLIX Ultra-Luxury 토큰 (CLAUDE.md §2).
 * 옵시디언/캔버스 다크 + 샴페인 골드 메탈릭 + 넷플릭스 크림슨 CTA. 네온 금지.
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // ── 배경 (CLAUDE.md §2-A) ──
        /** 최심도 — 헤더·모달 오버레이 */
        obsidian: "#0B0B0B",
        /** 넷플릭스 캔버스 */
        canvas: "#141414",
        /** 카드 표면 */
        surface: "#181818",
        /** 호버·활성 표면 */
        elevation: "#222222",
        /** @deprecated obsidian 사용 */
        ink: "#0B0B0B",

        // ── 메탈릭·럭셔리 액센트 ──
        gold: {
          champagne: "#E6CA65",
          metallic: "#D4AF37",
          dark: "#A27B1E",
        },
        /** 브랜드 CTA 전용 */
        crimson: "#E50914",
        platinum: { ice: "#E5E4E2" },
        bronze: { executive: "#C5A059" },

        // ── 텍스트 ──
        /** 본문 90% 화이트 */
        secondary: "#E5E5E5",
        /** 캡션 */
        muted: "#9CA3AF",
        /** 메타·법적 고지 */
        faint: "#6B7280",
        /** 1px 구분선 (헤어라인 유틸이 우선) */
        line: "#2A2A2A",
        hairline: "rgba(255,255,255,0.08)",

        /**
         * 프레스티지 등급 (CLAUDE.md §3). 배수 파생 — lib/tiers.ts 가 원천.
         * ROYAL 20x+ / PRESTIGE 6~20x / EXECUTIVE 2~6x / CURATED 기본 보장
         */
        tier: {
          royal: "#E6CA65",
          prestige: "#93C5FD",
          executive: "#C084FC",
          curated: "#94A3B8",
        },
      },
      letterSpacing: {
        /** 초정밀 캡션 트래킹 */
        luxury: "0.2em",
      },
      scale: {
        "130": "1.3",
      },
      fontFamily: {
        /** 전 사이트 단일 서체 — 제목·본문·숫자 모두 Pretendard, 위계는 굵기로만 */
        display: ["Pretendard Variable", "Pretendard", "-apple-system", "BlinkMacSystemFont", "system-ui", "Roboto", "sans-serif"],
        sans: ["Pretendard Variable", "Pretendard", "-apple-system", "BlinkMacSystemFont", "system-ui", "Roboto", "sans-serif"],
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
