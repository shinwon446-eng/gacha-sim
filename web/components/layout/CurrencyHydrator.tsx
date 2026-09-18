"use client";

import { useEffect } from "react";
import { rehydrateCurrency } from "@/stores/currencyStore";
import { useWalletStore } from "@/stores/walletStore";
import { useFairStore } from "@/stores/fairStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useInventoryStore } from "@/stores/inventoryStore";
import { useDailyStore } from "@/stores/dailyStore";
import { useCommunityStore } from "@/stores/communityStore";

/** 마운트 후 persist 스토어(통화·지갑·설정·공정성 시드)를 적용한다. layout 에 한 번만 둔다. */
export function CurrencyHydrator() {
  useEffect(() => {
    rehydrateCurrency();
    void useWalletStore.persist.rehydrate();
    void useSettingsStore.persist.rehydrate();
    void useInventoryStore.persist.rehydrate();
    void useDailyStore.persist.rehydrate();
    void useCommunityStore.persist.rehydrate();
    void Promise.resolve(useFairStore.persist.rehydrate()).then(() => useFairStore.getState().ensureSeeds());
  }, []);
  return null;
}

export default CurrencyHydrator;
