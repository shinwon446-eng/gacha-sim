import { MIN_WITHDRAW_USDT, WITHDRAW_NETWORK_BY_KEY } from "./withdrawal";

// Policy publication does not activate unconnected transaction services.
export const LEGAL_VERSION = "2026-09-29.3";
export const LEGAL_DOCS = ["terms", "privacy", "payments", "withdrawals", "refunds", "policy", "fairness", "safety", "community", "cookies", "complaints", "business", "faq"] as const;
export type LegalDoc = (typeof LEGAL_DOCS)[number];
export const LEGAL_GROUPS = [
  { key: "basics", docs: ["terms", "privacy", "cookies", "business"] },
  { key: "transactions", docs: ["payments", "withdrawals", "refunds", "policy"] },
  { key: "rights", docs: ["fairness", "safety", "community", "complaints", "faq"] },
] as const;
// Shared display values; the transaction flow must confirm availability and final charges.
export const LEGAL_VALUES = {
  minWithdraw: MIN_WITHDRAW_USDT,
  trcFee: WITHDRAW_NETWORK_BY_KEY.TRC20.feeUsdt.toFixed(2),
  bepFee: WITHDRAW_NETWORK_BY_KEY.BEP20.feeUsdt.toFixed(2),
};
export const LEGAL_SOURCES = [
  { key: "consumer", href: "https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=282793" },
  { key: "privacy", href: "https://www.law.go.kr/lsLinkCommonInfo.do?lsJoLnkSeq=1029331583" },
  { key: "clauses", href: "https://www.law.go.kr/lsLinkCommonInfo.do?lsJoLnkSeq=1025032405" },
  { key: "gaming", href: "https://www.law.go.kr/lsLinkCommonInfo.do?lsJoLnkSeq=1032690633" },
  { key: "fiu", href: "https://www.kofiu.go.kr/kor/main.do" },
  { key: "hosting", href: "https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages#data-collection" },
] as const;
