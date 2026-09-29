import { getTranslations, setRequestLocale } from "next-intl/server";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Link } from "@/i18n/navigation";
import { LEGAL_GROUPS, LEGAL_VERSION } from "@/lib/legal";

export default async function LegalCenter({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale);
  const t = await getTranslations("legalCenter");
  const d = await getTranslations("legalDocs");
  return <main className="min-h-screen bg-canvas"><SiteHeader />
    <div className="mx-auto max-w-[1200px] px-5 py-14 sm:px-8 md:py-20">
      <p className="text-xs uppercase tracking-[0.2em] text-gold-champagne">VOILA / POLICIES</p>
      <h1 className="mt-5 text-4xl font-semibold tracking-tight text-white md:text-6xl">{t("title")}</h1>
      <p className="mt-6 max-w-2xl text-base leading-8 text-secondary">{t("intro")}</p>
      <aside className="mt-9 rounded-xl border border-gold-champagne/25 bg-gold-champagne/[0.04] p-6">
        <p className="text-xs font-medium text-gold-champagne">{t("draftBadge")} · {LEGAL_VERSION}</p>
        <h2 className="mt-3 text-lg font-medium text-white">{t("statusTitle")}</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-secondary">{t("statusBody")}</p>
        <Link href="/legal/business" className="mt-4 inline-flex min-h-11 items-center text-sm text-gold-champagne underline underline-offset-4">{t("businessLink")} →</Link>
      </aside>
      {LEGAL_GROUPS.map(group => <section className="mt-14" key={group.key}><h2 className="text-lg font-semibold text-white">{t(`groups.${group.key}`)}</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{group.docs.map(doc => <Link key={doc} href={`/legal/${doc}`} className="group flex min-h-44 flex-col rounded-xl border border-hairline bg-surface p-6 transition-colors hover:border-gold-champagne/40"><h3 className="text-base font-semibold text-white">{d(`${doc}.title`)}</h3><p className="mt-3 flex-1 text-sm leading-7 text-secondary">{d(`${doc}.summary`)}</p><span aria-hidden className="mt-5 self-end text-gold-champagne">↗</span></Link>)}</div>
      </section>)}
      <p className="mt-12 text-xs leading-7 text-muted">{t("effective")} · {t("sourcesNote")}</p>
    </div>
  </main>;
}
