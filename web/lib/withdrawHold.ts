/**
 * 이메일 인증 출금의 **72시간 보안 대기(72-Hour Security Hold)**.
 *
 * Google OTP 를 쓸 수 없거나 인증에 실패한 계정은 이메일 인증으로 출금할 수 있지만, 계정 탈취 시
 * 즉시 자산이 빠져나가는 것을 막기 위해 72시간을 기다린다. 대기 중에는 본인이 언제든 취소해 되돌릴 수 있고,
 * 그 취소가 탈취를 실제로 막는 장치다 — 그래서 남은 시간을 화면에 항상 보여 준다.
 */

export const HOLD_HOURS = 72;
export const HOLD_MS = HOLD_HOURS * 60 * 60 * 1000;

/** 이메일 인증 시각 → 송금 예정 시각 */
export const holdUnlockAt = (atMs: number = Date.now()): number => atMs + HOLD_MS;

export const holdRemainingMs = (unlockAt: number, now: number = Date.now()): number => Math.max(0, unlockAt - now);

export const holdElapsedRatio = (unlockAt: number, now: number = Date.now()): number => {
  const remaining = holdRemainingMs(unlockAt, now);
  return +Math.min(1, Math.max(0, 1 - remaining / HOLD_MS)).toFixed(4);
};

export const holdReleased = (unlockAt: number, now: number = Date.now()): boolean => holdRemainingMs(unlockAt, now) === 0;

export interface HoldCountdown {
  hours: number;
  minutes: number;
  seconds: number;
  released: boolean;
}

/** 남은 시간 — "71시간 59분 후" 처럼 로케일 문구에 끼워 넣을 조각으로 쪼갠다 */
export function holdCountdown(unlockAt: number, now: number = Date.now()): HoldCountdown {
  const ms = holdRemainingMs(unlockAt, now);
  const total = Math.floor(ms / 1000);
  return {
    hours: Math.floor(total / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
    released: ms === 0,
  };
}

/**
 * 이메일 마스킹 — 내역에는 원문 대신 이것만 남는다.
 * `sangwon@example.com` → `sa****@example.com`. 로컬파트가 2자 이하면 전부 가린다.
 */
export function maskEmail(email: string): string {
  const trimmed = email.trim();
  const at = trimmed.lastIndexOf("@");
  if (at <= 0) return "****";
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at);
  const head = local.length > 2 ? local.slice(0, 2) : "";
  return `${head}****${domain}`;
}

/** 이메일 형식 — `lib/account.ts` 와 같은 규칙을 쓴다(두 군데서 갈리지 않게 여기서 재수출) */
export { validEmail } from "@/lib/account";
