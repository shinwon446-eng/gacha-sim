# CLAUDE.md - Ultra-Luxury GACHAFLIX (Global Mystery Box Platform)

This document is the absolute single source of truth and constitution for Claude Code. All generated code, UI components, typography, layout hierarchy, and business architecture must strictly conform to these standards.

---

## 1. Project Identity & Core Philosophy

- **Project Name**: GACHAFLIX (Luxury Edition)
- **Concept**: A high-end luxury mystery box platform merging the **cinematic depth of Netflix** with the **prestige and elegance of Sotheby's and luxury boutiques (Rolex, Hermes, High-End Tech)**.
- **Core Value**: Zero-tackiness (짜침 0%), frictionless onboarding, guaranteed floor value, provably fair transparency, instant liquidity (95% sell-back), and cross-border UX.
- **Visual Tone**: Deep Obsidian Dark (`#0B0B0B`, `#141414`), Brushed Champagne Gold (`#D4AF37`, `#E6CA65`), Netflix Crimson Red (`#E50914`), Platinum Diamond, Frosted Glassmorphism, and Hairline Metallic Borders.
- **Design Stability Principle (CRITICAL)**:
  - The UI/UX layout, spacing, and micro-interactions remain **rock-solid and fixed**.
  - **Clean Separation of Language & Currency**: Never mix languages or currencies on the same screen. When a user selects a language (KO, EN, ZH) or currency (USDT, USD, KRW), the entire UI cleanly switches to that specific context without clutter.

---

## 2. Main Page Layout Hierarchy & Conversion Architecture (CRITICAL UPDATE)

To prevent cognitive overload and maximize conversion rates, the main homepage must follow the **"Product-First & Social Proof"** layout hierarchy:

```
[ 1. Top Bar: Live Drops & Payout Ticker ]
  └─ Real-time animated stream: "user***21 unboxed Rolex Submariner (3s ago)" | "crypto*** withdrew 150 USDT (8s ago)"

[ 2. Hero Billboard (Streamlined & Visually Striking) ]
  ├─ Left: Single prestige badge, H1, 1-line sub-copy, compact price pill, and 2 CTA buttons:
  │        [지금 오픈하기 (Red)]  [무료 체험해보기 (Gold Outline)]
  └─ Right: Floating 3D Luxury Pedestal with brilliant studio rim-lighting (NOT buried in murky dark shadows).

[ 3. Primary Mystery Box Carousels (IMMEDIATE PRODUCT EXPOSURE) ]
  ├─ "🔥 지금 가장 많이 열리는 박스 TOP 10" (Netflix 1, 2, 3 outlined numerals)
  └─ Compact cards by default; sub-items and odds bar unfold smoothly ONLY on Hover.

[ 4. Reassurance & Social Proof Section (Positioned AFTER the first box row) ]
  ├─ 3-Step Interactive Visual Guide: [1. 박스 선택 ➔ 2. 공정 오픈 ➔ 3. 무료 배송 or 95% 환전]
  └─ Live Credibility Counters: Today's Shipments (142) | Settled USDT ($328,450) | Fairness Rate (100%)

[ 5. Secondary Curated Carousels ]
  └─ "💎 럭셔리 워치 & 하이엔드", "⚡ 애플 & 차세대 게이밍 기어", "🎯 초보자 가성비 보장 박스"
```

---

## 3. Card Anatomy: True Netflix Hover Expansion

- **Default State (Compact & Clean)**:
  - 16:9 or 4:5 luxury box artwork.
  - Box Title (single line, truncate).
  - Price in golden ratio (`58.00 USDT`) + Max Multiplier tag (`1650배`).
  - Subtle `100% 꽝 없음` micro-badge.
  - **DO NOT display long sub-item lists by default**, which makes cards vertically bloated.
- **Hover State (Framer Motion Expansion)**:
  - Smooth 1.15x scale elevation + 3D tilt tracking cursor.
  - Reveals the 3px tier probability progress bar.
  - Unfolds the 3 featured luxury item thumbnails with individual prices.
  - Shows quick action buttons: `[바로 열기]` and `[상세 정보]`.

---

## 4. Typography Golden Ratio & Readability Rules

### Number vs. Currency Ticker Separation Rule
**NEVER combine the number and currency ticker in one monolithic giant string** (e.g., `text-5xl: 0.00 USDT` is strictly prohibited).
Large amounts in KRW (e.g., `₩1,350,000`) or decimals in USDT must never break layouts or wrap awkwardly.

**Mandatory Implementation Pattern**:
```html
<!-- Golden Ratio Currency Display -->
<div class="flex items-baseline gap-1.5 whitespace-nowrap">
  <span class="text-gold-gradient font-display text-2xl md:text-3xl font-bold tabular-nums tracking-tight">
    {formattedAmount}
  </span>
  <span class="text-xs md:text-sm font-semibold uppercase tracking-wider text-neutral-400">
    {currencyTicker}
  </span>
</div>
```
- Numeric part: `text-2xl md:text-3xl font-bold tabular-nums tracking-tight`
- Currency ticker / symbol: `text-xs md:text-sm font-semibold text-neutral-400` aligned to the baseline.

---

## 5. Trust, Payout & Verification Architecture

### A. 3-Step 1-Click Visual Verifier (수학 없는 1초 비주얼 검증기)
- Located on every unboxing result and inventory card: `[🛡️ 공정성 1초 검증]`.
- Visual animation timeline:
  1. **Step 1: 🔒 Pre-Committed Hash**: Pre-generated SHA-256 hash proves the server could not alter the outcome.
  2. **Step 2: 🎲 Client Seed Entropy**: Combined with the user's browser seed to produce deterministic roll number `[14,291]`.
  3. **Step 3: 🎯 Bracket Match**: Visual gauge bar showing the roll landed precisely inside the target tier.

### B. Live Proof of Payout & Delivery Feed (실지급 & 실배송 라이브 인증)
Featured on `/fairness` and the Homepage:
1. **USDT Cashouts (Proof of Payment)**:
   - Clickable on-chain explorer link:
     - **TRC-20**: `https://tronscan.org/#/transaction/{txHash}`
     - **BEP-20**: `https://bscscan.com/tx/{txHash}`
2. **Physical Shipments (Proof of Delivery)**:
   - Masked recipient info + clickable real-time courier tracking links (우체국택배, CJ대한통운, DHL, FedEx).
3. **Proof of Reserves (지급 준비금 투명 공개)**:
   - "GACHAFLIX maintains over 500,000 USDT in liquid payout reserves." Directly links to platform's public cold/hot wallet on TronScan.

---

## 6. Wallet Architecture: Deposit & Withdrawal with Explorer Links

### A. USDT Deposit
- Networks: **TRC-20 (Tron)** and **BEP-20 (BSC)** with QR code and 1-click address copy.

### B. USDT Withdrawal with On-Chain Links (MANDATORY)
- Networks: TRC-20 (1.00 USDT fee) / BEP-20 (0.80 USDT fee).
- Address syntax validation ('T' for Tron, '0x' for BSC).
- Live calculator: `Amount - Fee = Net Received USDT`.
- Status: `PENDING` ➔ `BROADCASTING` ➔ `COMPLETED`.
- Direct clickable TronScan / BscScan TxID links provided upon broadcasting.

---

## 7. Retention & Community Growth Flows

### A. Daily Free Box (일일 무료 상자)
- 24-hour timer. Open for free to win 0.1 ~ 1.0 USDT credited directly to balance.
- Experiences frictionless UX with zero personal financial risk.

### B. Community Unboxing Proof Wall (실물 수령 포토 후기 & $10 보너스)
- Dedicated `/community` feed.
- Users who receive real goods upload unboxing photos/videos and receive **10 USDT bonus reward**.

---

## 8. Inventory & Liquidation Standards

- Compact My Vault banner with golden ratio typography and `[Withdraw]` / `[Batch Sell-Back]` CTAs.
- Multi-item checkbox selection + sticky floating bar (`Selected N items -> 95% Instant Sell-Back`).
- Sort Dropdown: Newest / Highest Value / Lowest Value.
- Empty State shows top 3 trending mystery box recommendations.

---

## 부록 A. 이전 판에서 계승되는 규범 (v2/v3 → v4)

v4 본문이 다루지 않는 항목은 이전 규범을 그대로 유지한다. 코드가 이미 이 값으로 구현되어 있다.

- **색·표면 토큰**: obsidian `#0B0B0B` / canvas `#141414` / surface `#181818` / elevated `#222222`, champagne `#E6CA65` / metallic `#D4AF37` / dark gold `#A27B1E`, crimson `#E50914`.
- **등급**: ROYAL `#E6CA65`(20x+) / PRESTIGE `#93C5FD`(6~20x) / EXECUTIVE `#C084FC`(2~6x) / CURATED `#94A3B8`(기본 보장). 배수 = 실판매가 ÷ 오픈 가격 (`web/lib/tiers.ts`).
- **v3 §3-A 3개 국어 히어로 카피·§3-B 림라이트/신뢰 카운터·§4 온보딩(무료 체험·3-Step·꽝 없음 뱃지)**: v4 §2 계층에 그대로 들어간다 — 위치만 바뀐다.
- **헤어라인 메탈릭 보더·페데스탈 림라이트·오버사이즈 순위 숫자**: `globals.css` 유틸(`.border-metallic-*`, `.pedestal-glow(-strong)`, `.pedestal-shadow`, `.rank-numeral`).
- **Provably Fair**: `HMAC-SHA256(serverSeed, "clientSeed:nonce")` 앞 8 hex → `mod 1,000,000`. (규범 [0, 99999]보다 해상도를 높인 이유: 0.0004% 구간이 0칸이 되는 것을 막기 위함.)
- **경제 불변식** (`web/lib/products.ts`, 모듈 로드 시 위반하면 throw): 가격 = `prettyCeil(EV / retailRtp)`, `EV × REFUND_RATE < price`, `retailRtp < 1/REFUND_RATE`, 보장 박스는 `guaranteedMin ≥ price` 이자 `guaranteedMin × REFUND_RATE < price`. `REFUND_RATE = 0.95`.
- **i18n / 통화**: `next-intl` 정적 라우팅 `app/[locale]/` (ko/en/zh), 메시지는 `scripts/gen-messages.py`가 생성(`npx tsx scripts/dump-products.ts` 선행)하며 테스트가 3개 국어 키 집합·혼용 0건을 강제. 단일 통화 표기는 `formatCurrency` / `<Money>` 만 사용.
- **배포**: GitHub Pages 정적 export(basePath `/gacha-sim`, 브랜치 `feat/netflix-gacha-web`). 미들웨어·API 라우트 없음. 로그인·DB·PG·핫월렛·물류 웹훅은 없으며 클라이언트 모의(mock)로 흐름만 재현하고 화면에 "데모"임을 명시한다. 모의 TxID·운송장·리저브 주소는 형식만 맞고 실제 조회되지 않는다.

## 부록 B. v4 규범 대비 현재 코드베이스 상태 (2026-09-18)

| v4 항목 | 상태 | 위치 |
|---|---|---|
| §2-1 라이브 드랍 티커 | ✅ (모의) | `components/home/LiveTicker.tsx`, `lib/liveDrops.ts` |
| §2-2 히어로 다이어트 · 마스킹 제거 | ✅ | `components/home/BillboardHero.tsx` |
| §2-3~5 상품 우선 순서 · 보조 캐러셀 명칭 | ✅ | `app/[locale]/page.tsx`, `rows.*` 메시지 |
| §3 카드 콤팩트 + 호버 1.15x 확장 | ✅ | `components/box/BoxCard.tsx` |
| §4 숫자·통화 분리 타이포 | ✅ | `components/ui/Money.tsx` |
| §5-A 3-Step 비주얼 검증기 | ✅ | `components/fairness/VisualVerifier.tsx` (`/fairness`). 룰렛 팝업·보관함 카드의 [검증] 버튼은 hex 모달(`FairnessModal`) |
| §5-B 실지급/실배송 피드 · 준비금 | ✅ (모의) | `components/fairness/ProofFeed.tsx`, `lib/proofFeed.ts` |
| §6 입금 / 출금(BROADCASTING · TxID · 익스플로러) | ✅ (모의) | `components/wallet/*`, `lib/withdrawal.ts` |
| §7-A 데일리 무료 상자 | ✅ (브라우저 단위 24h) | `components/home/DailyFreeBox.tsx`, `lib/dailyBox.ts`, `stores/dailyStore.ts` |
| §7-B `/community` 후기 월 · 10 USDT 보너스 | ✅ (로컬 저장) | `app/[locale]/community/page.tsx`, `lib/community.ts`, `stores/communityStore.ts` |
| §8 보관함 표준 | ✅ | `app/[locale]/inventory/page.tsx` |

PROMPTS.md 1~4 전부 반영 완료. 남은 것은 백엔드(계정·DB·PG·핫월렛·물류 웹훅·업로드 스토리지)로, 모의 모듈(`lib/liveDrops`, `lib/proofFeed`, `lib/community`, `lib/carriers`·`lib/withdrawal` 의 mock*)을 API 로 교체하면 된다.
