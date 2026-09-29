"use client";

/**
 * 계정 지갑. USDT 잔액·입출금·캐시백을 기록하고 정산 중복을 방지한다.
 * 표시는 항상 useCurrency().fmt 를 거친다 — 여기서는 숫자만 다룬다.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { CRYPTO_ONLY, planDebit, type FundingRatio, type FundingSplit } from "@/lib/funding";

/** 시작 잔액 — 신규 유저는 0 에서 시작한다(체험용 가상 잔고 없음). 충전해야 개봉할 수 있다. */
export const START_BALANCE_USDT = 0;
/** 무료 체험 후 1회 지급되는 웰컴 보너스 (CLAUDE.md §4-A) */
export const WELCOME_BONUS_USDT = 5;

export type TxType = "deposit_usdt" | "deposit_card" | "open" | "sellback" | "withdraw" | "bonus" | "shipping_refund" | "order_refund";

/**
 * PENDING_ADMIN_REVIEW — 부정거래 탐지·서킷 브레이커로 관리자 안전 심사 대기 (lib/fraudScoring.ts)
 * PENDING_72H_HOLD    — Google OTP 대신 이메일 인증으로 신청한 출금. 72시간 보안 대기 후 송금 (lib/withdrawHold.ts)
 * CANCELLED           — 대기 중 본인이 취소 → 잔액 환불 완료
 */
export type TxStatus = "PENDING" | "PENDING_ADMIN_REVIEW" | "PENDING_72H_HOLD" | "BROADCASTING" | "COMPLETED" | "CANCELLED" | "FAILED";

/** 출금을 통과시킨 2차 인증 수단 — 내역에 그대로 남는다 */
export type WithdrawAuthMethod = "2FA_OTP" | "EMAIL_72H_HOLD";

export interface Transaction {
  id: string;
  accountId?: string;
  serverId?: string;
  type: TxType;
  /** USDT 기준. 입금·판매는 +, 오픈은 - */
  amountUsdt: number;
  at: string;
  /** 부가 정보 — PG 거래 id, 네트워크, 박스 slug 등 */
  ref?: string;
  /** 출금 네트워크 수수료(USDT) */
  feeUsdt?: number;
  /** 수수료를 뺀 실수령액(USDT) — 화면에서 가장 크게 보여 주는 값 */
  netUsdt?: number;
  /** 입·출금 네트워크 키("TRC20"/"BEP20") 또는 카드 브랜드 */
  network?: string;
  /** 수령 지갑 주소 */
  address?: string;
  /** 출금을 통과시킨 인증 수단 */
  authMethod?: WithdrawAuthMethod;
  /** 72시간 보안 대기 해제 시각(epoch ms) — PENDING_72H_HOLD 전용 */
  unlockAt?: number;
  /** 인증에 쓴 이메일(마스킹) — 원문은 저장하지 않는다 */
  emailMasked?: string;
  /** 카드 결제 영수증 번호 — PG 가 준 값만 들어간다 */
  receipt?: string;
  /**
   * 이 개봉이 롤오버에 인정되는 금액(USDT). 저위험 상자는 개봉액의 30% 만 잡힌다 (lib/rollover.ts).
   * 없으면 개봉액 전액으로 본다. 배송비처럼 롤오버와 무관한 지출은 0 을 준다.
   */
  rolloverUsdt?: number;
  /** 출금처럼 비동기 처리되는 거래의 진행 상태 */
  status?: TxStatus;
  /** 온체인 TxID — BROADCASTING 이후 */
  txHash?: string;
}

interface WalletState {
  /** 총 잔액 = cryptoBalance + cardBalance (표시용) */
  balance: number;
  /** USDT 온체인 입금분 — 온체인 출금 가능 */
  cryptoBalance: number;
  /** 신용카드 결제분 — 개봉·실물 배송·카드 환불 전용, 온체인 출금 불가 (CLAUDE.md §7-B) */
  cardBalance: number;
  transactions: Transaction[];
  settledDepositRefs: string[];
  settleDeposit: (id: string, input: { amountUsdt: number; reference: string; txHash?: string; receipt?: string }) => boolean;
  syncWithdrawal: (id: string, status: TxStatus, patch?: { txHash?: string; unlockAt?: number }) => void;
  /** 롤오버(자금세탁 방지) 누계 — addTransaction 이 자동으로 적립한다. lib/rollover.ts 참고 */
  totalDeposited: number;
  /** 크립토 입금 누계 — 필요 롤오버의 기준(카드 입금분은 온체인 출금이 애초에 불가하므로 제외) */
  totalDepositedCrypto: number;
  totalDepositedCard: number;
  /** 가중치가 반영된 누적 롤오버 달성액 */
  totalWagered: number;
  /** 웰컴 보너스 수령 여부 — 브라우저당 1회 */
  welcomeClaimed: boolean;
  hydrated: boolean;
  addTransaction: (tx: Omit<Transaction, "id" | "at">) => Transaction;
  setTransactionStatus: (id: string, status: TxStatus, patch?: Partial<Pick<Transaction, "txHash" | "receipt">>) => void;
  /**
   * 72시간 보안 대기 중인 출금을 본인이 취소하고 잔액을 되돌린다.
   * 대기 상태가 아니거나 이미 취소된 건이면 아무것도 하지 않고 false — 중복 환불이 일어날 수 없다.
   */
  cancelHeldWithdrawal: (id: string) => boolean;
  /** 차감(암호화폐 우선 → 모자라면 카드 결합). 부족하면 false 를 돌려주고 아무것도 바꾸지 않는다. */
  debit: (usdt: number) => boolean;
  /** 차감 + 이번 지출의 족보(비율)를 돌려준다 — 개봉이 쓴다. 부족하면 null. */
  debitSplit: (usdt: number) => FundingSplit | null;
  /** 온체인 출금 전용 차감 — 암호화폐 잔액만 건드린다(카드 충전분은 절대 나가지 않는다) */
  debitCrypto: (usdt: number) => boolean;
  /** 적립. 원천을 주지 않으면 암호화폐 잔액으로 — 환급은 반드시 아이템 족보대로 부를 것 */
  credit: (usdt: number, to?: "crypto" | "card") => void;
  /** 환급 귀속 — 암호화폐/카드 잔액에 각각 더한다 */
  creditSplit: (toCrypto: number, toCard: number) => void;
  topUp: () => void;
  /** 웰컴 보너스 지급. 이미 받았으면 false. */
  claimWelcome: () => boolean;
}

/** 두 버킷 → 표시용 총 잔액. balance 는 항상 여기서만 계산된다(어긋날 수 없다). */
const sync = (cryptoBalance: number, cardBalance: number) => ({ cryptoBalance, cardBalance, balance: +(cryptoBalance + cardBalance).toFixed(2) });
let transactionSequence = 0;
const transactionId = () => `tx_${globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}_${++transactionSequence}`}`;

export const useWalletStore = create<WalletState>()(
  persist(
    (set, get) => ({
      balance: START_BALANCE_USDT,
      cryptoBalance: START_BALANCE_USDT,
      cardBalance: 0,
      transactions: [],
      settledDepositRefs: [],
      totalDeposited: 0,
      totalDepositedCrypto: 0,
      totalDepositedCard: 0,
      totalWagered: 0,
      welcomeClaimed: false,
      hydrated: false,
      addTransaction: (tx) => {
        const rec: Transaction = { ...tx, id: transactionId(), at: new Date().toISOString() };
        // 롤오버 누계는 **확정된 입금**만 올린다. 확인 대기(PENDING) 상태로 만든 입금 레코드는
        // 아직 돈이 도착하지 않았으므로 요구 롤오버를 늘리지 않는다 — COMPLETED 로 바뀔 때 setTransactionStatus 가 더한다.
        const settled = rec.status === undefined || rec.status === "COMPLETED";
        const depositedCrypto = settled && rec.type === "deposit_usdt" ? Math.max(0, rec.amountUsdt) : 0;
        const depositedCard = settled && rec.type === "deposit_card" ? Math.max(0, rec.amountUsdt) : 0;
        const wagered = rec.type === "open" ? (typeof rec.rolloverUsdt === "number" ? Math.max(0, rec.rolloverUsdt) : Math.abs(Math.min(0, rec.amountUsdt))) : 0;
        set((s) => ({
          transactions: [rec, ...s.transactions],
          totalDepositedCrypto: +(s.totalDepositedCrypto + depositedCrypto).toFixed(2),
          totalDepositedCard: +(s.totalDepositedCard + depositedCard).toFixed(2),
          totalDeposited: +(s.totalDeposited + depositedCrypto + depositedCard).toFixed(2),
          totalWagered: +(s.totalWagered + wagered).toFixed(2),
        }));
        return rec;
      },
      settleDeposit: (id, input) => {
        const s = get();
        const tx = s.transactions.find(x => x.id === id);
        if (!tx || !["deposit_usdt", "deposit_card"].includes(tx.type) || tx.status !== "PENDING" || !Number.isFinite(input.amountUsdt) || input.amountUsdt <= 0 || !input.reference.trim()) return false;
        const key = `${tx.type}:${input.reference}`;
        if (s.settledDepositRefs.includes(key) || s.transactions.some(x => x.id !== id && x.type === tx.type && (x.status === "COMPLETED" || x.status === undefined) && x.ref === input.reference)) {
          set({ transactions: s.transactions.map(x => x.id === id ? { ...x, status: "CANCELLED" } : x) });
          return false;
        }
        const crypto = tx.type === "deposit_usdt" ? input.amountUsdt : 0;
        const card = tx.type === "deposit_card" ? input.amountUsdt : 0;
        set({
          ...sync(+(s.cryptoBalance + crypto).toFixed(2), +(s.cardBalance + card).toFixed(2)),
          transactions: s.transactions.map(x => x.id === id ? { ...x, amountUsdt: input.amountUsdt, ref: input.reference, txHash: input.txHash, receipt: input.receipt, status: "COMPLETED" } : x),
          settledDepositRefs: [...s.settledDepositRefs, key],
          totalDepositedCrypto: +(s.totalDepositedCrypto + crypto).toFixed(2),
          totalDepositedCard: +(s.totalDepositedCard + card).toFixed(2),
          totalDeposited: +(s.totalDeposited + crypto + card).toFixed(2),
        });
        return true;
      },
      syncWithdrawal: (id, status, patch) => set(s => {
        const tx = s.transactions.find(x => x.id === id);
        if (!tx || tx.type !== "withdraw" || ["COMPLETED", "CANCELLED", "FAILED"].includes(tx.status ?? "")) return {};
        const refund = ["CANCELLED", "FAILED"].includes(status) ? Math.abs(tx.amountUsdt) : 0;
        return { ...sync(+(s.cryptoBalance + refund).toFixed(2), s.cardBalance), transactions: s.transactions.map(x => x.id === id ? { ...x, ...patch, status } : x) };
      }),
      setTransactionStatus: (id, status, patch) =>
        set((s) => {
          const prev = s.transactions.find((x) => x.id === id);
          if (!prev || ["COMPLETED", "CANCELLED", "FAILED"].includes(prev.status ?? "") || (prev.status === undefined && ["deposit_usdt", "deposit_card"].includes(prev.type))) return {};
          const transactions = s.transactions.map((x) => (x.id === id ? { ...x, status, ...patch } : x));
          // 확인 대기였던 입금이 확정되는 순간에만 롤오버 요구액이 올라간다(중복 가산 없음)
          const becameSettled = !!prev && prev.status !== "COMPLETED" && status === "COMPLETED";
          const crypto = becameSettled && prev.type === "deposit_usdt" ? Math.max(0, prev.amountUsdt) : 0;
          const card = becameSettled && prev.type === "deposit_card" ? Math.max(0, prev.amountUsdt) : 0;
          if (!crypto && !card) return { transactions };
          return {
            transactions,
            totalDepositedCrypto: +(s.totalDepositedCrypto + crypto).toFixed(2),
            totalDepositedCard: +(s.totalDepositedCard + card).toFixed(2),
            totalDeposited: +(s.totalDeposited + crypto + card).toFixed(2),
          };
        }),
      cancelHeldWithdrawal: (id) => {
        const tx = get().transactions.find((x) => x.id === id);
        // 대기 중인 출금만 되돌린다 — 이미 CANCELLED 거나 송금이 시작된 건은 손대지 않는다
        if (!tx || tx.type !== "withdraw" || tx.status !== "PENDING_72H_HOLD") return false;
        const refund = Math.abs(tx.amountUsdt);
        set((s) => ({
          ...sync(+(s.cryptoBalance + refund).toFixed(2), s.cardBalance),
          transactions: s.transactions.map((x) => (x.id === id ? { ...x, status: "CANCELLED" as TxStatus } : x)),
        }));
        return true;
      },
      debit: (usdt) => get().debitSplit(usdt) !== null,
      debitCrypto: (usdt) => {
        const s = get();
        if (!Number.isFinite(usdt) || usdt <= 0 || s.cryptoBalance + 1e-9 < usdt) return false;
        set((x) => sync(+(x.cryptoBalance - usdt).toFixed(2), x.cardBalance));
        return true;
      },
      debitSplit: (usdt) => {
        const s = get();
        const plan = planDebit(usdt, s.cryptoBalance, s.cardBalance);
        if (!plan) return null;
        set((x) => sync(+(x.cryptoBalance - plan.fromCrypto).toFixed(2), +(x.cardBalance - plan.fromCard).toFixed(2)));
        return plan;
      },
      credit: (usdt, to = "crypto") => set((s) => sync(to === "crypto" ? +(s.cryptoBalance + usdt).toFixed(2) : s.cryptoBalance, to === "card" ? +(s.cardBalance + usdt).toFixed(2) : s.cardBalance)),
      creditSplit: (toCrypto, toCard) => set((s) => sync(+(s.cryptoBalance + toCrypto).toFixed(2), +(s.cardBalance + toCard).toFixed(2))),
      topUp: () => set((s) => sync(+(s.cryptoBalance + START_BALANCE_USDT).toFixed(2), s.cardBalance)),
      claimWelcome: () => {
        if (get().welcomeClaimed) return false;
        set((s) => ({ ...sync(+(s.cryptoBalance + WELCOME_BONUS_USDT).toFixed(2), s.cardBalance), welcomeClaimed: true }));
        get().addTransaction({ type: "bonus", amountUsdt: WELCOME_BONUS_USDT, ref: "welcome" });
        return true;
      },
    }),
    {
      name: "gachaflix.wallet",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ balance: s.balance, cryptoBalance: s.cryptoBalance, cardBalance: s.cardBalance, transactions: s.transactions, settledDepositRefs: s.settledDepositRefs, welcomeClaimed: s.welcomeClaimed, totalDeposited: s.totalDeposited, totalDepositedCrypto: s.totalDepositedCrypto, totalDepositedCard: s.totalDepositedCard, totalWagered: s.totalWagered }),
      version: 4,
      // v0 → v1: 출금 상태명 PROCESSING → BROADCASTING
      // v1 → v2: 롤오버 누계 신설 — 남아 있는 거래 기록에서 되살린다
      migrate: (persisted, version) => {
        const s = persisted as { transactions?: Transaction[]; totalDeposited?: number; totalWagered?: number };
        if (version < 1 && Array.isArray(s.transactions)) {
          s.transactions = s.transactions.map((x) => ((x.status as string) === "PROCESSING" ? { ...x, status: "BROADCASTING" } : x));
        }
        if (version < 4) {
          // v3 → v4: 필요 롤오버를 크립토 입금분 기준으로 — 남은 거래 기록에서 되살린다
          const w = persisted as { transactions?: Transaction[]; totalDeposited?: number; totalDepositedCrypto?: number; totalDepositedCard?: number };
          const txs = Array.isArray(w.transactions) ? w.transactions : [];
          w.totalDepositedCrypto = +txs.filter((x) => x.type === "deposit_usdt").reduce((n, x) => n + Math.max(0, x.amountUsdt), 0).toFixed(2);
          w.totalDepositedCard = +txs.filter((x) => x.type === "deposit_card").reduce((n, x) => n + Math.max(0, x.amountUsdt), 0).toFixed(2);
          w.totalDeposited = +(w.totalDepositedCrypto + w.totalDepositedCard).toFixed(2);
        }
        if (version < 3) {
          // v2 → v3: 원천 분리 신설. 카드 결제 도입 전 잔액은 전부 암호화폐분으로 본다.
          const w = persisted as { balance?: number; cryptoBalance?: number; cardBalance?: number };
          if (typeof w.cryptoBalance !== "number") w.cryptoBalance = typeof w.balance === "number" ? w.balance : 0;
          if (typeof w.cardBalance !== "number") w.cardBalance = 0;
        }
        if (version < 2) {
          const txs = Array.isArray(s.transactions) ? s.transactions : [];
          s.totalDeposited = +txs.filter((x) => x.type === "deposit_usdt" || x.type === "deposit_card").reduce((n, x) => n + Math.max(0, x.amountUsdt), 0).toFixed(2);
          s.totalWagered = +txs.filter((x) => x.type === "open").reduce((n, x) => n + Math.abs(Math.min(0, x.amountUsdt)), 0).toFixed(2);
        }
        return s as never;
      },
      skipHydration: true,
      onRehydrateStorage: () => () => useWalletStore.setState({ hydrated: true }),
    },
  ),
);
