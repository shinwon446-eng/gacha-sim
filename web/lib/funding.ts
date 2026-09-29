/**
 * 자산 원천 분리 · 인벤토리 족보 추적 (Tainted Asset Tracking) — CLAUDE.md §7-B.
 *
 * 카드 결제로 충전한 잔액이 "상자 개봉 → 환전 → 코인 출금"을 거쳐 암호화폐로 빠져나가는 경로(카드깡·세탁)를 막는다.
 * 잔액은 원천별로 나뉘고, 개봉에 쓰인 비율이 당첨 아이템에 족보로 박히며, 환급금은 그 비율 그대로 되돌아간다.
 *
 *   crypto — USDT 온체인 입금분. 출금 가능.
 *   card   — 신용카드 결제분. 온체인 출금 불가(개봉·실물 배송·카드 환불 전용).
 *
 * 모든 계산은 순수 함수다(tests/funding.test.ts). 금액 단위는 USDT, 소수 둘째 자리에서 맞춘다.
 */

export type FundingSource = "crypto" | "card" | "mixed";

export interface FundingRatio {
  /** 0~1 */
  crypto: number;
  card: number;
}

export interface FundingSplit {
  /** 실제 차감액 */
  fromCrypto: number;
  fromCard: number;
  /** 이 개봉의 족보 — 아이템에 그대로 박힌다 */
  source: FundingSource;
  ratio: FundingRatio;
}

const r2 = (n: number): number => +n.toFixed(2);

export const CRYPTO_ONLY: FundingRatio = { crypto: 1, card: 0 };
export const CARD_ONLY: FundingRatio = { crypto: 0, card: 1 };

/** 비율 → 원천 라벨 */
export function sourceOf(ratio: FundingRatio): FundingSource {
  if (ratio.card <= 0) return "crypto";
  if (ratio.crypto <= 0) return "card";
  return "mixed";
}

/**
 * 개봉 차감 계획 — 암호화폐 잔액을 먼저 소진하고, 모자란 만큼만 카드 잔액을 쓴다(결합 결제).
 * 두 잔액을 합쳐도 모자라면 null(차감하지 않는다).
 */
export function planDebit(amountUsdt: number, cryptoBalance: number, cardBalance: number): FundingSplit | null {
  const amount = r2(Math.max(0, amountUsdt));
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const crypto = Math.max(0, cryptoBalance);
  const card = Math.max(0, cardBalance);
  if (r2(crypto + card) + 1e-9 < amount) return null;

  const fromCrypto = r2(Math.min(crypto, amount));
  const fromCard = r2(amount - fromCrypto);
  const ratio: FundingRatio = { crypto: amount === 0 ? 1 : +(fromCrypto / amount).toFixed(6), card: amount === 0 ? 0 : +(fromCard / amount).toFixed(6) };
  return { fromCrypto, fromCard, source: sourceOf(ratio), ratio };
}

/**
 * 환급금 귀속 — 아이템 족보 비율대로만 되돌린다.
 * card 출처 환급금은 절대 crypto 로 들어가지 않는다(교차 환급 차단).
 */
export function attributeRefund(amountUsdt: number, ratio: FundingRatio): { toCrypto: number; toCard: number } {
  const amount = r2(Math.max(0, amountUsdt));
  if (!Number.isFinite(amount) || amount <= 0) return { toCrypto: 0, toCard: 0 };
  const cryptoShare = Math.min(1, Math.max(0, Number.isFinite(ratio?.crypto) ? ratio.crypto : 1));
  const toCrypto = r2(amount * cryptoShare);
  // 반올림 오차는 카드 쪽에 몰아 합계를 정확히 보존한다
  return { toCrypto, toCard: r2(amount - toCrypto) };
}

/** 여러 아이템 환급을 한 번에 — [{amount, ratio}] → 합계 귀속 */
export function attributeRefunds(items: { amountUsdt: number; ratio: FundingRatio }[]): { toCrypto: number; toCard: number } {
  return items.reduce(
    (acc, it) => {
      const { toCrypto, toCard } = attributeRefund(it.amountUsdt, it.ratio);
      return { toCrypto: r2(acc.toCrypto + toCrypto), toCard: r2(acc.toCard + toCard) };
    },
    { toCrypto: 0, toCard: 0 },
  );
}

/** 저장된 값이 깨졌을 때의 기본 족보 — 구버전 기록은 전부 crypto 로 본다(카드 결제 도입 전 데이터) */
export function normalizeRatio(ratio?: Partial<FundingRatio> | null): FundingRatio {
  const crypto = Number.isFinite(ratio?.crypto as number) ? Math.min(1, Math.max(0, ratio!.crypto as number)) : 1;
  return { crypto, card: +(1 - crypto).toFixed(6) };
}
