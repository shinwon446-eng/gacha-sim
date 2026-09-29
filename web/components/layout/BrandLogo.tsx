"use client";
import { cn } from "@/lib/format";
import { Link } from "@/i18n/navigation";
export function BrandLogo({ size = "md", href = "/", asLink = true, className }: { size?: "sm" | "md" | "lg"; href?: string; asLink?: boolean; className?: string }) {
  const content = <><span className={cn("font-display font-black leading-none tracking-[-0.065em]", size === "lg" ? "text-[36px]" : size === "sm" ? "text-[23px]" : "text-[27px]")}>VOILA</span><svg viewBox="0 0 16 16" className={cn("ml-1.5 text-gold-champagne", size === "lg" ? "h-4 w-4" : "h-3 w-3")} fill="currentColor" aria-hidden="true"><path d="M8 0 10.15 5.85 16 8l-5.85 2.15L8 16l-2.15-5.85L0 8l5.85-2.15Z" /></svg></>;
  const styles = cn("inline-flex min-h-11 shrink-0 items-center whitespace-nowrap text-white", className);
  return asLink ? <Link href={href} className={styles} aria-label="VOILA">{content}</Link> : <span className={styles}>{content}</span>;
}
export default BrandLogo;
