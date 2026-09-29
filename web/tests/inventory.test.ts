// 보관함 상태 전이 + 배송 규칙
import test from "node:test";
import assert from "node:assert/strict";
import { useInventoryStore, summarize, EXPIRE_MS, daysUntilCashback, sweepReadyInventory, type OwnedItem } from "../stores/inventoryStore";
import { useWalletStore } from "../stores/walletStore";
import { useAuthStore } from "../stores/authStore";
import { COUNTRIES, FREE_SHIPPING_EVENT, SHIPPING_FEE_USDT, customsKindFor, isValidPccc, isValidResidentId, shippingFee, validateAddress } from "../lib/shipping";

const base = (over: Partial<Omit<OwnedItem, "id" | "status" | "acquiredAt">> = {}) => ({
  itemId: "ctd-cable",
  boxSlug: "jackpot-cybertruck",
  valueUsdt: 28,
  tier: "curated" as const,
  fair: { serverSeedHash: "h", serverSeed: "s", clientSeed: "c", nonce: 0, roll: 1 },
  ...over,
});

const addr = { recipient: "홍길동", country: "KR" as const, phone: "+82 10-1234-5678", postalCode: "06236", address: "서울 강남구 테헤란로 123, 4층", customsId: "P123456789012" };

test("30-day boundary: sweep credits 95% once, preserves timestamps, records one batch", () => {
  const acquired = Date.parse("2026-08-01T00:00:00Z");
  useInventoryStore.setState({ items: [
    { ...base({ valueUsdt: 100 }), id: "expired", status: "IN_STORAGE", acquiredAt: new Date(acquired).toISOString() },
    { ...base({ valueUsdt: 10.01 }), id: "rounded", status: "IN_STORAGE", acquiredAt: new Date(acquired).toISOString() },
  ] });
  useWalletStore.setState({ balance: 0, cryptoBalance: 0, cardBalance: 0, transactions: [] });
  assert.equal(useInventoryStore.getState().sweepExpired(acquired + EXPIRE_MS - 1).ids.length, 0);
  const result = useInventoryStore.getState().sweepExpired(acquired + EXPIRE_MS);
  assert.deepEqual(result, { ids: ["expired", "rounded"], totalUsdt: 104.51 });
  assert.equal(useWalletStore.getState().cryptoBalance, 104.51);
  assert.equal(useWalletStore.getState().cardBalance, 0);
  const tx = useWalletStore.getState().transactions[0];
  assert.equal(tx.type, "sellback");
  assert.equal(tx.ref, "auto_cashback_30d");
  assert.equal(tx.amountUsdt, 104.51);
  const item = useInventoryStore.getState().items[0];
  assert.equal(item.status, "SOLD");
  assert.equal(item.autoCashbackAt, new Date(acquired + EXPIRE_MS).toISOString());
  assert.equal(item.soldAt, item.autoCashbackAt);
  assert.equal(item.soldForUsdt, 95);
  assert.equal(item.acquiredAt, new Date(acquired).toISOString());
  assert.equal(useInventoryStore.getState().sweepExpired(acquired + EXPIRE_MS * 2).ids.length, 0);
  assert.equal(useWalletStore.getState().transactions.length, 1);
  assert.equal(useInventoryStore.getState().sell([item.id], 0.95).totalUsdt, 0);
});

test("sweep skips active shipping, delivered, sold, invalid values and invalid dates", () => {
  const now = Date.parse("2026-09-30T00:00:00Z");
  const old = new Date(now - EXPIRE_MS - 1).toISOString();
  const make = (id: string, overrides: Partial<OwnedItem> = {}): OwnedItem => ({ ...base(), id, acquiredAt: old, status: "IN_STORAGE", ...overrides });
  useInventoryStore.setState({ items: [
    ...(["SHIPPING_REQUESTED", "SHIPPING", "DELIVERED", "SOLD"] as const).map(status => make(status, { status })),
    make("bad-date", { acquiredAt: "invalid" }), make("negative", { valueUsdt: -1 }),
    make("infinity", { valueUsdt: Infinity }), make("nan", { valueUsdt: NaN }),
    make("future", { acquiredAt: new Date(now + 1).toISOString() }),
  ] });
  assert.deepEqual(useInventoryStore.getState().sweepExpired(now), { ids: [], totalUsdt: 0 });
  assert.deepEqual(useInventoryStore.getState().sweepExpired(NaN), { ids: [], totalUsdt: 0 });
  assert.equal(daysUntilCashback(old, now), 0);
  assert.equal(daysUntilCashback(new Date(now).toISOString(), now), 30);
  assert.equal(daysUntilCashback(new Date(now - EXPIRE_MS + 1).toISOString(), now), 1);
  assert.equal(daysUntilCashback("invalid", now), null);
});

test("automatic sweep waits for matching hydrated account stores and announces one settlement", () => {
  // Zustand omits its persist API in Node when localStorage is unavailable.
  const inventoryPersist = useInventoryStore.persist;
  const walletPersist = useWalletStore.persist;
  let inventoryName = "voila.browser-inventory.guest";
  let walletName = "voila.browser-wallet.another-account";
  Object.defineProperty(useInventoryStore, "persist", { configurable: true, value: {
    getOptions: () => ({ name: inventoryName }), setOptions: (o: { name: string }) => { inventoryName = o.name; },
  } });
  Object.defineProperty(useWalletStore, "persist", { configurable: true, value: {
    getOptions: () => ({ name: walletName }), setOptions: (o: { name: string }) => { walletName = o.name; },
  } });
  const now = Date.now();
  try {
    useAuthStore.setState({ user: null, hydrated: true, toast: null });
    useInventoryStore.setState({ hydrated: true, items: [{ ...base({ valueUsdt: 100 }), id: "due", status: "IN_STORAGE", acquiredAt: new Date(now - EXPIRE_MS).toISOString() }] });
    useWalletStore.setState({ hydrated: false, balance: 0, cryptoBalance: 0, cardBalance: 0, transactions: [] });
    useInventoryStore.persist.setOptions({ name: "voila.browser-inventory.guest" });
    useWalletStore.persist.setOptions({ name: "voila.browser-wallet.another-account" });
    sweepReadyInventory(now);
    useWalletStore.setState({ hydrated: true });
    sweepReadyInventory(now);
    assert.equal(useInventoryStore.getState().items[0].status, "IN_STORAGE");
    useWalletStore.persist.setOptions({ name: "voila.browser-wallet.guest" });
    sweepReadyInventory(now);
    assert.equal(useWalletStore.getState().balance, 95);
    assert.match(useAuthStore.getState().toast?.text ?? "", /1건이 95.00 USDT/);
    sweepReadyInventory(now);
    assert.equal(useWalletStore.getState().transactions.length, 1);
  } finally {
    Object.defineProperty(useInventoryStore, "persist", { configurable: true, value: inventoryPersist });
    Object.defineProperty(useWalletStore, "persist", { configurable: true, value: walletPersist });
  }
});

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
  assert.equal(shippingFee("KR"), FREE_SHIPPING_EVENT ? 0 : Math.min(...COUNTRIES.map((c) => SHIPPING_FEE_USDT[c])), "무료 배송 이벤트 중에는 표기와 청구가 모두 0");
  if (!FREE_SHIPPING_EVENT) assert.equal(shippingFee("KR"), SHIPPING_FEE_USDT.KR);
});

test("지갑: 출금 거래는 status 를 갖고 PENDING → BROADCASTING(TxID) → COMPLETED 로 갱신된다", async () => {
  const { useWalletStore } = await import("../stores/walletStore");
  const w = useWalletStore.getState();
  useWalletStore.setState({ balance: 100, cryptoBalance: 100, cardBalance: 0, transactions: [] });
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
  useWalletStore.setState({ balance: 0, cryptoBalance: 0, cardBalance: 0, transactions: [], welcomeClaimed: false });
  const w = useWalletStore.getState();
  assert.equal(WELCOME_BONUS_USDT, 5);
  assert.ok(w.claimWelcome());
  assert.equal(useWalletStore.getState().balance, 5);
  assert.equal(useWalletStore.getState().transactions[0].type, "bonus");
  assert.ok(!w.claimWelcome(), "두 번째 수령 거부");
  assert.equal(useWalletStore.getState().balance, 5);
});
