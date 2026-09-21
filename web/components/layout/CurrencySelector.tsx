"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/format";
import { CURRENCIES, type Currency } from "@/stores/currencyStore";
import { useTranslations } from "next-intl";
import { useCurrency } from "@/lib/useCurrency";

const LABEL: Record<Currency, string> = { USDT: "USDT", USD: "USD", KRW: "KRW" };
const SYMBOL: Record<Currency, string> = { USDT: "₮", USD: "$", KRW: "₩" };

/**
 * 헤더 통화 드롭다운 — [USDT ▾] / [USD ▾] / [KRW ▾]
 * 선택 즉시 스토어가 바뀌고, useCurrency 를 쓰는 모든 금액이 한 번에 전환된다.
 */
export function CurrencySelector({ className }: { className?: string }) {
  const t = useTranslations("header");
  const { currency, setCurrency } = useCurrency();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("currency")}
        className="glass-dark flex h-9 items-center gap-1.5 rounded-md px-2 text-xs font-semibold text-white transition-colors hover:border-gold-champagne sm:px-3"
      >
        <span className="text-gold-champagne">{SYMBOL[currency]}</span>
        <span className="hidden tracking-wide sm:inline">{LABEL[currency]}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 text-muted transition-transform", open && "rotate-180")} strokeWidth={2} />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={t("currency")}
          className="border-metallic-subtle absolute right-0 top-full z-50 mt-1.5 w-36 overflow-hidden rounded-md bg-obsidian py-1 shadow-2xl"
        >
          {CURRENCIES.map((c) => {
            const active = c === currency;
            return (
              <li key={c} role="option" aria-selected={active}>
                <button
                  type="button"
                  onClick={() => {
                    setCurrency(c);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors",
                    active ? "text-gold-champagne" : "text-secondary hover:bg-elevation hover:text-white",
                  )}
                >
                  <span className="w-4 text-center font-semibold">{SYMBOL[c]}</span>
                  <span className="flex-1 font-semibold tracking-wide">{LABEL[c]}</span>
                  {active && <Check className="h-3.5 w-3.5" strokeWidth={2.5} />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default CurrencySelector;
