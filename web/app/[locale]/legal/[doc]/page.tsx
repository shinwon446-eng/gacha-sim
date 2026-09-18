import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";

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
      <header className="sticky top-0 z-40 flex items-center gap-4 border-b border-hairline bg-obsidian/90 px-[4%] py-3 backdrop-blur-md">
        <Link href="/" className="font-display text-xl font-bold uppercase leading-none tracking-tight text-crimson">
          Gachaflix
        </Link>
        <nav className="flex items-center gap-3 text-xs text-muted">
          {DOCS.map((d) => (
            <Link key={d} href={`/legal/${d}`} className={d === key ? "font-semibold text-white" : "hover:text-white"}>
              {t(`${d}.title`)}
            </Link>
          ))}
        </nav>
      </header>
      <article className="mx-auto w-full max-w-3xl px-[4%] pt-10">
        <div className="caption-luxury">{t("eyebrow")}</div>
        <h1 className="mt-2 font-display text-3xl font-bold uppercase tracking-tight text-white">{t(`${key}.title`)}</h1>
        <p className="mt-2 text-xs text-faint">{t("updated")}</p>
        <div className="mt-8 space-y-6">
          {sections.map((s, i) => (
            <section key={i}>
              <h2 className="text-base font-bold text-white">{s.h}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-secondary">{s.p}</p>
            </section>
          ))}
        </div>
      </article>
    </main>
  );
}
