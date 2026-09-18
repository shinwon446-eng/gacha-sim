// Provably Fair 엔진 — 표준 벡터, 결정성, 구간 매핑
//   npm test
import test from "node:test";
import assert from "node:assert/strict";
import { BOXES } from "../lib/products";
import {
  ROLL_MAX,
  ROLL_RANGE,
  calculateRollResult,
  determineItem,
  generateClientSeed,
  generateServerSeed,
  hashServerSeed,
  hmacSha256Hex,
  rollRanges,
  sha256Hex,
  verifyRoll,
} from "../lib/fairness";

test("SHA-256 표준 벡터 (FIPS 180-2 'abc')", async () => {
  assert.equal(await sha256Hex("abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
});

test("HMAC-SHA256 표준 벡터 (RFC 4231 Test Case 2)", async () => {
  assert.equal(
    await hmacSha256Hex("Jefe", "what do ya want for nothing?"),
    "5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843",
  );
});

test("서버 시드는 64바이트(128 hex), 클라이언트 시드는 16바이트, 매번 다르다", async () => {
  const a = generateServerSeed(), b = generateServerSeed();
  assert.match(a, /^[0-9a-f]{128}$/);
  assert.notEqual(a, b);
  assert.match(generateClientSeed(), /^[0-9a-f]{32}$/);
  assert.match(await hashServerSeed(a), /^[0-9a-f]{64}$/);
});

test("같은 입력은 언제나 같은 roll, nonce 가 바뀌면 다른 roll", async () => {
  const s = "a".repeat(128), c = "client-seed-1";
  const r1 = await calculateRollResult(s, c, 0);
  const r2 = await calculateRollResult(s, c, 0);
  const r3 = await calculateRollResult(s, c, 1);
  assert.deepEqual(r1, r2);
  assert.notEqual(r1.roll, r3.roll);
  assert.equal(r1.hmac, await hmacSha256Hex(s, `${c}:0`));
  assert.equal(r1.raw, parseInt(r1.hmac.slice(0, 8), 16));
  assert.equal(r1.roll, r1.raw % ROLL_RANGE);
  assert.ok(r1.roll >= 0 && r1.roll <= ROLL_MAX);
  await assert.rejects(() => calculateRollResult(s, c, -1));
  await assert.rejects(() => calculateRollResult(s, c, 1.5));
});

test("모든 박스의 구간표 칸 합계가 정확히 ROLL_RANGE 이고 모든 항목이 최소 1칸을 받는다", () => {
  for (const b of BOXES) {
    const ranges = rollRanges(b.items);
    assert.equal(ranges.length, b.items.length, b.slug);
    assert.equal(ranges[0].from, 0);
    assert.equal(ranges[ranges.length - 1].to, ROLL_MAX, b.slug);
    let expectFrom = 0;
    for (const r of ranges) {
      assert.equal(r.from, expectFrom, `${b.slug}: 구간 틈`);
      assert.ok(r.units >= 1, `${b.slug}/${r.item.id}: 0칸`);
      assert.equal(r.units, Math.round((r.item.dropRate * ROLL_RANGE) / 100));
      expectFrom = r.to + 1;
    }
  }
});

test("determineItem 경계: 각 구간의 from/to 는 그 항목, 밖은 이웃 항목", () => {
  const b = BOXES[0];
  for (const r of rollRanges(b.items)) {
    assert.equal(determineItem(r.from, b.items).id, r.item.id);
    assert.equal(determineItem(r.to, b.items).id, r.item.id);
  }
  assert.throws(() => determineItem(-1, b.items));
  assert.throws(() => determineItem(ROLL_RANGE, b.items));
  assert.throws(() => rollRanges([{ dropRate: 60 }, { dropRate: 30 }]), /합계/);
  assert.throws(() => rollRanges([{ dropRate: 99.99999 }, { dropRate: 0.00001 }]), /해상도/);
});

test("roll 을 균등하게 훑으면 항목별 빈도가 표기 확률과 정확히 같다", () => {
  const b = BOXES.find((x) => x.slug === "jackpot-cybertruck")!;
  const ranges = rollRanges(b.items);
  const top = ranges.find((r) => r.item.id === "ctd-cybertruck")!;
  // 0.0003% → 3칸. 0.001% 해상도였다면 0칸으로 영영 안 나온다.
  assert.equal(top.units, 3);
  const count = new Map<string, number>();
  for (let roll = 0; roll < ROLL_RANGE; roll += 1) {
    const it = determineItem(roll, b.items);
    count.set(it.id, (count.get(it.id) ?? 0) + 1);
  }
  for (const r of ranges) assert.equal(count.get(r.item.id), r.units, r.item.id);
});

test("verifyRoll 은 해시 일치 여부와 항목까지 한 번에 재현한다", async () => {
  const b = BOXES[1];
  const serverSeed = generateServerSeed();
  const hash = await hashServerSeed(serverSeed);
  const ok = await verifyRoll({ serverSeed, serverSeedHash: hash.toUpperCase(), clientSeed: "abc", nonce: 7, items: b.items });
  assert.equal(ok.hashMatches, true);
  assert.equal(ok.item.id, determineItem(ok.roll, b.items).id);
  const bad = await verifyRoll({ serverSeed, serverSeedHash: "0".repeat(64), clientSeed: "abc", nonce: 7, items: b.items });
  assert.equal(bad.hashMatches, false);
  assert.equal(bad.roll, ok.roll, "해시 불일치여도 롤 계산은 같다");
  const none = await verifyRoll({ serverSeed, clientSeed: "abc", nonce: 7, items: b.items });
  assert.equal(none.hashMatches, null);
});
