// 서버사이드 인메모리 상태 저장소.
// 프로토타입: 프로세스 메모리 Map (dev HMR 에도 유지되도록 globalThis 에 고정).
// 프로덕션: Redis 등 외부 캐시로 교체할 것 — 인터페이스는 동일하게 유지.

export interface ServerSession {
  pityCount: number;
  totalSpent: number;
}

interface ServerState {
  /** HttpOnly 세션 쿠키(gsid) → 유저별 pity/누적 결제액 */
  sessions: Map<string, ServerSession>;
  /** `${ip}:${fingerprint}` → 게스트 무료체험 사용 시각 */
  guestClaims: Map<string, number>;
}

const g = globalThis as unknown as { __gachaServerState?: ServerState };
g.__gachaServerState ??= { sessions: new Map(), guestClaims: new Map() };

export const { sessions, guestClaims } = g.__gachaServerState;
