# GACHAFLIX — 시네마틱 실물 릴 (프로토타입)

브루탈리스트 다크 시네마틱 UI 위에 USDT/카드 결제 기반 실물 릴 로직을 얹은 Next.js 프로토타입입니다.
잔액·결제·온체인 동기화는 전부 **모의(Mock)** 이며 실제 자금 이동은 없습니다.

상품 비주얼에 이모지를 사용하지 않습니다. 모든 항목은 애셋 코드(`CT-01`, `RLX-D` 등)를 `AssetPlate` 로 렌더합니다.
UI 카피는 `lib/i18n.ts` 사전을 통해서만 렌더하며, 이모지와 과장 마케팅 표현을 금지합니다.

## 실행

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # 프로덕션 빌드 (TypeScript 검사 포함)
```

## 구조

| 경로 | 역할 |
|---|---|
| `store/useGachaStore.ts` | Zustand 스토어 — 잔액, 인벤토리, `openBox`, `refundItem`(80%), `shipItem`, `deposit` |
| `lib/catalog.ts` | 상품 데이터 단일 원천 (3개 시리즈, EN/ZH 상품명, 확률표, 최저 보장가) |
| `lib/data.ts` | 카탈로그 → 앱 모델 어댑터 (라인업·톤 파생) |
| `lib/i18n.ts` | KO/EN/ZH 카피 사전 + 로케일 스토어 |
| `lib/rng.ts` | 라인업/아이템 확률 계산 |
| `lib/config.ts` | 신뢰 티커 문구, 데모 피드, 입금 주소 (**출시 전 교체 필요**) |
| `lib/audio.ts` | Web Audio API 효과음 (타-덤, 릴 틱, 당첨) |
| `components/Navbar.tsx` | 스크롤 시 투명 → 솔리드 블랙 GNB, 실시간 잔액 |
| `components/TrustTicker.tsx` | 상단 롤링 티커 (신뢰 문구 + 당첨 이벤트) |
| `components/HeroBillboard.tsx` | 85vh 빌보드, 1회/10연속/무료 체험 버튼 |
| `components/ContentRow.tsx` + `BoxCard.tsx` | 슬라이더 + 가장자리 보정 호버 익스팬션 (origin-left/right, z-50) |
| `components/BoxDetailModal.tsx` | 에피소드 상세 모달 → 구성품/확률표, 언박싱 로그 |
| `components/DepositModal.tsx` | USDT(QR/주소) · 카드(PSP 위젯 자리) 듀얼 결제 |
| `components/TheaterGacha.tsx` | 암전 → 릴 스핀 → 파티클/카메라 셰이크 → [배송 / 80% 환급] |
| `components/InventoryDrawer.tsx` | 보관함 (배송/환급) |

## 부스터 & 게스트 무료체험 아키텍처

```bash
npm run dev     # API 라우트 포함 (서버에서 확률 계산)
npm test        # 엔진·카탈로그·카피 사전 테스트 19건
```

| 경로 | 역할 |
|---|---|
| `lib/engine.ts` | 확률·pity·멤버십 배율 순수 로직 (서버/폴백 공용). `runPulls` 가 상태 머신 |
| `server/rng.ts` | CSPRNG 난수 (`Math.random` 미사용) |
| `server/state.ts` | 인메모리 세션/게스트 기록 — **프로덕션은 Redis로 교체** |
| `app/api/gacha/open/route.ts` | 뽑기 API. 응답은 당첨 아이템 + `pityCount` + `boosterTriggered` 만 |
| `app/api/guest/demo/route.ts` | 게스트 1회 체험 세션. HttpOnly 쿠키 + IP×fingerprint 이중 차단, 초과 시 429. 상품을 지급하지 않는다 |
| `lib/fingerprint.ts` | Canvas/WebGL 지문 SHA-256 (해시만 전송) |
| `lib/gateway.ts` | API 호출 / 정적 데모 폴백 분기 |
| `components/BoosterGauge.tsx` | 10칸 게이지, BOOST ON 배지, 확률 변환 표기 |
| `components/AssetPlate.tsx` | 애셋 코드 플레이트 — 모든 상품 비주얼의 단일 프리미티브 |
| `components/GuestDemoModal.tsx` | 02:59 카운트다운, 3단계 인센티브, 이탈 방지 |

- **부스터**: pity 가 10에 도달하면 그 다음 재생에 [ORIGINALS] 라인 가중치 5배를 적용한 뒤 0으로 리셋합니다. 가중치를 5배 해도 분모가 함께 커지므로 **확률 배율은 5배 미만**이며, UI 는 배수로 표기하지 않고 기본/부스터 확률을 나란히 표기합니다.
- **정적 데모 한계**: GitHub Pages 배포본에는 서버가 없어 확률 계산이 클라이언트에서 실행되고, 게스트 체험 차단이 `localStorage` 뿐입니다. 실제 서비스는 반드시 서버 배포(`npm start` 또는 Vercel 등)로 운영하세요.
- **이탈 방지 문구**: `EXIT_SOCIAL_PROOF` 의 가입자 수는 실측 데이터가 아니므로 `isDemo: true` 로 DEMO 태그가 붙습니다. 실제 수치 연동 전까지 사실처럼 표기하지 마세요(표시광고법).
- **소셜 로그인**: 실제 OAuth 미연동 — 버튼 클릭 시 모의 가입으로 동작합니다.

## 출시 전 반드시 확인

- `lib/config.ts`의 `TRUST_MESSAGES`, `DEPOSIT_ADDRESSES`는 자리 표시자입니다. 검증 가능한 실제 링크/주소로 교체하세요. 실존 감사기관·투자사 명칭을 사실과 다르게 표기하면 허위 광고에 해당합니다.
- `SHOW_DEMO_FEED = false`로 두고 실제 이벤트만 사용하세요. 데모 피드는 UI에 `DEMO` 태그가 붙습니다.
- 카드 결제는 클라이언트에서 카드 정보를 다루지 않고 PSP(MoonPay/Stripe) 위젯을 마운트하는 구조입니다.
- 실물 상품의 USDT 환급(환전) 구조는 관할 지역에 따라 사행행위 규제 대상이 될 수 있으므로 법률 검토가 필요합니다.
