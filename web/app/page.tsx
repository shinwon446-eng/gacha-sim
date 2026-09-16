"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Wallet, RefreshCw } from "lucide-react";
import type { GachaItem } from "@/src/data/gachaItems";
import { GACHA_ITEMS } from "@/src/data/gachaItems";
import {
  PULL_PRICE_USDT,
  TIER_LABEL,
  TIER_ORDER,
  TIER_SHARE,
  breakEvenUsdt,
  expectedValueUsdt,
  formatOdds,
  formatUsdt,
  oddsTable,
} from "@/src/data/gachaRules";
import { LiveDropBar } from "@/src/components/LiveDropBar";
import { GachaReel } from "@/src/components/GachaReel";
import { ClaimModal } from "@/src/components/ClaimModal";
import { GachaItemCard } from "@/components/gacha/GachaItemCard";
import { glow } from "@/lib/tiers";

const BG = "#0B0E14";
const START_BALANCE = 1000;
const BOX_NAME = "Global Vault";

interface Toast {
  id: number;
  title: string;
  body: string;
  tone: string;
}

/**
 * 메인 — 가챠 전체 루프.
 *   잔고(useState) → 릴 스핀 시 가격 차감 → 정지 후 ClaimModal → 환전 시 잔고 가산.
 * 잔고는 메모리에만 있고 새로고침하면 사라진다. 결제·계정·저장 없음.
 */
export default function HomePage() {
  const [balance, setBalance] = useState(START_BALANCE);
  const [won, setWon] = useState<GachaItem | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [pulls, setPulls] = useState(0);

  const odds = useMemo(() => oddsTable(), []);
  const ev = useMemo(() => expectedValueUsdt(), []);
  const breakEven = useMemo(() => breakEvenUsdt(), []);
  const canAfford = balance >= PULL_PRICE_USDT;

  const pushToast = useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((ts) => [...ts, { ...t, id }]);
    setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== id)), 5200);
  }, []);

  // 스핀 직전: 차감. 부족하면 false → 릴이 돌지 않는다.
  const onSpinStart = useCallback((): boolean => {
    if (balance < PULL_PRICE_USDT) return false;
    setBalance((b) => b - PULL_PRICE_USDT);
    setPulls((n) => n + 1);
    return true;
  }, [balance]);

  const onResult = useCallback((item: GachaItem) => setWon(item), []);

  const onClaim = useCallback(
    (item: GachaItem) => {
      setBalance((b) => b + item.usdtValue);
      setWon(null);
      pushToast({ title: "환전 완료", body: `${item.name} → +${formatUsdt(item.usdtValue)} 잔고 반영`, tone: item.glowColor });
    },
    [pushToast],
  );

  const onShip = useCallback(
    (item: GachaItem) => {
      pushToast({
        title: "국제 배송비 및 세관 수수료 안내",
        body: `${item.name} 실물 배송은 수취국 관세·부가세와 국제 배송비(DHL/FedEx 실비)가 별도 청구됩니다. 데모에서는 접수되지 않습니다.`,
        tone: "#00D2FF",
      });
    },
    [pushToast],
  );

  const topUp = useCallback(() => {
    setBalance((b) => b + START_BALANCE);
    pushToast({ title: "데모 잔고 충전", body: `+${formatUsdt(START_BALANCE)} (가상 잔고)`, tone: "#A0AEC0" });
  }, [pushToast]);

  // 릴 도는 동안 페이지 배경을 고정 — body 는 layout 이 bg-canvas 를 주므로 여기서 덮는다
  useEffect(() => {
    const prev = document.body.style.backgroundColor;
    document.body.style.backgroundColor = BG;
    return () => {
      document.body.style.backgroundColor = prev;
    };
  }, []);

  const tierAccent = (t: (typeof TIER_ORDER)[number]) => GACHA_ITEMS.find((i) => i.tier === t)?.glowColor ?? "#FFFFFF";

  return (
    <main className="min-h-screen text-white" style={{ backgroundColor: BG }}>
      {/* ── 상단 바: 로고 · 내비 · 잔고 ── */}
      <header className="sticky top-0 z-40 border-b border-neutral-800" style={{ backgroundColor: "rgba(11,14,20,0.94)", backdropFilter: "blur(8px)" }}>
        <div className="flex items-center gap-5 px-4 py-3 md:px-8">
          <span className="font-display text-xl font-bold uppercase leading-none tracking-tight" style={{ color: "#E50914" }}>
            Gachaflix
          </span>
          <nav className="hidden items-center gap-4 text-xs text-neutral-400 sm:flex">
            <span className="font-semibold text-white">Gacha</span>
            <Link href="/boxes" className="transition-colors hover:text-white">
              박스
            </Link>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-lg border border-neutral-800 px-3 py-2" style={{ backgroundColor: "#0F131C" }}>
              <Wallet className="h-4 w-4 text-neutral-400" strokeWidth={2} />
              <span className="text-xs uppercase tracking-widest text-neutral-500" style={{ fontSize: 9 }}>
                Balance
              </span>
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={balance}
                  className="font-mono text-base font-bold tabular-nums text-white"
                  initial={{ y: -6, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 6, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {formatUsdt(balance)}
                </motion.span>
              </AnimatePresence>
            </div>
            <button
              type="button"
              onClick={topUp}
              title="데모 잔고 충전"
              className="flex h-9 items-center gap-1.5 rounded-lg border border-neutral-700 px-3 text-xs font-semibold text-neutral-300 transition-colors hover:border-white hover:text-white"
            >
              <RefreshCw className="h-3.5 w-3.5" strokeWidth={2} />
              충전
            </button>
          </div>
        </div>
        <LiveDropBar />
      </header>

      {/* ── 본문 ── */}
      <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-6 md:px-8 md:pt-10">
        <GachaReel
          boxName={BOX_NAME}
          priceUsdt={PULL_PRICE_USDT}
          onSpinStart={onSpinStart}
          onResult={onResult}
          disabled={!canAfford}
          disabledReason={!canAfford ? `잔고 부족 — ${formatUsdt(PULL_PRICE_USDT)} 필요. 상단 [충전]으로 데모 잔고를 추가하세요.` : undefined}
        />

        {/* 요약 수치 */}
        <section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="1회 가격" value={formatUsdt(PULL_PRICE_USDT)} />
          <Stat label="기대 수령 가치" value={formatUsdt(ev)} sub={`가격의 ${((ev / PULL_PRICE_USDT) * 100).toFixed(1)}%`} />
          <Stat label="가격 이상 확률" value={formatOdds(breakEven)} />
          <Stat label="오픈 횟수" value={String(pulls)} sub="세션 기준" />
        </section>

        {/* 등급 분포 */}
        <section className="mt-6 rounded-xl border border-neutral-800 p-4" style={{ backgroundColor: "#0F131C" }}>
          <div className="flex items-baseline justify-between">
            <h3 className="text-sm font-bold">등급별 확률</h3>
            <span className="text-xs text-neutral-500">항목 확률은 같은 등급 안에서 균등 분배</span>
          </div>
          <div className="mt-3 flex h-2 w-full overflow-hidden rounded-sm">
            {TIER_ORDER.map((t) => (
              <span
                key={t}
                className="block h-full"
                title={`${t} ${formatOdds(TIER_SHARE[t])}`}
                style={{ flexGrow: Math.max(TIER_SHARE[t], 0.5), flexBasis: 0, minWidth: 6, background: tierAccent(t), boxShadow: `0 0 6px ${glow(tierAccent(t), 0.5)}` }}
              />
            ))}
          </div>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
            {TIER_ORDER.map((t) => (
              <li key={t} className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-sm" style={{ background: tierAccent(t) }} />
                <span className="font-semibold tracking-widest" style={{ color: tierAccent(t) }}>
                  {t} · {TIER_LABEL[t]}
                </span>
                <span className="font-mono tabular-nums text-neutral-400">{formatOdds(TIER_SHARE[t])}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* 전체 30종 */}
        <section className="mt-8">
          <div className="flex items-baseline justify-between border-b border-neutral-800 pb-2">
            <h3 className="text-base font-bold">
              획득 가능 아이템 <span className="ml-1 font-mono text-xs font-normal text-neutral-500">{GACHA_ITEMS.length}종</span>
            </h3>
            <span className="text-xs text-neutral-500">가치 내림차순 · 항목 확률 표기</span>
          </div>
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {odds.map((o) => (
              <li key={o.item.id}>
                <GachaItemCard item={o.item} probability={o.probability} size="sm" />
              </li>
            ))}
          </ul>
        </section>

        <p className="mt-8 max-w-3xl text-xs leading-relaxed text-neutral-500">
          프로토타입입니다. 잔고는 가상이며 새로고침 시 초기화됩니다. 라이브 피드는 더미 데이터이고 실제 확률표와
          무관합니다. 가격은 기대값 ÷ {`0.85`} 에서 역산되어 아이템 가치가 바뀌면 함께 움직입니다.
        </p>
      </div>

      <ClaimModal item={won} paidUsdt={PULL_PRICE_USDT} onClaim={onClaim} onShip={onShip} onClose={() => setWon(null)} />

      {/* 토스트 */}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-80 max-w-full flex-col gap-2">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              className="pointer-events-auto rounded-lg border p-3 text-xs"
              style={{ backgroundColor: "#111521", borderColor: glow(t.tone, 0.5), boxShadow: `0 0 20px ${glow(t.tone, 0.2)}, 0 12px 30px rgba(0,0,0,0.6)` }}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 24 }}
              transition={{ duration: 0.25 }}
            >
              <div className="font-bold" style={{ color: t.tone }}>{t.title}</div>
              <div className="mt-1 leading-relaxed text-neutral-300">{t.body}</div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </main>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-neutral-800 p-4" style={{ backgroundColor: "#0F131C" }}>
      <div className="text-xs font-semibold uppercase tracking-widest text-neutral-500" style={{ fontSize: 9 }}>
        {label}
      </div>
      <div className="mt-1 font-mono text-lg font-bold tabular-nums text-white">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-neutral-500">{sub}</div>}
    </div>
  );
}
