// 자산 원천 분리 — 지갑 스토어 + 보관함 족보의 실제 흐름 (카드깡 경로 차단 검증)
import test from "node:test";
import assert from "node:assert/strict";

const reset = async () => {
  const { useWalletStore } = await import("../stores/walletStore");
  const { useInventoryStore } = await import("../stores/inventoryStore");
  useWalletStore.setState({ balance: 0, cryptoBalance: 0, cardBalance: 0, transactions: [], totalDeposited: 0, totalDepositedCrypto: 0, totalDepositedCard: 0, totalWagered: 0, welcomeClaimed: false });
  useInventoryStore.setState({ items: [] });
  return { useWalletStore, useInventoryStore };
};

const fair = { serverSeedHash: "h", serverSeed: "s", clientSeed: "c", nonce: 1, roll: 1 };

test("balance 는 항상 cryptoBalance + cardBalance", async () => {
  const { useWalletStore } = await reset();
  const w = useWalletStore.getState();
  w.credit(100, "crypto");
  w.credit(40, "card");
  const s = useWalletStore.getState();
  assert.equal(s.cryptoBalance, 100);
  assert.equal(s.cardBalance, 40);
  assert.equal(s.balance, 140);
});

test("개봉 차감은 암호화폐부터 — 모자라면 카드와 결합되고 비율이 남는다", async () => {
  const { useWalletStore } = await reset();
  const w = useWalletStore.getState();
  w.credit(60, "crypto");
  w.credit(100, "card");
  const plan = useWalletStore.getState().debitSplit(100)!;
  assert.equal(plan.source, "mixed");
  assert.equal(plan.ratio.crypto, 0.6);
  const s = useWalletStore.getState();
  assert.equal(s.cryptoBalance, 0);
  assert.equal(s.cardBalance, 60);
});

test("카드 잔액은 온체인 출금으로 절대 빠져나가지 않는다", async () => {
  const { useWalletStore } = await reset();
  useWalletStore.getState().credit(500, "card");
  assert.equal(useWalletStore.getState().debitCrypto(100), false, "암호화폐 잔액 0 이면 거부");
  assert.equal(useWalletStore.getState().cardBalance, 500, "카드 잔액은 그대로");
  useWalletStore.getState().credit(120, "crypto");
  assert.equal(useWalletStore.getState().debitCrypto(100), true);
  const s = useWalletStore.getState();
  assert.equal(s.cryptoBalance, 20);
  assert.equal(s.cardBalance, 500);
});

test("카드깡 경로 차단: 카드 충전 → 개봉 → 환전하면 환급금은 100% 카드 잔액으로 돌아온다", async () => {
  const { useWalletStore, useInventoryStore } = await reset();
  const w = useWalletStore.getState();
  w.credit(100, "card"); // 카드 결제 충전
  const plan = useWalletStore.getState().debitSplit(100)!; // 전액 카드로 개봉
  assert.equal(plan.source, "card");

  const [rec] = useInventoryStore.getState().add([{ itemId: "x", boxSlug: "b", valueUsdt: 100, tier: "royal", fair, fundingRatio: plan.ratio, fundingSource: plan.source }]);
  assert.equal(rec.fundingSource, "card");

  const sold = useInventoryStore.getState().sell([rec.id], 0.95);
  assert.equal(sold.totalUsdt, 95);
  assert.equal(sold.toCrypto, 0, "카드 출처 환급금이 암호화폐로 새면 안 된다");
  assert.equal(sold.toCard, 95);

  useWalletStore.getState().creditSplit(sold.toCrypto, sold.toCard);
  const s = useWalletStore.getState();
  assert.equal(s.cryptoBalance, 0);
  assert.equal(s.cardBalance, 95);
  assert.equal(s.debitCrypto(95), false, "환전해도 온체인 출금은 여전히 불가");
});

test("결합 개봉의 환급금은 족보 비율대로 나뉜다", async () => {
  const { useWalletStore, useInventoryStore } = await reset();
  useWalletStore.getState().credit(60, "crypto");
  useWalletStore.getState().credit(40, "card");
  const plan = useWalletStore.getState().debitSplit(100)!;
  const [rec] = useInventoryStore.getState().add([{ itemId: "x", boxSlug: "b", valueUsdt: 200, tier: "royal", fair, fundingRatio: plan.ratio, fundingSource: plan.source }]);
  const sold = useInventoryStore.getState().sell([rec.id], 0.95);
  assert.equal(sold.totalUsdt, 190);
  assert.equal(sold.toCrypto, 114, "60%");
  assert.equal(sold.toCard, 76, "40%");
});

test("구버전 기록(족보 없음)은 crypto 로 간주된다", async () => {
  const { useInventoryStore } = await reset();
  const [rec] = useInventoryStore.getState().add([{ itemId: "x", boxSlug: "b", valueUsdt: 10, tier: "curated", fair }]);
  assert.equal(rec.fundingSource, "crypto");
  const sold = useInventoryStore.getState().sell([rec.id], 1);
  assert.equal(sold.toCrypto, 10);
  assert.equal(sold.toCard, 0);
});

test("롤오버 누계: 입금은 요구액, 개봉은 소진액으로 잡힌다", async () => {
  const { useWalletStore } = await reset();
  const w = useWalletStore.getState();
  w.addTransaction({ type: "deposit_card", amountUsdt: 100 });
  w.addTransaction({ type: "open", amountUsdt: -30 });
  w.addTransaction({ type: "sellback", amountUsdt: 28 });
  const s = useWalletStore.getState();
  assert.equal(s.totalDeposited, 100);
  assert.equal(s.totalWagered, 30, "환급은 롤오버를 되돌리지 않는다");
});

test("안티 그라인딩: 저위험 상자 개봉은 30% 만 롤오버에 잡힌다", async () => {
  const { useWalletStore } = await reset();
  const w = useWalletStore.getState();
  w.addTransaction({ type: "deposit_usdt", amountUsdt: 100 });
  // 잭팟(바닥 95%) 100 USDT 개봉 → 인정 30
  w.addTransaction({ type: "open", amountUsdt: -100, ref: "jackpot-supercar x1", rolloverUsdt: 30 });
  let s = useWalletStore.getState();
  assert.equal(s.totalDepositedCrypto, 100);
  assert.equal(s.totalWagered, 30);
  // 1달러 상자(바닥 85%) 70 USDT 개봉 → 전액 인정
  w.addTransaction({ type: "open", amountUsdt: -70, ref: "dollar-apple x70", rolloverUsdt: 70 });
  s = useWalletStore.getState();
  assert.equal(s.totalWagered, 100, "30 + 70 = 100 → 충족");
});

test("카드 입금은 필요 롤오버(크립토 기준)를 늘리지 않는다", async () => {
  const { useWalletStore } = await reset();
  const w = useWalletStore.getState();
  w.addTransaction({ type: "deposit_card", amountUsdt: 500 });
  const s = useWalletStore.getState();
  assert.equal(s.totalDepositedCrypto, 0);
  assert.equal(s.totalDepositedCard, 500);
  assert.equal(s.totalDeposited, 500, "표시용 합계는 그대로");
});

test("배송비 같은 비개봉 지출(rolloverUsdt: 0)은 롤오버를 채우지 않는다", async () => {
  const { useWalletStore } = await reset();
  const w = useWalletStore.getState();
  w.addTransaction({ type: "deposit_usdt", amountUsdt: 100 });
  w.addTransaction({ type: "open", amountUsdt: -15, ref: "shipping:KR", rolloverUsdt: 0 });
  assert.equal(useWalletStore.getState().totalWagered, 0);
});
