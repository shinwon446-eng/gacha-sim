/**
 * 당첨 상품 후기. 실제 보관함 기록과 100 USDT 기준으로 작성 자격을 검증한다.
 */
import type { Network } from "@/lib/depositAddress";
import type { CarrierKey } from "@/lib/carriers";
import type { MyReview } from "@/stores/communityStore";
import type { OwnedItem } from "@/stores/inventoryStore";
import { BOX_BY_SLUG } from "./products";

export const REVIEW_BONUS_USDT = 10;
export const MIN_REVIEW_ITEM_VALUE_USDT = 100;
export const REVIEW_MIN_CHARS = 5;
export const REVIEW_MAX_CHARS = 1200;
export const isExampleReview = (review: { id: string; source?: string }) => review.source === "example" || review.id.startsWith("review_example_v1_");

/** UI copy stays local to this feature so parallel locale-catalogue work is untouched. */
export function communityFeedCopy(locale: string) {
  const copy = {
    ko: { title: "실시간 상품 후기", all: "전체 후기 보기", example: "작성 예시", exampleNote: "운영팀이 구성한 작성 예시입니다. 실제 회원의 당첨·이용 후기가 아닙니다.", examplesIncluded: "작성 예시 포함", member: "회원", exampleAuthor: "예시 작성자", exampleRating: "예시 별점", rating: "별점", price: "카탈로그 기준가", pause: "자동 넘김 일시정지", play: "자동 넘김 재생", previous: "이전 후기", next: "다음 후기", auto: "자동 넘김", paused: "일시정지", newReviews: "새 후기 반영", description: "새로 작성된 후기를 반영합니다. 자동 넘김은 새 게시물 등록을 의미하지 않습니다.", now: "방금 전", unknownTime: "작성 시각 미상", hideExamples: "작성 예시 숨기기", showExamples: "작성 예시 보기", examplesOnly: "현재는 작성 예시를 표시하고 있습니다.", product: "상품", empty: "아직 공개된 후기가 없습니다." },
    en: { title: "Latest product reviews", all: "View all reviews", example: "Writing example", exampleNote: "An editorial writing example, not a real member's win or customer testimonial.", examplesIncluded: "Includes writing examples", member: "Member", exampleAuthor: "Example author", exampleRating: "Example rating", rating: "Rating", price: "Catalogue value", pause: "Pause rotation", play: "Resume rotation", previous: "Previous review", next: "Next review", auto: "Auto rotation", paused: "Paused", newReviews: "New reviews update here", description: "Newly written reviews are reflected here. Card rotation does not indicate a new post.", now: "Just now", unknownTime: "Time unavailable", hideExamples: "Hide writing examples", showExamples: "Show writing examples", examplesOnly: "Currently displaying writing examples.", product: "Product", empty: "No published reviews yet." },
    zh: { title: "最新商品评价", all: "查看全部评价", example: "写作示例", exampleNote: "这是运营团队编写的示例，并非真实会员的中奖记录或使用评价。", examplesIncluded: "包含写作示例", member: "会员", exampleAuthor: "示例作者", exampleRating: "示例评分", rating: "评分", price: "目录参考价值", pause: "暂停自动轮播", play: "继续自动轮播", previous: "上一条评价", next: "下一条评价", auto: "自动轮播", paused: "已暂停", newReviews: "新评价同步更新", description: "此处同步新发表的评价。卡片轮播不代表有新帖子发表。", now: "刚刚", unknownTime: "发布时间未知", hideExamples: "隐藏写作示例", showExamples: "显示写作示例", examplesOnly: "当前展示的是写作示例。", product: "商品", empty: "暂无公开评价。" },
  };
  return copy[locale === "en" || locale === "zh" ? locale : "ko"];
}

/** Fixed editorial content: never reset dates on reload, never write these into `mine`. */
export function createReviewExamples(): MyReview[] {
  const entries: [string, string, string, number, string][] = [
    ["dollar-apple", "aud-airpods", "출근길음악", 4, "에어팟 맥스는 디자인이 취향인데 무게가 고민임. 나한테 필요한 게 헤드폰인지부터 정리해서 쓰면 다른 사람도 비교하기 편할 듯. 착용감은 직접 확인한 뒤 추가하는 식으로."],
    ["dollar-apple", "da-iphone16", "폰바꿀까말까", 5, "아이폰은 카메라랑 용량을 먼저 적어두고 싶음. 모델명만 적는 것보다 기존에 쓰던 기기와 어떤 점을 비교했는지 쓰는 후기가 읽기 좋더라. 첫인상과 사용기는 구분해서 남기는 쪽."],
    ["starter-macbook", "apx-mbp", "키보드와커피", 5, "맥북 프로면 무조건 좋겠지 싶다가도 내 작업에 필요한 사양인지 보게 됨. 화면 크기, 무게, 주로 쓰는 프로그램까지 적는 식의 후기라면 참고하기 좋겠어요."],
    ["starter-macbook", "gtc-ipadpro", "소파태블릿", 4, "아이패드는 화면만 보고 고르기엔 쓰는 방식이 너무 다름. 필기용인지 영상용인지부터 적고, 손으로 들고 있을 때 느낌을 따로 남기면 좋을 듯. 액세서리 비용도 빼놓을 수 없고."],
    ["vault-submariner", "rlx-hamilton", "작은손목", 4, "해밀턴 필드워치 사진 보면 담백해서 좋음. 다만 내 손목에 맞는 크기인지가 더 중요할 것 같아서 치수부터 확인하는 편. 다이얼 색과 줄 느낌도 같이 기록하면 보기 좋겠네요."],
    ["vault-submariner", "rlx-sub", "시계덕후99", 5, "서브마리너 후기를 쓴다면 모델 번호부터 정확히 적고 싶음. 멋있다는 말 한 줄보다 크기나 착용 목적 같은 정보가 더 궁금하니까. 구성품은 직접 확인한 것만 적는 게 맞고요."],
    ["dollar-gaming", "dg-ps5", "주말패드", 5, "PS5는 결국 무슨 게임을 할지가 먼저인 듯 ㅋㅋ 설치 공간하고 같이 쓸 TV도 생각해야겠고. 후기에 본체 외에 필요한 준비물을 따로 적어주면 초보가 보기 좋을 것 같음."],
    ["vault-gold", "vg-gold10g", "차분한기록", 4, "골드바는 사진만 보면 크기가 잘 안 와닿음. 무게와 규격, 포장 상태를 구분해서 쓰는 방식이 좋겠어요. 시세랑 카탈로그 기준가도 같은 숫자인 것처럼 섞어 쓰지 않고."],
    ["dollar-apple", "da-watchse", "산책알림", 4, "애플워치는 운동 기능보다 일상 알림을 얼마나 쓸지가 더 궁금함. 처음 설정할 때 확인한 것과 오래 써봐야 아는 부분을 나누면 솔직한 후기가 될 듯해요."],
    ["dollar-apple", "da-airpods4", "가벼운주머니", 5, "이어폰은 휴대성이 끌리는데 귀에 맞는지가 제일 중요하겠죠. 남한테 편하다고 나한테도 편한 건 아니라서 착용감은 개인차 있다고 적어두고 싶음. 케이스 크기도 같이."],
    ["starter-macbook", "gtc-mba", "가벼운가방", 5, "맥북 에어는 매일 들고 나갈 용도로 비교하는 글이 도움 됨. 성능 수치만 길게 적기보다 가방에 넣었을 때 부피, 충전기까지 챙겼을 때 느낌 같은 게 더 궁금해요."],
    ["starter-macbook", "flg-buds", "조용한출근", 4, "에어팟 프로 후기는 장점만 있으면 잘 안 읽게 됨. 어떤 환경에서 썼는지, 어떤 부분은 아직 확인 못 했는지가 같이 있으면 판단하기 편하더라고요."],
    ["starter-ps5", "sp-ps5pro", "게임은주말에", 5, "프로 모델이라고 무조건 내 용도에 맞는 건 아니니까 기존 환경부터 적어두는 쪽. 게임 제목과 화면 설정을 함께 써야 다른 사람이 비교할 수 있을 것 같아요."],
    ["dollar-gaming", "dg-switch2", "소파플레이어", 4, "스위치는 휴대해서 쓸지 TV에 연결할지부터 고민. 나중에 후기를 쓰면 두 사용 방식을 나눠 적고 싶음. 게임 목록과 추가 액세서리 이야기도 빠지면 아쉽고."],
    ["dollar-gaming", "gpu-5090", "책상속컴퓨터", 5, "그래픽카드는 스펙만 보고 끝내기 어렵네요. 케이스 공간, 전원, 사용할 모니터까지 생각해야 해서 후기에 설치 환경이 있으면 훨씬 참고하기 좋을 듯."],
    ["vault-submariner", "rlx-tudor", "다이얼구경", 4, "튜더는 디자인 보고 끌렸다가도 크기부터 다시 확인하게 됨. 시계 후기는 손목 둘레랑 착용 사진이 같이 있으면 느낌이 잘 전달될 것 같아요. 사진 각도에 따라 달라 보이니까."],
    ["vault-omega", "sws-tissot", "심플한시계", 4, "PRX는 깔끔한 느낌이 좋아 보이는데 줄과 케이스 모양이 내 취향인지가 관건. 후기라면 외관 첫인상과 실제 사용하면서 느낀 점을 나눠서 쓰고 싶네요."],
    ["vault-omega", "sws-omega", "천천히고르자", 5, "아쿠아테라를 소개하는 글은 어떤 옷에 맞춰 생각했는지 궁금함. 평소 복장과 착용 목적을 적으면 막연히 예쁘다는 말보다 정보가 많을 것 같아요."],
    ["vault-gold", "vg-gold100g", "규격부터확인", 5, "골드바는 무게와 순도, 제품 규격을 정확히 구분해서 쓰는 게 중요할 듯. 확인하지 않은 보증이나 배송 이야기는 빼고 실제 확인할 수 있는 항목 중심으로 정리하고 싶어요."],
    ["vault-gold", "vg-silver", "작은수집노트", 4, "실버바도 사진보다 실제 규격이 궁금한 상품. 크기 비교와 표면 상태를 따로 설명하는 후기가 보기 편할 것 같음. 관리나 보관은 제품 안내를 확인해서 적어두는 식으로요."],
  ];
  return entries.map(([boxSlug, itemId, authorName, rating, text], index) => {
    const item = BOX_BY_SLUG[boxSlug]?.items.find(product => product.id === itemId);
    if (!item || !Number.isFinite(item.value) || item.value < MIN_REVIEW_ITEM_VALUE_USDT || item.kind === "cash") throw new Error(`invalid-review-example-product:${boxSlug}/${itemId}`);
    const id = `review_example_v1_${String(index + 1).padStart(2, "0")}`;
    const at = new Date(Date.parse("2026-09-30T00:00:00.000Z") - index * 3600000).toISOString();
    return { id, ownedId: `${id}_editorial`, boxSlug, itemId, authorName, source: "example", rating, text, at, bonusUsdt: 0 };
  });
}

export function publicReviewFeed(reviews: MyReview[], includeExamples = true): MyReview[] {
  const seen = new Set<string>();
  const members = reviews.filter(review => {
    if (isExampleReview(review) || !review.publishedAt || !Number.isFinite(Date.parse(review.at)) || seen.has(review.id)) return false;
    seen.add(review.id); return true;
  }).sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  return includeExamples ? [...members, ...createReviewExamples()] : members;
}

export function relativeReviewTime(at: string, now: number, locale: string): string {
  const copy = communityFeedCopy(locale);
  const value = Date.parse(at);
  if (!Number.isFinite(value) || !Number.isFinite(now) || value > now + 60000) return copy.unknownTime;
  const seconds = Math.max(0, Math.floor((now - value) / 1000));
  if (seconds < 60) return copy.now;
  const units: [Intl.RelativeTimeFormatUnit, number][] = [["year", 31536000], ["month", 2592000], ["day", 86400], ["hour", 3600], ["minute", 60]];
  const [unit, size] = units.find(([, size]) => seconds >= size)!;
  return new Intl.RelativeTimeFormat(locale, { numeric: "always" }).format(-Math.floor(seconds / size), unit);
}

export function reviewWindow<T>(records: T[], start: number, size = 3): T[] {
  if (!records.length || !Number.isFinite(start) || !Number.isFinite(size)) return [];
  const offset = ((Math.trunc(start) % records.length) + records.length) % records.length;
  return Array.from({ length: Math.min(records.length, Math.max(0, Math.trunc(size))) }, (_, n) => records[(offset + n) % records.length]);
}

export function meetsReviewValue(item: Pick<OwnedItem, "valueUsdt">): boolean {
  return Number.isFinite(item.valueUsdt) && item.valueUsdt >= MIN_REVIEW_ITEM_VALUE_USDT;
}

/** Reviews describe a won item; delivery is not a prerequisite. One review per win. */
export function canReview(item: OwnedItem, reviews: Pick<MyReview, "ownedId">[]): boolean {
  return meetsReviewValue(item) && ["IN_STORAGE", "SHIPPING_REQUESTED", "SHIPPING", "DELIVERED", "SOLD"].includes(item.status) && !reviews.some(r => r.ownedId === item.id);
}

export interface Review {
  id: string;
  /** 마스킹 핸들 */
  user: string;
  boxSlug: string;
  itemId: string;
  text: string;
  /** 별점 1~5 */
  rating: number;
  likes: number;
  at: string;
  /** 업로드 사진(URL 또는 data URL). 없으면 카탈로그 이미지 */
  photo?: string;
  proof: {
    carrier?: CarrierKey;
    trackingNumber?: string;
    network?: Network;
    txHash?: string;
  };
  mine?: boolean;
}

/** 내 후기 + 해당 보관함 레코드 → 게시용 Review (운송장 인증은 실제 발급된 것만) */
export function toReview(m: MyReview, owned: OwnedItem | undefined, user: string): Review {
  return {
    id: m.id,
    user,
    boxSlug: m.boxSlug,
    itemId: m.itemId,
    text: m.text,
    rating: m.rating,
    likes: 0,
    at: m.at,
    photo: m.photo,
    proof: { carrier: owned?.shipping?.carrier, trackingNumber: owned?.shipping?.trackingNumber },
    mine: true,
  };
}
