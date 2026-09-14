"use client";

import { Link2, ShieldCheck, Newspaper, BadgeCheck, Trophy } from "lucide-react";
import { TRUST_MESSAGES } from "@/lib/config";
import { useGachaStore } from "@/store/useGachaStore";
import { compactUsd } from "@/lib/format";
import { LINE_META, itemLine } from "@/lib/types";

const ICONS = {
  chain: Link2,
  shield: ShieldCheck,
  news: Newspaper,
  check: BadgeCheck,
};

/** GNB 최상단: 온체인 인증/뉴스 + 실시간 당첨 롤링 티커 */
export function TrustTicker() {
  const openLog = useGachaStore((s) => s.openLog);
  const wins = openLog.filter((e) => itemLine(e.item) === "jackpot").slice(0, 8);

  const entries = [
    ...TRUST_MESSAGES.map((m, i) => {
      const Icon = ICONS[m.icon];
      return (
        <span key={`t${i}`} className="inline-flex items-center gap-1.5 text-gray-300">
          <Icon className="h-3 w-3 text-emerald-400" />
          {m.text}
        </span>
      );
    }),
    ...wins.map((w) => (
      <span key={w.id} className="inline-flex items-center gap-1.5">
        <Trophy className="h-3 w-3" style={{ color: LINE_META[itemLine(w.item)].color }} />
        <span className="font-semibold text-white">{w.user}</span>
        <span className="text-gray-400">님이</span>
        <span className="font-semibold" style={{ color: LINE_META[itemLine(w.item)].color }}>
          [{w.item.name}]
        </span>
        <span className="text-gray-400">획득 ({compactUsd(w.item.value)} 상당)</span>
        {w.isDemo && (
          <span className="rounded border border-white/20 px-1 text-[9px] uppercase tracking-wider text-gray-500">
            demo
          </span>
        )}
      </span>
    )),
  ];

  return (
    <div className="fixed inset-x-0 top-0 z-[70] h-7 overflow-hidden border-b border-white/5 bg-black text-[11px] leading-7">
      <div className="flex w-max animate-ticker whitespace-nowrap">
        {[0, 1].map((dup) => (
          <div key={dup} className="flex shrink-0 items-center gap-10 pr-10">
            {entries.map((e, i) => (
              <span key={`${dup}-${i}`} className="inline-flex items-center">
                {e}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
