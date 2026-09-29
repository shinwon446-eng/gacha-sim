"use client";

import { SiteHeader } from "@/components/layout/SiteHeader";
import { PolicyNotice } from "@/components/legal/PolicyNotice";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { Camera, Star, ExternalLink, ShieldCheck, Truck, Heart, Package } from "lucide-react";
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
import { BrandLogo } from "@/components/layout/BrandLogo";
import { LanguageSelector } from "@/components/layout/LanguageSelector";
import { CurrencySelector } from "@/components/layout/CurrencySelector";
import { HeaderAuthControl } from "@/components/auth/HeaderAuthControl";
import { Money } from "@/components/ui/Money";
import { ReviewFormModal } from "@/components/community/ReviewFormModal";

/**
 * /community — 실물 언박싱 포토 후기 (CLAUDE.md §7-B 계승).
 * 후기 카드 그리드(사진·한줄 후기·별점·[운송장 인증]/[온체인 인증] 뱃지) + 10 USDT 보너스 배너 + 후기 작성.
 * 게시되는 후기는 실제 수령 유저가 올린 것뿐이다.
 */
export default function CommunityPage() {
  const t = useTranslations();
  const e = useTranslations("editorialPages");
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
      <SiteHeader />

      <section className="mx-auto max-w-[1440px] px-6 pt-14 lg:px-14 md:pt-20">
        <div className="grid gap-8 border-b border-hairline pb-10 md:grid-cols-[1.2fr_1fr] md:gap-16 md:pb-14">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-gold-champagne">VOILA JOURNAL</p>
            <h1 className="mt-6 text-4xl font-semibold leading-[1.2] tracking-[-0.045em] text-white md:text-[52px]">{e("communityTitle")}</h1>
          </div>
          <div className="md:pt-8">
            <p className="max-w-lg text-base leading-8 text-muted">{e("communityBody")}</p>
            <button type="button" onClick={() => setWriteOpen(true)} className="mt-6 inline-flex min-h-12 items-center gap-3 rounded-md bg-[#f1eee7] px-6 text-sm font-semibold text-obsidian hover:bg-white">
              <Camera className="h-4 w-4" strokeWidth={1.7} />{t("community.write")}
            </button>
            <p className="mt-4 flex flex-wrap items-baseline gap-2 text-xs text-muted"><span>{e("communityNote")}</span><Money value={REVIEW_BONUS_USDT} size="xs" numberClassName="text-gold-champagne" /></p>
          </div>
        </div>

        <PolicyNotice kind="community" />
        {mounted && reviews.length === 0 ? (
          <div className="my-12 grid items-center gap-8 rounded-lg border border-hairline bg-surface px-7 py-12 md:grid-cols-[1fr_1.8fr] md:px-14 md:py-16">
            <div aria-hidden className="mx-auto flex aspect-square w-full max-w-48 items-center justify-center rounded-full border border-hairline bg-obsidian"><Package className="h-20 w-20 text-gold-champagne" strokeWidth={0.7} /></div>
            <div><h2 className="text-2xl font-medium tracking-tight text-white md:text-3xl">{e("communityEmptyTitle")}</h2><p className="mt-4 max-w-lg text-sm leading-7 text-muted">{e("communityEmptyBody")}</p><Link href="/inventory" className="mt-6 inline-flex min-h-11 items-center gap-3 text-sm font-medium text-gold-champagne">{e("communityEmptyAction")}<ExternalLink className="h-4 w-4" /></Link></div>
          </div>
        ) : (
          <ul className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
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
                      <span className="absolute left-2 top-2 rounded-sm px-1.5 py-1 text-xs font-bold uppercase tracking-widest" style={{ color: tier.accent, backgroundColor: glow(tier.accent, 0.12), border: `1px solid ${glow(tier.accent, 0.45)}` }}>
                        {tier.label}
                      </span>
                    )}
                    {r.mine && <span className="absolute right-2 top-2 rounded-sm bg-obsidian/85 px-1.5 py-1 text-xs font-semibold text-gold-champagne">{t("community.you")}</span>}
                  </div>
                  <div className="p-5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-bold text-white">{item ? itemName(item) : r.itemId}</span>
                      <span className="flex flex-none items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star key={n} className={cn("h-3 w-3", n <= r.rating ? "fill-gold-champagne text-gold-champagne" : "text-faint")} strokeWidth={1.6} />
                        ))}
                      </span>
                    </div>
                    <div className="truncate text-xs text-faint">{box ? boxTitle(box) : r.boxSlug}</div>
                    <p className="mt-2 line-clamp-3 text-sm leading-7 text-secondary">{r.text}</p>
                    <div className="mt-2 flex items-center justify-between text-xs text-faint">
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
                        <a href={trackingUrl(r.proof.carrier, r.proof.trackingNumber)} target="_blank" rel="noopener noreferrer" className="border-metallic-subtle flex h-6 items-center gap-1 rounded-sm bg-obsidian px-1.5 text-xs font-semibold text-secondary hover:border-gold-champagne hover:text-white">
                          <Truck className="h-3 w-3 text-tier-prestige" strokeWidth={2.2} />
                          {t("community.badgeShipping")}
                          <ExternalLink className="h-2.5 w-2.5 text-faint" strokeWidth={2.4} />
                        </a>
                      )}
                      {r.proof.network && r.proof.txHash && (
                        <a href={explorerTxUrl(r.proof.network, r.proof.txHash)} target="_blank" rel="noopener noreferrer" className="border-metallic-gold flex h-6 items-center gap-1 rounded-sm bg-obsidian px-1.5 text-xs font-semibold text-gold-champagne hover:bg-gold-champagne/10">
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
          <motion.div key={toast.id} className="border-metallic-subtle fixed bottom-24 right-4 md:bottom-6 z-50 rounded-lg bg-obsidian p-3 text-xs font-bold text-gold-champagne" style={{ boxShadow: `0 0 20px ${glow("#E6CA65", 0.2)}` }} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24 }}>
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
