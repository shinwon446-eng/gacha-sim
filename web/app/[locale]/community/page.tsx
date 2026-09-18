"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { Camera, Gift, Star, ExternalLink, ShieldCheck, Truck, Heart, Package } from "lucide-react";
import { cn } from "@/lib/format";
import { Link } from "@/i18n/navigation";
import { useCurrency } from "@/lib/useCurrency";
import { useProductText } from "@/lib/useProductText";
import { BOX_BY_SLUG } from "@/lib/products";
import { tierOf, glow } from "@/lib/tiers";
import { EXPLORERS, explorerTxUrl } from "@/lib/withdrawal";
import { trackingUrl } from "@/lib/carriers";
import { REVIEW_BONUS_USDT, toReview, type Review } from "@/lib/community";
import { localHandle } from "@/lib/liveDrops";
import { useCommunityStore } from "@/stores/communityStore";
import { useInventoryStore } from "@/stores/inventoryStore";
import { useWalletStore } from "@/stores/walletStore";
import { useFairStore } from "@/stores/fairStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { playChime } from "@/lib/audio";
import { ProductArt } from "@/components/box/ProductArt";
import { LanguageSelector } from "@/components/layout/LanguageSelector";
import { CurrencySelector } from "@/components/layout/CurrencySelector";
import { Money } from "@/components/ui/Money";
import { ReviewFormModal } from "@/components/community/ReviewFormModal";

/**
 * /community — 실물 언박싱 포토 후기 (CLAUDE.md §7-B 계승).
 * 후기 카드 그리드(사진·한줄 후기·별점·[운송장 인증]/[온체인 인증] 뱃지) + 10 USDT 보너스 배너 + 후기 작성.
 * 게시되는 후기는 실제 수령 유저가 올린 것뿐이다.
 */
export default function CommunityPage() {
  const t = useTranslations();
  const locale = useLocale();
  const { fmt } = useCurrency();
  const { boxTitle, itemName } = useProductText();
  const mine = useCommunityStore((s) => s.mine);
  const owned = useInventoryStore((s) => s.items);
  const clientSeed = useFairStore((s) => s.clientSeed);
  const credit = useWalletStore((s) => s.credit);
  const addTransaction = useWalletStore((s) => s.addTransaction);
  const balance = useWalletStore((s) => s.balance);
  const [writeOpen, setWriteOpen] = useState(false);
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const reviews: Review[] = useMemo(() => mine.map((m) => toReview(m, owned.find((o) => o.id === m.ownedId), localHandle(clientSeed))), [mine, owned, clientSeed]);

  const say = useCallback((text: string) => {
    const id = Date.now();
    setToast({ id, text });
    setTimeout(() => setToast((x) => (x?.id === id ? null : x)), 4500);
  }, []);

  const onSubmitted = (ownedId: string, bonus: number) => {
    credit(bonus);
    addTransaction({ type: "bonus", amountUsdt: bonus, ref: `review:${ownedId}` });
    if (!useSettingsStore.getState().muted) playChime();
    setWriteOpen(false);
    say(t("community.bonusToast", { amount: fmt(bonus) }));
  };

  return (
    <main className="min-h-screen bg-canvas pb-24">
      <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-hairline bg-obsidian/90 px-[4%] py-3 backdrop-blur-md sm:gap-5">
        <Link href="/" className="font-display text-xl font-bold uppercase leading-none tracking-tight text-crimson">
          Gachaflix
        </Link>
        <nav className="flex flex-none items-center gap-3 whitespace-nowrap text-[11px] text-muted sm:gap-4 sm:text-xs">
          <Link href="/" className="hidden hover:text-white sm:inline">
            {t("nav.boxes")}
          </Link>
          <Link href="/inventory" className="hover:text-white">
            {t("nav.inventory")}
          </Link>
          <Link href="/fairness" className="hover:text-white">
            {t("nav.fairness")}
          </Link>
          <span className="font-semibold text-white">{t("nav.community")}</span>
        </nav>
        <div className="ml-auto flex flex-none items-center gap-2">
          <div className="glass-dark hidden h-9 items-center gap-2 rounded-md px-3 sm:flex">
            <Money value={balance} size="sm" />
          </div>
          <LanguageSelector />
          <CurrencySelector />
        </div>
      </header>

      <section className="mx-auto w-full max-w-7xl px-[4%] pt-6 md:pt-8">
        <div className="border-metallic-gold relative overflow-hidden rounded-xl bg-surface px-4 py-4 md:px-6 md:py-5">
          <span aria-hidden className="pedestal-glow pointer-events-none absolute inset-0" />
          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="caption-luxury">{t("community.eyebrow")}</div>
              <h1 className="mt-0.5 font-display text-xl font-bold uppercase tracking-tight text-white md:text-2xl">{t("community.title")}</h1>
              <p className="mt-1.5 flex flex-wrap items-baseline gap-1 text-sm text-secondary">
                <Gift className="h-4 w-4 self-center text-gold-champagne" strokeWidth={2.2} />
                {t("community.bonusBanner")} <Money value={REVIEW_BONUS_USDT} size="sm" numberClassName="text-gold-gradient" /> {t("community.bonusBannerTail")}
              </p>
            </div>
            <button type="button" onClick={() => setWriteOpen(true)} className="flex h-10 items-center gap-2 whitespace-nowrap rounded-md bg-gold-champagne px-4 text-sm font-bold text-obsidian hover:bg-gold-metallic">
              <Camera className="h-4 w-4" strokeWidth={2.4} />
              {t("community.write")}
            </button>
          </div>
        </div>

        {mounted && reviews.length === 0 ? (
          <div className="border-metallic-subtle mt-6 flex flex-col items-center rounded-xl bg-surface px-6 py-14 text-center">
            <Package className="h-8 w-8 text-faint" strokeWidth={1.5} />
            <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">{t("community.empty")}</p>
            <Link href="/" className="mt-5 rounded-md bg-crimson px-5 py-2.5 text-sm font-bold text-white hover:bg-red-600">
              {t("community.emptyCta")}
            </Link>
          </div>
        ) : (
          <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {reviews.map((r) => {
              const box = BOX_BY_SLUG[r.boxSlug];
              const item = box?.items.find((i) => i.id === r.itemId);
              const tier = box && item ? tierOf(item.value, box.price) : undefined;
              return (
                <li key={r.id} className={cn("relative overflow-hidden rounded-xl bg-surface", tier?.key === "royal" ? "border-metallic-gold" : "border-metallic-subtle")}>
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-obsidian">
                    {r.photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.photo} alt="" className="h-full w-full object-cover" />
                    ) : item ? (
                      <ProductArt image={item.image} alt={itemName(item)} accent={tier?.accent} glowStrength={0.25} fallbackSize="md" />
                    ) : null}
                    {tier && (
                      <span className="absolute left-2 top-2 rounded-sm px-1.5 py-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: tier.accent, backgroundColor: glow(tier.accent, 0.12), border: `1px solid ${glow(tier.accent, 0.45)}` }}>
                        {tier.label}
                      </span>
                    )}
                    {r.mine && <span className="absolute right-2 top-2 rounded-sm bg-obsidian/85 px-1.5 py-1 text-[10px] font-semibold text-gold-champagne">{t("community.you")}</span>}
                  </div>
                  <div className="p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-bold text-white">{item ? itemName(item) : r.itemId}</span>
                      <span className="flex flex-none items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star key={n} className={cn("h-3 w-3", n <= r.rating ? "fill-gold-champagne text-gold-champagne" : "text-faint")} strokeWidth={1.6} />
                        ))}
                      </span>
                    </div>
                    <div className="truncate text-[10px] text-faint">{box ? boxTitle(box) : r.boxSlug}</div>
                    <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-secondary">{r.text}</p>
                    <div className="mt-2 flex items-center justify-between text-[10px] text-faint">
                      <span className="font-mono">{r.user}</span>
                      <span className="flex items-center gap-2">
                        {mounted && <span>{new Date(r.at).toLocaleDateString(locale)}</span>}
                        {!r.mine && (
                          <span className="flex items-center gap-0.5">
                            <Heart className="h-3 w-3" strokeWidth={2} />
                            {r.likes}
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {r.proof.carrier && r.proof.trackingNumber && (
                        <a href={trackingUrl(r.proof.carrier, r.proof.trackingNumber)} target="_blank" rel="noopener noreferrer" className="border-metallic-subtle flex h-6 items-center gap-1 rounded-sm bg-obsidian px-1.5 text-[10px] font-semibold text-secondary hover:border-gold-champagne hover:text-white">
                          <Truck className="h-3 w-3 text-tier-prestige" strokeWidth={2.2} />
                          {t("community.badgeShipping")}
                          <ExternalLink className="h-2.5 w-2.5 text-faint" strokeWidth={2.4} />
                        </a>
                      )}
                      {r.proof.network && r.proof.txHash && (
                        <a href={explorerTxUrl(r.proof.network, r.proof.txHash)} target="_blank" rel="noopener noreferrer" className="border-metallic-gold flex h-6 items-center gap-1 rounded-sm bg-obsidian px-1.5 text-[10px] font-semibold text-gold-champagne hover:bg-gold-champagne/10">
                          <ShieldCheck className="h-3 w-3" strokeWidth={2.2} />
                          {t("community.badgeOnchain", { explorer: EXPLORERS[r.proof.network].name })}
                          <ExternalLink className="h-2.5 w-2.5" strokeWidth={2.4} />
                        </a>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <ReviewFormModal open={writeOpen} onClose={() => setWriteOpen(false)} onSubmitted={onSubmitted} />

      <AnimatePresence>
        {toast && (
          <motion.div key={toast.id} className="border-metallic-subtle fixed bottom-6 right-4 z-50 rounded-lg bg-obsidian p-3 text-xs font-bold text-gold-champagne" style={{ boxShadow: `0 0 20px ${glow("#E6CA65", 0.2)}` }} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24 }}>
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
