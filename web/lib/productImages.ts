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
 * 박스 id / 상품 id → 이미지.
 * 비어 있는 키는 NONE 으로 폴백하므로 확보한 것만 등록하면 된다.
 */
const SOURCES: Record<string, ProductImage> = {};

export const imageFor = (id: string): ProductImage => SOURCES[id] ?? NONE;

/** 자산 확보율 — 관리 화면과 테스트에서 쓴다. */
export const imageCoverage = (ids: string[]): { have: number; total: number } => ({
  have: ids.filter((id) => SOURCES[id]?.src).length,
  total: ids.length,
});
