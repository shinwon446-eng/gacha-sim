"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import type { ProductBox, ProductItem } from "@/lib/products";

/**
 * 상품 문자열의 로케일 해석. 데이터(products.ts)는 ko/en 원문만 들고 있고,
 * 표시용 문자열은 messages/<locale>.json 의 products.* 에서 온다. 키가 없으면 데이터 원문으로 폴백.
 */
export function useProductText() {
  const t = useTranslations("products");
  const boxTitle = useCallback((b: ProductBox) => (t.has(`boxes.${b.slug}.title`) ? t(`boxes.${b.slug}.title`) : b.title), [t]);
  const boxTagline = useCallback((b: ProductBox) => (t.has(`boxes.${b.slug}.tagline`) ? t(`boxes.${b.slug}.tagline`) : b.tagline), [t]);
  const boxBadge = useCallback((b: ProductBox) => (t.has(`boxes.${b.slug}.badge`) ? t(`boxes.${b.slug}.badge`) : b.badge), [t]);
  const itemName = useCallback((i: ProductItem) => (t.has(`items.${i.id}`) ? t(`items.${i.id}`) : i.name), [t]);
  return { boxTitle, boxTagline, boxBadge, itemName };
}
