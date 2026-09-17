# CLAUDE.md - Ultra-Luxury GACHAFLIX (Global Mystery Box Platform)

This document is the master specification and rulebook for Claude Code. All generated code, UI components, and business architecture must strictly conform to these standards.

---

## 1. Project Identity & Aesthetic Vision

- **Project Name**: GACHAFLIX (Luxury Edition)
- **Concept**: A high-end luxury mystery box platform bridging the **cinematic depth of Netflix** with the **prestige and elegance of Sotheby's and luxury boutiques (Rolex, Hermes, High-end Tech)**.
- **Visual Tone**: Deep Obsidian Dark (`#0B0B0B`, `#141414`), Brushed Champagne Gold (`#D4AF37`, `#E6CA65`), Royal Crimson (`#E50914`), Frosted Glassmorphism, and Hairline Metallic Borders.
- **Design Stability Principle (CRITICAL)**:
  - The UI/UX layout, spacing, and micro-interactions remain **rock-solid and fixed**.
  - **Clean Separation of Language & Currency**: Never mix languages or currencies on the same screen. When a user selects a language (KO, EN, ZH) or currency (USDT, USD, KRW), the entire UI cleanly switches to that specific context without clutter.

---

## 2. Design System & Luxury UI/UX Specifications

### A. Color System
```css
/* Backgrounds */
--bg-obsidian: #0B0B0B;       /* Deepest background, header & modal overlays */
--bg-canvas: #141414;         /* Netflix signature canvas */
--bg-surface: #181818;        /* Card surface */
--bg-surface-elevated: #222222; /* Hovered / active card surface */

/* Metallic & Luxury Accents */
--gold-champagne: #E6CA65;    /* Primary luxury gold for Mythic/Royal tiers */
--gold-dark: #A27B1E;         /* Deep gold shadow / border gradient */
--crimson-netflix: #E50914;   /* Brand CTA & highlight accent */
--platinum-ice: #E5E4E2;      /* Prestige tier silver/ice */
--bronze-executive: #C5A059;  /* Executive tier */

/* High-Contrast Readability Text */
--text-primary: #FFFFFF;      /* 100% pure white for titles & key metrics */
--text-secondary: #E5E5E5;    /* 90% white for readable body text */
--text-muted: #9CA3AF;        /* Clean cool grey for captions */
--text-faint: #6B7280;        /* Subtle metadata & legal text */
```

### B. Luxury Styling Rules
1. **Hairline Metallic Borders**:
   - Replace flat grey borders with delicate metallic border gradients:
     `border: 1px solid rgba(255, 255, 255, 0.08);` with a top highlight `box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12);`
   - For Royal/Mythic cards, use champagne gold hairline borders:
     `border: 1px solid rgba(212, 175, 55, 0.4); box-shadow: 0 0 20px rgba(212, 175, 55, 0.15);`
2. **Pedestal Rim Lighting (스튜디오 조명 연출)**:
   - All high-value items (Tesla, Rolex, RTX 5090, Vision Pro) must sit on a subtle radial vignette glow (`radial-gradient(circle at 50% 60%, rgba(212, 175, 55, 0.15) 0%, transparent 70%)`).
3. **Card Micro-Interactions**:
   - On hover: 1.12x smooth scale, z-index elevation, subtle 5-degree 3D tilt tracking mouse coordinates, and an ultra-subtle diagonal light sheen (holographic shimmer) sweeping across the card.
   - Hover reveals the smooth 3px tier breakdown probability bar and quick preview of top items.
4. **Netflix Oversized Ranking Numerals**:
   - In row carousels, outline numerals (1, 2, 3...) positioned behind the cards with metallic stroke:
     `-webkit-text-stroke: 2px #333333; font-size: 8.5rem; line-height: 0.72;`

---

## 3. Prestige Tier Classification

Replace generic gaming terms with sophisticated luxury tiers:

| Tier Name | Accent Color | Odds Color Token | Multiplier Target |
| :--- | :--- | :--- | :--- |
| 👑 **ROYAL (로열)** | Champagne Gold (`#E6CA65`) | `gold-gradient` with soft glow | 20x+ of box price |
| 💎 **PRESTIGE (프레스티지)** | Platinum Diamond (`#93C5FD`) | `ice-blue` metallic | 6x ~ 20x |
| ⚜️ **EXECUTIVE (이그제큐티브)** | Royal Amethyst (`#C084FC`) | `purple` sheen | 2x ~ 6x |
| 🏷️ **CURATED (큐레이티드)** | Titanium Grey (`#94A3B8`) | `slate` hairline | Guaranteed base value |

---

## 4. Multi-Language & Currency Architecture (Clean Decoupling)

### Zero Clutter Rule:
- **Language**: English (`en`), Korean (`ko`), Chinese (`zh-CN`).
  - When Korean is selected: 100% pure Korean throughout all labels, buttons, and legal disclaimers.
  - When English is selected: 100% natural international English.
  - When Chinese is selected: 100% authentic Chinese mystery box (盲盒) terminology.
- **Currency**: USDT, USD ($), KRW (₩).
  - Selected currency governs ALL monetary displays platform-wide.
  - **No dual/mixed currency clutter**: If USDT is active, show `80.00 USDT`. If KRW is active, show `₩80,000`. If USD is active, show `$80.00`.
  - Switching is instant via a dedicated top-bar control.

---

## 5. Core Business & Payment Specifications

### A. USDT & Credit Card Payments Only
1. **USDT Crypto Deposit**:
   - **Networks**: TRC-20 (Tron, lowest fees) and BEP-20 (BSC).
   - Instant address generation, QR code (`qrcode.react`), one-click clipboard copy, and block confirmation indicator.
2. **Credit Card Gateway**:
   - Clean luxury modal with fixed deposit tiers (20, 50, 100, 300, 500 in selected currency) + custom input.
   - Stripe / PortOne integration bridge.

### B. Provably Fair (SHA-256)
- **Equation**: `HMAC-SHA256(ServerSeed, ClientSeed:Nonce)` mapped to integer [0, 99999].
- Unalterable transparency: Server seed hash published prior to opening. Dedicated verification tool (`/fairness`) allows players to independently reproduce any drop.

### C. Post-Unbox Liquidity: 95% Instant Sell-Back & Global Shipping
- **Instant Sell-Back**: One-click liquidation back to the account balance at **95% fair market value** (or 80% as configured per box tier).
- **Physical Shipping**: Global shipping form supporting international postal codes, recipient information, and customs clearance codes (PCCC for KR, Resident ID for ZH).

---

## 6. Claude Code Technical Guidelines

- **Framework**: Next.js 15 (App Router), TypeScript, Tailwind CSS, Framer Motion, Lucide React.
- **State**: Zustand store with persistence for `currencyStore` (`currency: 'USDT' | 'USD' | 'KRW'`) and `locale`.
- **Code Standards**:
  - Keep components modular and reusable.
  - Strict TypeScript types for all items, odds, boxes, and transactions.
  - No messy inline CSS; use Tailwind semantic classes and utility layers.

---

## 부록. 현재 코드베이스와의 격차 (2026-09-17 기준)

위 1~6절이 규범이다. 이 판은 기존 `gacha-sim` 프로토타입의 레이아웃(빌보드 히어로 · 1/2/3 넘버링 · 호버 확률 바 · 배수 기반 등급)을 계승하므로 구조는 그대로 두고 아래만 규범으로 옮긴다. 옮기기 전까지 새 코드는 반드시 규범 값을 쓴다.

| 항목 | 규범 | 현재 코드 | 위치 |
|---|---|---|---|
| 등급 명칭·색 | ROYAL `#E6CA65` / PRESTIGE `#93C5FD` / EXECUTIVE `#C084FC` / CURATED `#94A3B8` | DREAM `#FF4655` / HIGH-END `#FFD700` / PRO `#00D2FF` / STANDARD `#A0AEC0` — **배수 구간(20x+ / 6~20x / 2~6x / 나머지)은 이미 일치** | `web/lib/tiers.ts`, `tailwind.config.ts` `tier.*`, `web/src/data/gachaItems.ts`(S/A/B/C) |
| 배경·표면 토큰 | obsidian `#0B0B0B`, surface `#181818`, elevated `#222222` | canvas `#141414` ✓, surface `#1F1F1F`, elevation `#282828` | `tailwind.config.ts` |
| 골드 계열 토큰 | champagne `#E6CA65`, metallic `#D4AF37`, dark `#A27B1E`, platinum-ice, bronze-executive | 없음 | `tailwind.config.ts` |
| 보더 | 메탈릭 헤어라인(`rgba(255,255,255,0.08)` + inset 상단 하이라이트), ROYAL 은 골드 헤어라인 | `border-line #2A2A2A`, `hairline` 토큰은 있으나 미사용 | `globals.css` 유틸 신설 필요 |
| 호버 | 1.12x + 마우스 3D 틸트 + 홀로그램 샤인 | 1.08x(BoxCard) / 1.32x(구), 틸트·샤인 없음 | `web/components/box/BoxCard.tsx` |
| 통화 | 단일 통화 표시(USDT 기본 / USD / KRW), zustand persist | 박스 데이터 KRW 정수 고정, `formatPrice` 원화 전용. `gachaItems.ts` 는 USDT | `web/lib/products.ts`, `web/lib/format.ts` |
| i18n | `next-intl`, ko/en/zh-CN 완전 분리 | zustand 기반 `lib/i18n.ts`, 라우팅 없음, 화면에 한/영 혼재 | `web/lib/i18n.ts`, 각 컴포넌트 카피 |
| 환급률 | 95% (박스별 80% 허용) | 95% (`REFUND_RATE`) — 정가 환원율 상한 1/0.95≈1.0526, 보장 박스는 최저가≈가격 | `web/lib/types.ts`, `web/lib/products.ts` |
| Provably Fair | HMAC-SHA256(Server, Client:Nonce) → [0, 99999] | 미구현. `server/rng.ts` CSPRNG 만 | `web/server/rng.ts` |
| 결제·DB | USDT TRC-20/BEP-20 + Stripe/PortOne, Supabase | 없음 (정적 데모) | — |
| 프레임워크 | Next.js 15 | Next.js 14.2 | `web/package.json` |
| 인라인 CSS | "No messy inline CSS" | 최근 컴포넌트가 인라인 스타일 다수 사용(임의값 회피 목적) | `BoxCard.tsx`, `ProductArt.tsx` 등 — 토큰·유틸로 흡수 |

배포는 GitHub Pages 정적 export(basePath `/gacha-sim`)이며 규범에 언급이 없다. 결제·DB 단계 전까지 유지한다.
