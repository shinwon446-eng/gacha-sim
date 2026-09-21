// 3개 언어 딕셔너리 — 키 완전 일치 + 지정 문구 + 언어 혼선 없음
//   npm test
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { BOXES } from "../lib/products";

type Dict = Record<string, unknown>;
const load = (l: string): Dict => JSON.parse(readFileSync(join(process.cwd(), "messages", `${l}.json`), "utf8"));
const ko = load("ko"), en = load("en"), zh = load("zh");

function keys(d: Dict, prefix = ""): string[] {
  return Object.entries(d).flatMap(([k, v]) =>
    v && typeof v === "object" ? keys(v as Dict, prefix ? `${prefix}.${k}` : k) : [prefix ? `${prefix}.${k}` : k],
  );
}
function get(d: Dict, path: string): string {
  return path.split(".").reduce<unknown>((o, k) => (o as Dict)?.[k], d) as string;
}

test("ko / en / zh 키 집합이 완전히 같다", () => {
  const a = keys(ko).sort(), b = keys(en).sort(), c = keys(zh).sort();
  assert.deepEqual(a, b, "ko ≠ en");
  assert.deepEqual(a, c, "ko ≠ zh");
  assert.ok(a.length >= 250, `키 ${a.length}개`);
});

test("지정 문구가 정확히 들어 있다 (CLAUDE.md §2 구어체 카피)", () => {
  const spec: Record<string, [string, string, string]> = {
    "hero.headline": ["1달러로 롤렉스 & 아이폰, 긁어보세요.", "$1. A shot at a Rolex & an iPhone.", "1 美元，博劳力士和 iPhone。"],
    "hero.sub": ["터지면 100% 내 것. 안 떠도 95% 즉시 환전해 드립니다.", "Hit, it's 100% yours. Miss, 95% cashed out instantly.", "中了 100% 归你，没中也立即折现 95%。"],
    "hero.viewContents": ["뭐 들었나 보기", "What's inside", "看看里面"],
    "hero.freeTry": ["손맛 보기 (무료)", "Try free", "免费试玩"],
    "inventory.sell": ["95% 즉시 회수", "Cash out 95%", "95% 立即折现"],
    "inventory.ship": ["집으로 배송", "Ship to me", "寄到家"],
    "hero.guaranteedMinLabel": ["최소 보장 금액", "Guaranteed Minimum", "保底价值"],
    "actions.sellBack": ["즉시 판매", "Instant Sell-Back", "即时回收"],
    "actions.claimShipping": ["실물 배송 신청", "Claim Shipping", "申请发货"],
    "actions.provablyFair": ["공정성 검증", "Provably Fair", "公平性验证"],
  };
  for (const [k, [k1, e1, z1]] of Object.entries(spec)) {
    assert.equal(get(ko, k), k1, k);
    assert.equal(get(en, k), e1, k);
    assert.equal(get(zh, k), z1, k);
  }
});

test("언어 혼선 없음 — en 에 한글·한자 없음, ko 에 한자 없음, zh 에 한글 없음", () => {
  const hangul = /[가-힣]/, han = /[一-鿿]/;
  for (const k of keys(en)) {
    const v = get(en, k);
    assert.ok(!hangul.test(v) && !han.test(v), `en.${k}: ${v}`);
  }
  for (const k of keys(ko)) assert.ok(!han.test(get(ko, k)), `ko.${k}: ${get(ko, k)}`);
  for (const k of keys(zh)) assert.ok(!hangul.test(get(zh, k)), `zh.${k}: ${get(zh, k)}`);
});

test("모든 박스·항목에 세 언어 상품 문자열이 있다", () => {
  for (const d of [ko, en, zh]) {
    for (const b of BOXES) {
      for (const f of ["title", "tagline", "badge"]) assert.ok(get(d, `products.boxes.${b.slug}.${f}`), `${b.slug}.${f}`);
      for (const i of b.items) assert.ok(get(d, `products.items.${i.id}`), i.id);
    }
  }
});

test("플레이스홀더 인자가 세 언어에서 같다", () => {
  const args = (s: string) => (s.match(/\{(\w+)\}/g) ?? []).sort().join(",");
  for (const k of keys(ko)) {
    if (k.startsWith("products.")) continue;
    assert.equal(args(get(en, k)), args(get(ko, k)), `en.${k} 인자`);
    assert.equal(args(get(zh, k)), args(get(ko, k)), `zh.${k} 인자`);
  }
});
