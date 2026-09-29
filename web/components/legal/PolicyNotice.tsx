"use client";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

/** Informational links, not a simulated consent or support submission. */
export function PolicyNotice({ kind = "money" }: { kind?: "money" | "delivery" | "community" | "account" }) {
  const t = useTranslations("legalCenter");
  const td = useTranslations("legalDocs");
  const docs = kind === "account" ? ["terms", "privacy", "cookies"] : kind === "delivery" ? ["policy", "refunds", "privacy"] : kind === "community" ? ["community", "privacy"] : ["payments", "withdrawals", "refunds"];
  return <aside className="my-5 rounded-lg border border-hairline bg-obsidian/50 p-4 text-xs leading-6 text-secondary">
    <p>{t(`notice.${kind}`)}</p>
    <div className="mt-2 flex flex-wrap gap-x-4">{docs.map(doc => <Link key={doc} href={`/legal/${doc}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center font-medium text-gold-champagne underline underline-offset-4">{td(`${doc}.title`)}<span className="sr-only">, {t("newTab")}</span></Link>)}</div>
  </aside>;
}
