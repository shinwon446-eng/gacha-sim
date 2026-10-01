// 이메일 인증 출금의 72시간 보안 대기 + 입금 확정 회계
//   npm test
import test from "node:test";
import assert from "node:assert/strict";
import { HOLD_HOURS, HOLD_MS, holdCountdown, holdElapsedRatio, holdReleased, holdRemainingMs, holdUnlockAt, maskEmail } from "../lib/withdrawHold";
import { useWalletStore } from "../stores/walletStore";

test("대기는 정확히 72시간이다", () => {
  assert.equal(HOLD_HOURS, 72);
  assert.equal(HOLD_MS, 72 * 3600 * 1000);
  const t0 = 1_700_000_000_000;
  assert.equal(holdUnlockAt(t0), t0 + HOLD_MS);
});

test("남은 시간은 0 아래로 내려가지 않고, 해제 판정은 정확히 0 에서 참", () => {
  const unlock = 1_000_000;
  assert.equal(holdRemainingMs(unlock, 0), 1_000_000);
  assert.equal(holdRemainingMs(unlock, unlock), 0);
  assert.equal(holdRemainingMs(unlock, unlock + 99_999), 0);
  assert.equal(holdReleased(unlock, unlock - 1), false);
  assert.equal(holdReleased(unlock, unlock), true);
});

test("카운트다운 쪼개기 — 71시간 59분", () => {
  const t0 = 1_700_000_000_000;
  const unlock = holdUnlockAt(t0);
  const c = holdCountdown(unlock, t0 + 61_000); // 1분 1초 경과
  assert.equal(c.hours, 71);
  assert.equal(c.minutes, 58);
  assert.equal(c.seconds, 59);
  assert.equal(c.released, false);
  const done = holdCountdown(unlock, unlock + 1);
  assert.deepEqual([done.hours, done.minutes, done.seconds, done.released], [0, 0, 0, true]);
});

test("진행률은 0~1 로 묶인다", () => {
  const t0 = 1_700_000_000_000;
  const unlock = holdUnlockAt(t0);
  assert.equal(holdElapsedRatio(unlock, t0), 0);
  assert.equal(holdElapsedRatio(unlock, t0 + HOLD_MS / 2), 0.5);
  assert.equal(holdElapsedRatio(unlock, unlock + 10_000_000), 1);
});

test("이메일 마스킹 — 가운데는 복원할 수 없다", () => {
  assert.equal(maskEmail("sangwon@example.com"), "sa****@example.com");
  assert.equal(maskEmail("ab@x.io"), "****@x.io");
  assert.equal(maskEmail("a@x.io"), "****@x.io");
  assert.equal(maskEmail("not-an-email"), "****");
  assert.ok(!maskEmail("sangwon@example.com").includes("ngwon"));
});

/** 각 테스트가 서로를 오염시키지 않도록 지갑을 초기화한다 */
function resetWallet() {
  useWalletStore.setState({
    balance: 0,
    cryptoBalance: 0,
    cardBalance: 0,
    transactions: [],
    totalDeposited: 0,
    totalDepositedCrypto: 0,
    totalDepositedCard: 0,
    totalWagered: 0,
  });
}

test("확인 대기(PENDING) 입금은 롤오버 요구액을 올리지 않는다", () => {
  resetWallet();
  const s = useWalletStore.getState();
  s.addTransaction({ type: "deposit_usdt", amountUsdt: 100, status: "PENDING" });
  assert.equal(useWalletStore.getState().totalDepositedCrypto, 0, "도착하지 않은 입금이 요구액을 올렸다");
  assert.equal(useWalletStore.getState().totalDeposited, 0);
});

test("입금이 확정되는 순간에만 요구액이 오르고, 두 번 오르지 않는다", () => {
  resetWallet();
  const s = useWalletStore.getState();
  const tx = s.addTransaction({ type: "deposit_usdt", amountUsdt: 100, status: "PENDING" });
  useWalletStore.getState().setTransactionStatus(tx.id, "COMPLETED", { txHash: "0xabc" });
  assert.equal(useWalletStore.getState().totalDepositedCrypto, 100);
  // 같은 레코드를 다시 COMPLETED 로 밀어도 중복 가산되지 않는다
  useWalletStore.getState().setTransactionStatus(tx.id, "COMPLETED");
  assert.equal(useWalletStore.getState().totalDepositedCrypto, 100, "중복 가산됐다");
  assert.equal(useWalletStore.getState().totalDeposited, 100);
});

test("상태 없는 입금(구버전 기록)은 예전처럼 즉시 집계된다", () => {
  resetWallet();
  useWalletStore.getState().addTransaction({ type: "deposit_usdt", amountUsdt: 40 });
  assert.equal(useWalletStore.getState().totalDepositedCrypto, 40);
});

test("72시간 대기 출금 취소 — 잔액이 정확히 되돌아오고 상태는 CANCELLED", () => {
  resetWallet();
  useWalletStore.setState({ cryptoBalance: 100, balance: 100 });
  const s = useWalletStore.getState();
  assert.equal(s.debitCrypto(60), true);
  const tx = s.addTransaction({ type: "withdraw", amountUsdt: -60, status: "PENDING_72H_HOLD", unlockAt: holdUnlockAt() });
  assert.equal(useWalletStore.getState().cryptoBalance, 40);

  assert.equal(useWalletStore.getState().cancelHeldWithdrawal(tx.id), true);
  assert.equal(useWalletStore.getState().cryptoBalance, 100, "환불 금액이 어긋난다");
  assert.equal(useWalletStore.getState().transactions.find((x) => x.id === tx.id)?.status, "CANCELLED");

  // 두 번 눌러도 다시 환불되지 않는다
  assert.equal(useWalletStore.getState().cancelHeldWithdrawal(tx.id), false);
  assert.equal(useWalletStore.getState().cryptoBalance, 100, "중복 환불이 일어났다");
});

test("대기 중이 아닌 출금은 취소되지 않는다 — 이미 전송된 건을 되돌리지 않는다", () => {
  resetWallet();
  useWalletStore.setState({ cryptoBalance: 100, balance: 100 });
  const s = useWalletStore.getState();
  for (const status of ["PENDING", "BROADCASTING", "COMPLETED", "PENDING_ADMIN_REVIEW"] as const) {
    const tx = s.addTransaction({ type: "withdraw", amountUsdt: -10, status });
    assert.equal(useWalletStore.getState().cancelHeldWithdrawal(tx.id), false, status);
  }
  assert.equal(useWalletStore.getState().cryptoBalance, 100);
  assert.equal(useWalletStore.getState().cancelHeldWithdrawal("nope"), false);
});
