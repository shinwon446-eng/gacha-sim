import type { Metadata } from "next";
import { Cinzel, Inter } from "next/font/google";
import "./globals.css";
import { CurrencyHydrator } from "@/components/layout/CurrencyHydrator";

/**
 * 타이포그래피 (CLAUDE.md §2 / PROMPTS 1-1-3)
 *   display — Cinzel: 메인 타이틀·대형 숫자. 세리프 럭셔리, 묵직한 700/900.
 *   sans    — Pretendard(CDN, 한글·라틴 가변) → Inter(next/font, 라틴 폴백).
 * Pretendard 는 Google Fonts 에 없어 jsDelivr 정적 CSS 로 싣는다. 실패해도 Inter 로 떨어진다.
 */
const display = Cinzel({
  subsets: ["latin"],
  weight: ["600", "700", "900"],
  display: "swap",
  variable: "--font-display",
});

const sans = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

const PRETENDARD_CSS =
  "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css";

export const metadata: Metadata = {
  title: "GACHAFLIX — Luxury Mystery Box",
  description:
    "롤렉스, 에르메스, 하이엔드 테크. 100% 정품 실물 배송 및 95% 즉시 환전(USDT) 보장. 블록체인 기반의 가장 투명한 글로벌 럭셔리 플랫폼.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${display.variable} ${sans.variable}`}>
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link rel="stylesheet" href={PRETENDARD_CSS} />
      </head>
      <body className="min-h-screen bg-canvas font-sans text-white antialiased">
        <CurrencyHydrator />
        {children}
      </body>
    </html>
  );
}
