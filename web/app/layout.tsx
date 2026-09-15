import type { Metadata } from "next";
import { Bebas_Neue, Inter } from "next/font/google";
import "./globals.css";

const display = Bebas_Neue({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  variable: "--font-display",
});

const sans = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "GACHAFLIX — 실물 릴 스트리밍",
  description:
    "MacBook Pro M4 Max, RTX 5090, Genelec 8341A. 확률은 전량 공개되며 결과는 실물 발송 또는 즉시 회수로 정산됩니다. 현재 프로토타입이며 잔액과 결제는 모의 데이터입니다.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${display.variable} ${sans.variable}`}>
      <body className="min-h-screen bg-canvas font-sans text-white antialiased">{children}</body>
    </html>
  );
}
