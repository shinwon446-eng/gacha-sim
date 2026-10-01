// 가챠 아이템 30종 + 더미 에셋 무결성
//   npm test
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { GACHA_ITEMS, GACHA_ITEM_BY_ID, TIER_GLOW, itemsByTier } from "../src/data/gachaItems";

const ASSETS = join(process.cwd(), "public", "assets", "items");

test("30개, id 고유, 등급 분포 S5 / A8 / B8 / C9", () => {
  assert.equal(GACHA_ITEMS.length, 30);
  assert.equal(new Set(GACHA_ITEMS.map((i) => i.id)).size, 30, "id 중복");
  assert.equal(Object.keys(GACHA_ITEM_BY_ID).length, 30);
  assert.equal(itemsByTier("S").length, 5);
  assert.equal(itemsByTier("A").length, 8);
  assert.equal(itemsByTier("B").length, 8);
  assert.equal(itemsByTier("C").length, 9);
});

test("등급 구간이 usdtValue 와 단조이고 겹치지 않는다", () => {
  const min = (t: "S" | "A" | "B" | "C") => Math.min(...itemsByTier(t).map((i) => i.usdtValue));
  const max = (t: "S" | "A" | "B" | "C") => Math.max(...itemsByTier(t).map((i) => i.usdtValue));
  assert.ok(min("S") > max("A"), `S min ${min("S")} <= A max ${max("A")}`);
  assert.ok(min("A") > max("B"), `A min ${min("A")} <= B max ${max("B")}`);
  assert.ok(min("B") > max("C"), `B min ${min("B")} <= C max ${max("C")}`);
  for (const i of GACHA_ITEMS) assert.ok(i.usdtValue > 0 && Number.isFinite(i.usdtValue), i.id);
});

test("imageSrc 는 /assets/items/<id>.svg 이고 실제 파일이 존재한다", () => {
  for (const i of GACHA_ITEMS) {
    assert.equal(i.imageSrc, `/assets/items/${i.id}.svg`, i.id);
    const file = join(ASSETS, `${i.id}.svg`);
    assert.ok(existsSync(file), `에셋 누락: ${file}`);
    const svg = readFileSync(file, "utf8");
    assert.match(svg, /<svg[^>]*width="800"[^>]*height="800"/, `${i.id}: 800x800 아님`);
    assert.ok(svg.includes(i.glowColor), `${i.id}: glowColor 미반영`);
    assert.ok(svg.includes(i.usdtValue.toLocaleString("en-US") + " USDT"), `${i.id}: 밸류 텍스트 누락`);
    assert.ok(!/<rect[^>]*width="800"[^>]*height="800"/.test(svg), `${i.id}: 불투명 배경 rect 존재`);
  }
});

test("glowColor 는 등급별 팔레트와 일치하고 이름에 이모지·앰퍼샌드가 없다", () => {
  const emoji = new RegExp("[\\uD83C-\\uDBFF][\\uDC00-\\uDFFF]|[\\u2600-\\u27BF\\uFE0F]");
  for (const i of GACHA_ITEMS) {
    assert.equal(i.glowColor, TIER_GLOW[i.tier], i.id);
    assert.ok(!emoji.test(i.name) && !i.name.includes("&"), `${i.id}: ${i.name}`);
    assert.ok(["crypto", "watch", "tech", "luxury", "voucher"].includes(i.category), i.id);
  }
});
