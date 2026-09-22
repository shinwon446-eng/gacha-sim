/**
 * 상품 이미지 경로의 단일 원천.
 *
 * 데이터셋(lib/products.ts)에는 URL 을 절대 쓰지 않는다. 상품 id 만 들고 있고
 * 실제 경로는 전부 이 파일이 쥔다. 원격 자산을 로컬 파일로 교체할 때
 * 고칠 파일이 여기 하나뿐이도록 하기 위한 구조다.
 *
 * 교체 절차
 *   1. public/products/<id>.webp 로 파일을 넣는다
 *   2. 아래 SOURCES 의 해당 항목을 { src: "/products/<id>.webp" } 로 바꾼다
 *   3. 끝. 컴포넌트는 손대지 않는다.
 *
 * src 가 null 이면 UI 는 다크 플레이스홀더(코드 플레이트)로 폴백한다.
 * 확보하지 못한 자산에 임의의 URL 을 적어두지 않는다 — 깨진 이미지가
 * 조용히 배포되는 것보다 플레이스홀더가 낫다.
 */

export interface ProductImage {
  /** 원격 URL 또는 /public 기준 절대 경로. 미확보면 null */
  src: string | null;
  /** 원격 자산일 때 출처 표기. 로컬 자산은 생략 */
  credit?: string;
  /** 누끼 컷이면 true — 다크 배경 위에 그대로 얹는다. false 면 object-cover 로 채운다. */
  cutout?: boolean;
}

const NONE: ProductImage = { src: null };

/**
 * 박스 id / 상품 id → 이미지. 전부 Unsplash 다크 럭셔리/테크 컬렉션(Unsplash License) — 위키백과·스톡 사진은 쓰지 않는다.
 * 여기 없는 키(기프트카드·USDT 캐시백·일부 소품)는 NONE → ProductArt 가 kind 별 글리프/실루엣으로 그린다.
 */
const SOURCES: Record<string, ProductImage> = {
  "dollar-apple": { src: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=1600&q=80", credit: "Unsplash · Unsplash License", cutout: false },
  "dollar-galaxy": { src: "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?auto=format&fit=crop&w=1600&q=80", credit: "Unsplash · Unsplash License", cutout: false },
  "dollar-gaming": { src: "https://images.unsplash.com/photo-1587202372634-32705e3bf49c?auto=format&fit=crop&w=1600&q=80", credit: "Unsplash · Unsplash License", cutout: false },
  "starter-ps5": { src: "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=1600&q=80", credit: "Unsplash · Unsplash License", cutout: false },
  "starter-macbook": { src: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1600&q=80", credit: "Unsplash · Unsplash License", cutout: false },
  "starter-phone": { src: "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=1600&q=80", credit: "Unsplash · Unsplash License", cutout: false },
  "vault-submariner": { src: "https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?auto=format&fit=crop&w=1600&q=80", credit: "Unsplash · Unsplash License", cutout: false },
  "vault-omega": { src: "https://images.unsplash.com/photo-1612817159949-195b6eb9e31a?auto=format&fit=crop&w=1600&q=80", credit: "Unsplash · Unsplash License", cutout: false },
  "vault-handbag": { src: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=1600&q=80", credit: "Unsplash · Unsplash License", cutout: false },
  "vault-gold": { src: "https://images.unsplash.com/photo-1610375461246-83df859d849d?auto=format&fit=crop&w=1600&q=80", credit: "Unsplash · Unsplash License", cutout: false },
  "jackpot-cybertruck": { src: "https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=1600&q=80", credit: "Unsplash · Unsplash License", cutout: false },
  "jackpot-supercar": { src: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1600&q=80", credit: "Unsplash · Unsplash License", cutout: false },
  "da-iphone16": { src: "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=1200&q=80", credit: "Unsplash · Unsplash License", cutout: false },
  "flg-iphone": { src: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=1200&q=80", credit: "Unsplash · Unsplash License", cutout: false },
  "aud-airpods": { src: "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&w=1200&q=80", credit: "Unsplash · Unsplash License", cutout: false },
  "sp-headset": { src: "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&w=1200&q=80", credit: "Unsplash · Unsplash License", cutout: false },
  "da-airpods4": { src: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=1200&q=80", credit: "Unsplash · Unsplash License", cutout: false },
  "sp2-airpods": { src: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=1200&q=80", credit: "Unsplash · Unsplash License", cutout: false },
  "flg-buds": { src: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=1200&q=80", credit: "Unsplash · Unsplash License", cutout: false },
  "da-buds": { src: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=1200&q=80", credit: "Unsplash · Unsplash License", cutout: false },
  "flg-fold": { src: "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?auto=format&fit=crop&w=1200&q=80", credit: "Unsplash · Unsplash License", cutout: false },
  "flg-flip": { src: "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?auto=format&fit=crop&w=1200&q=80", credit: "Unsplash · Unsplash License", cutout: false },
  "gpu-5090": { src: "https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=1200&q=80", credit: "Unsplash · Unsplash License", cutout: false },
  "gpu-kb": { src: "https://images.unsplash.com/photo-1587202372634-32705e3bf49c?auto=format&fit=crop&w=1200&q=80", credit: "Unsplash · Unsplash License", cutout: false },
  "dg-ps5": { src: "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=1200&q=80", credit: "Unsplash · Unsplash License", cutout: false },
  "sp-ps5pro": { src: "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=1200&q=80", credit: "Unsplash · Unsplash License", cutout: false },
  "dg-switch2": { src: "https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?auto=format&fit=crop&w=1200&q=80", credit: "Unsplash · Unsplash License", cutout: false },
  "sp-switch2": { src: "https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?auto=format&fit=crop&w=1200&q=80", credit: "Unsplash · Unsplash License", cutout: false },
  "sp-dualsense": { src: "https://images.unsplash.com/photo-1607853202273-797f1c22a38e?auto=format&fit=crop&w=1200&q=80", credit: "Unsplash · Unsplash License", cutout: false },
  "apx-mbp": { src: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1200&q=80", credit: "Unsplash · Unsplash License", cutout: false },
  "gtc-mba": { src: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1200&q=80", credit: "Unsplash · Unsplash License", cutout: false },
  "gtc-ipadpro": { src: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=1200&q=80", credit: "Unsplash · Unsplash License", cutout: false },
  "ctd-visionpro": { src: "https://images.unsplash.com/photo-1622979135225-d2ba269cf1ac?auto=format&fit=crop&w=1200&q=80", credit: "Unsplash · Unsplash License", cutout: false },
  "rlx-sub": { src: "https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?auto=format&fit=crop&w=1200&q=80", credit: "Unsplash · Unsplash License", cutout: false },
  "rlx-omega": { src: "https://images.unsplash.com/photo-1614164185128-e4ec99c436d7?auto=format&fit=crop&w=1200&q=80", credit: "Unsplash · Unsplash License", cutout: false },
  "rlx-tudor": { src: "https://images.unsplash.com/photo-1612817159949-195b6eb9e31a?auto=format&fit=crop&w=1200&q=80", credit: "Unsplash · Unsplash License", cutout: false },
  "rlx-seiko": { src: "https://images.unsplash.com/photo-1539874754764-5a96559165b0?auto=format&fit=crop&w=1200&q=80", credit: "Unsplash · Unsplash License", cutout: false },
  "rlx-hamilton": { src: "https://images.unsplash.com/photo-1508057198894-247b23fe5ade?auto=format&fit=crop&w=1200&q=80", credit: "Unsplash · Unsplash License", cutout: false },
  "rlx-daytona": { src: "https://images.unsplash.com/photo-1547996160-81dfa63595aa?auto=format&fit=crop&w=1200&q=80", credit: "Unsplash · Unsplash License", cutout: false },
  "sws-omega": { src: "https://images.unsplash.com/photo-1612817159949-195b6eb9e31a?auto=format&fit=crop&w=1200&q=80", credit: "Unsplash · Unsplash License", cutout: false },
  "sws-tudor": { src: "https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?auto=format&fit=crop&w=1200&q=80", credit: "Unsplash · Unsplash License", cutout: false },
  "sws-longines": { src: "https://images.unsplash.com/photo-1508057198894-247b23fe5ade?auto=format&fit=crop&w=1200&q=80", credit: "Unsplash · Unsplash License", cutout: false },
  "sws-oris": { src: "https://images.unsplash.com/photo-1539874754764-5a96559165b0?auto=format&fit=crop&w=1200&q=80", credit: "Unsplash · Unsplash License", cutout: false },
  "sws-tissot": { src: "https://images.unsplash.com/photo-1547996160-81dfa63595aa?auto=format&fit=crop&w=1200&q=80", credit: "Unsplash · Unsplash License", cutout: false },
  "grl-birkin25": { src: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1200&q=80", credit: "Unsplash · Unsplash License", cutout: false },
  "lth-chanel": { src: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=1200&q=80", credit: "Unsplash · Unsplash License", cutout: false },
  "grl-dior": { src: "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=1200&q=80", credit: "Unsplash · Unsplash License", cutout: false },
  "grl-polene": { src: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1200&q=80", credit: "Unsplash · Unsplash License", cutout: false },
  "vg-gold1kg": { src: "https://images.unsplash.com/photo-1624365169364-0640dd10e180?auto=format&fit=crop&w=1200&q=80", credit: "Unsplash · Unsplash License", cutout: false },
  "vg-gold100g": { src: "https://images.unsplash.com/photo-1610375461246-83df859d849d?auto=format&fit=crop&w=1200&q=80", credit: "Unsplash · Unsplash License", cutout: false },
  "vg-gold10g": { src: "https://images.unsplash.com/photo-1624365169364-0640dd10e180?auto=format&fit=crop&w=1200&q=80", credit: "Unsplash · Unsplash License", cutout: false },
  "vg-coin": { src: "https://images.unsplash.com/photo-1610375461246-83df859d849d?auto=format&fit=crop&w=1200&q=80", credit: "Unsplash · Unsplash License", cutout: false },
  "ctd-cybertruck": { src: "https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=1200&q=80", credit: "Unsplash · Unsplash License", cutout: false },
  "ctd-model3": { src: "https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&w=1200&q=80", credit: "Unsplash · Unsplash License", cutout: false },
  "js-modely": { src: "https://images.unsplash.com/photo-1571987502227-9231b837d92a?auto=format&fit=crop&w=1200&q=80", credit: "Unsplash · Unsplash License", cutout: false },
  "js-porsche": { src: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80", credit: "Unsplash · Unsplash License", cutout: false },
  "js-ducati": { src: "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=1200&q=80", credit: "Unsplash · Unsplash License", cutout: false },
  "urb-vanmoof": { src: "https://images.unsplash.com/photo-1571068316344-75bc76f77890?auto=format&fit=crop&w=1200&q=80", credit: "Unsplash · Unsplash License", cutout: false },
  "ctd-brompton": { src: "https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=1200&q=80", credit: "Unsplash · Unsplash License", cutout: false },
  "ctd-segway": { src: "https://images.unsplash.com/photo-1594751543129-6701ad444259?auto=format&fit=crop&w=1200&q=80", credit: "Unsplash · Unsplash License", cutout: false },
  "ctd-dji": { src: "https://images.unsplash.com/photo-1473968512647-3e447244af8f?auto=format&fit=crop&w=1200&q=80", credit: "Unsplash · Unsplash License", cutout: false },
  "ctd-helmet": { src: "https://images.unsplash.com/photo-1558981001-792f6c0d5068?auto=format&fit=crop&w=1200&q=80", credit: "Unsplash · Unsplash License", cutout: false },
};

export const imageFor = (id: string): ProductImage => SOURCES[id] ?? NONE;

/** 자산 확보율 — 관리 화면과 테스트에서 쓴다. */
export const imageCoverage = (ids: string[]): { have: number; total: number } => ({
  have: ids.filter((id) => SOURCES[id]?.src).length,
  total: ids.length,
});
