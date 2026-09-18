/**
 * 실물 언박싱 포토 후기 갤러리 (CLAUDE.md §7-B, PROMPTS 4-2).
 * 정적 데모 — 업로드 백엔드가 없으므로 후기는 모의값이고, 사진은 해당 상품의 카탈로그 이미지를 쓴다.
 * 각 후기는 당첨 건의 온체인(TxID)·운송장 인증을 달고 있다 — 형식만 맞는 모의값이며 화면에 명시한다.
 * 실서비스에서는 buildReviews 를 API 로 바꾸고 사진을 업로드 스토리지 URL 로 대체한다.
 */
import type { Network } from "@/lib/depositAddress";
import { mockTxHash } from "@/lib/withdrawal";
import { mockTrackingNumber, type CarrierKey } from "@/lib/carriers";

export const REVIEW_BONUS_USDT = 10;

export interface Review {
  id: string;
  /** 마스킹 핸들 */
  user: string;
  boxSlug: string;
  itemId: string;
  /** 한 줄 후기 — 로케일별 */
  text: { ko: string; en: string; zh: string };
  /** 별점 1~5 */
  rating: number;
  likes: number;
  at: string;
  proof: {
    /** 배송 인증 */
    carrier: CarrierKey;
    trackingNumber: string;
    /** 온체인 인증 — 판매(즉시 환전)한 건이면 없다 */
    network?: Network;
    txHash?: string;
  };
  /** 내가 쓴 후기(로컬) — 검토 중 표기 */
  mine?: boolean;
  pending?: boolean;
}

const daysAgo = (base: number, d: number) => new Date(base - d * 86_400_000).toISOString();

export function buildReviews(base = Date.now()): Review[] {
  const rows: Array<[string, string, string, [string, string, string], number, number, CarrierKey, number, boolean]> = [
    ["choi***w", "apex-workstation", "apx-xdr", ["프로 디스플레이 XDR이 정말 왔습니다. 박스 개봉부터 설치까지 3일. 정품 인보이스 동봉.", "The Pro Display XDR actually arrived. Three days from unboxing to setup, invoice included.", "Pro Display XDR 真的到了。从开箱到安装只用了 3 天，附正品发票。"], 5, 214, "CJ", 2, true],
    ["kim***y", "rolex-vault", "rlx-tudor", ["튜더 블랙베이 58 실물. 보증서·박스 풀세트. 롤렉스는 못 뽑았지만 만족.", "Tudor Black Bay 58 in hand — full set with warranty card. Not a Rolex, but no complaints.", "Tudor Black Bay 58 实物到手，保卡盒子齐全。没抽到劳力士但很满意。"], 5, 168, "CJ", 4, false],
    ["jo***m", "flagship-phone", "flg-iphone", ["아이폰 17 프로 맥스 미개봉 새제품. 싱가포르까지 DHL 5일.", "Sealed iPhone 17 Pro Max. DHL to Singapore in five days.", "iPhone 17 Pro Max 未拆封新品，DHL 到新加坡 5 天。"], 4, 97, "DHL", 6, true],
    ["wang***", "guaranteed-tech", "gtc-mx", ["보장 박스라 최저가 나와도 손해 없음. MX 마스터 세트 받고 바로 사용 중.", "Guaranteed box means no loss even at the floor. Using the MX Master set already.", "保底盲盒抽到最低也不亏，MX Master 套装已经在用。"], 4, 61, "DHL", 8, false],
    ["park***j", "sneaker-drop", "snk-care", ["케어 키트라 소소하지만 배송 빠르고 포장 깔끔. 다음엔 조던 노림.", "Just the care kit, but fast shipping and clean packaging. Going for the Jordans next.", "只是护理套装，但发货快包装好。下次冲乔丹。"], 3, 23, "EPOST", 9, false],
    ["em***r", "grail-handbag", "grl-dior", ["디올 레이디 미디움 정품 확인 완료. 런던까지 FedEx, 관세는 별도였음.", "Dior Lady Medium, authenticated. FedEx to London — duties billed separately.", "Dior Lady 中号已验真。FedEx 到伦敦，关税另付。"], 5, 342, "FEDEX", 12, true],
    ["lee***7", "cybertruck-dream", "ctd-cable", ["케이블 세트 당첨 후 95% 즉시 환전 대신 배송받음. 앵커 정품.", "Won the cable set — took delivery instead of the 95% cash-out. Genuine Anker.", "抽到线缆套装，没选 95% 折现而是发货。Anker 正品。"], 4, 12, "CJ", 14, false],
    ["sato***", "guaranteed-luxury", "glx-card", ["프라다 카드홀더, 보장 박스 최저 구성. 그래도 오픈가 이상이라 후회 없음.", "Prada cardholder — the floor of the guaranteed box, still above the open price.", "Prada 卡包，保底盲盒最低配置，但仍高于开启价，不后悔。"], 4, 45, "DHL", 18, true],
  ];
  return rows.map(([user, boxSlug, itemId, text, rating, likes, carrier, d, onchain], i) => ({
    id: `rv_${i}`,
    user,
    boxSlug,
    itemId,
    text: { ko: text[0], en: text[1], zh: text[2] },
    rating,
    likes,
    at: daysAgo(base, d),
    proof: {
      carrier,
      trackingNumber: mockTrackingNumber(carrier, 3000 + i),
      ...(onchain ? { network: "TRC20" as Network, txHash: mockTxHash("TRC20", 3000 + i) } : {}),
    },
  }));
}
