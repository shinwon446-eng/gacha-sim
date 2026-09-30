import { MIN_WITHDRAW_USDT, WITHDRAW_NETWORK_BY_KEY } from "./withdrawal";

export const LEGAL_VERSION = "2026-09-30.1";
export const LEGAL_EFFECTIVE_DATE = "2026-09-30";
/**
 * 저작권 표기 연도. `new Date().getFullYear()` 를 쓰면 정적 export 의 빌드 시각과 방문자의 시계가 갈려
 * 연말·연초에 하이드레이션이 깨지므로, 약관 시행일에서 결정론적으로 끌어온다.
 * 약관을 개정하면 연도도 함께 올라간다 — 고쳐야 할 곳이 한 군데다.
 */
export const COPYRIGHT_YEAR = Number(LEGAL_EFFECTIVE_DATE.slice(0, 4));
export const LEGAL_DOCS = ["terms", "privacy", "payments", "withdrawals", "refunds", "policy", "fairness", "safety", "community", "cookies", "complaints", "business", "faq"] as const;
export type LegalDoc = (typeof LEGAL_DOCS)[number];
export const LEGAL_GROUPS = [
  { key: "basics", docs: ["terms", "privacy", "cookies", "business"] },
  { key: "transactions", docs: ["payments", "withdrawals", "refunds", "policy"] },
  { key: "rights", docs: ["fairness", "safety", "community", "complaints", "faq"] },
] as const;
const legalSetting = (name: string, fallback: string) => process.env[name] || fallback;

// Shared display values used by every published policy document.
export const LEGAL_VALUES = {
  minWithdraw: MIN_WITHDRAW_USDT,
  minDeposit: "1.00",
  trcFee: WITHDRAW_NETWORK_BY_KEY.TRC20.feeUsdt.toFixed(2),
  bepFee: WITHDRAW_NETWORK_BY_KEY.BEP20.feeUsdt.toFixed(2),
  companyName: legalSetting("NEXT_PUBLIC_LEGAL_COMPANY_NAME", "VOILA Operations"),
  registrationNumber: legalSetting("NEXT_PUBLIC_LEGAL_REGISTRATION_NUMBER", "VOILA-2026-001"),
  companyAddress: legalSetting("NEXT_PUBLIC_LEGAL_COMPANY_ADDRESS", "Seoul, Republic of Korea"),
  supportEmail: legalSetting("NEXT_PUBLIC_LEGAL_SUPPORT_EMAIL", "support@voila.global"),
  csHours: legalSetting("NEXT_PUBLIC_LEGAL_CS_HOURS", "Monday~Friday, 09:00~18:00 KST"),
};
export const LEGAL_SOURCES = [
  { key: "consumer", href: "https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=282793" },
  { key: "privacy", href: "https://www.law.go.kr/lsLinkCommonInfo.do?lsJoLnkSeq=1029331583" },
  { key: "clauses", href: "https://www.law.go.kr/lsLinkCommonInfo.do?lsJoLnkSeq=1025032405" },
  { key: "gaming", href: "https://www.law.go.kr/lsLinkCommonInfo.do?lsJoLnkSeq=1032690633" },
  { key: "fiu", href: "https://www.kofiu.go.kr/kor/main.do" },
  { key: "hosting", href: "https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages#data-collection" },
] as const;
