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
        <ContentRow title="지금 재생 중" boxes={trending} />
        <ContentRow id={CATEGORY_META.apex.anchor} title={CATEGORY_META.apex.label_en} boxes={byCategory("apex")} />
        <ContentRow id={CATEGORY_META.battle.anchor} title={CATEGORY_META.battle.label_en} boxes={byCategory("battle")} />
        <ContentRow id={CATEGORY_META.sound.anchor} title={CATEGORY_META.sound.label_en} boxes={byCategory("sound")} />
        <ContentRow title="이어서 볼 시퀀스" boxes={[...BOXES].reverse()} />
        <RankingSection />
      </div>

      <footer className="border-t border-white/[0.08] px-[4%] pt-8 text-[11px] leading-relaxed text-neutral-500">
        <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-300">고지</div>
        <p>
          모든 릴의 확률은 에피소드 정보의 확률 공시표에 전량 공개됩니다. 라인업은 실판매가 기준으로 자동 분류되며 운영
          측의 임의 조정은 없습니다. 획득한 실물 상품은 배송 또는 시세의 95% USDT 환급 중 하나를 선택합니다.
        </p>
        <p className="mt-2 border-l-2 border-crimson pl-3 text-[12px] font-semibold leading-relaxed text-neutral-200">
          비회원 모의 체험은 화면 연출이며 상품이 지급되지 않습니다. 본 화면은 프로토타입이고 잔액과 결제는 모의
          데이터입니다.
        </p>
        <p className="mt-4 font-display text-xs uppercase tracking-tighter text-neutral-600">© GACHAFLIX</p>
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
