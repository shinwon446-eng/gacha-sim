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

const SITE = "https://shinwon446-eng.github.io/gacha-sim";
const TITLE = "VOILA — 1달러부터 여는 럭셔리 랜덤박스";
const DESCRIPTION = "1달러부터 시작하는 럭셔리 랜덤박스 VOILA. 모든 상품 확률 100% 투명 공개, 당첨 상품 정품 무료 배송 또는 즉시 캐시백까지 한 번에 경험하세요.";
const IMAGE = `${SITE}/assets/photography/photo-1587836374828-4dbafa94cf0e.webp`;

export const metadata: Metadata = {
  applicationName: "VOILA",
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: "VOILA",
    title: TITLE,
    description: DESCRIPTION,
    url: `${SITE}/`,
    locale: "ko_KR",
    images: [{ url: IMAGE, alt: "VOILA 럭셔리 컬렉션" }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [IMAGE],
  },
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
