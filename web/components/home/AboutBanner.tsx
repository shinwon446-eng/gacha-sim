"use client";
import { useTranslations } from "next-intl";
import { ArrowUpRight, ShieldCheck, PackageCheck, RefreshCw } from "lucide-react";
import { cn } from "@/lib/format";
import { Link } from "@/i18n/navigation";
export function AboutBanner({ className }: { className?: string }) {
  const t = useTranslations("design");
  return <div className={cn("assurance-strip page-shell", className)}>
    {[{ Icon: ShieldCheck, title: "trustOdds", body: "trustOddsBody", href: "/fairness" }, { Icon: PackageCheck, title: "trustShipping", body: "trustShippingBody", href: "/about" }, { Icon: RefreshCw, title: "trustChoice", body: "trustChoiceBody", href: "/about" }].map(({ Icon, title, body, href }) => <Link key={title} href={href} className="assurance-item"><Icon size={22} strokeWidth={1.3} aria-hidden /><span><strong>{t(title)}</strong><span>{t(body)}</span></span><ArrowUpRight size={15} className="ml-auto text-muted" aria-hidden /></Link>)}
  </div>;
}
export default AboutBanner;
