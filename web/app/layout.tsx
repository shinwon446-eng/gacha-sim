import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { CurrencyHydrator } from "@/components/layout/CurrencyHydrator";

/**
 * 타이포그래피 (CLAUDE.md §2)
 *   전 사이트 단일 서체 — Pretendard Variable (한글·라틴·숫자 한 벌).
 *   제목·본문·숫자 모두 같은 가족을 쓰고 굵기(600~900)로만 위계를 만든다. 세리프(Cinzel)는 쓰지 않는다.
 *   가변 폰트 CSS 를 <head> 에서 preload + 동기 로드하고, globals.css 가 * 선택자로 폰트를 고정해
 *   정적 렌더링 직후에도 글꼴이 바뀌며 깜빡이지 않는다.
 */
const pretendard = localFont({ src: "../public/assets/fonts/PretendardVariable.woff2", variable: "--font-ui", display: "swap", weight: "45 920" });

export const metadata: Metadata = {
  title: "VOILA — You never know what’s next. | OPEN IT, OWN IT",
  description:
    "취향에 맞는 컬렉션을 발견하세요. 구성품과 확률을 확인하고, 개봉 결과부터 배송과 환급까지 VOILA에서 선택하세요.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={pretendard.variable}>
      <body className="min-h-screen bg-canvas font-sans text-white antialiased">
        <CurrencyHydrator />
        {children}
      </body>
    </html>
  );
}
