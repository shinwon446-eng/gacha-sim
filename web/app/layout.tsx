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
  title: "VOILA — You never know what’s next. | OPEN IT, OWN IT",
  description:
    "스위스 명품 워치부터 테슬라 사이버트럭까지. 100% 온체인 공정성 · 전 품목 95% 즉시 캐시백 · 정품 300% 보증 실물 무료 배송. 글로벌 럭셔리 언박싱 플랫폼 VOILA (voila.gg).",
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
