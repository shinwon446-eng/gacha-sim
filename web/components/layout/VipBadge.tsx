"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Crown } from "lucide-react";
import { cn } from "@/lib/format";
import { useWalletStore } from "@/stores/walletStore";

/** 누적 오픈 금액(USDT) → 등급. 실제 지갑 거래 기록에서만 계산한다. */
export const VIP_TIERS = [
  { key: "member", minUsdt: 0, color: "#94A3B8" },
  { key: "silver", minUsdt: 50, color: "#E5E4E2" },
  { key: "gold", minUsdt: 500, color: "#E6CA65" },
  { key: "black", minUsdt: 5000, color: "#C084FC" },
] as const;

export function vipTierFor(spentUsdt: number) {
  return [...VIP_TIERS].reverse().find((t) => spentUsdt >= t.minUsdt) ?? VIP_TIERS[0];
}

/** 헤더 VIP 등급 필 — 누적 오픈 금액 기준 (CLAUDE.md v5 §1: '데모' 뱃지 대체) */
export function VipBadge({ className }: { className?: string }) {
  const t = useTranslations("vip");
  const transactions = useWalletStore((s) => s.transactions);
  const spent = useMemo(() => transactions.filter((x) => x.type === "open").reduce((s, x) => s + Math.abs(x.amountUsdt), 0), [transactions]);
  const tier = vipTierFor(spent);
  return (
    <span className={cn("caption-luxury inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-md border border-hairline px-2.5", className)} style={{ color: tier.color }} title={t("title", { tier: t(`tiers.${tier.key}`) })}>
      <Crown className="h-3 w-3" strokeWidth={2.4} />
      {t(`tiers.${tier.key}`)}
    </span>
  );
}

export default VipBadge;
