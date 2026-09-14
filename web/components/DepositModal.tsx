"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Copy, Check, CreditCard, Coins, Zap, Loader2 } from "lucide-react";
import { useGachaStore, type DepositMethod } from "@/store/useGachaStore";
import { DEPOSIT_ADDRESSES } from "@/lib/config";
import { cn, usdt } from "@/lib/format";
import { playChime } from "@/lib/audio";

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
    <svg viewBox={`0 0 ${cells.n} ${cells.n}`} className="h-40 w-40 rounded bg-white p-2" shapeRendering="crispEdges">
      {cells.out.map((on, i) =>
        on ? <rect key={i} x={i % cells.n} y={Math.floor(i / cells.n)} width={1} height={1} fill="#000" /> : null,
      )}
    </svg>
  );
}

export function DepositModal() {
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
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setOpen(false)}
        >
          <motion.div
            className="relative w-full max-w-lg overflow-hidden rounded-lg bg-elevation shadow-2xl"
            initial={{ scale: 0.92, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.92, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 넷플릭스 멤버십 결제창 헤더 */}
            <div className="flex items-start justify-between border-b border-white/10 px-6 pt-6 pb-4">
              <div>
                <div className="text-xs uppercase tracking-widest text-gray-400">STEP 2 OF 3</div>
                <h2 className="mt-1 text-2xl font-bold">결제 방법을 선택하세요</h2>
                <p className="mt-1 text-sm text-gray-400">
                  현재 잔액 <span className="font-mono text-white">{usdt(balance)}</span> · 언제든 환급 가능
                </p>
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white">
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* 탭 */}
            <div className="grid grid-cols-2 border-b border-white/10">
              {(
                [
                  { key: "usdt", label: "USDT 즉시 입금", icon: Coins, sub: "TRC-20 · ERC-20" },
                  { key: "card", label: "신용카드 간편 결제", icon: CreditCard, sub: "수수료 0% 이벤트" },
                ] as const
              ).map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={cn(
                    "flex flex-col items-center gap-0.5 py-3 text-sm font-semibold transition",
                    tab === t.key ? "border-b-2 border-accent text-white" : "text-gray-400 hover:text-gray-200",
                  )}
                >
                  <span className="flex items-center gap-2">
                    <t.icon className="h-4 w-4" />
                    {t.label}
                  </span>
                  <span className="text-[11px] font-normal text-gray-500">{t.sub}</span>
                </button>
              ))}
            </div>

            <div className="px-6 py-5">
              {/* 금액 */}
              <div className="mb-4">
                <div className="mb-2 text-xs text-gray-400">충전 금액 (USDT)</div>
                <div className="grid grid-cols-4 gap-2">
                  {PRESETS.map((p) => (
                    <button
                      key={p}
                      onClick={() => setAmount(p)}
                      className={cn(
                        "rounded border py-2 text-sm font-semibold transition",
                        amount === p ? "border-accent bg-accent/20" : "border-white/15 hover:border-white/40",
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
                  onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
                  className="mt-2 w-full rounded border border-white/15 bg-black/40 px-3 py-2 font-mono text-sm outline-none focus:border-white/50"
                />
              </div>

              {tab === "usdt" ? (
                <div>
                  <div className="mb-3 flex gap-2">
                    {(Object.keys(DEPOSIT_ADDRESSES) as Network[]).map((n) => (
                      <button
                        key={n}
                        onClick={() => setNetwork(n)}
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs font-semibold",
                          network === n ? "border-emerald-400 text-emerald-300" : "border-white/15 text-gray-400",
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
                        <div className="text-xs text-gray-400">입금 주소 ({network})</div>
                        <div className="mt-1 break-all rounded bg-black/40 p-2 font-mono text-[11px] text-gray-200">
                          {address}
                        </div>
                        <button
                          onClick={copy}
                          className="mt-2 flex items-center gap-1 text-xs text-gray-300 hover:text-white"
                        >
                          {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                          {copied ? "복사됨" : "원클릭 복사"}
                        </button>
                      </div>
                      <p className="text-[11px] leading-snug text-gray-500">
                        오라클 기반 즉시 잔액 동기화 — 온체인 컨펌을 기다리지 않습니다.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  {/* 카드 정보는 클라이언트에서 직접 다루지 않고 PSP(MoonPay/Stripe) 위젯이 이 자리에 마운트된다 */}
                  <div className="flex h-[168px] flex-col items-center justify-center rounded border border-dashed border-white/20 bg-black/30 text-center">
                    <CreditCard className="h-8 w-8 text-gray-500" />
                    <div className="mt-2 text-sm text-gray-300">MoonPay / Stripe 카드 위젯 영역</div>
                    <div className="mt-1 text-[11px] text-gray-500">
                      복잡한 코인 전송 없이 · 원클릭 3초 충전 · 수수료 0% 이벤트 중
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={() => confirm(tab)}
                disabled={processing !== "idle" || amount <= 0}
                className={cn(
                  "mt-5 flex w-full items-center justify-center gap-2 rounded py-3 text-base font-bold transition",
                  processing === "done" ? "bg-emerald-500" : "bg-accent hover:bg-[#f6121d]",
                  "disabled:cursor-not-allowed disabled:opacity-80",
                )}
              >
                {processing === "idle" && (
                  <>
                    <Zap className="h-4 w-4" />
                    {tab === "usdt" ? `입금 완료 확인 · ${amount} USDT` : `카드로 ${amount} USDT 충전`}
                  </>
                )}
                {processing === "sync" && (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {tab === "usdt" ? "오라클 잔액 동기화 중…" : "카드 승인 중…"}
                  </>
                )}
                {processing === "done" && (
                  <>
                    <Check className="h-4 w-4" /> 충전 완료
                  </>
                )}
              </button>
              <p className="mt-3 text-center text-[11px] text-gray-500">
                결제 시 이용약관 및 확률 고지에 동의한 것으로 간주됩니다.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
