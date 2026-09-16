"use client";

import { useEffect } from "react";
import { rehydrateCurrency } from "@/stores/currencyStore";

/** 마운트 후 localStorage 의 통화 선택을 적용한다. layout 에 한 번만 둔다. */
export function CurrencyHydrator() {
  useEffect(() => {
    rehydrateCurrency();
  }, []);
  return null;
}

export default CurrencyHydrator;
