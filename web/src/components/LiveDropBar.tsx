"use client";

import { useEffect, useMemo, useState } from "react";
import { GACHA_ITEMS, type GachaItem } from "@/src/data/gachaItems";
import { PULL_PRICE_USDT, formatUsdt } from "@/src/data/gachaRules";

/**
 * 더미 피드 전용 결정적 난수 (mulberry32).
 * 확률 계산이 아니라 "표시용 가짜 로그"이므로 crypto 가 아니어도 되지만,
 * 서버와 클라이언트가 같은 시드로 같은 목록을 만들어야 하이드레이션이 깨지지 않는다.
 */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface DropEvent {
  id: number;
  user: string;
  item: GachaItem;
  /** 생성 시점 기준 몇 초 전인지 */
  ago: number;
}

const HANDLES = ["user", "kim", "crypto", "lee", "whale", "park", "neo", "sat", "mika", "ryu"];

/** 피드용 가중치 — 상위 등급이 더 자주 보이도록 "표시"만 편향한다. 확률표와는 무관하며 그렇게 표기한다. */
function pickForFeed(rand: () => number): GachaItem {
  const pool = GACHA_ITEMS;
  const weights = pool.map((i) => (i.tier === "S" ? 2 : i.tier === "A" ? 6 : i.tier === "B" ? 10 : 4));
  const total = weights.reduce((s, w) => s + w, 0);
  let r = rand() * total;
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r < 0) return pool[i];
  }
  return pool[pool.length - 1];
}

function makeEvent(rand: () => number, id: number, ago: number): DropEvent {
  const handle = HANDLES[Math.floor(rand() * HANDLES.length)];
  const num = Math.floor(rand() * 90 + 10);
  return { id, user: `${handle}***${num}`, item: pickForFeed(rand), ago };
}

const SEED = 20260916;
const INITIAL = 14;

function initialFeed(): DropEvent[] {
  const rand = mulberry32(SEED);
  const out: DropEvent[] = [];
  let ago = 2;
  for (let i = 0; i < INITIAL; i++) {
    out.push(makeEvent(rand, i, ago));
    ago += 3 + Math.floor(rand() * 20);
  }
  return out;
}

const agoLabel = (s: number): string =>
  s < 60 ? `${s}초 전` : s < 3600 ? `${Math.floor(s / 60)}분 전` : `${Math.floor(s / 3600)}시간 전`;

/**
 * 상단 라이브 드랍 티커. 좌측으로 무한 롤링.
 * 목록을 두 번 이어 붙이고 -50% 까지 이동시키면 끊김 없이 돈다 (tailwind animate-ticker).
 * 실제 데이터가 아니라는 표기를 바 왼쪽에 고정한다.
 */
export function LiveDropBar({ className = "" }: { className?: string }) {
  const [feed, setFeed] = useState<DropEvent[]>(() => initialFeed());
  const [tick, setTick] = useState(0);

  // 마운트 후에만 시간이 흐르고 새 이벤트가 붙는다 — SSR 마크업과 첫 렌더가 일치해야 한다.
  useEffect(() => {
    const rand = mulberry32(SEED ^ Date.now());
    let nextId = INITIAL;
    const clock = setInterval(() => setTick((t) => t + 1), 1000);
    const spawner = setInterval(() => {
      setFeed((f) => [makeEvent(rand, nextId++, 0), ...f].slice(0, INITIAL));
      setTick(0);
    }, 9000);
    return () => {
      clearInterval(clock);
      clearInterval(spawner);
    };
  }, []);

  const rows = useMemo(() => [...feed, ...feed], [feed]);

  return (
    <div
      className={`relative flex w-full items-stretch overflow-hidden border-b border-neutral-800 ${className}`}
      style={{ backgroundColor: "#0B0E14", height: 36 }}
      aria-label="라이브 드랍 피드 (데모)"
    >
      <div
        className="z-10 flex flex-none items-center gap-2 border-r border-neutral-800 px-3 text-xs font-bold uppercase tracking-widest"
        style={{ backgroundColor: "#0B0E14", color: "#FF4655" }}
      >
        <span className="relative inline-block h-2 w-2 rounded-full" style={{ backgroundColor: "#FF4655" }}>
          <span className="absolute inset-0 animate-ping rounded-full" style={{ backgroundColor: "#FF4655", opacity: 0.6 }} />
        </span>
        Live
        <span className="font-normal normal-case tracking-normal text-neutral-500" style={{ fontSize: 9 }}>
          demo
        </span>
      </div>

      <div className="relative flex-1 overflow-hidden">
        <ul className="animate-ticker flex h-full w-max items-center whitespace-nowrap" style={{ willChange: "transform" }}>
          {rows.map((e, i) => (
            <li key={`${e.id}-${i}`} className="flex items-center gap-2 px-5 text-xs text-neutral-400">
              <span className="font-mono text-neutral-300">{e.user}</span>
              <span>님이</span>
              <span className="font-semibold text-white">{formatUsdt(PULL_PRICE_USDT)} 박스</span>
              <span>에서</span>
              <span className="font-bold" style={{ color: e.item.glowColor }}>
                {e.item.name}
              </span>
              <span className="font-mono" style={{ color: e.item.glowColor }}>
                ({formatUsdt(e.item.usdtValue)})
              </span>
              <span>획득</span>
              <span className="text-neutral-600">·</span>
              <span className="font-mono text-neutral-500">{agoLabel(e.ago + tick)}</span>
            </li>
          ))}
        </ul>
        <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-8" style={{ background: "linear-gradient(to right, #0B0E14, transparent)" }} />
        <span aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-8" style={{ background: "linear-gradient(to left, #0B0E14, transparent)" }} />
      </div>
    </div>
  );
}

export default LiveDropBar;
