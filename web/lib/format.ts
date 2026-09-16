/**
 * 표시 통화 포맷터 — 렌더링 계층의 유일한 통로.
 *
 * 데이터 모델은 통화 기호도 소수점도 모르는 "정수 원(KRW)" 하나만 들고 있다.
 * 통화를 바꾸려면 이 파일만 고치면 되고, 데이터셋은 손대지 않는다.
 */
export const formatPrice = (won: number): string => "₩" + Math.round(won).toLocaleString("ko-KR");

/**
 * 만 단위 축약. 큰 금액이 카드 폭을 밀어내는 자리에서만 쓴다.
 *   12,900 -> ₩1.3만   1,290,000 -> ₩129만   120,000,000 -> ₩1.2억
 */
export function formatPriceCompact(won: number): string {
  const n = Math.round(won);
  if (n >= 100_000_000) return "₩" + +(n / 100_000_000).toFixed(1) + "억";
  if (n >= 10_000) return "₩" + +(n / 10_000).toFixed(n >= 1_000_000 ? 0 : 1) + "만";
  return formatPrice(n);
}

export const usd = (n: number, digits = 2): string =>
  "$" + n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });

export const usdt = (n: number): string => usd(n) + " USDT";

export const compactUsd = (n: number): string =>
  "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });

export function timeAgo(at: number, now: number): string {
  // 데모 이벤트는 at 이 음수(분 단위)로 들어온다
  const minutes = at < 0 ? -at : Math.max(0, Math.round((now - at) / 60000));
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  const h = Math.floor(minutes / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

export const uid = (): string =>
  Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);

export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}
