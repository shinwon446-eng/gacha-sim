import { MIN_DEPOSIT_USDT } from "./depositAddress";
import { MIN_WITHDRAW_USDT, WITHDRAW_NETWORK_BY_KEY } from "./withdrawal";

// Pre-launch documents describe the design; they do not enable transactions.
export const LEGAL_VERSION = "2026-09-29-draft.2";
export const LEGAL_DOCS = ["terms", "privacy", "payments", "withdrawals", "refunds", "policy", "fairness", "safety", "community", "cookies", "complaints", "business", "faq"] as const;
export type LegalDoc = (typeof LEGAL_DOCS)[number];
export const LEGAL_GROUPS = [
  { key: "basics", docs: ["terms", "privacy", "cookies", "business"] },
  { key: "transactions", docs: ["payments", "withdrawals", "refunds", "policy"] },
  { key: "rights", docs: ["fairness", "safety", "community", "complaints", "faq"] },
] as const;
// Shared with transaction screens. Design values, not launch quotes.
export const LEGAL_VALUES = {
  minDeposit: MIN_DEPOSIT_USDT,
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
