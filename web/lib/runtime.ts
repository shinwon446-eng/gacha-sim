/**
 * 실행 모드 — 백엔드 연결 여부 하나로 갈린다.
 *
 *   live    : NEXT_PUBLIC_API_BASE 가 설정됨. 입금 주소 발급·카드 결제 세션·출금 브로드캐스트·출고 운송장·집계 피드는 전부 API 가 준다.
 *   preview : API 가 없음(정적 호스팅). 지갑·보관함·공정성·검증기는 그대로 동작한다. 입금 주소·출금 TxID·운송장처럼
 *             백엔드가 발급해야 하는 값은 표시하지 않고, 잔액을 임의로 만드는 시뮬레이터도 없다(2026-09-21 제거).
 *
 * 다른 사람의 활동을 지어내지 않는다. 티커·인증 피드·후기·지표는 live 면 API 집계, preview 면 이 기기의 실제 기록만 보여준다.
 */
export const API_BASE = (process.env.NEXT_PUBLIC_API_BASE ?? "").replace(/\/+$/, "");

export const isLive = (): boolean => API_BASE.length > 0;
export const isPreview = (): boolean => !isLive();

/** 온체인 지급 준비금 지갑 — 설정된 경우에만 화면에 노출한다 */
export const RESERVE_ADDRESS = process.env.NEXT_PUBLIC_RESERVE_ADDRESS ?? "";
export const RESERVE_NETWORK = (process.env.NEXT_PUBLIC_RESERVE_NETWORK ?? "TRC20") as "TRC20" | "BEP20";

/** 고객지원 채널 — 푸터 */
export const SUPPORT = {
  telegram: process.env.NEXT_PUBLIC_SUPPORT_TELEGRAM ?? "https://t.me/gachaflix",
  discord: process.env.NEXT_PUBLIC_SUPPORT_DISCORD ?? "https://discord.gg/gachaflix",
  notice: process.env.NEXT_PUBLIC_SUPPORT_NOTICE ?? "https://t.me/gachaflix_notice",
};
