import { BOXES } from "@/lib/products";
import type { MyReview } from "@/stores/communityStore";

const authors = ["시계수집가", "민트초코", "픽셀러", "블루문", "도시여우", "오후다섯", "노을빛", "은하수", "모노그램", "레몬티", "초록창", "라이트룸", "해질녘", "스튜디오오", "카멜리아", "북극성", "블랙라벨", "미드나잇", "로프앤노트", "드림캐처"];
const texts = [
  "사진으로 보던 것보다 실물이 더 만족스러웠어요. 구성과 안내가 깔끔해서 확인하기 편했습니다.",
  "원하던 제품이 나와서 바로 후기 남겨요. 상품 상태와 패키지 모두 좋았습니다.",
  "개봉 과정도 확인했고, 제품 정보가 카드에 잘 정리되어 있어 좋았어요.",
  "선물용으로 골랐는데 반응이 좋았습니다. 다음 컬렉션도 기대하고 있어요.",
  "가격대가 있는 상품이라 망설였는데 상품 안내가 자세해서 선택하는 데 도움이 됐습니다.",
  "배송을 선택하기 전 보관함에서 상품 정보를 다시 볼 수 있어 편했습니다.",
  "디테일한 사진과 상품 설명이 일치해서 신뢰가 갔어요. 만족합니다.",
  "후기를 보고 골랐는데 기대 이상이었어요. 다른 박스도 천천히 둘러보려 합니다.",
  "상품 이미지와 안내가 명확해서 고르기 수월했습니다. 개봉 기록도 바로 확인했어요.",
  "포장 상태가 좋아서 보관하기에도 좋았습니다. 다음에는 다른 컬렉션을 열어볼게요.",
  "기대하지 않았던 구성이라 더 즐거웠어요. 카드에 적힌 정보도 이해하기 쉬웠습니다.",
  "디지털 보상도 정리가 잘 되어 있어 편했어요. 전체 흐름이 직관적입니다.",
  "화면에서 본 색감과 실제 느낌이 비슷했습니다. 만족스러운 선택이었어요.",
  "친구에게 추천받아 처음 열어봤는데 재미있었습니다. 상품도 마음에 들어요.",
  "상품 가치와 후기를 비교해 보고 골랐습니다. 다음 선택에도 참고할 것 같아요.",
  "개봉 후 바로 보관함에서 확인할 수 있어서 좋았습니다. 안내가 명확해요.",
  "기대했던 제품이라 반가웠습니다. 사진과 상세 정보가 특히 도움이 됐어요.",
  "박스마다 분위기가 달라 둘러보는 재미가 있습니다. 이번 결과도 만족해요.",
  "카드 구성이 단정해서 상품 내용을 보기 편했습니다. 지인에게도 보여주고 싶어요.",
  "처음 이용했는데 흐름이 어렵지 않았어요. 다음 후기들도 참고해 보려 합니다.",
];
const avatarStyles = ["adventurer-neutral", "avataaars-neutral", "bottts-neutral", "lorelei-neutral", "micah", "notionists-neutral", "personas", "thumbs"];

export function reviewAvatar(seed: string, index = 0) {
  return "https://api.dicebear.com/9.x/" + avatarStyles[index % avatarStyles.length] + "/svg?seed=" + encodeURIComponent(seed) + "&backgroundColor=1b1d20";
}

const products = BOXES.flatMap(box => box.items
  .filter(item => item.kind !== "cash" && item.value >= 100)
  .map(item => ({ boxSlug: box.slug, itemId: item.id })))
  .slice(0, texts.length);

/** The published product-review collection used by both the home carousel and community feed. */
export const PUBLISHED_REVIEW_EXAMPLES: readonly MyReview[] = products.map((product, index) => {
  const at = new Date(Date.UTC(2026, 8, 22 - index, 10, index * 7)).toISOString();
  return {
    id: "home-demo-review-" + (index + 1),
    ownedId: "home-demo-owned-" + (index + 1),
    ...product,
    text: texts[index],
    rating: index % 5 === 2 || index % 7 === 5 ? 4 : 5,
    bonusUsdt: 0,
    at,
    publishedAt: at,
    source: "example",
    authorName: authors[index],
    authorAvatarUrl: reviewAvatar(authors[index], index),
  };
});
