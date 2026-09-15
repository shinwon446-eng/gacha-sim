import type { OpenEvent } from "./types";
import { getBox } from "./data";

/**
 * GNB 상단 신뢰 티커 문구.
 *
 * 경고: 여기에는 실제로 검증 가능한 사실만 넣을 것.
 * 실존 감사 기관/투자사 이름을 사실과 다르게 표기하면 이용자 기만(허위 광고)이 된다.
 * 아래는 자리 표시용 예시이며, 출시 전 실제 링크/문서로 교체해야 한다.
 */
export const TRUST_MESSAGES: { icon: "chain" | "shield" | "news" | "check"; text: string }[] = [
  { icon: "chain", text: "확률 공시 — 전 항목 가중치 공개 · 에피소드 정보에서 열람" },
  { icon: "shield", text: "라인업 분류는 실판매가에서 자동 파생 · 운영 개입 없음" },
  { icon: "news", text: "프로토타입 — 잔액과 결제는 모의 데이터" },
  { icon: "check", text: "인증서 번호 전량 표기 · 항목별 조회 가능" },
];

/** 데모 피드를 표시할지 여부. 실서비스에서는 false로 두고 실제 이벤트만 사용한다. */
export const SHOW_DEMO_FEED = true;

/** 샘플 당첨 피드 — UI에 DEMO 태그가 붙는다. */
const demo = (id: string, user: string, boxId: string, itemId: string, minutesAgo: number): OpenEvent => {
  const box = getBox(boxId);
  const item = box.items.find((i) => i.id === itemId);
  if (!item) throw new Error(`unknown item ${itemId}`);
  return { id, user, boxId, item, at: -minutesAgo, isDemo: true };
};

export const DEMO_FEED: OpenEvent[] = [
  demo("d1", "0x7a…d3", "black-label-apex-tech", "bl-mbp16", 3),
  demo("d2", "k***", "studio-zero-sound-stage", "sz-genelec", 11),
  demo("d3", "0x19…4f", "overclock-battle-station", "oc-rig", 18),
  demo("d4", "m***", "black-label-apex-tech", "bl-vision", 26),
  demo("d5", "0xb2…91", "studio-zero-sound-stage", "sz-u87", 41),
  demo("d6", "j***", "overclock-battle-station", "oc-5090", 55),
  demo("d7", "0xe0…7c", "black-label-apex-tech", "bl-fold", 72),
  demo("d8", "s***", "studio-zero-sound-stage", "sz-apollo", 90),
];

/**
 * 이탈 방지 다이얼로그의 실시간 가입자 수 문구.
 * 경고: 실제 분석 데이터 연동 전까지 isDemo:true 로 두고 UI에 DEMO 태그를 붙인다.
 * 실측 없는 수치를 사실처럼 표기하면 기만 광고(표시광고법)에 해당할 수 있다. null 이면 문구 미노출.
 */
export const EXIT_SOCIAL_PROOF: { count: number; isDemo: boolean } | null = { count: 3120, isDemo: true };

/** 입금 주소 — 자리 표시. 실제 커스터디 지갑 주소로 교체할 것. */
export const DEPOSIT_ADDRESSES: Record<"TRC-20" | "ERC-20", string> = {
  "TRC-20": "TXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  "ERC-20": "0x0000000000000000000000000000000000000000",
};

export const INITIAL_BALANCE = 1000;

/** 비회원 모의 체험에 노출할 박스 — 이 박스의 1등 상품이 고정 노출된다(지급 없음). */
export const DEMO_BOX_ID = "black-label-apex-tech";
