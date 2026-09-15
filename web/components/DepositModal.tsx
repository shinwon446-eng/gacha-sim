"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Copy, Check, CreditCard, Coins, Loader2 } from "lucide-react";
import { useGachaStore, type DepositMethod } from "@/store/useGachaStore";
import { DEPOSIT_ADDRESSES } from "@/lib/config";
import { cn, usdt } from "@/lib/format";
import { playChime } from "@/lib/audio";
import { useCopy } from "@/lib/i18n";

type Network = keyof typeof DEPOSIT_ADDRESSES;
const PRESETS = [50, 100, 500, 1000];

/** 주소 문자열에서 결정적으로 생성하는 QR 모양 패턴 (자리 표시용) */
function PseudoQR({ seed }: { seed: string }) {
  const cells = useMemo(() => {
    const n = 21;
    let h = 2166136261;
    const out: boolean[] = [];
    for (let i = 0; i < n * n; i++) {
      h ^= seed.charCodeAt(i % seed.length);
      h = Math.imul(h, 16777619) >>> 0;
      out.push(((h >>> 13) & 1) === 1);
    }
    // 세 모서리 파인더 패턴
    const finder = (r: number, c: number) => {
      for (let y = 0; y < 7; y++)
        for (let x = 0; x < 7; x++) {
          const edge = y === 0 || y === 6 || x === 0 || x === 6;
          const core = y >= 2 && y <= 4 && x >= 2 && x <= 4;
          out[(r + y) * n + (c + x)] = edge || core;
        }
    };
    finder(0, 0);
    finder(0, n - 7);
    finder(n - 7, 0);
    return { n, out };
  }, [seed]);

  return (
    <svg viewBox={`0 0 ${cells.n} ${cells.n}`} className="h-40 w-40 bg-white p-2" shapeRendering="crispEdges">
      {cells.out.map((on, i) =>
        on ? <rect key={i} x={i % cells.n} y={Math.floor(i / cells.n)} width={1} height={1} fill="#000" /> : null,
      )}
    </svg>
  );
}

/** 멤버십 결제 시트 레지스터. 헤어라인 탭, 무채색 표면, 크림슨은 확정 액션에만. */
export function DepositModal() {
  const { t: tc } = useCopy();
  const open = useGachaStore((s) => s.depositOpen);
  const setOpen = useGachaStore((s) => s.setDepositOpen);
  const deposit = useGachaStore((s) => s.deposit);
  const balance = useGachaStore((s) => s.balance);

  const [tab, setTab] = useState<DepositMethod>("usdt");
  const [network, setNetwork] = useState<Network>("TRC-20");
  const [amount, setAmount] = useState(100);
  const [copied, setCopied] = useState(false);
  const [processing, setProcessing] = useState<"idle" | "sync" | "done">("idle");

  useEffect(() => {
    if (!open) setProcessing("idle");
  }, [open]);

  const address = DEPOSIT_ADDRESSES[network];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard 미지원 환경 */
    }
  };

  // 모의 결제: 온체인 컨펌 대기 없이 '오라클 즉시 동기화' 연출 후 잔액 반영
  const confirm = (method: DepositMethod) => {
    if (processing !== "idle" || amount <= 0) return;
    setProcessing("sync");
    setTimeout(() => {
      deposit(amount, method);
      playChime();
      setProcessing("done");
      setTimeout(() => setOpen(false), 900);
    }, method === "usdt" ? 1600 : 1200);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setOpen(false)}
        >
          <motion.div
            className="relative w-full max-w-lg overflow-hidden border border-white/[0.08] bg-elevation"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 프로토타입 고지 — 결제 화면 최상단 고정. 축약하거나 약화하지 않는다. */}
            <div className="bg-crimson px-4 py-2 text-center text-[11px] font-bold tracking-tight text-white">
              프로토타입 모의 결제 화면: 실제 입금 불가 · 표기된 주소는 자리 표시
            </div>

            {/* 결제 시트 헤더 */}
            <div className="flex items-start justify-between border-b border-white/[0.08] px-6 pb-4 pt-6">
              <div>
                <div className="label-caps">멤버십 결제 · 2 / 3 단계</div>
                <h2 className="display mt-2 text-3xl font-bold text-white">결제 수단</h2>
                <p className="mt-2 text-xs text-neutral-400">
                  잔액 <span className="font-mono text-white">{usdt(balance)}</span>
                  <span className="mx-1.5 text-neutral-700">/</span>
                  보유 상품은 시세의 80% USDT 로 환급 가능
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="닫기"
                className="text-neutral-500 transition duration-600 ease-cine hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* 탭 — 헤어라인, 활성 탭만 1px 하단 룰 */}
            <div className="grid grid-cols-2 border-b border-white/[0.08]">
              {(
                [
                  { key: "usdt", label: "USDT 전송", icon: Coins, sub: "TRC-20 / ERC-20" },
                  { key: "card", label: "카드 결제", icon: CreditCard, sub: "MoonPay / Stripe" },
                ] as const
              ).map((t, idx) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={cn(
                    "flex flex-col items-center gap-1 py-3.5 transition duration-600 ease-cine",
                    idx === 0 && "border-r border-white/[0.08]",
                    tab === t.key
                      ? "border-b border-white bg-white/[0.03] text-white"
                      : "text-neutral-500 hover:text-neutral-200",
                  )}
                >
                  <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em]">
                    <t.icon className="h-3.5 w-3.5" />
                    {t.label}
                  </span>
                  <span className="text-[10px] tracking-wide text-neutral-600">{t.sub}</span>
                </button>
              ))}
            </div>

            <div className="px-6 py-5">
              {/* 금액 */}
              <div className="mb-5">
                <div className="label-caps mb-2">충전 금액 (USDT)</div>
                <div className="grid grid-cols-4 gap-px bg-white/[0.08]">
                  {PRESETS.map((p) => (
                    <button
                      key={p}
                      onClick={() => setAmount(p)}
                      className={cn(
                        "bg-elevation py-2.5 font-display text-lg font-bold tracking-tighter transition duration-600 ease-cine",
                        amount === p ? "bg-white/[0.06] text-white" : "text-neutral-500 hover:text-white",
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min={1}
                  value={amount}
                  aria-label="충전 금액"
                  onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
                  className="mt-px w-full border border-white/[0.08] bg-ink px-3 py-2.5 font-mono text-sm text-white outline-none transition duration-600 ease-cine focus:border-white/40"
                />
              </div>

              {tab === "usdt" ? (
                <div>
                  <div className="mb-3 flex gap-px bg-white/[0.08]">
                    {(Object.keys(DEPOSIT_ADDRESSES) as Network[]).map((n) => (
                      <button
                        key={n}
                        onClick={() => setNetwork(n)}
                        className={cn(
                          "bg-elevation px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] transition duration-600 ease-cine",
                          network === n ? "bg-white/[0.06] text-white" : "text-neutral-500 hover:text-neutral-200",
                        )}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-4">
                    <PseudoQR seed={address + network} />
                    <div className="flex flex-1 flex-col justify-between">
                      <div>
                        <div className="label-caps">입금 주소 · {network}</div>
                        <div className="mt-1.5 break-all border border-white/[0.08] bg-ink p-2 font-mono text-[11px] text-neutral-300">
                          {address}
                        </div>
                        <button
                          onClick={copy}
                          className="mt-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-400 transition duration-600 ease-cine hover:text-white"
                        >
                          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          {copied ? "복사됨" : "주소 복사"}
                        </button>
                      </div>
                      <div>
                        <p className="text-[11px] leading-snug text-neutral-500">
                          모의 동기화: 온체인 컨펌 절차를 실행하지 않습니다.
                        </p>
                        {/* 네트워크/주소 경고 — 자산 유실 고지. 축약하거나 약화하지 않는다. */}
                        <p className="mt-2 border-l-2 border-crimson bg-crimson/[0.06] py-1.5 pl-2 text-[11px] leading-snug text-neutral-300">
                          {tc("withdrawalWarning")}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  {/* 카드 정보는 클라이언트에서 직접 다루지 않고 PSP(MoonPay/Stripe) 위젯이 이 자리에 마운트된다 */}
                  <div className="flex h-[168px] flex-col items-center justify-center border border-dashed border-white/15 bg-ink text-center">
                    <CreditCard className="h-7 w-7 text-neutral-600" />
                    <div className="label-caps mt-3">MoonPay / Stripe 위젯 영역</div>
                    <div className="mt-2 text-[11px] text-neutral-500">
                      코인 전송 없이 결제 · PSP 위젯 연동 예정 · 수수료 조건은 결제 단계에서 표기
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={() => confirm(tab)}
                disabled={processing !== "idle" || amount <= 0}
                className={cn(
                  "mt-5 flex w-full items-center justify-center gap-2 py-3.5 font-display text-lg font-bold uppercase tracking-tighter transition duration-600 ease-cine",
                  processing === "done"
                    ? "bg-white text-ink"
                    : "bg-crimson text-white hover:outline hover:outline-1 hover:outline-white",
                  "disabled:cursor-not-allowed disabled:opacity-70",
                )}
              >
                {processing === "idle" &&
                  (tab === "usdt" ? `입금 확인 · ${amount} USDT` : `카드 결제 · ${amount} USDT`)}
                {processing === "sync" && (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {tab === "usdt" ? "잔액 동기화 중" : "카드 승인 중"}
                  </>
                )}
                {processing === "done" && (
                  <>
                    <Check className="h-4 w-4" /> 충전 완료
                  </>
                )}
              </button>
              <p className="mt-3 text-center text-[11px] leading-relaxed text-neutral-500">
                프로토타입 화면입니다. 실제 약관 동의나 결제는 발생하지 않습니다.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
