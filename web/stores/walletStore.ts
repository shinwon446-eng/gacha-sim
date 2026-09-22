"use client";

/**
 * 데모 지갑 (USDT 기준 정수/소수). 결제·계정 없음. localStorage 에 persist.
 * 표시는 항상 useCurrency().fmt 를 거친다 — 여기서는 숫자만 다룬다.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { CRYPTO_ONLY, planDebit, type FundingRatio, type FundingSplit } from "@/lib/funding";

export const START_BALANCE_USDT = 1000;
/** 무료 체험 후 1회 지급되는 웰컴 보너스 (CLAUDE.md §4-A) */
export const WELCOME_BONUS_USDT = 5;

export type TxType = "deposit_usdt" | "deposit_card" | "open" | "sellback" | "withdraw" | "bonus";

export type TxStatus = "PENDING" | "BROADCASTING" | "COMPLETED";

export interface Transaction {
  id: string;
  type: TxType;
  /** USDT 기준. 입금·판매는 +, 오픈은 - */
  amountUsdt: number;
  at: string;
  /** 부가 정보 — PG 거래 id, 네트워크, 박스 slug 등 */
  ref?: string;
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
  setTransactionStatus: (id: string, status: TxStatus, patch?: Partial<Pick<Transaction, "txHash">>) => void;
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

export const useWalletStore = create<WalletState>()(
  persist(
    (set, get) => ({
      balance: START_BALANCE_USDT,
      cryptoBalance: START_BALANCE_USDT,
      cardBalance: 0,
      transactions: [],
      totalDeposited: 0,
      totalDepositedCrypto: 0,
      totalDepositedCard: 0,
      totalWagered: 0,
      welcomeClaimed: false,
      hydrated: false,
      addTransaction: (tx) => {
        const rec: Transaction = { ...tx, id: `tx_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`, at: new Date().toISOString() };
        // 롤오버 누계는 여기서만 늘어난다 — 입금(+)은 요구액, 개봉(−)은 가중치가 반영된 인정액
        const depositedCrypto = rec.type === "deposit_usdt" ? Math.max(0, rec.amountUsdt) : 0;
        const depositedCard = rec.type === "deposit_card" ? Math.max(0, rec.amountUsdt) : 0;
        const wagered = rec.type === "open" ? (typeof rec.rolloverUsdt === "number" ? Math.max(0, rec.rolloverUsdt) : Math.abs(Math.min(0, rec.amountUsdt))) : 0;
        set((s) => ({
          transactions: [rec, ...s.transactions].slice(0, 200),
          totalDepositedCrypto: +(s.totalDepositedCrypto + depositedCrypto).toFixed(2),
          totalDepositedCard: +(s.totalDepositedCard + depositedCard).toFixed(2),
          totalDeposited: +(s.totalDeposited + depositedCrypto + depositedCard).toFixed(2),
          totalWagered: +(s.totalWagered + wagered).toFixed(2),
        }));
        return rec;
      },
      setTransactionStatus: (id, status, patch) => set((s) => ({ transactions: s.transactions.map((x) => (x.id === id ? { ...x, status, ...patch } : x)) })),
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
      partialize: (s) => ({ balance: s.balance, cryptoBalance: s.cryptoBalance, cardBalance: s.cardBalance, transactions: s.transactions, welcomeClaimed: s.welcomeClaimed, totalDeposited: s.totalDeposited, totalDepositedCrypto: s.totalDepositedCrypto, totalDepositedCard: s.totalDepositedCard, totalWagered: s.totalWagered }),
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
