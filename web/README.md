# GACHAFLIX — 시네마틱 실물 가챠 (프로토타입)

넷플릭스 다크 시네마틱 UI 위에 USDT/카드 결제 기반 실물 가챠 로직을 얹은 Next.js 프로토타입입니다.
잔액·결제·온체인 동기화는 전부 **모의(Mock)** 이며 실제 자금 이동은 없습니다.

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
| `lib/data.ts` | 박스/아이템 카탈로그, 티어·가중치·시세·인증서 |
| `lib/rng.ts` | 가중치 추첨, 티어/아이템 확률 계산 |
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
npm test        # 엔진 단위/통계 테스트 8건
```

| 경로 | 역할 |
|---|---|
| `lib/engine.ts` | 확률·pity·티어 순수 로직 (서버/폴백 공용). `runPulls` 가 상태 머신 |
| `server/rng.ts` | CSPRNG 난수 (`Math.random` 미사용) |
| `server/state.ts` | 인메모리 세션/게스트 기록 — **프로덕션은 Redis로 교체** |
| `app/api/gacha/open/route.ts` | 뽑기 API. 응답은 당첨 아이템 + `pityCount` + `boosterTriggered` 만 |
| `app/api/guest/trial/route.ts` | 게스트 1회 체험. HttpOnly 쿠키 + IP×fingerprint 이중 차단 → 429 |
| `lib/fingerprint.ts` | Canvas/WebGL 지문 SHA-256 (해시만 전송) |
| `lib/gateway.ts` | API 호출 / 정적 데모 폴백 분기 |
| `components/BoosterGauge.tsx` | 10칸 게이지, BOOST ON 배지, 확률 변환 표기 |
| `components/GuestTrialBanner.tsx` | 비회원 배너 + 1.5초 룰렛 |
| `components/TrialLockModal.tsx` | 09:59 카운트다운, 3단계 리워드, Exit-Intent |

- **부스터**: pity 10 도달 → 다음 뽑기에 SSR/SR 가중치 ×5 → 0 리셋. 가중치를 5배 하면 분모도 커지므로 **확률 배율은 약 4.7배**이며, UI는 5배로 반올림하지 않고 실제 계산값을 표기합니다.
- **정적 데모 한계**: GitHub Pages 배포본에는 서버가 없어 확률 계산이 클라이언트에서 실행되고, 게스트 체험 차단이 `localStorage` 뿐입니다. 실제 서비스는 반드시 서버 배포(`npm start` 또는 Vercel 등)로 운영하세요.
- **이탈 방지 문구**: `EXIT_SOCIAL_PROOF` 의 가입자 수는 실측 데이터가 아니므로 `isDemo: true` 로 DEMO 태그가 붙습니다. 실제 수치 연동 전까지 사실처럼 표기하지 마세요(표시광고법).
- **소셜 로그인**: 실제 OAuth 미연동 — 버튼 클릭 시 모의 가입으로 동작합니다.

## 출시 전 반드시 확인

- `lib/config.ts`의 `TRUST_MESSAGES`, `DEPOSIT_ADDRESSES`는 자리 표시자입니다. 검증 가능한 실제 링크/주소로 교체하세요. 실존 감사기관·투자사 명칭을 사실과 다르게 표기하면 허위 광고에 해당합니다.
- `SHOW_DEMO_FEED = false`로 두고 실제 이벤트만 사용하세요. 데모 피드는 UI에 `DEMO` 태그가 붙습니다.
- 카드 결제는 클라이언트에서 카드 정보를 다루지 않고 PSP(MoonPay/Stripe) 위젯을 마운트하는 구조입니다.
- 실물 상품의 USDT 환급(환전) 구조는 관할 지역에 따라 사행행위 규제 대상이 될 수 있으므로 법률 검토가 필요합니다.
