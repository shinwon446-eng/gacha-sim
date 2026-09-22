"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Truck, PackageCheck, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/format";
import { BOX_BY_SLUG } from "@/lib/products";
import { useProductText } from "@/lib/useProductText";
import { CARRIERS } from "@/lib/carriers";
import { useInventoryStore } from "@/stores/inventoryStore";

/**
 * 📦 실배송 출고 인증 티커 (CLAUDE.md §8 · 부록 C).
 *
 * 흐르는 줄은 **이 기기의 실제 배송 기록**(출고 준비 / 배송 중)뿐이다.
 * 기록이 없으면 다른 사람의 배송을 지어내지 않고, 운영자가 내건 배송 보증(무료 배송·정품 검수·보험)을 대신 흘린다.
 * live 모드에서 API 가 마스킹된 실제 출고 피드를 주면 같은 자리에 그대로 올린다.
 */
export function ShippingTicker({ className }: { className?: string }) {
  const t = useTranslations("delivery");
  const ti = useTranslations("inventory");
  const { itemName } = useProductText();
  const items = useInventoryStore((s) => s.items);

  const lines = useMemo(() => {
    const shipping = items.filter((o) => o.status === "SHIPPING" || o.status === "SHIPPING_REQUESTED").slice(0, 8);
    return shipping.map((o) => {
      const box = BOX_BY_SLUG[o.boxSlug];
      const item = box?.items.find((i) => i.id === o.itemId);
      const name = item ? itemName(item) : o.itemId;
      const carrier = o.shipping?.carrier ? CARRIERS[o.shipping.carrier].key : null;
      const no = o.shipping?.trackingNumber;
      const label =
        o.status === "SHIPPING" && no
          ? ti("doneShipping") + " · " + (carrier ?? "") + " " + no.slice(0, 4) + "-****"
          : ti("donePreparing");
      return { id: o.id, name, label, shipped: o.status === "SHIPPING" };
    });
  }, [items, itemName, ti]);

  const guarantees = [
    { Icon: PackageCheck, text: t("tickerFree") },
    { Icon: ShieldCheck, text: t("tickerAuth") },
    { Icon: Truck, text: t("tickerInsured") },
  ];

  return (
    <section className={cn("border-metallic-subtle overflow-hidden rounded-xl bg-obsidian", className)} aria-label={t("tickerTitle")}>
      <div className="flex items-center gap-2 border-b border-hairline px-3 py-2">
        <Truck className="h-3.5 w-3.5 text-gold-champagne" strokeWidth={2.2} />
        <span className="caption-luxury !text-gold-champagne">{t("tickerTitle")}</span>
      </div>

      {lines.length > 0 ? (
        <ul className="divide-y divide-hairline">
          {lines.map((l) => (
            <li key={l.id} className="flex items-center justify-between gap-3 px-3 py-2 text-[11px]">
              <span className="min-w-0 truncate text-secondary">{l.name}</span>
              <span className={cn("flex-none whitespace-nowrap font-semibold", l.shipped ? "text-tier-prestige" : "text-gold-champagne")}>{l.label}</span>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="divide-y divide-hairline">
          {guarantees.map(({ Icon, text }) => (
            <li key={text} className="flex items-start gap-2 px-3 py-2 text-[11px]">
              <Icon className="mt-0.5 h-3.5 w-3.5 flex-none text-emerald-300" strokeWidth={2.2} />
              <span className="break-keep leading-relaxed text-secondary">{text}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default ShippingTicker;
