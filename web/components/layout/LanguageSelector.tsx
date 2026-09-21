"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { ChevronDown, Check, Globe } from "lucide-react";
import { cn } from "@/lib/format";
import { LOCALES, LOCALE_LABEL, LOCALE_SHORT, type Locale } from "@/i18n/routing";
import { usePathname, useRouter } from "@/i18n/navigation";

const STORAGE_KEY = "gachaflix.locale";

/**
 * 헤더 언어 드롭다운 — [KO ▾] / [EN ▾] / [ZH ▾]
 * 선택하면 같은 경로의 다른 로케일 URL 로 이동하고, 그 로케일의 딕셔너리로 100% 갈아끼워진다.
 * 선택은 저장해 루트(/) 리다이렉트가 다음 방문에 기억한다.
 */
export function LanguageSelector({ className }: { className?: string }) {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
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

  const choose = (next: Locale) => {
    setOpen(false);
    if (next === locale) return;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* 저장 실패는 무시 */
    }
    router.replace(pathname, { locale: next });
  };

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={LOCALE_LABEL[locale]}
        className="glass-dark flex h-9 items-center gap-1.5 rounded-md px-2 text-xs font-semibold text-white transition-colors hover:border-gold-champagne sm:px-3"
      >
        <Globe className="h-3.5 w-3.5 text-gold-champagne" strokeWidth={2} />
        <span className="tracking-wide">{LOCALE_SHORT[locale]}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 text-muted transition-transform", open && "rotate-180")} strokeWidth={2} />
      </button>

      {open && (
        <ul role="listbox" className="border-metallic-subtle absolute right-0 top-full z-50 mt-1.5 w-36 overflow-hidden rounded-md bg-obsidian py-1 shadow-2xl">
          {LOCALES.map((l) => {
            const active = l === locale;
            return (
              <li key={l} role="option" aria-selected={active}>
                <button
                  type="button"
                  onClick={() => choose(l)}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors",
                    active ? "text-gold-champagne" : "text-secondary hover:bg-elevation hover:text-white",
                  )}
                >
                  <span className="w-6 font-semibold tracking-wide">{LOCALE_SHORT[l]}</span>
                  <span className="flex-1">{LOCALE_LABEL[l]}</span>
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

export default LanguageSelector;
