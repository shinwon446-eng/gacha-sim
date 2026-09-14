import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GACHAFLIX — 시네마틱 실물 가챠",
  description: "포켓몬 카드, 사이버트럭, 롤렉스. 영화관에서 뽑는 실물 가챠.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-canvas font-sans text-white antialiased">{children}</body>
    </html>
  );
}
