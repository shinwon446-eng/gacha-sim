# CLAUDE.md - Global Netflix-Style Mystery Box Platform (BoxFlix)

This document serves as the single source of truth and constitution for Claude Code. All generated code, architecture, and design implementations must strictly adhere to the guidelines specified below.

---

## 1. Project Overview & Core Philosophy

- **Concept**: A high-end, global random mystery box platform featuring a **Netflix-inspired UI/UX**.
- **Core Value**: Cinematic excitement, provably fair transparency, instant liquidity (sell-back), and seamless cross-border UX.
- **Visual Tone**: Deep cinematic dark mode, Netflix red & luxury gold accents, generous spacing, razor-sharp typography, and smooth micro-interactions.
- **Target Markets**: Global (English), Korea (Korean), Greater China (Simplified/Traditional Chinese).
- **Payment Scope**: **USDT (TRC-20, BEP-20)** crypto deposit and **Credit Card** payments only.

---

## 2. Design System & UI/UX Standards (Netflix Emulation)

### Color Palette
- **Background Main**: `#141414` (Netflix Default Dark)
- **Background Surface / Deep**: `#0B0B0B` (Header & Modals)
- **Card Background**: `#181818` (Normal), `#222222` (Card Hover)
- **Brand Accent**: `#E50914` (Netflix Signature Red - primary CTAs)
- **Luxury/Tier Accent**: `#F5C518` (Gold for Mythic/Legendary tiers)
- **Typography Colors**:
  - Primary text: `#FFFFFF` (Pure White, 100% opacity for titles & prices)
  - Secondary text: `#E5E5E5` (High readability white for body)
  - Muted text: `#9CA3AF` (Subtle captions, odds percentages)
  - Border subtle: `rgba(255, 255, 255, 0.1)`

### Typography & Readability
- Font stack: `Pretendard`, `Inter`, -apple-system, sans-serif.
- Headings: Bold/ExtraBold with tight tracking (`tracking-tight`).
- Odds & Pricing: Always displayed with distinct high-contrast pill badges (e.g., `bg-red-950/60 text-red-400 border border-red-500/30`).
- No neon eye-strain effects. Keep animations smooth, subtle, and cinematic.

### Netflix Core UI Components
1. **Sticky Header**:
   - Transparent at top (`bg-transparent`); transitions to blurred solid black (`bg-[#0b0b0b]/90 backdrop-blur-md`) upon scrolling.
   - Left: Logo + Navigation Links (Home, High-Roller, Tech, Luxury, Provably Fair).
   - Right: Language Switcher (KO, EN, ZH), Currency Selector (USDT / USD / KRW), Wallet Balance & Deposit Button, User Avatar.
2. **Billboard Hero Banner**:
   - Takes 60-70vh of the viewport.
   - Cinematic background video/animated visual for the featured mystery box.
   - Huge title, price tag in USDT, prominent red `Open Now` button, and translucent `View Items` button.
3. **Horizontal Row Carousels**:
   - Categories: "Trending Mystery Boxes TOP 10", "Apple & Tech Vault", "Luxury & Streetwear", "Budget Starters".
   - Smooth left/right chevron navigation.
4. **Interactive Hover Card Expansion**:
   - Hovering over a card gently scales it by 1.15x with a smooth spring transition (`scale-110 z-30 transition-all duration-300`).
   - Reveals quick preview of contained items, drop probability tags, and instant action buttons.
5. **Live Drops Ticker**:
   - Real-time animated ticker showing recent unboxing results from live users (avatar, box name, dropped item, item value).

---

## 3. Tech Stack & Recommended Architecture

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript (Strict mode enabled)
- **Styling**: Tailwind CSS v3/v4 + Tailwind Animate
- **Motion & Interactions**: Framer Motion (Roulette unboxing spin, card expansions, modals)
- **Icons**: `lucide-react`
- **Internationalization (i18n)**: `next-intl` (URL routing: `/[locale]/...` for `ko`, `en`, `zh`)
- **Backend & Database**: Next.js Server Actions + Route Handlers, Supabase (PostgreSQL, Supabase Auth, Supabase Realtime)
- **State Management**: Zustand (for wallet balance, cart, unboxing audio/modal states)
- **Data Fetching**: TanStack Query or Server Components

---

## 4. Business Logic & Feature Specifications

### A. Provably Fair (SHA-256 Verification)
- Every unbox outcome must be provably fair and cryptographically deterministic.
- Formula:
  - `Server Seed` (pre-generated and hashed with SHA-256, hash shown before unbox)
  - `Client Seed` (customizable by the user or randomized client-side)
  - `Nonce` (incremental roll counter per box opening)
- Result determination: `HMAC-SHA256(server_seed, client_seed:nonce)`. First 8 hex characters converted to integer modulo 100,000 for precision down to 0.001%.
- Provide a dedicated `/fairness` verification page and modal where users can paste their seeds to verify rolls.

### B. Payment & Wallet System
- **USDT Deposits**:
  - Networks: **TRC-20 (Tron)** and **BEP-20 (Binance Smart Chain)**.
  - Generates unique deposit address per user or uses payment gateway API (e.g. NOWPayments / Cryptomus).
  - Displays QR code (`qrcode.react`), address copy button, minimum deposit limit, and block confirmation counter.
- **Credit Card Deposits**:
  - Global: Stripe Checkout / Stripe Elements.
  - Domestic (KR): PortOne / Toss Payments bridge.
  - Fixed tier buttons: 20 USDT, 50 USDT, 100 USDT, 300 USDT, 500 USDT, Custom amount.

### C. Inventory & Post-Unboxing Actions
- When an item is unboxed, it is stored in `user_inventory` with state `IN_STORAGE`.
- User has two immediate options for every item:
  1. **Instant Sell-Back (Liquidate)**: Sell the item back to the platform instantly for **95% of item value in USDT**, credited directly to user balance.
  2. **Claim Real Delivery**: Request physical delivery. Opens shipping modal requiring recipient name, phone, international postal code, detailed address, and customs ID (for KR/ZH). State changes to `SHIPPING_PENDING`.

---

## 5. Coding & Implementation Rules for Claude Code

1. **Clean Code & Modularity**:
   - Keep components under 150 lines where possible. Separate UI components into `/components/ui`, `/components/netflix`, `/components/unboxing`, `/components/wallet`.
2. **Type Safety**:
   - Zero `any` types. Define comprehensive interfaces for `Box`, `Item`, `User`, `DropHistory`, `ProvablyFairSeed`, `Transaction`.
3. **Accessibility & Usability**:
   - Provide keyboard escape listeners for all modals.
   - Always include subtle sound effects toggle (Mute/Unmute) for unboxing spins and card hovers.
4. **Security**:
   - Never expose server seed plaintext prior to box opening or seed rotation.
   - Protect all balance mutations with database-level transactions or Postgres RPC functions to prevent double-spending or race conditions.

---

## 부록. 현재 코드베이스와의 격차 (2026-09-17 기준, 작업 시 참고)

위 1~5절이 규범이다. 아래는 이 규범을 채택한 시점에 `web/` 에 이미 있던 것과의 차이이며, 각 항목은 규범 쪽으로 옮겨야 한다. 옮기기 전까지는 두 값이 공존하므로 새 코드는 반드시 규범 값을 쓴다.

| 항목 | 규범 | 현재 코드 | 위치 |
|---|---|---|---|
| 프레임워크 | Next.js 15 | Next.js 14.2 | `web/package.json` |
| 브랜드 | BoxFlix | Gachaflix | 헤더·`layout.tsx` metadata |
| 즉시 판매 환급률 | **95%** | 80% (`REFUND_RATE = 0.8`) | `web/lib/types.ts`, `web/lib/products.ts` (가격 역산에 사용) |
| 골드 액센트 | `#F5C518` | `#FFD700` | `web/lib/tiers.ts`, `tailwind.config.ts` `tier.highend` |
| 등급 명칭 | Mythic / Legendary / Rare / Common (Gold·Purple·Blue·Grey) | DREAM / HIGH-END / PRO / STANDARD | `web/lib/tiers.ts`, `web/src/data/gachaItems.ts` (S/A/B/C) |
| 기준 통화 | USDT (USD/KRW 환산 표시) | 박스 데이터가 KRW 정수 | `web/lib/products.ts`, `formatPrice` |
| i18n | `next-intl`, `/[locale]/` 라우팅 | zustand 기반 `lib/i18n.ts`, 라우팅 없음 | `web/lib/i18n.ts` |
| DB·인증·결제 | Supabase, Stripe/PortOne, USDT 웹훅 | 없음 (정적 데모, 잔고는 메모리) | — |
| Provably Fair | HMAC-SHA256(server, client:nonce) | 미구현. `server/rng.ts` 의 `randomBytes` CSPRNG 만 있음 | `web/server/rng.ts` |
| 디렉터리 | `components/ui` `netflix` `unboxing` `wallet` | `components/box` `home` `gacha`, `lib/`, `src/data` | — |
| 배포 | — | GitHub Pages 정적 export, basePath `/gacha-sim` | `web/next.config.mjs`, `.github/workflows/deploy-pages.yml` |

주의: `REFUND_RATE` 를 0.95 로 올리면 `products.ts` 의 무위험 차익 검사(`EV × 환급률 < price`)가 더 빡빡해진다. 환급률을 바꿀 때는 `retailRtp` 밴드 상한(현재 `1/REFUND_RATE`)과 보장 박스 3종의 테이블을 같이 다시 맞춰야 한다.

기존 데이터셋 `web/src/data/gachaItems.ts`(30종, USDT 기준)와 `public/assets/items/*.svg` 는 규범과 통화가 맞으므로 그대로 쓴다.
