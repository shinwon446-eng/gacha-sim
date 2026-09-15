"use client";

import { Link2, ShieldCheck, Newspaper, BadgeCheck } from "lucide-react";
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
        <span
          key={`t${i}`}
          className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-400"
        >
          <Icon className="h-3 w-3 flex-none text-neutral-500" />
          {m.text}
        </span>
      );
    }),
    ...wins.map((w) => {
      const meta = LINE_META[itemLine(w.item)];
      return (
        <span key={w.id} className="inline-flex items-center gap-1.5">
          {/* 등급 마커 — 트로피 글리프 대신 얇은 사각 + 브래킷 등급 */}
          <span aria-hidden className="h-1.5 w-1.5 flex-none" style={{ backgroundColor: meta.color }} />
          <span className="label-caps" style={{ color: meta.color }}>
            {meta.grade}
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-white">{w.user}</span>
          <span className="text-[10px] uppercase tracking-[0.08em] text-neutral-500">획득</span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ color: meta.color }}>
            [{w.item.name}]
          </span>
          <span className="font-mono text-[10px] text-neutral-500">{compactUsd(w.item.value)} 상당</span>
          {w.isDemo && (
            <span className="border border-white/25 px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-300">
              DEMO
            </span>
          )}
        </span>
      );
    }),
  ];

  return (
    <div className="fixed inset-x-0 top-0 z-[70] h-7 overflow-hidden border-b border-white/[0.08] bg-ink">
      <div className="flex w-max animate-ticker whitespace-nowrap">
        {[0, 1].map((dup) => (
          <div key={dup} className="flex h-7 shrink-0 items-center gap-10 pr-10">
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
