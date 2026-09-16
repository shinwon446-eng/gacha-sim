import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { routing, type Locale } from "@/i18n/routing";
import { LocaleHtmlLang } from "@/components/layout/LocaleHtmlLang";

/** 정적 export — 세 로케일을 전부 미리 생성한다. 목록 밖 로케일은 404. */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
export const dynamicParams = false;

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
      {children}
    </NextIntlClientProvider>
  );
}
