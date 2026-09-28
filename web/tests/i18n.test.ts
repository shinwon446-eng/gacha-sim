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
    "hero.headline": ["1달러로 여는 롤렉스 & 아이폰, 지금 열어보세요.", "Open a Rolex or an iPhone, from $1.", "1 美元开启劳力士与 iPhone，现在就开箱。"],
    "hero.sub": ["당첨되면 100% 정품 무료 배송, 다른 상품이어도 95% 바로 돌려받으세요.", "Win it and it ships free, 100% authentic. Get a different item and take 95% straight back.", "中奖即 100% 正品免费送到家，开到其他商品也能立即拿回 95%。"],
    "mobileNav.home": ["홈", "Home", "首页"],
    "mobileNav.dollar": ["1달러 박스", "$1 Boxes", "1 美元盲盒"],
    "mobileNav.vault": ["내 보관함", "Vault", "保管箱"],
    "mobileNav.deposit": ["충전 (+)", "Deposit (+)", "充值 (+)"],
    "hero.viewContents": ["구성품 · 확률 보기", "Contents & odds", "查看商品与概率"],
    "hero.freeTry": ["무료로 미리 열어보기", "Try an unboxing, free", "免费试开一箱"],
    "inventory.sell": ["💰 95% 바로 돌려받기", "💰 Take 95% back", "💰 立即拿回 95%"],
    "inventory.ship": ["📦 우리 집으로 배송", "📦 Ship to my door", "📦 寄到我家"],
    "hero.guaranteedMinLabel": ["최소 보장 금액", "Guaranteed Minimum", "保底价值"],
    "actions.sellBack": ["💰 95% 바로 돌려받기", "💰 Take 95% back", "💰 立即拿回 95%"],
    "actions.claimShipping": ["집으로 배송", "Ship to me", "寄到家"],
    "actions.provablyFair": ["공정성 검증", "Provably Fair", "公平性验证"],
  };
  for (const [k, [k1, e1, z1]] of Object.entries(spec)) {
    assert.equal(get(ko, k), k1, k);
    assert.equal(get(en, k), e1, k);
    assert.equal(get(zh, k), z1, k);
  }
});

test("도박장 용어가 사전에 남아 있지 않다 (CLAUDE.md §2 — 2026-09-28 운영자 지시)", () => {
  const banned: Record<string, string[]> = {
    ko: ["환전", "회수", "정산", "롤오버", "긁어", "돌려보기", "손맛", "잭팟", "볼트", "연타", "올인", "본전", "환수율", "오토플레이"],
    en: ["cash out", "Cash out", "cashed out", "cash-out", "rollover", "jackpot", "Jackpot", "All-in"],
    zh: ["折现", "头奖", "金库", "自动旋转", "流水"],
  };
  for (const [loc, dict] of [["ko", ko], ["en", en], ["zh", zh]] as const) {
    for (const k of keys(dict)) {
      if (k.startsWith("products.")) continue;
      const v = get(dict, k);
      for (const w of banned[loc]) assert.ok(!v.includes(w), `${loc}.${k} 에 금지어 "${w}": ${v}`);
    }
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
