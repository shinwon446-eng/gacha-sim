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
const TITLE = "VOILA — You never know what’s next. | OPEN IT, OWN IT";
/** 로케일별 메타 설명 — /en/, /zh/ 에 한국어가 새지 않게 여기서 분기한다 */
const DESCRIPTION: Record<Locale, string> = {
  ko: "스위스 명품 워치부터 테슬라 사이버트럭까지. 100% 온체인 공정성 · 전 품목 95% 즉시 캐시백 · 정품 300% 보증 실물 무료 배송. 글로벌 럭셔리 언박싱 플랫폼 VOILA (voila.gg).",
  en: "From Swiss Luxury Watches to Tesla Cybertruck. Provably Fair On-Chain · 95% Instant Cashback · 100% Authentic Free Global Shipping. VOILA (voila.gg) — You never know what’s next. OPEN IT, OWN IT.",
  zh: "从瑞士名表到特斯拉赛博皮卡。100% 链上可验证公平 · 全品类 95% 极速返现 · 300% 正品保障全球包邮。全球奢品开箱平台 VOILA (voila.gg)。",
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
      siteName: "VOILA",
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
