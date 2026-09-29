"use client";

import { useEffect } from "react";
import { rehydrateCurrency } from "@/stores/currencyStore";
import { useWalletStore } from "@/stores/walletStore";
import { useFairStore } from "@/stores/fairStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useInventoryStore } from "@/stores/inventoryStore";
import { useDailyStore } from "@/stores/dailyStore";
import { useCommunityStore } from "@/stores/communityStore";
import { useTelemetryStore } from "@/stores/telemetryStore";

/** 마운트 후 persist 스토어(통화·지갑·설정·공정성 시드)를 적용한다. layout 에 한 번만 둔다. */
export function CurrencyHydrator() {
  useEffect(() => {
    rehydrateCurrency();
    const rehydrate = async () => {
      await Promise.all([
        useWalletStore.persist.rehydrate(),
        useInventoryStore.persist.rehydrate(),
      ]);
      // 브라우저 보관함이므로 다음 방문 시에도 반드시 만료분을 정산한다.
      // 판매 상태 전환 후에만 지갑을 적립해 중복 캐시백을 막는다.
      const settled = useInventoryStore.getState().settleExpiredCashback();
      if (settled.ids.length) {
        const wallet = useWalletStore.getState();
        wallet.creditSplit(settled.toCrypto, settled.toCard);
        wallet.addTransaction({ type: "sellback", amountUsdt: settled.totalUsdt, ref: `auto-cashback-30d:${settled.ids.join(",")}` });
      }
    };
    void rehydrate();
    void useSettingsStore.persist.rehydrate();
    void useDailyStore.persist.rehydrate();
    void useCommunityStore.persist.rehydrate();
    void useTelemetryStore.persist.rehydrate();
    void Promise.resolve(useFairStore.persist.rehydrate()).then(() => useFairStore.getState().ensureSeeds());
  }, []);
  return null;
}

export default CurrencyHydrator;
