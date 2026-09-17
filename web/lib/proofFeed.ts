/**
 * 실지급 & 실배송 라이브 인증 피드 + 지급 준비금 (CLAUDE.md §5-B, PROMPTS 3-2/3-3).
 *
 * 정적 데모에는 집계 백엔드가 없다. 여기 데이터는 규범이 요구하는 "형태"를 재현하는 모의 피드이며,
 * TxID·운송장·지갑 주소는 형식만 맞는 가짜라 익스플로러/택배사에서 조회되지 않는다. 화면은 항상 "데모 데이터"를 표기한다.
 * 실서비스에서는 이 모듈을 API 응답으로 바꾸기만 하면 된다 — 타입이 계약이다.
 */
import type { Network } from "@/lib/depositAddress";
import { demoAddress } from "@/lib/depositAddress";
import { mockTxHash } from "@/lib/withdrawal";
import { mockTrackingNumber, type CarrierKey } from "@/lib/carriers";
import type { CountryCode } from "@/lib/shipping";

export type PayoutKind = "withdraw" | "sellback";

export interface PayoutProof {
  id: string;
  /** 마스킹된 유저 식별자 — "u_3f9c…a1" */
  user: string;
  kind: PayoutKind;
  amountUsdt: number;
  boxSlug: string;
  network: Network;
  txHash: string;
  /** ISO — 화면은 상대 시간으로 표기 */
  at: string;
}

export interface ShipmentProof {
  id: string;
  /** 마스킹된 수령인 — 로케일별 */
  recipient: { ko: string; en: string; zh: string };
  /** 지역 — 로케일별 ("경기 성남시" / "Seongnam, KR" / "京畿 城南市") */
  region: { ko: string; en: string; zh: string };
  country: CountryCode;
  boxSlug: string;
  itemId: string;
  carrier: CarrierKey;
  trackingNumber: string;
  at: string;
}

/** 지급 준비금 (§5-B-3) — 데모 리저브 지갑. 체크섬이 틀린 주소라 실제로 존재하지 않는다. */
export const RESERVE = {
  minUsdt: 500_000,
  /** 화면 표시용 현재 보유량 — 데모 고정값 */
  balanceUsdt: 612_340,
  network: "TRC20" as Network,
  address: demoAddress("TRC20", "gachaflix-reserve"),
  explorerUrl: (address: string) => `https://tronscan.org/#/address/${address}`,
};

const minutesAgo = (base: number, m: number) => new Date(base - m * 60_000).toISOString();

/** 결정적 모의 피드 — base(ms) 기준으로 상대 시각을 만든다 */
export function buildPayoutFeed(base = Date.now()): PayoutProof[] {
  const rows: Array<[string, PayoutKind, number, string, Network, number]> = [
    ["u_3f9c…a1", "withdraw", 1_240.0, "rolex-vault", "TRC20", 3],
    ["u_b71e…07", "sellback", 88.35, "cybertruck-dream", "TRC20", 9],
    ["u_e0d2…5c", "withdraw", 320.0, "guaranteed-tech", "BEP20", 17],
    ["u_91aa…f3", "withdraw", 6_745.0, "grail-handbag", "TRC20", 26],
    ["u_4c08…9e", "sellback", 412.3, "apex-workstation", "BEP20", 41],
    ["u_77d1…b0", "withdraw", 59.0, "sneaker-drop", "TRC20", 58],
    ["u_2be4…6d", "withdraw", 14_820.0, "rolex-vault", "TRC20", 84],
    ["u_c5f0…22", "sellback", 266.0, "guaranteed-luxury", "TRC20", 121],
  ];
  return rows.map(([user, kind, amountUsdt, boxSlug, network, m], i) => ({
    id: `po_${i}`,
    user,
    kind,
    amountUsdt,
    boxSlug,
    network,
    txHash: mockTxHash(network, 1000 + i),
    at: minutesAgo(base, m),
  }));
}

export function buildShipmentFeed(base = Date.now()): ShipmentProof[] {
  const rows: Array<[[string, string, string], [string, string, string], CountryCode, string, string, CarrierKey, number]> = [
    [["최*우", "C**-woo C.", "崔*宇"], ["경기 성남시", "Seongnam, KR", "京畿 城南市"], "KR", "apex-workstation", "apx-xdr", "CJ", 6],
    [["김*연", "S**-yeon K.", "金*妍"], ["서울 강남구", "Seoul, KR", "首尔 江南区"], "KR", "rolex-vault", "rlx-tudor", "CJ", 22],
    [["Jo*** M.", "Jo*** M.", "Jo*** M."], ["싱가포르", "Singapore, SG", "新加坡"], "SG", "flagship-phone", "flg-iphone", "DHL", 47],
    [["王*明", "W*** M.", "王*明"], ["상하이", "Shanghai, CN", "上海"], "CN", "guaranteed-tech", "gtc-mx", "DHL", 63],
    [["박*준", "M**-jun P.", "朴*俊"], ["부산 해운대구", "Busan, KR", "釜山 海云台区"], "KR", "sneaker-drop", "snk-care", "EPOST", 95],
    [["Em*** R.", "Em*** R.", "Em*** R."], ["런던", "London, GB", "伦敦"], "GB", "grail-handbag", "grl-dior", "FEDEX", 140],
  ];
  return rows.map(([rec, reg, country, boxSlug, itemId, carrier, m], i) => ({
    id: `sp_${i}`,
    recipient: { ko: rec[0], en: rec[1], zh: rec[2] },
    region: { ko: reg[0], en: reg[1], zh: reg[2] },
    country,
    boxSlug,
    itemId,
    carrier,
    trackingNumber: mockTrackingNumber(carrier, 2000 + i),
    at: minutesAgo(base, m),
  }));
}

/** 유저 id 마스킹 — 실서비스용 (앞 4 + 뒤 2) */
export function maskUserId(id: string): string {
  return id.length <= 6 ? id : `${id.slice(0, 4)}…${id.slice(-2)}`;
}
