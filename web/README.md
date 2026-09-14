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

## 제품 이미지 파이프라인

```bash
npm run images            # 미보유 상품만 수집 (검색 → 메타 필터 → 다운로드 → sharp 검증 → WebP 저장)
npm run images -- --redo  # 검수 미통과 항목만 재수집
npm run images:report     # 저장 파일 재검증 + 전수 검증 표 출력 + lib/product-images.json 갱신
npm run images:credits    # public/images/products/CREDITS.md (출처/저작자/라이선스) 생성
```

- 기준: 가로·세로 모두 1200px 이상(1000px 미만은 무조건 Reject), 비율 0.5~2.0, 5KB 미만(HTML 에러 파일) 거부, `sharp`로 실측.
- 소스 우선순위: Wikimedia Commons 카테고리 → Commons 풀텍스트 → Pexels/Unsplash(API 키 있을 때) → Openverse.
  `PEXELS_API_KEY`, `UNSPLASH_ACCESS_KEY` 환경 변수를 넣으면 스톡 소스가 활성화됩니다.
- `scripts/image-manifest.mjs`: 상품별 검색어/카테고리/강제 지정(`pick`). `scripts/image-review.json`: 시각 검수 결과(`ok: true`인 항목만 프론트에 매핑).
- Commons 사진 대부분이 CC BY / CC BY-SA 이므로 서비스 화면 또는 크레딧 페이지에 저작자 표기가 필요합니다 (`CREDITS.md` 참고).
- **미확보**: 포켓몬/원피스 카드 상품 17종. Commons는 저작권 정책상 카드 실물 사진을 보유하지 않고, Openverse 익명 한도가 낮아 확보하지 못했습니다. Pexels/Unsplash 키를 넣고 `npm run images -- --redo`를 실행하면 채워집니다.

## 출시 전 반드시 확인

- `lib/config.ts`의 `TRUST_MESSAGES`, `DEPOSIT_ADDRESSES`는 자리 표시자입니다. 검증 가능한 실제 링크/주소로 교체하세요. 실존 감사기관·투자사 명칭을 사실과 다르게 표기하면 허위 광고에 해당합니다.
- `SHOW_DEMO_FEED = false`로 두고 실제 이벤트만 사용하세요. 데모 피드는 UI에 `DEMO` 태그가 붙습니다.
- 카드 결제는 클라이언트에서 카드 정보를 다루지 않고 PSP(MoonPay/Stripe) 위젯을 마운트하는 구조입니다.
- 실물 상품의 USDT 환급(환전) 구조는 관할 지역에 따라 사행행위 규제 대상이 될 수 있으므로 법률 검토가 필요합니다.
