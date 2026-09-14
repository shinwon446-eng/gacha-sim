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
