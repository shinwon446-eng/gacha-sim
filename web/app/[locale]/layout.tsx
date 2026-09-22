import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { routing, type Locale } from "@/i18n/routing";
import { LocaleHtmlLang } from "@/components/layout/LocaleHtmlLang";
import { Footer } from "@/components/layout/Footer";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";

/** 정적 export — 세 로케일을 전부 미리 생성한다. 목록 밖 로케일은 404. */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
export const dynamicParams = false;

const SITE = "https://shinwon446-eng.github.io/gacha-sim";
const TITLE = "GACHAFLIX — Luxury Mystery Box";
/** 로케일별 메타 설명 — /en/, /zh/ 에 한국어가 새지 않게 여기서 분기한다 */
const DESCRIPTION: Record<Locale, string> = {
  ko: "롤렉스, 에르메스, 하이엔드 테크. 100% 정품 실물 배송 및 95% 즉시 환전(USDT) 보장. 블록체인 기반의 가장 투명한 글로벌 럭셔리 플랫폼.",
  en: "Rolex, iPhone 16 Pro & High-End Tech. 100% Authentic delivery or 95% instant USDT cashout. The most transparent provably fair luxury platform.",
  zh: "劳力士、iPhone 16 Pro 与高端科技。100% 正品实物配送或 95% USDT 极速兑现。基于区块链的最透明全球奢品盲盒平台。",
};
const OG_LOCALE: Record<Locale, string> = { ko: "ko_KR", en: "en_US", zh: "zh_CN" };

export function generateMetadata({ params: { locale } }: { params: { locale: string } }): Metadata {
  const loc = ((routing.locales as readonly string[]).includes(locale) ? locale : routing.defaultLocale) as Locale;
  const description = DESCRIPTION[loc];
  return {
    title: TITLE,
    description,
    alternates: {
      canonical: `${SITE}/${loc}/`,
      languages: Object.fromEntries(routing.locales.map((l) => [l, `${SITE}/${l}/`])),
    },
    openGraph: {
      type: "website",
      siteName: "GACHAFLIX",
      title: TITLE,
      description,
      url: `${SITE}/${loc}/`,
      locale: OG_LOCALE[loc],
      alternateLocale: routing.locales.filter((l) => l !== loc).map((l) => OG_LOCALE[l as Locale]),
    },
    twitter: { card: "summary_large_image", title: TITLE, description },
  };
}

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!(routing.locales as readonly string[]).includes(locale)) notFound();
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <LocaleHtmlLang locale={locale as Locale} />
      {/* 모바일 하단 고정 내비(h-14) 만큼 여백 — 푸터까지 가려지지 않는다 */}
      <div className="pb-16 md:pb-0">
        {children}
        <Footer />
      </div>
      <MobileBottomNav />
    </NextIntlClientProvider>
  );
}
