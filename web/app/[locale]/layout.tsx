import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { routing, type Locale } from "@/i18n/routing";
import { LocaleHtmlLang } from "@/components/layout/LocaleHtmlLang";
import { Footer } from "@/components/layout/Footer";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { AuthHost } from "@/components/auth/AuthHost";
import { MotionPreferences } from "@/components/layout/MotionPreferences";

/** 정적 export — 세 로케일을 전부 미리 생성한다. 목록 밖 로케일은 404. */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
export const dynamicParams = false;

const SITE = "https://shinwon446-eng.github.io/gacha-sim";
const TITLE = "VOILA — You never know what’s next. | OPEN IT, OWN IT";
/** 로케일별 메타 설명 — /en/, /zh/ 에 한국어가 새지 않게 여기서 분기한다 */
const DESCRIPTION: Record<Locale, string> = {
  ko: "취향에 맞는 컬렉션을 발견하세요. 구성품과 확률을 확인하고, 개봉 결과부터 배송과 환급까지 VOILA에서 선택하세요.",
  en: "Discover your next collection with VOILA. Explore the contents and published odds, then choose delivery or the displayed refund value for your items.",
  zh: "在 VOILA 发现心仪系列。查看商品与公开概率，开启后选择实物配送或按显示金额兑换余额。",
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
      <MotionPreferences>
      <LocaleHtmlLang locale={locale as Locale} />
      {/* 모바일 하단 고정 내비(h-14) 만큼 여백 — 푸터까지 가려지지 않는다 */}
      <div className="pb-[calc(64px+env(safe-area-inset-bottom))] md:pb-0">
        {children}
        <Footer />
      </div>
      <MobileBottomNav />
      {/* 로그인·회원가입 모달과 확인 토스트 — 어느 페이지에서든 열린다 */}
      <AuthHost />
      </MotionPreferences>
    </NextIntlClientProvider>
  );
}
