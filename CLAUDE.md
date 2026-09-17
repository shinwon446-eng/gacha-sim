# CLAUDE.md - Ultra-Luxury GACHAFLIX (Global Mystery Box Platform)

This document is the absolute single source of truth and constitution for Claude Code. All generated code, UI components, typography, and business architecture must strictly conform to these standards.

---

## 1. Project Identity & Core Philosophy

- **Project Name**: GACHAFLIX (Luxury Edition)
- **Concept**: A high-end luxury mystery box platform merging the **cinematic depth and immersive engagement of Netflix** with the **prestige and elegance of Sotheby's and luxury boutiques (Rolex, Hermes, High-End Tech)**.
- **Core Value**: Zero-tackiness (짜침 0%), frictionless onboarding, guaranteed floor value, provably fair transparency, instant liquidity (95% sell-back), and cross-border UX.
- **Visual Tone**: Deep Obsidian Dark (`#0B0B0B`, `#141414`), Brushed Champagne Gold (`#D4AF37`, `#E6CA65`), Netflix Crimson Red (`#E50914`), Platinum Diamond, Frosted Glassmorphism, and Hairline Metallic Borders.
- **Design Stability Principle (CRITICAL)**:
  - The UI/UX layout, spacing, and micro-interactions remain **rock-solid and fixed**.
  - **Clean Separation of Language & Currency**: Never mix languages or currencies on the same screen. When a user selects a language (KO, EN, ZH) or currency (USDT, USD, KRW), the entire UI cleanly switches to that specific context without clutter.

---

## 2. Typography Golden Ratio & Readability Rules (CRITICAL FIX)

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

## 3. High-Converting Hero Hooking Copy & Visual Standards

### A. 3-Language Cinematic Headline Copy
- **Korean (KO)**:
  - Main: **"영화처럼 열고, 롤렉스를 받다."** (*Cinematic Thrill, Real Luxury.*)
  - Sub: "100% 정품 실물 보장. 마음에 들면 집으로 무료 배송, 마음에 안 들면 95% USDT로 즉시 현금 환전."
- **English (EN)**:
  - Main: **"Cinematic Thrills. Authentic Luxury."**
  - Sub: "100% Authentic Drops. Ship directly to your door, or liquidate instantly for 95% USDT."
- **Chinese (ZH)**:
  - Main: **"如看大片般开箱，劳力士真实发货。"**
  - Sub: "100%正品实物保障。满意即申请包邮发货到家，不满意支持95% USDT即时极速折现。"

### B. Visual Presentation Rules
1. **Floating Hero Pedestal (벨벳 쇼케이스 3D 연출)**:
   - High-value featured items (Rolex, Tesla Cybertruck, RTX 5090) sit on a dark pedestal with a soft radial studio rim-light (`radial-gradient(circle at 50% 60%, rgba(230, 202, 101, 0.15) 0%, transparent 70%)`).
2. **Live Credibility Counters (실시간 누적 지표 카운터)**:
   - Live metrics displayed below the hero banner:
     - 📦 Today's Physical Shipments: `142 items`
     - 💎 Today's Settled USDT Cashouts: `328,450 USDT`
     - 🛡️ Provably Fair Verification Rate: `100.00%`

---

## 4. Frictionless Onboarding & Anti-Drop Flows (3대 진입장벽 파괴)

### A. 1-Second Free Demo Mode (노가입 가상 체험 모드)
- On the billboard banner, place `[무료 체험해보기 (Free Demo)]` alongside `[지금 오픈하기]`.
- Allows skeptical new visitors to experience the thrilling unboxing roulette without logging in or spending money.
- Win popup: "Congratulations! You simulated Rolex Submariner (1,200x). Open real boxes with your 5 USDT welcome bonus! [Claim & Open Real Box]".

### B. 3-Step Interactive Visual Guide Strip (3초 이해 가이드)
- Fixed right below the hero billboard:
  ```
  [Step 1. 명품 박스 선택] ➔ [Step 2. 100% 공정 언박싱] ➔ [Step 3. 집으로 배송 or 95% 즉시 환전]
  ```
- Instant clarity on how the platform operates in under 5 seconds.

### C. Guaranteed Floor Value Badge (100% 꽝 없음 보장)
- Every box card prominently shows: `[100% 꽝 없음 · 최소 ₩39,000 상당 보장]`.
- Eliminates loss aversion anxiety.

---

## 5. Trust & Verification Architecture (직관적 신뢰 시스템)

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

## 부록 A. 이전 판에서 계승되는 규범 (v2 → v3)

v3 본문이 다루지 않는 항목은 v2 규범을 그대로 유지한다. 코드가 이미 이 값으로 구현되어 있다.

- **색·표면 토큰**: obsidian `#0B0B0B` / canvas `#141414` / surface `#181818` / elevated `#222222`, champagne `#E6CA65` / metallic `#D4AF37` / dark gold `#A27B1E`, crimson `#E50914`.
- **등급**: ROYAL `#E6CA65`(20x+) / PRESTIGE `#93C5FD`(6~20x) / EXECUTIVE `#C084FC`(2~6x) / CURATED `#94A3B8`(기본 보장). 배수 = 실판매가 ÷ 오픈 가격 (`web/lib/tiers.ts`).
- **헤어라인 메탈릭 보더·페데스탈 림라이트·1.12x 틸트 호버·오버사이즈 순위 숫자**: `globals.css` 유틸(`.border-metallic-*`, `.pedestal-glow`, `.rank-numeral`)과 `BoxCard`.
- **Provably Fair**: `HMAC-SHA256(serverSeed, "clientSeed:nonce")` 앞 8 hex → `mod 1,000,000`. (규범 [0, 99999]보다 해상도를 높인 이유: 0.0004% 구간이 0칸이 되는 것을 막기 위함.)
- **경제 불변식** (`web/lib/products.ts`, 모듈 로드 시 위반하면 throw): 가격 = `prettyCeil(EV / retailRtp)`, `EV × REFUND_RATE < price`, `retailRtp < 1/REFUND_RATE`, 보장 박스는 `guaranteedMin ≥ price` 이자 `guaranteedMin × REFUND_RATE < price`. `REFUND_RATE = 0.95`.
- **i18n / 통화**: `next-intl` 정적 라우팅 `app/[locale]/` (ko/en/zh), 메시지는 `scripts/gen-messages.py`가 생성하며 테스트가 3개 국어 키 집합·혼용 0건을 강제. 단일 통화 표기는 `formatCurrency` / `<Money>` 만 사용.
- **배포**: GitHub Pages 정적 export(basePath `/gacha-sim`, 브랜치 `feat/netflix-gacha-web`). 미들웨어·API 라우트 없음. 로그인·DB·PG·핫월렛은 없으며 클라이언트 모의(mock)로 흐름만 재현하고 화면에 "데모"임을 명시한다.

## 부록 B. v3 규범 대비 현재 코드베이스 격차 (2026-09-17)

| v3 항목 | 상태 | 위치 / 비고 |
|---|---|---|
| §2 숫자·통화 단위 분리 타이포 | ✅ 완료 | `components/ui/Money.tsx`, `splitCurrency` — 보관함·헤더·룰렛 팝업 적용. 홈 히어로/카드 가격은 아직 `fmt()` 단일 문자열 |
| §3-A 3개 국어 히어로 헤드라인·서브 카피 | ❌ | `BillboardHero` — 현재 박스 tagline 노출 |
| §3-B-1 플로팅 페데스탈 림라이트 | ✅ 부분 | `.pedestal-glow` 적용, "공중 부양 3D" 연출은 없음 |
| §3-B-2 실시간 신뢰 지표 카운터 | ❌ | 홈 |
| §4-A 노가입 무료 체험 데모 | ❌ | 룰렛 엔진(`UnboxingRoulette`) 재사용 가능. 잔액 차감 없는 데모 모드 + 전환 팝업 필요 |
| §4-B 3-Step 안심 가이드 스트립 | ❌ | 홈 |
| §4-C "100% 꽝 없음 · 최소 ₩N 보장" 뱃지 | ✅ 부분 | `BoxCard` 에 "Min ₩…" 표기 있음. 문구·고대비 스타일 미반영 |
| §5-A 3-Step 1-Click 비주얼 검증기 | ❌ | `/fairness` 는 hex 입력형 검증기. 타임라인 UI 신설 + 전문가 토글로 이동 |
| §5-B 실지급/실배송 라이브 피드, §5-B-3 지급 준비금 | ❌ | 백엔드 없음 → **모의 피드**. 익스플로러 링크는 실제 존재하지 않는 txHash 를 가리키게 되므로 "데모 데이터" 라벨 필수 |
| §6-A USDT 입금 | ✅ 완료 | `UsdtDepositTab` (TRC-20/BEP-20, QR, 복사, 컨펌 인디케이터, 모의 웹훅) |
| §6-B 출금 + 온체인 링크 | ✅ 부분 | `WithdrawalModal` (수수료·주소 검증·MAX·계산기·PENDING→PROCESSING). **BROADCASTING 상태명·TxID·TronScan/BscScan 링크 없음** |
| §7-A 데일리 무료 상자 | ❌ | 로그인 없음 → 브라우저 단위 24h 타이머로 대체 |
| §7-B 커뮤니티 후기 월 | ❌ | `/community` 신설, 업로드 백엔드 없음 → 모의 갤러리 |
| §8 보관함 표준 | ✅ 완료 | 압축 배너·출금/일괄판매 CTA·전체선택·플로팅 바·정렬·빈 화면 TOP 3·배송 추적 모달 |
| 95% 즉시 환전 | ✅ 완료 | `REFUND_RATE = 0.95`, 박스 데이터 재조정 완료 |

**PROMPTS.md 진행 순서**: [프롬프트 2]는 온체인 링크·BROADCASTING 상태·택배사 추적 링크만 남았다. [프롬프트 1] → [2 잔여] → [3] → [4] 순으로 진행한다.
