/**
 * 카피 사전 — 단일 진입점.
 *
 * 규칙: 이모지 금지. 마케팅성 과장 표현 금지. 톤은 미니멀·냉정·정확.
 * en / zh 값은 지정된 사전을 그대로 옮긴 것이며 임의 수정하지 않는다.
 * ko 는 기존 UI 회귀를 막기 위해 유지하되 동일한 레지스터로 정렬했다.
 */

import { create } from "zustand";

export type Locale = "ko" | "en" | "zh";

export const LOCALES: Locale[] = ["ko", "en", "zh"];

export const DEFAULT_LOCALE: Locale = "ko";

type Dict = Record<Locale, string>;

/** 사전 키 — UI 텍스트 노드는 전부 이 키를 통해 렌더한다. */
export const COPY = {
  // ── 지정 사전 (정확히 일치시킬 것) ──────────────────────
  boxOpen: {
    ko: "시퀀스 잠금 해제",
    en: "UNLOCK SEQUENCE",
    zh: "开启盲盒",
  },
  reclaimValue: {
    ko: "즉시 회수",
    en: "RECLAIM VALUE",
    zh: "即时回收",
  },
  requestDispatch: {
    ko: "발송 요청",
    en: "REQUEST DISPATCH",
    zh: "申请发货",
  },
  probabilityIndex: {
    ko: "확률 공시",
    en: "PROBABILITY INDEX",
    zh: "公开概率公示",
  },
  withdrawalWarning: {
    ko: "메인넷 프로토콜과 출금 주소를 확인하십시오. 정보 오입력으로 자산이 유실된 경우 플랫폼은 회수할 수 없습니다.",
    en: "Assets sent to an incompatible network or incorrect address cannot be recovered.",
    zh: "请核对主网协议与提现地址。若因信息填写错误导致资产丢失，平台概无法找回。",
  },

  // ── 파생 라벨 ───────────────────────────────────────────
  boxOpenSingle: { ko: "1회 재생", en: "SINGLE PLAY", zh: "单次开启" },
  boxOpenMulti: { ko: "10연속 재생", en: "TEN-PULL SEQUENCE", zh: "十连开启" },
  boxOpenAgain: { ko: "새 세션 재생", en: "RE-ROLL", zh: "重新开启" },
  episodeInfo: { ko: "에피소드 정보", en: "EPISODE DETAIL", zh: "详情" },
  acquiredIndex: { ko: "획득 목록", en: "ACQUIRED INDEX", zh: "获得记录" },
  previewPlay: { ko: "프리뷰 재생", en: "PREVIEW PLAY", zh: "试玩预览" },
  guaranteedMin: { ko: "최저 보장가", en: "GUARANTEED MINIMUM", zh: "保底价值" },
  deposit: { ko: "충전", en: "DEPOSIT", zh: "充值" },
  balance: { ko: "잔액", en: "BALANCE", zh: "余额" },
  sequenceLocked: { ko: "시퀀스 잠김", en: "SEQUENCE LOCKED", zh: "序列锁定" },
} satisfies Record<string, Dict>;

export type CopyKey = keyof typeof COPY;

/** 지정 로케일의 문자열을 반환한다. 누락 시 en 으로 폴백. */
export const t = (key: CopyKey, locale: Locale = DEFAULT_LOCALE): string =>
  COPY[key][locale] ?? COPY[key].en;

/** 로케일 전환 스토어. 표시 계층 전용이며 어떤 비즈니스 로직에도 관여하지 않는다. */
export const useLocale = create<{ locale: Locale; setLocale: (l: Locale) => void }>()((set) => ({
  locale: DEFAULT_LOCALE,
  setLocale: (locale) => set({ locale }),
}));

/** 컴포넌트에서 쓰는 헬퍼 — 현재 로케일로 키를 해석한다. */
export const useCopy = () => {
  const locale = useLocale((s) => s.locale);
  return { locale, t: (key: CopyKey) => t(key, locale) };
};

export const LOCALE_LABEL: Record<Locale, string> = { ko: "한", en: "EN", zh: "中" };

/** 상품명 등 데이터에 실린 다국어 필드를 로케일에 맞춰 고른다. */
export const pickName = (
  entry: { name_en: string; name_zh: string; name_ko?: string },
  locale: Locale = DEFAULT_LOCALE,
): string => (locale === "zh" ? entry.name_zh : locale === "ko" ? (entry.name_ko ?? entry.name_en) : entry.name_en);
