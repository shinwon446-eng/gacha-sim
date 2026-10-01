/**
 * 서비스 연결 설정. 환경변수는 데이터 전송 경로를 선택하며 화면과 기능을 잠그지 않는다.
 * 입출금, 계정, 보관함은 공통 데이터 계약과 상태 전이를 사용한다.
 */
export const API_BASE = (process.env.NEXT_PUBLIC_API_BASE ?? "").trim().replace(/\/+$/, "");

/** Transport selector retained for API consumers; never use as a UI permission. */
export const isLive = (): boolean => API_BASE.length > 0;
export const isPreview = (): boolean => !isLive();

/** 온체인 지급 준비금 지갑 */
export const RESERVE_ADDRESS = process.env.NEXT_PUBLIC_RESERVE_ADDRESS ?? "";
/**
 * 플랫폼 전용 입금 지갑. 배포 주소를 우선 사용하고 계정별 발급 주소를 함께 지원한다.
 */
export const DEPOSIT_ADDRESSES: Record<"TRC20" | "BEP20" | "ERC20", string> = {
  TRC20: process.env.NEXT_PUBLIC_DEPOSIT_TRC20?.trim() ?? "",
  BEP20: process.env.NEXT_PUBLIC_DEPOSIT_BEP20?.trim() ?? "",
  ERC20: process.env.NEXT_PUBLIC_DEPOSIT_ERC20?.trim() ?? "",
};
export const RESERVE_NETWORK = (process.env.NEXT_PUBLIC_RESERVE_NETWORK ?? "TRC20") as "TRC20" | "BEP20";

/** 고객지원 채널, 푸터 */
export const SUPPORT = {
  telegram: process.env.NEXT_PUBLIC_SUPPORT_TELEGRAM ?? "",
  discord: process.env.NEXT_PUBLIC_SUPPORT_DISCORD ?? "",
  notice: process.env.NEXT_PUBLIC_SUPPORT_NOTICE ?? "",
};
