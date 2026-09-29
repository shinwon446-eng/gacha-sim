import { SiteHeader } from "@/components/layout/SiteHeader";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { LegalNav } from "@/components/legal/LegalNav";

const DOCS = ["terms", "privacy", "policy", "faq"] as const;
type Doc = (typeof DOCS)[number];

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => DOCS.map((doc) => ({ locale, doc })));
}
export const dynamicParams = false;

/** 이용약관 · 개인정보처리방침 · 배송 및 95% 환전 정책 · FAQ — 문안은 messages `legalDocs.*` */
export default async function LegalPage({ params: { locale, doc } }: { params: { locale: string; doc: string } }) {
  if (!(DOCS as readonly string[]).includes(doc)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("legalDocs");
  const key = doc as Doc;
  const sections = t.raw(`${key}.sections`) as { h: string; p: string }[];
  return (
    <main className="min-h-screen bg-canvas pb-16">
      <SiteHeader />
      <div className="mx-auto max-w-[1440px] border-b border-hairline px-5 py-5 sm:px-8"><LegalNav items={DOCS.map((d) => ({ key: d, title: t(`${d}.title`) }))} current={key} /></div>
      <article className="mx-auto w-full max-w-[800px] px-5 py-12 sm:px-8 md:py-20">
        <div className="caption-luxury">{t("eyebrow")}</div>
        <h1 className="mt-4 max-w-2xl break-keep font-display text-3xl font-semibold leading-tight tracking-tight text-white md:text-5xl">{t(`${key}.title`)}</h1>
        <p className="mt-5 text-sm text-muted">{t("updated")}</p>
        <div className="mt-12 space-y-9">
          {sections.map((s, i) => (
            <section key={i}>
              <h2 className="text-lg font-semibold text-white">{s.h}</h2>
              <p className="mt-3 whitespace-pre-line break-keep text-[15px] leading-8 text-secondary">{s.p}</p>
            </section>
          ))}
        </div>
      </article>
    </main>
  );
}
