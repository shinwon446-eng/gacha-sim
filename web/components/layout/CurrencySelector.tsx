"use client";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/format";
import { useCurrency } from "@/lib/useCurrency";
import { CURRENCIES, type Currency } from "@/stores/currencyStore";
export function CurrencySelector({ className }: { className?: string }) {
  const t = useTranslations("header");
  const { currency, setCurrency } = useCurrency();
  return <div className={cn("relative", className)}><select aria-label={t("currency")} value={currency} onChange={(event) => setCurrency(event.target.value as Currency)} className="h-11 min-w-[82px] appearance-none rounded-lg border border-hairline bg-obsidian pl-3 pr-7 text-xs font-medium text-secondary hover:text-white">{CURRENCIES.map((value) => <option key={value} value={value}>{value}</option>)}</select><ChevronDown className="pointer-events-none absolute right-2.5 top-4 h-3 w-3 text-muted" aria-hidden="true" /></div>;
}
export default CurrencySelector;
