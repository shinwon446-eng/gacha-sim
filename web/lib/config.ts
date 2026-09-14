import type { OpenEvent } from "./types";
import { getBox } from "./data";

/**
 * GNB 상단 신뢰 티커 문구.
 *
 * ⚠️ 여기에는 실제로 검증 가능한 사실만 넣을 것.
 * 실존 감사 기관/투자사 이름을 사실과 다르게 표기하면 이용자 기만(허위 광고)이 된다.
 * 아래는 자리 표시용 예시이며, 출시 전 실제 링크/문서로 교체해야 한다.
 */
export const TRUST_MESSAGES: { icon: "chain" | "shield" | "news" | "check"; text: string }[] = [
  { icon: "chain", text: "온체인 확률 검증 컨트랙트 주소: 0x0000…0000 (출시 전 실제 주소로 교체)" },
  { icon: "shield", text: "스마트 컨트랙트 보안 감사 리포트 링크 (감사 완료 후 게시)" },
  { icon: "news", text: "투자 유치 / 파트너십 보도자료 링크 (공식 발표 후 게시)" },
  { icon: "check", text: "모든 실물 상품은 인증서 번호 공개 · 배송 트래킹 제공" },
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
  demo("d1", "0x7a…d3", "pokemon-shadowless", "pk-charizard10", 3),
  demo("d2", "k***", "cybertruck-beast", "ct-foundation", 11),
  demo("d3", "0x19…4f", "rolex-daytona", "rx-sub", 18),
  demo("d4", "m***", "sneaker-grail", "sn-ts", 26),
  demo("d5", "0xb2…91", "birkin-drop", "hm-kelly", 41),
  demo("d6", "j***", "macbook-silicon", "mb-max", 55),
  demo("d7", "0xe0…7c", "ps5-pro-drop", "ps-30th", 72),
  demo("d8", "s***", "pokemon-151", "p151-zard-sar", 90),
];

/** 입금 주소 — 자리 표시. 실제 커스터디 지갑 주소로 교체할 것. */
export const DEPOSIT_ADDRESSES: Record<"TRC-20" | "ERC-20", string> = {
  "TRC-20": "TXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  "ERC-20": "0x0000000000000000000000000000000000000000",
};

export const INITIAL_BALANCE = 1000;
