/**
 * 라이브 드랍 티커 데이터 (CLAUDE.md §4-1).
 * live 모드는 API 스트림, preview 모드는 이 기기의 실제 기록(보관함·지갑 거래)만 쓴다. 다른 사람의 활동을 지어내지 않는다.
 */
import type { OwnedItem } from "@/stores/inventoryStore";
import type { Transaction } from "@/stores/walletStore";
import { BOXES, dropTable } from "@/lib/products";

export type LiveDropKind = "win" | "cashout" | "ship" | "lineup";

export interface LiveDrop {
  id: string;
  kind: LiveDropKind;
  /** 마스킹 핸들 — "user***21" */
  user: string;
  itemId?: string;
  boxSlug?: string;
  amountUsdt?: number;
  /** ISO 시각 */
  at: string;
}

/** 클라이언트 시드 → 이 기기의 마스킹 핸들 ("u_3f9c***") */
export function localHandle(clientSeed: string): string {
  return `u_${(clientSeed || "anon").slice(0, 4)}***`;
}

/** 활동 기록이 없을 때 — 지어낸 당첨 대신 공개된 잭팟 라인업(박스 · 최고 상품 · 배수 · 확률)을 흘린다 */
export function buildLineupDrops(): LiveDrop[] {
  return BOXES.map((b) => {
    const top = dropTable(b)[0];
    return { id: `lineup_${b.slug}`, kind: "lineup" as const, user: "", boxSlug: b.slug, itemId: top.id, at: b.releasedAt };
  });
}

/** 이 기기의 실제 활동 → 티커 이벤트 (최신순, 최대 limit) */
export function buildLocalDrops(items: OwnedItem[], transactions: Transaction[], handle: string, limit = 20): LiveDrop[] {
  const out: LiveDrop[] = [];
  for (const o of items) {
    out.push({ id: `win_${o.id}`, kind: "win", user: handle, itemId: o.itemId, boxSlug: o.boxSlug, at: o.acquiredAt });
    if (o.shipping) out.push({ id: `ship_${o.id}`, kind: "ship", user: handle, itemId: o.itemId, boxSlug: o.boxSlug, at: o.shipping.requestedAt });
  }
  for (const t of transactions) {
    if (t.type === "sellback" || t.type === "withdraw") out.push({ id: `cash_${t.id}`, kind: "cashout", user: handle, amountUsdt: Math.abs(t.amountUsdt), at: t.at });
  }
  return out.sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
}
