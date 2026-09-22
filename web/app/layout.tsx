import type { Metadata } from "next";
import "./globals.css";
import { CurrencyHydrator } from "@/components/layout/CurrencyHydrator";

/**
 * 타이포그래피 (CLAUDE.md §2)
 *   전 사이트 단일 서체 — Pretendard Variable (한글·라틴·숫자 한 벌).
 *   제목·본문·숫자 모두 같은 가족을 쓰고 굵기(600~900)로만 위계를 만든다. 세리프(Cinzel)는 쓰지 않는다.
 *   가변 폰트 CSS 를 <head> 에서 preload + 동기 로드하고, globals.css 가 * 선택자로 폰트를 고정해
 *   정적 렌더링 직후에도 글꼴이 바뀌며 깜빡이지 않는다.
 */
const PRETENDARD_CSS = "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css";

export const metadata: Metadata = {
  title: "GACHAFLIX — Luxury Mystery Box",
  description:
    "롤렉스, 에르메스, 하이엔드 테크. 100% 정품 실물 배송 및 95% 즉시 환전(USDT) 보장. 블록체인 기반의 가장 투명한 글로벌 럭셔리 플랫폼.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link rel="preload" as="style" href={PRETENDARD_CSS} />
        <link rel="stylesheet" href={PRETENDARD_CSS} />
      </head>
      <body className="min-h-screen bg-canvas font-sans text-white antialiased">
        <CurrencyHydrator />
        {children}
      </body>
    </html>
  );
}
