import type { Box, Category, Item } from "./types";
import { CATALOG, type CatalogBox, type CatalogEntry } from "./catalog";

/**
 * 카탈로그 → 앱 모델 어댑터.
 *
 * lib/catalog.ts 가 유일한 상품 데이터 원천이며, 이 파일은 표시 계층이 쓰는 형태로 옮기기만 한다.
 * 가격·가중치·확률·인증번호는 어떤 경우에도 여기서 변형하지 않는다.
 */

/** 애셋 톤 램프. 전부 무채색이며, 박스당 최고 실판매가 1개에만 crimson 을 허용한다. */
const TONE = {
  crimson: "linear-gradient(135deg,#080808 0%,#3a0206 48%,#e50914 78%,#120103 100%)",
  steel: "linear-gradient(135deg,#0d0d0d 0%,#2e2e2e 45%,#6b6b6b 78%,#0d0d0d 100%)",
  graphite: "linear-gradient(135deg,#0a0a0a 0%,#242424 50%,#454545 80%,#0a0a0a 100%)",
  coal: "linear-gradient(135deg,#050505 0%,#151515 55%,#282828 100%)",
};

/** 실판매가 내림차순 순위로 톤을 결정한다. 1위만 crimson. */
function toneForRank(rank: number, total: number): string {
  if (rank === 0) return TONE.crimson;
  if (rank < Math.ceil(total * 0.35)) return TONE.steel;
  if (rank < Math.ceil(total * 0.7)) return TONE.graphite;
  return TONE.coal;
}

function toItem(e: CatalogEntry, rank: number, total: number): Item {
  return {
    id: e.item_id,
    name: e.name_en,
    name_en: e.name_en,
    name_zh: e.name_zh,
    value: e.value_usd,
    weight: e.weight,
    cert: e.cert,
    code: e.image_placeholder,
    art: toneForRank(rank, total),
  };
}

/** 시리즈별 표시 메타 — 카탈로그에 없는 순수 표시 문구만 여기서 보강한다. */
const PRESENTATION: Record<
  string,
  {
    category: Category;
    subtitle: string;
    tagline: string;
    description: string;
    art: string;
    featured?: boolean;
    badge?: string;
  }
> = {
  "black-label-apex-tech": {
    category: "apex",
    subtitle: "플래그십 컴퓨팅 · XR · 모바일",
    tagline: "최상위 실리콘만 수록한 시리즈.",
    description:
      "MacBook Pro M4 Max, Vision Pro, 폴더블 플래그십으로 구성된 시리즈. 전 항목 시리얼 기반 정품 인증이며 실물 발송 또는 즉시 회수를 선택한다.",
    art: "linear-gradient(120deg,#080808 0%,#1e1e1e 42%,#6e6e6e 72%,#080808 100%)",
    featured: true,
    badge: "SERIES 01",
  },
  "overclock-battle-station": {
    category: "battle",
    subtitle: "GPU · 디스플레이 · 입력장치",
    tagline: "한 번의 시퀀스로 워크스테이션을 구성한다.",
    description:
      "풀빌드 데스크톱, RTX 5090, 49인치 OLED 울트라와이드를 포함한 시리즈. 전 항목 인보이스 또는 시리얼로 인증된다.",
    art: "linear-gradient(120deg,#060606 0%,#202020 44%,#5c5c5c 70%,#060606 100%)",
    featured: true,
    badge: "SERIES 02",
  },
  "studio-zero-sound-stage": {
    category: "sound",
    subtitle: "모니터링 · 마이크 · 인터페이스",
    tagline: "레퍼런스 체인 전체를 수록했다.",
    description:
      "Genelec 모니터, Neumann U 87 Ai, Apollo x8p 로 구성된 음향 시리즈. 전 항목 시리얼 기반 정품 인증.",
    art: "linear-gradient(120deg,#050505 0%,#1a1a1a 40%,#585858 68%,#050505 100%)",
    featured: true,
    badge: "SERIES 03",
  },
};

function toBox(c: CatalogBox): Box {
  const p = PRESENTATION[c.id];
  if (!p) throw new Error(`presentation meta missing for ${c.id}`);
  const ranked = [...c.probability_table].sort((a, b) => b.value_usd - a.value_usd);
  const rankOf = new Map(ranked.map((e, i) => [e.item_id, i]));
  return {
    id: c.id,
    title: c.name_en,
    name_en: c.name_en,
    name_zh: c.name_zh,
    subtitle: p.subtitle,
    category: p.category,
    price: c.price_usd,
    guaranteed_min_value: c.guaranteed_min_value,
    art: p.art,
    code: c.image_placeholder,
    tagline: p.tagline,
    description: p.description,
    // 카탈로그 선언 순서를 그대로 보존한다
    items: c.probability_table.map((e) => toItem(e, rankOf.get(e.item_id) ?? 0, c.probability_table.length)),
    featured: p.featured,
    badge: p.badge,
  };
}

export const BOXES: Box[] = CATALOG.map(toBox);

export const BOX_MAP: Record<string, Box> = Object.fromEntries(BOXES.map((b) => [b.id, b]));

export const getBox = (id: string): Box => {
  const b = BOX_MAP[id];
  if (!b) throw new Error(`unknown box: ${id}`);
  return b;
};
