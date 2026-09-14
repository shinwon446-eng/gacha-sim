"use client";

import { BOXES } from "@/lib/data";
import { CATEGORY_META } from "@/lib/types";
import { TrustTicker } from "@/components/TrustTicker";
import { Navbar } from "@/components/Navbar";
import { HeroBillboard } from "@/components/HeroBillboard";
import { ContentRow } from "@/components/ContentRow";
import { RankingSection } from "@/components/RankingSection";
import { BoxDetailModal } from "@/components/BoxDetailModal";
import { DepositModal } from "@/components/DepositModal";
import { InventoryDrawer } from "@/components/InventoryDrawer";
import { TheaterGacha } from "@/components/TheaterGacha";
import { Toasts } from "@/components/Toasts";
import { GuestTrialBanner } from "@/components/GuestTrialBanner";
import { TrialSystem } from "@/components/TrialSystem";

const trending = BOXES.filter((b) => b.featured).concat(BOXES.filter((b) => !b.featured).slice(0, 4));
const byCategory = (c: keyof typeof CATEGORY_META) => BOXES.filter((b) => b.category === c);

export default function Home() {
  return (
    <main className="relative min-h-screen bg-canvas pb-16">
      <TrustTicker />
      <Navbar />
      <HeroBillboard />

      {/* 히어로 하단 그라디언트 위로 살짝 겹치게 */}
      <div className="relative -mt-[8vh]">
        <GuestTrialBanner />
        <ContentRow title="지금 뜨는 박스" boxes={trending} />
        <ContentRow id={CATEGORY_META.tech.anchor} title={CATEGORY_META.tech.label} boxes={byCategory("tech")} />
        <ContentRow id={CATEGORY_META.tcg.anchor} title={CATEGORY_META.tcg.label} boxes={byCategory("tcg")} />
        <ContentRow id={CATEGORY_META.luxury.anchor} title={CATEGORY_META.luxury.label} boxes={byCategory("luxury")} />
        <ContentRow title="당신이 좋아할 만한 박스" boxes={[...BOXES].reverse()} />
        <RankingSection />
      </div>

      <footer className="px-[4%] text-[11px] leading-relaxed text-gray-500">
        <p>
          모든 박스의 확률은 상세 페이지에 공개되며, 획득한 실물 상품은 배송 또는 시세의 80% USDT 환급을 선택할 수
          있습니다. 인증서 번호는 각 상품 항목에서 확인하세요.
        </p>
        <p className="mt-2">© GACHAFLIX. 본 화면은 프로토타입이며 잔액/결제는 모의 데이터입니다.</p>
      </footer>

      <BoxDetailModal />
      <DepositModal />
      <InventoryDrawer />
      <TheaterGacha />
      <TrialSystem />
      <Toasts />
    </main>
  );
}
