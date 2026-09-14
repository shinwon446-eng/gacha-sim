"use client";

import { useEffect } from "react";
import { BOXES } from "@/lib/data";
import { CATEGORY_META } from "@/lib/types";
import { useGachaStore } from "@/store/useGachaStore";
import { TrustTicker } from "@/components/TrustTicker";
import { Navbar } from "@/components/Navbar";
import { HeroBillboard } from "@/components/HeroBillboard";
import { ContentRow } from "@/components/ContentRow";
import { RankingSection } from "@/components/RankingSection";
import { BoxDetailModal } from "@/components/BoxDetailModal";
import { DepositModal } from "@/components/DepositModal";
import { InventoryDrawer } from "@/components/InventoryDrawer";
import { TheaterGacha } from "@/components/TheaterGacha";
import { GuestDemoModal } from "@/components/GuestDemoModal";
import { Toasts } from "@/components/Toasts";

const trending = BOXES.filter((b) => b.featured).concat(BOXES.filter((b) => !b.featured).slice(0, 4));
const byCategory = (c: keyof typeof CATEGORY_META) => BOXES.filter((b) => b.category === c);

export default function Home() {
  const hydrateDemo = useGachaStore((s) => s.hydrateDemo);

  useEffect(() => {
    hydrateDemo();
    if (process.env.NODE_ENV === "development") {
      (window as unknown as { __gacha?: typeof useGachaStore }).__gacha = useGachaStore;
    }
  }, [hydrateDemo]);

  return (
    <main className="relative min-h-screen bg-canvas pb-16">
      <TrustTicker />
      <Navbar />
      <HeroBillboard />

      <div className="relative -mt-[8vh]">
        <ContentRow title="지금 뜨는 박스" boxes={trending} />
        <ContentRow id={CATEGORY_META.tech.anchor} title={CATEGORY_META.tech.label} boxes={byCategory("tech")} />
        <ContentRow id={CATEGORY_META.tcg.anchor} title={CATEGORY_META.tcg.label} boxes={byCategory("tcg")} />
        <ContentRow id={CATEGORY_META.luxury.anchor} title={CATEGORY_META.luxury.label} boxes={byCategory("luxury")} />
        <ContentRow title="당신이 좋아할 만한 박스" boxes={[...BOXES].reverse()} />
        <RankingSection />
      </div>

      <footer className="px-[4%] text-[11px] leading-relaxed text-gray-500">
        <p>
          모든 박스의 확률은 상세 페이지의 확률 공시표에 공개되며, 라인업은 실판매가 기준으로 자동 분류됩니다. 획득한
          실물 상품은 배송 또는 시세의 80% USDT 환급을 선택할 수 있습니다.
        </p>
        <p className="mt-2">
          비회원 체험은 모의 화면이며 상품이 지급되지 않습니다. © GACHAFLIX. 본 화면은 프로토타입이며 잔액/결제는 모의
          데이터입니다.
        </p>
      </footer>

      <BoxDetailModal />
      <DepositModal />
      <InventoryDrawer />
      <TheaterGacha />
      <GuestDemoModal />
      <Toasts />
    </main>
  );
}
