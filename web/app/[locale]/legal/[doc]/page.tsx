import { SiteHeader } from "@/components/layout/SiteHeader";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { LegalNav } from "@/components/legal/LegalNav";
import { Link } from "@/i18n/navigation";
import { LEGAL_DOCS as DOCS, LEGAL_VERSION, LEGAL_VALUES, LEGAL_SOURCES, type LegalDoc } from "@/lib/legal";

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => DOCS.map((doc) => ({ locale, doc })));
}
export const dynamicParams = false;

/** Versioned pre-launch policy drafts; source text lives in all three locale files. */
export default async function LegalPage({ params: { locale, doc } }: { params: { locale: string; doc: string } }) {
  if (!(DOCS as readonly string[]).includes(doc)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("legalDocs");
  const c = await getTranslations("legalCenter");
  const key = doc as LegalDoc;
  const sections = t.raw(`${key}.sections`) as { h: string; p: string }[];
  return (
    <main className="min-h-screen bg-canvas pb-16">
      <SiteHeader />
      <div className="mx-auto max-w-[1440px] border-b border-hairline px-5 py-5 sm:px-8"><LegalNav items={DOCS.map((d) => ({ key: d, title: t(`${d}.title`) }))} current={key} /></div>
      <article className="mx-auto w-full max-w-[900px] px-5 py-12 sm:px-8 md:py-20">
        <Link href="/legal" className="inline-flex min-h-11 items-center text-sm text-gold-champagne">← {c("title")}</Link>
        <div className="mt-5 text-xs font-medium tracking-wide text-gold-champagne">{c("draftBadge")}</div>
        <h1 className="mt-4 max-w-2xl break-keep font-display text-3xl font-semibold leading-tight tracking-tight text-white md:text-5xl">{t(`${key}.title`)}</h1>
        <p className="mt-5 text-base leading-8 text-secondary">{t(`${key}.summary`)}</p>
        <p className="mt-4 text-xs leading-6 text-muted">{c("version", { version: LEGAL_VERSION })} · {c("effective")}</p>
        <aside className="mt-8 rounded-xl border border-gold-champagne/25 bg-gold-champagne/[0.04] p-5 text-sm leading-7 text-secondary"><strong className="block font-medium text-white">{c("statusTitle")}</strong>{c("statusBody")}</aside>
        <nav aria-label={c("contents")} className="mt-10 rounded-xl border border-hairline p-5"><h2 className="text-sm font-semibold text-white">{c("contents")}</h2><ol className="mt-3 grid gap-x-6 sm:grid-cols-2">{sections.map((s, i) => <li key={i}><a className="flex min-h-11 items-center gap-3 text-sm leading-6 text-muted hover:text-white" href={`#section-${i + 1}`}><span className="text-xs tabular-nums text-gold-champagne">{String(i + 1).padStart(2, "0")}</span>{s.h}</a></li>)}</ol></nav>
        <div className="mt-12 space-y-9">
          {sections.map((s, i) => (
            <section className="scroll-mt-28 border-b border-hairline pb-9" id={`section-${i + 1}`} key={i}>
              <h2 className="text-lg font-semibold text-white">{i + 1}. {s.h}</h2>
              <p className="mt-3 whitespace-pre-line break-words text-[15px] leading-8 text-secondary">{t(`${key}.sections.${i}.p`, LEGAL_VALUES)}</p>
            </section>
          ))}
        </div>
        <aside className="mt-12 text-xs leading-6 text-muted"><h2 className="font-semibold text-white">{c("sourcesTitle")}</h2><p className="mt-2">{c("sourcesNote")}</p><ul className="mt-3 space-y-2">{LEGAL_SOURCES.map(s => <li key={s.key}><a href={s.href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-white">{c(`sources.${s.key}`)}<span className="sr-only"> — {c("newTab")}</span></a></li>)}</ul></aside>
      </article>
    </main>
  );
}
