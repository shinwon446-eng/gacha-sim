/**
 * 🏆 주간 랭킹전 (2026-09-23 운영자 지시).
 *
 * 매주 초기화되는 잭팟 배수 랭킹전. 상위 5명에게 상금 풀을 순차 지급한다.
 * 연출이 아니라 **운영자가 실제로 지급하는 프로모션**이므로 상금액은 상수로 명시하고,
 * 랭킹 자체는 지어내지 않는다 — live 모드에서 API 가 준 마스킹 랭킹, 없으면 이 기기의 실제 기록만 오른다.
 * 채워지지 않은 자리는 가짜 당첨자로 메우지 않고 "공석"으로 남겨 상금과 진입 조건만 보여 준다.
 */

/** 총 상금 풀(USDT) — 운영자 프로모션. 운영하지 않을 주에는 0 으로 두면 섹션이 상금 표기를 감춘다. */
export const WEEKLY_PRIZE_POOL_USDT = 5000;

/** 1~5위 순차 지급액(USDT). 합계는 반드시 총 상금 풀과 같다. */
export const PRIZE_SPLIT_USDT = [2500, 1200, 600, 350, 350] as const;

/** 랭킹 진입 하한 배수 — 바닥 캐시백(≈0.95x)이 상위권을 도배하는 것을 막는다. */
export const MIN_RANK_MULTIPLE = 10;

/** 랭킹에 실리는 한 줄. `mine` 은 이 기기의 실제 당첨인지 여부. */
export interface RankEntry {
  key: string;
  who: string;
  boxSlug: string;
  itemId: string;
  valueUsdt: number;
  price: number;
  /** 획득 시각(ISO) — 시즌 구간 판정용 */
  at: string;
  mine: boolean;
}

export interface RankRow extends RankEntry {
  rank: number;
  /** 이 순위가 받는 상금(USDT) */
  prizeUsdt: number;
}

/** 아직 아무도 올라오지 못한 자리 — 가짜 당첨자 대신 이걸 보여 준다 */
export interface OpenSlot {
  rank: number;
  prizeUsdt: number;
}

export interface SeasonWindow {
  /** 이번 시즌 시작(월요일 00:00 UTC) */
  startsAt: number;
  /** 이번 시즌 마감(다음 월요일 00:00 UTC) */
  endsAt: number;
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * `now` 가 속한 주의 시즌 구간. 기준은 UTC 월요일 00:00 —
 * 서버·클라이언트·타임존이 달라도 같은 값이 나와야 하이드레이션이 깨지지 않는다.
 */
export function seasonWindow(now: number): SeasonWindow {
  const d = new Date(now);
  const dow = d.getUTCDay(); // 0=일 … 1=월
  const sinceMonday = (dow + 6) % 7;
  const startsAt = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - sinceMonday * 24 * 60 * 60 * 1000;
  return { startsAt, endsAt: startsAt + WEEK_MS };
}

/** 남은 시간 → "D-2 14:22:05". 음수는 전부 0 으로 눌러 마감 표기가 뒤로 가지 않게 한다. */
export function formatCountdown(remainingMs: number): string {
  const ms = Math.max(0, remainingMs);
  const total = Math.floor(ms / 1000);
  const days = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `D-${days} ${pad(h)}:${pad(m)}:${pad(s)}`;
}

/** 이번 시즌 구간 안의 기록만 남긴다 */
export function withinSeason(entries: RankEntry[], season: SeasonWindow): RankEntry[] {
  return entries.filter((e) => {
    const t = Date.parse(e.at);
    return Number.isFinite(t) && t >= season.startsAt && t < season.endsAt;
  });
}

/** 배수 = 획득 가치 ÷ 오픈가 */
export function multipleOf(e: Pick<RankEntry, "valueUsdt" | "price">): number {
  return e.price > 0 ? e.valueUsdt / e.price : 0;
}

/**
 * 진입 하한을 넘긴 기록을 배수 내림차순으로 세워 상위 N 줄을 만든다.
 * 동률이면 획득 가치가 큰 쪽, 그래도 같으면 먼저 딴 쪽이 앞선다.
 */
export function rankRows(entries: RankEntry[], limit = PRIZE_SPLIT_USDT.length): RankRow[] {
  return entries
    .filter((e) => multipleOf(e) >= MIN_RANK_MULTIPLE)
    .sort((a, b) => multipleOf(b) - multipleOf(a) || b.valueUsdt - a.valueUsdt || a.at.localeCompare(b.at))
    .slice(0, limit)
    .map((e, i) => ({ ...e, rank: i + 1, prizeUsdt: PRIZE_SPLIT_USDT[i] ?? 0 }));
}

/** 채워지지 않은 순위 자리 */
export function openSlots(filled: number, limit = PRIZE_SPLIT_USDT.length): OpenSlot[] {
  const out: OpenSlot[] = [];
  for (let i = filled; i < limit; i += 1) out.push({ rank: i + 1, prizeUsdt: PRIZE_SPLIT_USDT[i] ?? 0 });
  return out;
}

/**
 * 내 최고 배수가 지금 랭킹에서 몇 위인지. 상위권에 이미 올라 있으면 그 순위,
 * 아니면 마지막 순위 뒤(=limit+1) 로만 답한다 — 집계 범위를 모르면서 "42위" 같은 숫자를 지어내지 않는다.
 */
export function myRank(rows: RankRow[], myBestMultiple: number): number | null {
  const mine = rows.find((r) => r.mine);
  if (mine) return mine.rank;
  if (myBestMultiple <= 0) return null;
  return rows.length + 1;
}
