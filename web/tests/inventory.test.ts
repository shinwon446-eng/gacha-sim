// 보관함 상태 전이 + 배송 규칙
import test from "node:test";
import assert from "node:assert/strict";
import { useInventoryStore, summarize, type OwnedItem } from "../stores/inventoryStore";
import { COUNTRIES, SHIPPING_FEE_USDT, customsKindFor, isValidPccc, isValidResidentId, shippingFee, validateAddress } from "../lib/shipping";

const base = (over: Partial<Omit<OwnedItem, "id" | "status" | "acquiredAt">> = {}) => ({
  itemId: "ctd-cable",
  boxSlug: "jackpot-cybertruck",
  valueUsdt: 28,
  tier: "curated" as const,
  fair: { serverSeedHash: "h", serverSeed: "s", clientSeed: "c", nonce: 0, roll: 1 },
  ...over,
});

const addr = { recipient: "홍길동", country: "KR" as const, phone: "+82 10-1234-5678", postalCode: "06236", address: "서울 강남구 테헤란로 123, 4층", customsId: "P123456789012" };

test("add → IN_STORAGE, sell → SOLD 환급액 = 가치 × 환급률, 이미 판 것은 다시 못 판다", () => {
  useInventoryStore.setState({ items: [] });
  const [a, b] = useInventoryStore.getState().add([base({ valueUsdt: 100 }), base({ valueUsdt: 50, itemId: "ctd-tracker" })]);
  assert.equal(a.status, "IN_STORAGE");
  assert.equal(useInventoryStore.getState().items.length, 2);
  const r = useInventoryStore.getState().sell([a.id, b.id], 0.8);
  assert.deepEqual(r.ids.sort(), [a.id, b.id].sort());
  assert.equal(r.totalUsdt, 120);
  const again = useInventoryStore.getState().sell([a.id], 0.8);
  assert.equal(again.ids.length, 0);
  assert.equal(again.totalUsdt, 0);
  const sold = useInventoryStore.getState().items.find((i) => i.id === a.id)!;
  assert.equal(sold.status, "SOLD");
  assert.equal(sold.soldForUsdt, 80);
});

test("requestShipping → SHIPPING_REQUESTED, markShipping → SHIPPING + 운송장. SOLD 는 배송 불가", () => {
  useInventoryStore.setState({ items: [] });
  const [a, b] = useInventoryStore.getState().add([base(), base()]);
  useInventoryStore.getState().sell([b.id], 0.8);
  useInventoryStore.getState().requestShipping([a.id, b.id], addr, 15);
  const s = useInventoryStore.getState();
  assert.equal(s.items.find((i) => i.id === a.id)!.status, "SHIPPING_REQUESTED");
  assert.equal(s.items.find((i) => i.id === b.id)!.status, "SOLD");
  assert.equal(s.items.find((i) => i.id === a.id)!.shipping?.feeUsdt, 15);
  useInventoryStore.getState().markShipping(a.id, "DHL", "1234567890");
  assert.equal(useInventoryStore.getState().items.find((i) => i.id === a.id)!.status, "SHIPPING");
  assert.equal(useInventoryStore.getState().items.find((i) => i.id === a.id)!.shipping?.trackingNumber, "1234567890");
  assert.equal(useInventoryStore.getState().items.find((i) => i.id === a.id)!.shipping?.carrier, "DHL");
  const sum = summarize(useInventoryStore.getState().items);
  assert.deepEqual(sum, { total: 2, stored: 0, storedValueUsdt: 0, shipping: 1, sold: 1 });
});

test("통관 식별자: KR 은 PCCC(P+12자리), CN 은 身份证(18자리), 그 외 없음", () => {
  assert.equal(customsKindFor("KR"), "pccc");
  assert.equal(customsKindFor("CN"), "residentId");
  assert.equal(customsKindFor("US"), "none");
  assert.ok(isValidPccc("P123456789012"));
  assert.ok(isValidPccc("p123456789012"));
  assert.ok(!isValidPccc("P12345678901"));
  assert.ok(!isValidPccc("X123456789012"));
  assert.ok(isValidResidentId("11010119900307001X"));
  assert.ok(!isValidResidentId("1101011990030700"));
});

test("주소 검증: 필수 필드와 국가별 통관 식별자", () => {
  assert.deepEqual(validateAddress(addr), []);
  assert.deepEqual(validateAddress({ ...addr, customsId: "" }), ["customsId"]);
  assert.deepEqual(validateAddress({ ...addr, country: "US", customsId: undefined }), []);
  assert.deepEqual(validateAddress({ ...addr, country: "CN", customsId: "bad" }), ["customsId"]);
  const errs = validateAddress({ recipient: "", country: "US", phone: "x", postalCode: "", address: "" });
  assert.deepEqual(errs.sort(), ["address", "phone", "postalCode", "recipient"]);
});

test("배송비: 모든 국가에 정액이 있고 KR 이 가장 싸다", () => {
  for (const c of COUNTRIES) assert.ok(SHIPPING_FEE_USDT[c] > 0, c);
  assert.equal(shippingFee("KR"), Math.min(...COUNTRIES.map((c) => SHIPPING_FEE_USDT[c])));
});

test("지갑: 출금 거래는 status 를 갖고 PENDING → BROADCASTING(TxID) → COMPLETED 로 갱신된다", async () => {
  const { useWalletStore } = await import("../stores/walletStore");
  const w = useWalletStore.getState();
  useWalletStore.setState({ balance: 100, transactions: [] });
  assert.ok(w.debit(50));
  const tx = w.addTransaction({ type: "withdraw", amountUsdt: -50, ref: "TRC20:Txxx", status: "PENDING" });
  assert.equal(useWalletStore.getState().balance, 50);
  assert.equal(useWalletStore.getState().transactions[0].status, "PENDING");
  w.setTransactionStatus(tx.id, "BROADCASTING", { txHash: "ab".repeat(32) });
  assert.equal(useWalletStore.getState().transactions[0].status, "BROADCASTING");
  assert.equal(useWalletStore.getState().transactions[0].txHash, "ab".repeat(32));
  w.setTransactionStatus(tx.id, "COMPLETED");
  assert.equal(useWalletStore.getState().transactions[0].status, "COMPLETED");
  assert.ok(!w.debit(50.01), "잔액 초과 출금은 거부");
});

test("지갑: 웰컴 보너스는 브라우저당 1회만 지급된다", async () => {
  const { useWalletStore, WELCOME_BONUS_USDT } = await import("../stores/walletStore");
  useWalletStore.setState({ balance: 0, transactions: [], welcomeClaimed: false });
  const w = useWalletStore.getState();
  assert.equal(WELCOME_BONUS_USDT, 5);
  assert.ok(w.claimWelcome());
  assert.equal(useWalletStore.getState().balance, 5);
  assert.equal(useWalletStore.getState().transactions[0].type, "bonus");
  assert.ok(!w.claimWelcome(), "두 번째 수령 거부");
  assert.equal(useWalletStore.getState().balance, 5);
});
