# -*- coding: utf-8 -*-
"""
messages/{ko,en,zh}.json 생성기.

  npx tsx 로 lib/products.ts 를 덤프한 .dump.txt(BOX/item 줄) 를 읽어 ko/en 상품 문자열을 만들고,
  zh 는 아래 ZH_BOX / ZH_ITEM 사전에서 가져온다. UI 문자열은 세 언어를 여기 직접 둔다.

  실행: python scripts/gen-messages.py   (사전에 .dump.txt 필요)
규칙: 세 파일의 키 집합은 완전히 같아야 한다 (tests/i18n.test.ts 가 검증).
"""
import io, json, re, sys

sys.stdout.reconfigure(encoding="utf-8")

# ── UI 문자열 ──────────────────────────────────────────────
UI = {
  "ko": {
    "nav": {"boxes": "박스", "battles": "배틀", "inventory": "보관함", "fairness": "공정성 검증", "community": "커뮤니티", "highRoller": "하이롤러", "tech": "테크", "luxury": "럭셔리"},
    "header": {"balance": "잔액", "language": "언어", "currency": "통화", "deposit": "충전하기", "withdraw": "출금", "welcomeToast": "웰컴 보너스 {amount} 지급 완료 — 실제 박스를 열어보세요"},
    "hero": {
      "royalSelection": "로열 셀렉션", "top": "TOP {n}", "pricePerOpen": "1회 오픈", "topPull": "최고 구성",
      "noBlank": "100% 실물 지급 · 꽝 없음", "guaranteedMinLabel": "최소 보장 금액",
      "guaranteedMin": "최소 보장 금액 {value}", "aboveOpenPrice": "오픈가 이상",
      "openNow": "지금 오픈하기", "viewContents": "뭐 들었나 보기", "billboardPicker": "빌보드 선택", "billboardOf": "{title} 빌보드",
      "headline": "1달러로 롤렉스 & 아이폰, 긁어보세요.", "sub": "터지면 100% 내 것. 안 떠도 95% 즉시 환전해 드립니다.", "freeTry": "손맛 보기 (무료)", "openFor": "🔥 {price}로 돌려보기", "badge": "1달러부터 명품 잭팟", "nowShowing": "지금 상영 중", "topMultipleShort": "최고 {n}"
    },
    "card": {"perOpen": "1회", "top": "최고", "guaranteedMinShort": "최소 {value}", "noBlankBadge": "100% 꽝 없음 · 최소 {value} 상당 보장", "settleBadge": "전 품목 95% USDT 즉시 정산", "upTo": "최고 {n} 잭팟", "rtp": "RTP {rate}%", "floorPct": "최소 {pct}% 환급", "guaranteed": "보장", "openNow": "바로 열기", "contents": "상세 정보", "details": "{title} 상세 정보", "expand": "확대"},
    "rows": {"trending": "🔥 지금 가장 많이 열리는 박스 TOP 10", "dollar": "🔥 1달러의 행복", "techMobility": "⚡ 애플&테크", "luxuryWatch": "👑 명품&시계", "guaranteed": "🚗 슈퍼카&골드바", "prev": "이전", "next": "다음"},
    "grid": {"title": "전체 박스", "sort": "정렬", "loadMore": "더 보기 ({n}개)"},
    "categories": {"all": "전체", "dollar": "🔥 1달러의 행복", "tech": "⚡ 애플&테크", "luxury": "👑 명품&시계", "jackpot": "🚗 슈퍼카&골드바"},
    "sorts": {"featured": "추천순", "price-asc": "가격 낮은순", "price-desc": "가격 높은순", "popularity": "인기순"},
    "tiers": {
      "legendTitle": "등급 = 실판매가 ÷ 오픈가",
      "royal": "로열", "prestige": "프레스티지", "executive": "이그제큐티브", "curated": "큐레이티드",
      "range": {"royal": "20배 이상", "prestige": "6~20배", "executive": "2~6배", "curated": "기본 보장"},
      "multiple": "{n}배"
    },
    "modal": {
      "details": "{title} 상세 정보", "close": "닫기", "topRank": "TOP {n}", "openNowPrice": "지금 오픈하기 · {price}", "viewOdds": "확률 전체 보기",
      "openPrice": "오픈 가격", "guaranteedMin": "최소 보장 금액", "topPrize": "최고 당첨", "topMultiple": "최고 배수",
      "tierOdds": "등급별 당첨 확률", "breakEven": "본전({price}) 이상 {rate}",
      "explain": "등급은 저장값이 아니라 실판매가 ÷ 오픈 가격 배수에서 파생됩니다. 기대 수령 실판매가 {ev} — 오픈 가격의 {retail}입니다. 다만 받은 실물을 즉시 판매하면 실판매가의 {refund}만 지급되므로, 현금 기준 회수율은 {cash}로 오픈 가격보다 낮습니다.",
      "guaranteedYes": "이 박스의 바닥 등급은 {min} 즉시 캐시백 — 개봉 즉시 100% 잔액에 적립됩니다.",
      "guaranteedNo": "이 박스의 바닥 등급은 {min} 즉시 캐시백입니다 — 개봉 즉시 100% 잔액에 적립됩니다.",
      "settleBadge": "⚡ 전 품목 1클릭 95% USDT 즉시 정산 및 개인지갑 출금 보장",
      "settleBody": "실물·기프트카드는 실판매가의 95%를 1클릭에 USDT로, USDT 캐시백·인스턴트 드롭은 100%를 개봉 즉시 잔액에. 잔액은 TRC-20/BEP-20 개인지갑으로 출금됩니다.",
      
      "allPrizes": "전체 당첨 가능 상품", "count": "{n}종", "sortedByValue": "실판매가 내림차순",
      "marketValue": "실판매가", "odds": "확률", "tierLabel": "등급", "tierBar": "등급 구성", "upToLabel": "최고 잭팟", "rtpLabel": "환수율 RTP", "floorLabel": "바닥 환급 보장", "floorPct": "최소 {pct}%", "preciseOddsLink": "공정성 검증 (Provably Fair)", "preciseOdds": "정밀 확률표 · Provably Fair", "expand": "펼치기", "collapse": "접기", "openVerifier": "3-Step 비주얼 검증기 열기", "imageCredits": "이미지 출처"
    },
    "fairness": {
      "title": "공정성 검증", "eyebrow": "Provably Fair · HMAC-SHA256",
      "subtitle": "모든 개봉 결과는 서버 시드 + 클라이언트 시드 + Nonce 로 결정됩니다. 서버 시드의 SHA-256 해시는 개봉 전에 공개되고, 개봉 후 원문이 공개되면 누구나 같은 결과를 재현할 수 있습니다.",
      "formula": "roll = HMAC-SHA256(서버 시드, 클라이언트 시드:Nonce) 의 앞 8자리 hex → 정수 → mod {range}",
      "step1": "개봉 전, 서버 시드의 SHA-256 해시를 공개합니다.", "step2": "유저는 클라이언트 시드를 직접 정하거나 무작위로 받습니다. Nonce 는 개봉마다 1씩 오릅니다.",
      "step3": "개봉 후 서버 시드 원문을 공개합니다. 아래 검증기에 넣으면 해시·롤·당첨 항목이 그대로 재현됩니다.",
      "serverSeed": "서버 시드", "serverSeedHash": "공개된 서버 시드 해시 (선택)", "clientSeed": "클라이언트 시드", "nonce": "Nonce", "box": "박스",
      "verify": "검증하기", "verifying": "계산 중…", "clear": "지우기",
      "resultHash": "서버 시드 SHA-256", "resultHmac": "HMAC-SHA256", "resultRoll": "롤 넘버", "resultItem": "당첨 항목", "resultRange": "당첨 구간",
      "hashMatch": "공개 해시와 일치", "hashMismatch": "공개 해시와 불일치 — 서버 시드가 다릅니다", "hashSkipped": "공개 해시 미입력",
      "rangeNote": "롤 범위 0 ~ {max} ({resolution}% 해상도)", "outOf": "{roll} / {max}",
      "tryTitle": "시드 커밋 직접 해보기", "tryBody": "새 서버 시드를 만들면 해시만 먼저 보입니다. 공개(Reveal) 를 누르면 원문이 드러나고, 그걸 검증기에 넣어 재현할 수 있습니다.",
      "generate": "새 서버 시드 생성", "reveal": "서버 시드 공개", "hidden": "개봉 전 — 원문 비공개", "useInVerifier": "검증기에 넣기",
      "invalidInput": "서버 시드와 클라이언트 시드를 입력하고 Nonce 는 0 이상의 정수여야 합니다.",
      "open": "공정성 검증 열기", "close": "닫기",
      "visual": {
        "eyebrow": "1-Click 비주얼 검증", "title": "3초 공정성 검증", "body": "수학 공식 없이 확인합니다. 최근 언박싱을 고르고 [검증하기]를 누르면 3단계가 순서대로 검증됩니다. 128자리 hex 입력은 전문가 모드에 있습니다.",
        "expert": "전문가 모드", "expertTitle": "직접 입력 검증기 (서버 시드 · 클라이언트 시드 · Nonce)",
        "pick": "최근 언박싱 선택", "noRecent": "아직 검증할 언박싱이 없습니다.", "goOpen": "박스 열러 가기", "verify": "검증하기", "reverify": "다시 검증", "verifying": "검증 중…", "close": "닫기",
        "s1Title": "🔒 사전 암호화 봉인", "s1Body": "박스를 열기 전에 이미 SHA-256 해시값으로 결과가 봉인되어 있어, 서버 관리자도 중간에 결과를 바꿀 수 없었습니다.",
        "s1Pass": "봉인 일치 — 개봉 전 공개 해시와 서버 시드가 같습니다", "s1Fail": "봉인 불일치 — 공개 해시와 서버 시드가 다릅니다",
        "s2Title": "🎲 내 브라우저 난수 결합", "s2Body": "유저님의 기기(클라이언트 시드)와 결합하여 무작위 롤 넘버가 도출되었습니다.", "rollLabel": "롤 넘버",
        "s3Title": "🎯 구간 매칭", "s3Body": "해당 박스의 당첨 구간 게이지 바 위에 롤 넘버가 정확히 매칭되어 정당하게 당첨되었음을 검증합니다.",
        "s3Pass": "구간 일치 —", "s3Fail": "구간 불일치 —", "bracket": "구간 {from} ~ {to} ({pct}%)", "gaugeHint": "당첨 구간 게이지 · 흰 선이 내 롤",
        "verdictPass": "검증 완료 · 조작 없음", "verdictPassBody": "세 단계 모두 통과했습니다. 이 결과는 누구나 같은 값으로 재현할 수 있습니다.",
        "verdictFail": "검증 실패", "verdictFailBody": "재현 값이 기록과 다릅니다. 전문가 모드에서 입력값을 확인하세요."
      }
    },
    "unbox": {
      "open1": "1회 오픈", "open5": "5회 연속 오픈", "trialLabel": "손맛 보기 · 무료 체험", "trialCongrats": "{item} ({n}) 손맛 적중!", "trialBody": "웰컴 보너스 {bonus} 받고 진짜로 열어보세요.", "trialCta": "보너스 받고 진짜 열기", "trialCtaClaimed": "실제 박스 열기", "trialNote": "무료 체험 결과는 배송·환전 대상이 아닙니다. 진짜 오픈은 위 버튼으로.", "spinning": "개봉 중…", "landing": "결과 확정",
      "result": "당첨", "results": "5회 결과", "total": "합계 가치", "paid": "지불 {price}",
      "sellBack": "95% 즉시 회수 · {amount}", "sellBackAll": "전부 95% 회수 · {amount}", "cashoutCta": "⚡ 95% USDT 즉시 회수", "noFee": "수수료 0%", "shipSub": "실물 · 무료 배송", "cashCredited": "{amount} 잔액에 즉시 적립됨", "respin": "🔥 {price}로 다시 돌리기", "sellBackNote": "실판매가의 {rate}가 잔액으로 즉시 반영됩니다",
      "sold": "회수 완료 — {amount} 잔액 반영", "claimShipping": "집으로 배송",
      "shippingNotice": "국제 배송비 및 세관 수수료 안내", "shippingBody": "수취국 관세·부가세와 국제 배송비(DHL/FedEx 실비)가 별도 청구됩니다.",
      "verify": "공정성 1초 검증", "close": "닫기", "keep": "보관함으로", "kept": "보관함에 저장됐습니다 — 팝업을 닫아도 유지됩니다",
      "insufficient": "잔액 부족 — {price} 필요", "topUp": "충전하기", "toppedUp": "+{amount} 잔액 반영",
      "mute": "효과음 끄기", "unmute": "효과음 켜기",
      "seedHash": "서버 시드 해시 (개봉 전 공개)", "serverSeed": "서버 시드", "clientSeed": "클라이언트 시드", "nonce": "Nonce", "roll": "롤",
      "fairNote": "이 결과는 아래 시드와 Nonce 로 결정됐습니다. [이 결과 검증]에서 그대로 재현할 수 있습니다."
    },
    "deposit": {
      "title": "충전하기", "eyebrow": "Wallet · Deposit", "tabUsdt": "USDT 입금", "tabCard": "신용카드 결제",
      "network": "네트워크 선택", "recommended": "추천 · 수수료 1 USDT 이하", "chain": "{chain}",
      "address": "입금 지갑 주소", "copy": "원클릭 복사", "copied": "주소가 복사되었습니다", "qrHint": "지갑 앱으로 QR을 스캔하세요",
      "addressIssuing": "입금 주소를 발급하는 중입니다…", "addressError": "주소 발급에 실패했습니다. 잠시 후 다시 시도해 주세요.", "addressPending": "전용 입금 지갑 주소로 USDT 전송 시 12 블록 컨펌 후 계정 잔액에 즉시 자동 충전됩니다.",
      "guideTitle": "입금 안내", "guideMin": "최소 입금액 {min}", "guideConfirm": "블록체인 {n} 컨펌 후 자동 반영", "guideToken": "선택한 네트워크의 USDT 만 전송하세요. 다른 코인·네트워크 전송은 복구 불가",
      "guideTime": "평균 {sec}초/블록 · 약 {min}분",
      "status": "입금 상태", "waiting": "입금 대기 중", "watching": "블록체인 네트워크 승인을 실시간 감지 중입니다.", "confirming": "컨펌 {n} / {total}", "credited": "잔액 반영 완료",
     
      "amount": "금액 (USDT)", "belowMin": "최소 입금액은 {min} 입니다",
      "creditedToast": "+{amount} 잔액 반영",
      "close": "닫기"
    },
    "cardPay": {
      "quick": "빠른 충전", "custom": "직접 입력", "amount": "결제 금액", "credit": "잔액 반영",
      "provider": "결제 수단", "providerStripe": "Stripe · 글로벌 카드", "providerPortone": "PortOne · 국내 카드", "cardSoon": "카드 결제는 곧 오픈됩니다. 지금은 USDT 입금을 이용해 주세요.",
     
      "pay": "{amount} 결제", "processing": "결제 진행 중…", "belowMin": "최소 결제액은 {min} 입니다", "aboveMax": "최대 결제액은 {max} 입니다", "invalid": "금액을 확인하세요",
      "declined": "카드가 거절되었습니다", "declinedHint": "카드사 승인이 거절되었습니다. 다른 카드로 다시 시도해 주세요.",
      "receipt": "영수증", "receiptId": "거래 번호", "receiptAt": "승인 시각", "receiptCard": "카드", "receiptPaid": "결제 금액", "receiptCredited": "잔액 반영", "receiptProvider": "결제 수단",
      "done": "완료", "creditedToast": "+{amount} 잔액 반영 (카드 결제)", "history": "최근 충전 내역", "noHistory": "충전 내역이 없습니다",
      "txDepositCard": "카드 충전", "txDepositUsdt": "USDT 입금", "txOpen": "박스 오픈", "txSellback": "즉시 판매"
    },
    "inventory": {
      "title": "보관함", "eyebrow": "My Vault", "empty": "보관 중인 아이템이 없습니다. 박스를 열어 채워보세요.", "goBoxes": "박스 보러 가기",
      "summary": "총 아이템 {n}개 · 보관 중인 총 가치 {value}", "storedCount": "보관 중 {n}", "shippingCount": "배송 {n}", "soldCount": "환전 완료 {n}",
      "filterStatus": "상태", "filterTier": "등급", "all": "전체", "tabHeld": "보유 중 ({n})", "tabDone": "처리 완료 ({n})", "cashableValue": "즉시 환전 가능한 총 가치", "doneSold": "95% 환전 완료 +{amount}", "doneCash": "캐시백 적립 +{amount}", "archived": "처리 완료", "doneShipping": "배송 출발", "donePreparing": "출고 준비", "emptyDone": "아직 처리 완료된 내역이 없습니다. 환전하거나 배송한 상품이 여기에 보관됩니다.",
      "status": {"IN_STORAGE": "보관 중", "SHIPPING_REQUESTED": "배송 준비 중", "SHIPPING": "배송 중", "SOLD": "환전 완료"},
      "acquired": "획득 {date}", "from": "{box}", "soldFor": "환급 {amount}", "tracking": "운송장", "trackingPending": "운송장 발급 대기",
      "sell": "⚡ 95% USDT 즉시 회수", "noFee": "수수료 0%", "ship": "📦 우리 집으로 배송", "verify": "공정성 1초 검증", "select": "선택", "selected": "{n}개 선택", "selectAll": "전체 선택", "clearSelection": "선택 해제",
      "sellSelected": "선택 {rate} 회수", "selectedValue": "총 가치:", "soldForLabel": "환급",
      "totalValue": "총 보관 자산", "sellAll": "전부 95% 회수", "sort": "정렬", "sorts": {"newest": "최신순", "valueDesc": "높은 가치순", "valueAsc": "낮은 가치순"},
      "emptyFiltered": "조건에 맞는 아이템이 없습니다.", "hotTitle": "지금 가장 핫한 박스 TOP 3", "hotTop": "최고 배수",
      "track": "배송 조회", "trackingTitle": "배송 현황", "copyTracking": "운송장 복사", "trackOnCarrier": "{carrier} 실시간 배송조회",
      "carriers": {"CJ": "CJ대한통운", "EPOST": "우체국택배", "DHL": "DHL", "FEDEX": "FedEx"},
      "steps": {"requested": "배송 신청 접수", "label": "운송장 발급", "transit": "운송 중", "delivered": "배송 완료"}, "stepCurrent": "현재 단계",
      "trackingNote": "출고가 완료되면 택배사와 운송장 번호가 여기에 표시되고, 실시간 배송조회 링크가 열립니다.", "trackingIssuedNote": "운송장이 발급되었습니다. {carrier} 공식 조회 페이지에서 실시간 배송 현황을 확인하세요.",
      "sellTitle": "95% 즉시 회수", "sellBody": "이 아이템을 회수할까요? 정가의 {rate}인 {amount}가 계정 잔액으로 즉시 환급됩니다.",
      "sellBodyMulti": "{n}개 아이템을 회수할까요? 정가의 {rate}인 {amount}가 계정 잔액으로 즉시 환급됩니다.",
      "confirm": "확인", "cancel": "취소", "soldToast": "판매 완료 — {amount} 잔액 반영",
      "shipTitle": "실물 배송 신청", "shipBody": "국제 배송비는 잔액에서 차감되며 수취국 관세·부가세는 수령 시 별도입니다.",
      "recipient": "수령인 이름", "country": "국가", "phone": "연락처", "postalCode": "우편번호", "address": "상세 주소",
      "pccc": "개인통관고유부호 (PCCC)", "pcccHint": "P + 숫자 12자리", "residentId": "중국 주민신분증 번호", "residentIdHint": "18자리",
      "fee": "배송비", "feeFree": "무료 배송 이벤트", "itemsToShip": "배송 항목 {n}개", "submitShip": "배송 신청 · {fee}", "shipInsufficient": "배송비 {fee}가 부족합니다",
      "shipRequestedToast": "배송 신청 완료 — 출고되면 운송장 번호가 표시됩니다",
      "errors": {"recipient": "수령인 이름을 입력하세요", "phone": "연락처 형식을 확인하세요", "postalCode": "우편번호를 입력하세요", "address": "상세 주소를 입력하세요", "customsId": "통관 식별자 형식이 올바르지 않습니다"},
      "countries": {"KR": "대한민국", "US": "미국", "CN": "중국", "JP": "일본", "SG": "싱가포르", "HK": "홍콩", "TW": "대만", "GB": "영국", "DE": "독일", "FR": "프랑스", "AU": "호주", "CA": "캐나다", "AE": "아랍에미리트"}
    },
    "daily": {
      "title": "데일리 프리 박스", "pill": "무료 상자", "openFree": "무료로 열기", "nextIn": "다음 오픈까지 {time}",
      "stripBody": "24시간마다 1회, 결제 없이 {min} ~ {max}를 잔액에 바로 적립합니다.", "body": "24시간마다 1회. 카드 한 장을 고르면 {min} ~ {max}가 잔액에 즉시 적립됩니다. 결제·가입 없음.",
      "card": "카드 {n}", "pickOne": "카드 한 장을 선택하세요", "revealing": "결과 확정 중…", "won": "적립", "credited": "축하합니다! 무료 당첨 금액 {amount}가 지갑 잔액에 즉시 적립되었습니다.",
      "odds": "확률표", "fairNote": "유료 박스와 같은 Provably Fair 롤 — 카드 선택은 연출이며 결과를 바꾸지 않습니다",
      "creditedToast": "데일리 프리 박스 — {amount} 적립", "close": "닫기",
      "cooldownNote": "일일 무료 상자는 24시간마다 1회 오픈 가능합니다."
    },
    "community": {
      "eyebrow": "Community Wall", "title": "실물 언박싱 후기", "you": "나", 
      "bonusBanner": "실물 수령 후 사진 후기 작성 시 즉시", "bonusBannerTail": "보너스 캐시백 지급", "write": "후기 작성",
      "badgeShipping": "운송장 인증", "badgeOnchain": "{explorer} 온체인 인증",
      "writeTitle": "포토 후기 작성", "writeBonus": "등록 즉시 보너스", "noEligible": "배송 완료된 아이템이 있어야 후기를 쓸 수 있습니다. 보관함에서 배송을 신청해 보세요.",
      "pickItem": "수령한 아이템", "photo": "언박싱 사진", "photoHint": "사진 선택 (선택 사항)", "rating": "별점", "text": "한 줄 후기", "textHint": "솔직한 한 줄이면 충분합니다 (5자 이상)",
      "submit": "등록하고 {bonus} 받기", "bonusToast": "후기 등록 — 보너스 {amount} 적립",
      "errors": {"item": "아이템을 선택하세요", "text": "후기는 5자 이상 입력하세요", "photo": "사진을 불러오지 못했습니다"},
      "bonusNote": "후기 등록 즉시 {bonus} 보너스가 계정 잔액으로 입금됩니다.",
      "empty": "아직 게시된 후기가 없습니다. 실물을 받으셨다면 첫 후기를 남기고 10 USDT를 받아가세요.", "emptyCta": "박스 열러 가기", "close": "닫기"
    },
    "ticker": {"label": "실시간 라이브 드랍", "live": "LIVE", "lineup": "{box} · {item} {mult} 잭팟", "win": "{box} ➔ {item} 획득", "cashout": "{amount} 즉시 환전", "ship": "{item} 출고 신청", "ago": "({s}초 전)"},
    "onboarding": {
      "title": "3초 안심 가이드",
      "step1Title": "박스 고르기", "step1Desc": "1달러부터. 롤렉스·테슬라·애플.",
      "step2Title": "공정하게 열기", "step2Desc": "SHA-256으로 봉인, 조작 불가.",
      "step3Title": "배송 or 95% 환전", "step3Desc": "무료 배송받거나, 1초 만에 USDT로."
    },
    "counters": {"label": "신뢰 지표", "shipments": "오늘 출고된 실물 명품", "shipmentsUnit": "건", "cashouts": "오늘 즉시 환전된 자산", "verification": "공정성 검증 완료율", "odds": "공개된 확률 항목", "oddsUnit": "개", "sellback": "즉시 현금 회수율", "verifiedOf": "내 개봉 {n}건 재검증"},
    "proof": {
      "title": "실지급 & 실배송 라이브 인증", "live": "LIVE", "tab": {"payouts": "USDT 실지급", "shipments": "실물 출고"},
      "kind": {"withdraw": "출금", "sellback": "즉시 환전"}, "viewOnExplorer": "{explorer} 조회", "track": "운송장 추적",
      "carriers": {"CJ": "CJ대한통운", "EPOST": "우체국택배", "DHL": "DHL", "FEDEX": "FedEx"},
      "reserveEyebrow": "Proof of Reserves · 지급 준비금", "reserveBody": "GACHAFLIX는 유저 자산 보호와 즉시 출금을 위해 유동성 지급 준비금을 온체인 지갑에 보유하며, 아래 주소에서 누구나 잔고를 확인할 수 있습니다.",
      "reserveWallet": "리저브 지갑", "reserveBalance": "현재 보유", "copyAddress": "주소 복사",
      "emptyPayouts": "아직 지급 기록이 없습니다.", "emptyShipments": "아직 출고 기록이 없습니다.", "emptyCta": "박스 열러 가기", "pendingTx": "전송 대기", "settledInstant": "즉시 정산"
    },
    "withdraw": {
      "title": "USDT 출금", "close": "닫기", "available": "출금 가능 잔액", "network": "출금 네트워크", "address": "받는 지갑 주소", "addressHint": "{hint} 로 시작하는 주소",
      "amount": "출금 수량", "min": "최소 {min}", "max": "전액", "fee": "네트워크 수수료", "feeShort": "수수료", "net": "최종 실 수령액", "netLabel": "최종 실 수령액",
      "submit": "출금 신청 완료", "requested": "출금 신청 접수", "txId": "거래 ID", "at": "신청 시각", "another": "추가 출금", "done": "확인", "history": "최근 출금",
      "status": {"PENDING": "검토 중", "BROADCASTING": "전송 중", "COMPLETED": "완료"},
      "txHash": "온체인 TxID", "txHashPending": "브로드캐스트 후 TxID가 표시됩니다", "copyHash": "TxID 복사", "viewOnExplorer": "{explorer}에서 확인",
      "errors": {"TRC20": "TRC-20 주소는 T 로 시작하는 34자입니다", "BEP20": "BEP-20 주소는 0x 로 시작하는 42자입니다", "min": "최소 출금 수량은 {min}입니다", "insufficient": "잔액이 부족합니다", "nan": "출금 수량을 입력하세요"},
      "processingNote": "출금은 보안 검토 후 서명·브로드캐스트됩니다. 완료되면 TxID와 익스플로러 링크가 여기에 표시됩니다.", "networkNote": "출금 신청 즉시 블록체인 네트워크로 전송되며, 온체인 트랜잭션이 TronScan/BscScan에서 실시간 조회됩니다.",
      "requestedToast": "출금 신청 완료 — {amount} 차감"
    },
    "vip": {"title": "VIP 등급 {tier}", "tiers": {"member": "멤버", "silver": "실버", "gold": "골드", "black": "블랙"}},
    "footer": {
      "slogan": "블록체인 기반의 가장 투명한 실물 럭셔리 랜덤박스 플랫폼",
      "service": "서비스", "guide": "이용 안내", "support": "고객지원",
      "links": {"dollar": "1달러 박스", "vault": "명품 볼트", "feed": "실시간 라이브 피드", "verifier": "공정성 검증기", "terms": "서비스 이용약관", "privacy": "개인정보처리방침", "policy": "배송 및 95% 환전 정책", "faq": "자주 묻는 질문(FAQ)", "telegram": "텔레그램 24/7 실시간 상담", "discord": "공식 디스코드", "notice": "공지 채널"},
      "disclaimer": "GACHAFLIX는 전 세계 유저를 위한 글로벌 이커머스 랜덤박스 플랫폼입니다. 모든 개봉 결과는 조작 불가능한 SHA-256 알고리즘을 통해 투명하게 공개되며, 당첨된 상품은 100% 실물 배송 또는 즉시 현금(USDT) 환전이 보장됩니다."
    },
    "legalDocs": {
      "eyebrow": "이용 안내", "updated": "최종 개정 2026년 9월 18일",
      "terms": {"title": "서비스 이용약관", "sections": [
        {"h": "1. 서비스", "p": "GACHAFLIX는 확률이 전량 공개된 랜덤박스를 판매하고, 당첨 상품을 실물로 배송하거나 실판매가의 95%를 USDT로 즉시 환전해 드리는 이커머스 서비스입니다."},
        {"h": "2. 계정과 잔액", "p": "잔액은 USDT로 관리되며 입금·출금·오픈·회수 내역은 거래 기록으로 남습니다. 잔액은 상품 구매와 출금 외의 용도로 쓰이지 않습니다."},
        {"h": "3. 확률과 공정성", "p": "모든 박스의 항목별 확률은 오픈 전에 공개됩니다. 결과는 개봉 전 공개된 서버 시드 해시와 이용자의 클라이언트 시드로 결정되며 누구나 재현·검증할 수 있습니다."},
        {"h": "4. 취소와 환불", "p": "개봉이 시작된 박스는 취소할 수 없습니다. 당첨 상품은 언제든 95% 즉시 회수 또는 실물 배송 중 하나를 선택할 수 있습니다."},
        {"h": "5. 책임", "p": "이용자는 거주 지역의 법령을 준수할 책임이 있으며, 회사는 서비스 장애 시 거래 기록을 기준으로 잔액을 복구합니다."}
      ]},
      "privacy": {"title": "개인정보처리방침", "sections": [
        {"h": "1. 수집 항목", "p": "배송을 위한 수령인 이름·연락처·주소·통관 식별자, 출금을 위한 지갑 주소, 결제 처리를 위한 거래 식별자를 수집합니다. 카드 정보는 결제 대행사가 처리하며 회사는 저장하지 않습니다."},
        {"h": "2. 이용 목적", "p": "상품 배송, 출금 처리, 부정 이용 방지, 고객 문의 응대에만 사용합니다."},
        {"h": "3. 보관과 파기", "p": "배송·출금 완료 후 관련 법령이 정한 기간 동안 보관한 뒤 지체 없이 파기합니다."},
        {"h": "4. 제3자 제공", "p": "택배사(배송 정보), 결제 대행사(결제 정보)에 필요한 최소한의 정보만 제공합니다."},
        {"h": "5. 이용자 권리", "p": "고객지원 채널을 통해 언제든 열람·정정·삭제를 요청할 수 있습니다."}
      ]},
      "policy": {"title": "배송 및 95% 환전 정책", "sections": [
        {"h": "1. 즉시 환전", "p": "당첨 상품은 보관함에서 실판매가의 95%를 USDT로 즉시 회수할 수 있으며, 회수액은 곧바로 잔액에 반영됩니다."},
        {"h": "2. 실물 배송", "p": "국제 배송비는 신청 시 잔액에서 차감되며 수취국 관세·부가세는 수령 시 별도입니다. 대한민국은 CJ대한통운, 해외는 DHL/FedEx로 출고되며 운송장 번호가 발급되면 보관함에 표시됩니다."},
        {"h": "3. 출금", "p": "USDT 출금은 TRC-20(수수료 1.00 USDT) 또는 BEP-20(수수료 0.80 USDT)로 처리되며 최소 20 USDT입니다. 브로드캐스트 후 TxID와 익스플로러 링크가 제공됩니다."},
        {"h": "4. 바닥 가치 보장", "p": "모든 박스의 최저 구성은 오픈 가격의 80% 이상을 즉시 회수할 수 있는 가치를 가집니다."}
      ]},
      "faq": {"title": "자주 묻는 질문", "sections": [
        {"h": "정말 1 USDT로 시작할 수 있나요?", "p": "네. 1달러의 행복 카테고리는 1.00 USDT에 열리며, 꽝이어도 0.85 USDT가 즉시 돌아옵니다."},
        {"h": "결과가 조작되지 않았다는 걸 어떻게 확인하나요?", "p": "결과 팝업과 보관함 카드의 [공정성 1초 검증]을 누르면 사전 봉인 해시·롤 넘버·구간 매칭을 3단계로 재현해 보여줍니다."},
        {"h": "실물 대신 현금으로 받을 수 있나요?", "p": "언제든 보관함에서 실판매가의 95%를 USDT로 즉시 회수할 수 있습니다."},
        {"h": "출금은 얼마나 걸리나요?", "p": "보안 검토 후 브로드캐스트되며, 완료되면 TxID와 TronScan/BscScan 링크가 표시됩니다."}
      ]}
    },
    "actions": {"sellBack": "95% 즉시 회수", "claimShipping": "집으로 배송", "provablyFair": "공정성 검증"},
    "legal": {"disclaimer": "표기 금액은 실판매가 기준입니다. 받은 실물을 즉시 현금으로 회수하면 실판매가의 {refund}를 돌려받으므로 회수액은 오픈 가격보다 낮습니다. 모든 확률은 [뭐 들어있는지 보기]에서 전량 공개됩니다."},
    "badges": {"dream": "드림 박스", "mobility": "모빌리티", "tech": "테크", "audio": "오디오", "watch": "워치", "luxury": "럭셔리", "lifestyle": "라이프스타일", "guaranteed": "가치 보장", "dollar": "1달러", "gold": "골드"},
  },
  "en": {
    "nav": {"boxes": "Boxes", "battles": "Battles", "inventory": "Inventory", "fairness": "Provably Fair", "community": "Community", "highRoller": "High-Roller", "tech": "Tech", "luxury": "Luxury"},
    "header": {"balance": "Balance", "language": "Language", "currency": "Currency", "deposit": "Deposit", "withdraw": "Withdraw", "welcomeToast": "Welcome bonus {amount} credited — open a real box"},
    "hero": {
      "royalSelection": "Royal Selection", "top": "TOP {n}", "pricePerOpen": "Per Open", "topPull": "Top Pull",
      "noBlank": "100% physical payout · No blanks", "guaranteedMinLabel": "Guaranteed Minimum",
      "guaranteedMin": "Guaranteed Minimum {value}", "aboveOpenPrice": "Above open price",
      "openNow": "Open Now", "viewContents": "What's inside", "billboardPicker": "Billboard picker", "billboardOf": "{title} billboard",
      "headline": "$1. A shot at a Rolex & an iPhone.", "sub": "Hit, it's 100% yours. Miss, 95% cashed out instantly.", "freeTry": "Try free", "openFor": "🔥 Spin for {price}", "badge": "Luxury jackpots from $1", "nowShowing": "Now Showing", "topMultipleShort": "up to {n}"
    },
    "card": {"perOpen": "Open", "top": "Top", "guaranteedMinShort": "Min {value}", "noBlankBadge": "100% No Blanks · Min {value} guaranteed", "settleBadge": "Every item cashes out 95% in USDT", "upTo": "Up to {n} jackpot", "rtp": "RTP {rate}%", "floorPct": "Min {pct}% back", "guaranteed": "guaranteed", "openNow": "Open now", "contents": "Details", "details": "{title} details", "expand": "Expand"},
    "rows": {"trending": "🔥 Most Opened Boxes TOP 10", "dollar": "🔥 $1 Boxes", "techMobility": "⚡ Apple & Tech", "luxuryWatch": "👑 Luxury & Watches", "guaranteed": "🚗 Supercars & Gold", "prev": "Previous", "next": "Next"},
    "grid": {"title": "All Boxes", "sort": "Sort", "loadMore": "Load more ({n})"},
    "categories": {"all": "All", "dollar": "🔥 $1 Boxes", "tech": "⚡ Apple & Tech", "luxury": "👑 Luxury & Watches", "jackpot": "🚗 Supercars & Gold"},
    "sorts": {"featured": "Featured", "price-asc": "Price: Low to High", "price-desc": "Price: High to Low", "popularity": "Popularity"},
    "tiers": {
      "legendTitle": "Tier = market value ÷ open price",
      "royal": "Royal", "prestige": "Prestige", "executive": "Executive", "curated": "Curated",
      "range": {"royal": "20x and up", "prestige": "6–20x", "executive": "2–6x", "curated": "Guaranteed base"},
      "multiple": "{n}x"
    },
    "modal": {
      "details": "{title} details", "close": "Close", "topRank": "TOP {n}", "openNowPrice": "Open Now · {price}", "viewOdds": "View all odds",
      "openPrice": "Open Price", "guaranteedMin": "Guaranteed Minimum", "topPrize": "Top Prize", "topMultiple": "Top Multiple",
      "tierOdds": "Odds by tier", "breakEven": "At or above {price}: {rate}",
      "explain": "Tiers are not stored values — they derive from market value ÷ open price. Expected market value per open is {ev}, which is {retail} of the open price. Instant sell-back pays {refund} of market value, so the cash-basis return is {cash}, below the open price.",
      "guaranteedYes": "This box's floor tier is a {min} instant cashback — credited 100% the moment you open.",
      "guaranteedNo": "This box's floor tier is a {min} instant cashback — credited 100% to your balance the moment you open.",
      "settleBadge": "⚡ Every item settles to USDT in 1 click at 95% — withdraw to your own wallet, guaranteed",
      "settleBody": "Physical items and gift cards cash out at 95% of market value in one click; USDT cashback and instant drops are credited at 100% on open. Balance withdraws to your TRC-20 / BEP-20 wallet.",
      
      "allPrizes": "All possible prizes", "count": "{n} items", "sortedByValue": "By market value, descending",
      "marketValue": "Market value", "odds": "Odds", "tierLabel": "Tier", "tierBar": "Tier lineup", "upToLabel": "Top jackpot", "rtpLabel": "RTP", "floorLabel": "Floor value", "floorPct": "Min {pct}%", "preciseOddsLink": "Provably Fair", "preciseOdds": "Exact odds table · Provably Fair", "expand": "Expand", "collapse": "Collapse", "openVerifier": "Open the 3-step visual verifier", "imageCredits": "Image credits"
    },
    "fairness": {
      "title": "Provably Fair", "eyebrow": "Provably Fair · HMAC-SHA256",
      "subtitle": "Every unbox result is determined by the server seed, your client seed and a nonce. The SHA-256 hash of the server seed is published before opening; once the seed is revealed, anyone can reproduce the exact result.",
      "formula": "roll = first 8 hex chars of HMAC-SHA256(server seed, client seed:nonce) → integer → mod {range}",
      "step1": "Before opening, we publish the SHA-256 hash of the server seed.", "step2": "You choose a client seed or receive a random one. The nonce increments by 1 per open.",
      "step3": "After opening, the server seed is revealed. Paste it below and the hash, roll and winning item are reproduced exactly.",
      "serverSeed": "Server seed", "serverSeedHash": "Published server seed hash (optional)", "clientSeed": "Client seed", "nonce": "Nonce", "box": "Box",
      "verify": "Verify", "verifying": "Computing…", "clear": "Clear",
      "resultHash": "Server seed SHA-256", "resultHmac": "HMAC-SHA256", "resultRoll": "Roll number", "resultItem": "Winning item", "resultRange": "Winning range",
      "hashMatch": "Matches the published hash", "hashMismatch": "Does not match the published hash — different server seed", "hashSkipped": "No published hash provided",
      "rangeNote": "Roll range 0 – {max} ({resolution}% resolution)", "outOf": "{roll} / {max}",
      "tryTitle": "Try seed commitment yourself", "tryBody": "Generate a server seed and only its hash is shown. Reveal it, then paste it into the verifier to reproduce a roll.",
      "generate": "Generate server seed", "reveal": "Reveal server seed", "hidden": "Before opening — seed hidden", "useInVerifier": "Use in verifier",
      "invalidInput": "Enter a server seed and a client seed; the nonce must be an integer ≥ 0.",
      "open": "Open Provably Fair", "close": "Close",
      "visual": {
        "eyebrow": "1-Click Visual Verifier", "title": "3-Second Fairness Check", "body": "No math required. Pick a recent unboxing and press Verify — three steps run in order. The 128-char hex inputs live under Expert mode.",
        "expert": "Expert mode", "expertTitle": "Manual verifier (server seed · client seed · nonce)",
        "pick": "Recent unboxing", "noRecent": "Nothing to verify yet.", "goOpen": "Open a box", "verify": "Verify", "reverify": "Verify again", "verifying": "Verifying…", "close": "Close",
        "s1Title": "🔒 Pre-committed seal", "s1Body": "The outcome was sealed with a SHA-256 hash before the box opened, so not even the server operator could change it mid-way.",
        "s1Pass": "Seal intact — the server seed matches the hash published before opening", "s1Fail": "Seal broken — the server seed does not match the published hash",
        "s2Title": "🎲 Your browser's entropy", "s2Body": "Combined with your device's client seed to derive a deterministic roll number.", "rollLabel": "Roll number",
        "s3Title": "🎯 Bracket match", "s3Body": "The roll lands precisely inside the winning bracket on this box's gauge, proving the drop was legitimate.",
        "s3Pass": "Bracket match —", "s3Fail": "Bracket mismatch —", "bracket": "Bracket {from} – {to} ({pct}%)", "gaugeHint": "Winning brackets · white line is your roll",
        "verdictPass": "Verified · Untampered", "verdictPassBody": "All three steps passed. Anyone can reproduce this exact result.",
        "verdictFail": "Verification failed", "verdictFailBody": "The reproduced values differ from the record. Check the inputs in Expert mode."
      }
    },
    "unbox": {
      "open1": "Open ×1", "open5": "Open ×5", "trialLabel": "Free try", "trialCongrats": "Nice hit — {item} ({n}) on your free try!", "trialBody": "Open real boxes with your {bonus} welcome bonus!", "trialCta": "Claim & Open Real Box", "trialCtaClaimed": "Open Real Box", "trialNote": "Free-try results aren't shipped or cashed out. Use the button above for the real thing.", "spinning": "Opening…", "landing": "Result locked",
      "result": "You won", "results": "5 results", "total": "Total value", "paid": "Paid {price}",
      "sellBack": "Cash out 95% · {amount}", "sellBackAll": "Cash out all · {amount}", "cashoutCta": "⚡ Cash out 95% in USDT", "noFee": "0% fee", "shipSub": "Physical · free shipping", "cashCredited": "{amount} credited to your balance", "respin": "🔥 Spin again for {price}", "sellBackNote": "{rate} of market value is credited to your balance instantly",
      "sold": "Cashed out — {amount} credited", "claimShipping": "Ship to me",
      "shippingNotice": "International shipping & customs notice", "shippingBody": "Destination duties/VAT and international shipping (DHL/FedEx at cost) are billed separately.",
      "verify": "1-second fairness check", "close": "Close", "keep": "Keep in inventory", "kept": "Saved to your vault — it stays after you close this",
      "insufficient": "Insufficient balance — {price} required", "topUp": "Deposit", "toppedUp": "+{amount} credited",
      "mute": "Mute sound", "unmute": "Unmute sound",
      "seedHash": "Server seed hash (published before open)", "serverSeed": "Server seed", "clientSeed": "Client seed", "nonce": "Nonce", "roll": "Roll",
      "fairNote": "This result was determined by the seeds and nonce below. Reproduce it exactly under [Verify this result]."
    },
    "deposit": {
      "title": "Deposit", "eyebrow": "Wallet · Deposit", "tabUsdt": "USDT Deposit", "tabCard": "Credit Card",
      "network": "Select network", "recommended": "Recommended · fee under 1 USDT", "chain": "{chain}",
      "address": "Deposit address", "copy": "Copy address", "copied": "Address copied", "qrHint": "Scan the QR with your wallet app",
      "addressIssuing": "Issuing your deposit address…", "addressError": "Could not issue an address. Please try again shortly.", "addressPending": "Send USDT to your dedicated deposit address — after 12 block confirmations it is credited to your balance automatically.",
      "guideTitle": "Deposit guide", "guideMin": "Minimum deposit {min}", "guideConfirm": "Credited automatically after {n} block confirmations", "guideToken": "Send only USDT on the selected network. Other coins or networks cannot be recovered",
      "guideTime": "~{sec}s per block · about {min} min",
      "status": "Deposit status", "waiting": "Waiting for deposit", "watching": "Watching the blockchain for network approval in real time.", "confirming": "Confirmation {n} / {total}", "credited": "Credited to balance",
     
      "amount": "Amount (USDT)", "belowMin": "Minimum deposit is {min}",
      "creditedToast": "+{amount} credited",
      "close": "Close"
    },
    "cardPay": {
      "quick": "Quick top-up", "custom": "Custom amount", "amount": "Payment amount", "credit": "Credited",
      "provider": "Payment method", "providerStripe": "Stripe · Global cards", "providerPortone": "PortOne · Korean cards", "cardSoon": "Card payments are launching soon. Please use a USDT deposit for now.",
     
      "pay": "Pay {amount}", "processing": "Processing…", "belowMin": "Minimum payment is {min}", "aboveMax": "Maximum payment is {max}", "invalid": "Check the amount",
      "declined": "Card declined", "declinedHint": "The issuer declined this card. Please try another card.",
      "receipt": "Receipt", "receiptId": "Transaction ID", "receiptAt": "Approved at", "receiptCard": "Card", "receiptPaid": "Paid", "receiptCredited": "Credited", "receiptProvider": "Method",
      "done": "Done", "creditedToast": "+{amount} credited (card)", "history": "Recent top-ups", "noHistory": "No top-ups yet",
      "txDepositCard": "Card top-up", "txDepositUsdt": "USDT deposit", "txOpen": "Box open", "txSellback": "Instant sell-back"
    },
    "inventory": {
      "title": "Inventory", "eyebrow": "My Vault", "empty": "Nothing in your vault yet. Open a box to fill it.", "goBoxes": "Browse boxes",
      "summary": "{n} items · Total value in vault {value}", "storedCount": "In vault {n}", "shippingCount": "Shipping {n}", "soldCount": "Sold {n}",
      "filterStatus": "Status", "filterTier": "Tier", "all": "All", "tabHeld": "Holding ({n})", "tabDone": "Settled ({n})", "cashableValue": "Total cash-out value now", "doneSold": "Cashed out 95% +{amount}", "doneCash": "Cashback credited +{amount}", "archived": "Settled", "doneShipping": "Shipped", "donePreparing": "Preparing shipment", "emptyDone": "Nothing settled yet. Items you cash out or ship are archived here.",
      "status": {"IN_STORAGE": "In Vault", "SHIPPING_REQUESTED": "Preparing shipment", "SHIPPING": "Shipping", "SOLD": "Sold"},
      "acquired": "Acquired {date}", "from": "{box}", "soldFor": "Refunded {amount}", "tracking": "Tracking", "trackingPending": "Awaiting tracking number",
      "sell": "⚡ Cash out 95% USDT", "noFee": "0% fee", "ship": "📦 Ship to my door", "verify": "1-second fairness check", "select": "Select", "selected": "{n} selected", "selectAll": "Select all", "clearSelection": "Clear",
      "sellSelected": "Cash out selected · {rate}", "selectedValue": "Total value:", "soldForLabel": "Refunded",
      "totalValue": "Total vault value", "sellAll": "Cash out all", "sort": "Sort", "sorts": {"newest": "Newest", "valueDesc": "Highest value", "valueAsc": "Lowest value"},
      "emptyFiltered": "No items match these filters.", "hotTitle": "Hottest boxes right now — TOP 3", "hotTop": "top multiplier",
      "track": "Track", "trackingTitle": "Shipment status", "copyTracking": "Copy tracking number", "trackOnCarrier": "Live tracking on {carrier}",
      "carriers": {"CJ": "CJ Logistics", "EPOST": "Korea Post", "DHL": "DHL", "FEDEX": "FedEx"},
      "steps": {"requested": "Shipping requested", "label": "Label issued", "transit": "In transit", "delivered": "Delivered"}, "stepCurrent": "Current step",
      "trackingNote": "Once the parcel ships, the carrier and tracking number appear here with a live tracking link.", "trackingIssuedNote": "Your tracking number is issued. Follow the parcel live on the official {carrier} tracking page.",
      "sellTitle": "95% Instant Cash-Out", "sellBody": "Cash out this item? {rate} of market value — {amount} — is credited to your balance instantly.",
      "sellBodyMulti": "Cash out {n} items? {rate} of market value — {amount} — is credited to your balance instantly.",
      "confirm": "Confirm", "cancel": "Cancel", "soldToast": "Sold — {amount} credited",
      "shipTitle": "Claim Shipping", "shipBody": "International shipping is deducted from your balance. Destination duties and VAT are billed on delivery.",
      "recipient": "Recipient name", "country": "Country", "phone": "Phone", "postalCode": "Postal code", "address": "Street address",
      "pccc": "Personal Customs Clearance Code (PCCC)", "pcccHint": "P + 12 digits", "residentId": "Resident ID number", "residentIdHint": "18 characters",
      "fee": "Shipping fee", "feeFree": "Free shipping event", "itemsToShip": "{n} items to ship", "submitShip": "Request shipping · {fee}", "shipInsufficient": "Insufficient balance for the {fee} shipping fee",
      "shipRequestedToast": "Shipping requested — a tracking number appears once the label is issued",
      "errors": {"recipient": "Enter the recipient name", "phone": "Check the phone number format", "postalCode": "Enter a postal code", "address": "Enter the street address", "customsId": "Invalid customs identifier format"},
      "countries": {"KR": "South Korea", "US": "United States", "CN": "China", "JP": "Japan", "SG": "Singapore", "HK": "Hong Kong", "TW": "Taiwan", "GB": "United Kingdom", "DE": "Germany", "FR": "France", "AU": "Australia", "CA": "Canada", "AE": "United Arab Emirates"}
    },
    "daily": {
      "title": "Daily Free Box", "pill": "Free Box", "openFree": "Open for free", "nextIn": "Next in {time}",
      "stripBody": "Once every 24 hours, no payment — {min} to {max} credited straight to your balance.", "body": "Once every 24 hours. Pick a card and {min} to {max} is credited instantly. No deposit, no sign-up.",
      "card": "Card {n}", "pickOne": "Pick a card", "revealing": "Locking the result…", "won": "Credited", "credited": "Congratulations! Your free win of {amount} has been credited to your wallet.",
      "odds": "Odds", "fairNote": "Same Provably Fair roll as paid boxes — your card pick is cosmetic and never changes the result",
      "creditedToast": "Daily Free Box — {amount} credited", "close": "Close",
      "cooldownNote": "The daily free box can be opened once every 24 hours."
    },
    "community": {
      "eyebrow": "Community Wall", "title": "Real Unboxing Reviews", "you": "You", 
      "bonusBanner": "Post a photo review after delivery and get an instant", "bonusBannerTail": "bonus cashback", "write": "Write a review",
      "badgeShipping": "Shipping verified", "badgeOnchain": "{explorer} on-chain proof",
      "writeTitle": "Photo Review", "writeBonus": "Instant bonus on submit", "noEligible": "You need a delivered item to write a review. Request shipping from your vault first.",
      "pickItem": "Received item", "photo": "Unboxing photo", "photoHint": "Choose a photo (optional)", "rating": "Rating", "text": "One-line review", "textHint": "One honest line is enough (5+ characters)",
      "submit": "Submit & get {bonus}", "bonusToast": "Review posted — {amount} bonus credited",
      "errors": {"item": "Pick an item", "text": "Write at least 5 characters", "photo": "Could not load the photo"},
      "bonusNote": "The {bonus} bonus is credited to your account the moment your review is posted.",
      "empty": "No reviews yet. Received your item? Post the first review and take the 10 USDT bonus.", "emptyCta": "Open a box", "close": "Close"
    },
    "ticker": {"label": "Live drops", "live": "LIVE", "lineup": "{box} · {item} {mult} jackpot", "win": "{box} ➔ {item}", "cashout": "cashed out {amount}", "ship": "requested shipping for {item}", "ago": "({s}s ago)"},
    "onboarding": {
      "title": "How it works in 3 steps",
      "step1Title": "Pick a box", "step1Desc": "From $1. Rolex, Tesla, Apple.",
      "step2Title": "Open it fair", "step2Desc": "Sealed by SHA-256. No tampering.",
      "step3Title": "Ship or cash out 95%", "step3Desc": "Free shipping, or USDT in a second."
    },
    "counters": {"label": "Trust metrics", "shipments": "Physical items shipped today", "shipmentsUnit": "items", "cashouts": "Settled cashouts today", "verification": "Provably fair verification rate", "odds": "Published odds entries", "oddsUnit": "items", "sellback": "Instant cash-out rate", "verifiedOf": "{n} of my opens re-verified"},
    "proof": {
      "title": "Live Proof of Payout & Delivery", "live": "LIVE", "tab": {"payouts": "USDT Payouts", "shipments": "Shipments"},
      "kind": {"withdraw": "Withdrawal", "sellback": "Instant sell-back"}, "viewOnExplorer": "View on {explorer}", "track": "Track parcel",
      "carriers": {"CJ": "CJ Logistics", "EPOST": "Korea Post", "DHL": "DHL", "FEDEX": "FedEx"},
      "reserveEyebrow": "Proof of Reserves", "reserveBody": "GACHAFLIX keeps liquid payout reserves in an on-chain wallet to protect user assets and guarantee instant withdrawals. Anyone can check the balance at the address below.",
      "reserveWallet": "Reserve wallet", "reserveBalance": "Current balance", "copyAddress": "Copy address",
      "emptyPayouts": "No payouts recorded yet.", "emptyShipments": "No shipments recorded yet.", "emptyCta": "Open a box", "pendingTx": "Awaiting broadcast", "settledInstant": "Settled instantly"
    },
    "withdraw": {
      "title": "Withdraw USDT", "close": "Close", "available": "Available balance", "network": "Withdrawal network", "address": "Destination wallet address", "addressHint": "Address starting with {hint}",
      "amount": "Amount", "min": "Min {min}", "max": "MAX", "fee": "Network fee", "feeShort": "Fee", "net": "You receive", "netLabel": "Net amount you receive",
      "submit": "Submit withdrawal", "requested": "Withdrawal submitted", "txId": "Transaction ID", "at": "Submitted at", "another": "New withdrawal", "done": "Done", "history": "Recent withdrawals",
      "status": {"PENDING": "Pending", "BROADCASTING": "Broadcasting", "COMPLETED": "Completed"},
      "txHash": "On-chain TxID", "txHashPending": "The TxID appears after broadcast", "copyHash": "Copy TxID", "viewOnExplorer": "View on {explorer}",
      "errors": {"TRC20": "A TRC-20 address is 34 characters starting with T", "BEP20": "A BEP-20 address is 42 characters starting with 0x", "min": "Minimum withdrawal is {min}", "insufficient": "Insufficient balance", "nan": "Enter an amount"},
      "processingNote": "Withdrawals are signed and broadcast after a security review. The TxID and explorer link appear here once complete.", "networkNote": "Withdrawals are sent to the blockchain network as soon as they are requested, and the on-chain transaction can be viewed live on TronScan / BscScan.",
      "requestedToast": "Withdrawal submitted — {amount} deducted"
    },
    "vip": {"title": "VIP tier {tier}", "tiers": {"member": "Member", "silver": "Silver", "gold": "Gold", "black": "Black"}},
    "footer": {
      "slogan": "The most transparent blockchain-based luxury mystery box platform for real goods",
      "service": "Service", "guide": "Help & Policies", "support": "Support",
      "links": {"dollar": "$1 boxes", "vault": "Luxury vault", "feed": "Live payout feed", "verifier": "Fairness verifier", "terms": "Terms of Service", "privacy": "Privacy Policy", "policy": "Shipping & 95% cash-out policy", "faq": "FAQ", "telegram": "Telegram 24/7 live support", "discord": "Official Discord", "notice": "Announcements"},
      "disclaimer": "GACHAFLIX is a global e-commerce mystery box platform. Every opening result is published transparently through a tamper-proof SHA-256 algorithm, and every winning item is guaranteed to ship as a physical product or to cash out instantly to USDT."
    },
    "legalDocs": {
      "eyebrow": "Help & Policies", "updated": "Last updated September 18, 2026",
      "terms": {"title": "Terms of Service", "sections": [
        {"h": "1. The service", "p": "GACHAFLIX sells mystery boxes with fully published odds and either ships the winning item or cashes it out instantly at 95% of market value in USDT."},
        {"h": "2. Account and balance", "p": "Balances are held in USDT. Deposits, withdrawals, openings and cash-outs are recorded as transactions and used for nothing other than purchases and withdrawals."},
        {"h": "3. Odds and fairness", "p": "Every box publishes its per-item odds before opening. Results are fixed by a server seed hash published in advance and the user's client seed, and anyone can reproduce and verify them."},
        {"h": "4. Cancellation and refunds", "p": "A box cannot be cancelled once opening starts. Any winning item can be cashed out at 95% or shipped at any time."},
        {"h": "5. Responsibility", "p": "Users are responsible for complying with local law. In case of a service failure balances are restored from the transaction record."}
      ]},
      "privacy": {"title": "Privacy Policy", "sections": [
        {"h": "1. What we collect", "p": "Recipient name, phone, address and customs identifier for shipping; wallet address for withdrawals; transaction identifiers for payments. Card details are handled by the payment processor and never stored by us."},
        {"h": "2. Why", "p": "Only for shipping, withdrawals, fraud prevention and support."},
        {"h": "3. Retention", "p": "Kept for the period required by law after shipping or withdrawal completes, then deleted without delay."},
        {"h": "4. Third parties", "p": "Only the minimum needed is shared with carriers (shipping) and payment processors (payments)."},
        {"h": "5. Your rights", "p": "You can request access, correction or deletion at any time through support."}
      ]},
      "policy": {"title": "Shipping & 95% Cash-Out Policy", "sections": [
        {"h": "1. Instant cash-out", "p": "Any item in your vault can be cashed out instantly at 95% of market value in USDT, credited to your balance immediately."},
        {"h": "2. Physical shipping", "p": "International shipping is deducted from your balance on request; destination duties and VAT are paid on delivery. Korea ships via CJ Logistics, international via DHL/FedEx, and the tracking number appears in your vault once issued."},
        {"h": "3. Withdrawals", "p": "USDT withdrawals run on TRC-20 (1.00 USDT fee) or BEP-20 (0.80 USDT fee) with a 20 USDT minimum. The TxID and explorer link are provided after broadcast."},
        {"h": "4. Floor value guarantee", "p": "The lowest item in every box can be cashed out for at least 80% of the open price."}
      ]},
      "faq": {"title": "FAQ", "sections": [
        {"h": "Can I really start with 1 USDT?", "p": "Yes. The $1 category opens for 1.00 USDT, and even a miss returns 0.85 USDT instantly."},
        {"h": "How do I know a result wasn't rigged?", "p": "Press the 1-second fairness check on any result or vault card. It replays the pre-committed hash, the roll number and the bracket match in three steps."},
        {"h": "Can I take cash instead of the item?", "p": "Any time — cash out 95% of market value to USDT from your vault."},
        {"h": "How long do withdrawals take?", "p": "They are broadcast after a security review; the TxID and TronScan/BscScan link appear once complete."}
      ]}
    },
    "actions": {"sellBack": "Cash out 95%", "claimShipping": "Ship to me", "provablyFair": "Provably Fair"},
    "legal": {"disclaimer": "Amounts shown are market value. Cashing out an item instantly pays {refund} of market value, so cash recovery is below the open price. Every probability is published in full under [See what's inside]."},
    "badges": {"dream": "Dream Box", "mobility": "Mobility", "tech": "Tech", "audio": "Audio", "watch": "Watches", "luxury": "Luxury", "lifestyle": "Lifestyle", "guaranteed": "Guaranteed", "dollar": "$1", "gold": "Gold"},
  },
  "zh": {
    "nav": {"boxes": "盲盒", "battles": "对战", "inventory": "仓库", "fairness": "公平性验证", "community": "社区", "highRoller": "高额玩家", "tech": "科技", "luxury": "奢侈品"},
    "header": {"balance": "余额", "language": "语言", "currency": "货币", "deposit": "充值", "withdraw": "提现", "welcomeToast": "新人奖励 {amount} 已到账 — 开启真实盲盒吧"},
    "hero": {
      "royalSelection": "皇家精选", "top": "TOP {n}", "pricePerOpen": "单次开启", "topPull": "最高奖品",
      "noBlank": "100% 实物发放 · 无空奖", "guaranteedMinLabel": "保底价值",
      "guaranteedMin": "保底价值 {value}", "aboveOpenPrice": "不低于开启价",
      "openNow": "立即开启", "viewContents": "看看里面", "billboardPicker": "选择展示", "billboardOf": "{title} 展示",
      "headline": "1 美元，博劳力士和 iPhone。", "sub": "中了 100% 归你，没中也立即折现 95%。", "freeTry": "免费试玩", "openFor": "🔥 {price} 开一发", "badge": "1 美元起的奢品头奖", "nowShowing": "正在上映", "topMultipleShort": "最高 {n}"
    },
    "card": {"perOpen": "单次", "top": "最高", "guaranteedMinShort": "保底 {value}", "noBlankBadge": "100% 不落空 · 最低 {value} 保底", "settleBadge": "全品类 95% USDT 即时结算", "upTo": "最高 {n} 头奖", "rtp": "RTP {rate}%", "floorPct": "最低 {pct}% 返还", "guaranteed": "保底", "openNow": "立即开", "contents": "详情", "details": "{title} 详情", "expand": "展开"},
    "rows": {"trending": "🔥 开启最多的盲盒 TOP 10", "dollar": "🔥 1 美元盲盒", "techMobility": "⚡ 苹果与科技", "luxuryWatch": "👑 奢品与腕表", "guaranteed": "🚗 超跑与金条", "prev": "上一页", "next": "下一页"},
    "grid": {"title": "全部盲盒", "sort": "排序", "loadMore": "加载更多（{n}）"},
    "categories": {"all": "全部", "dollar": "🔥 1 美元盲盒", "tech": "⚡ 苹果与科技", "luxury": "👑 奢品与腕表", "jackpot": "🚗 超跑与金条"},
    "sorts": {"featured": "推荐", "price-asc": "价格从低到高", "price-desc": "价格从高到低", "popularity": "人气"},
    "tiers": {
      "legendTitle": "等级 = 市场价 ÷ 开启价",
      "royal": "皇家", "prestige": "尊享", "executive": "行政", "curated": "精选",
      "range": {"royal": "20倍以上", "prestige": "6~20倍", "executive": "2~6倍", "curated": "基础保底"},
      "multiple": "{n}倍"
    },
    "modal": {
      "details": "{title} 详情", "close": "关闭", "topRank": "TOP {n}", "openNowPrice": "立即开启 · {price}", "viewOdds": "查看全部概率",
      "openPrice": "开启价", "guaranteedMin": "保底价值", "topPrize": "最高奖品", "topMultiple": "最高倍数",
      "tierOdds": "各等级中奖概率", "breakEven": "不低于 {price} 的概率 {rate}",
      "explain": "等级并非存储值，而是由市场价 ÷ 开启价的倍数推导。每次开启的期望市场价为 {ev}，相当于开启价的 {retail}。若即时回收，仅按市场价的 {refund} 支付，因此按现金计算的回收率为 {cash}，低于开启价。",
      "guaranteedYes": "本盲盒的保底档为 {min} 即时返现——开箱即刻 100% 计入余额。",
      "guaranteedNo": "本盲盒的保底档为 {min} 即时返现——开箱即刻 100% 计入余额。",
      "settleBadge": "⚡ 全品类一键 95% USDT 即时结算，可提现至个人钱包",
      "settleBody": "实物与礼品卡可一键按市场价 95% 折现为 USDT；USDT 返现与即时到账在开箱时 100% 计入余额。余额可提现至 TRC-20 / BEP-20 个人钱包。",
      
      "allPrizes": "全部可得商品", "count": "{n} 件", "sortedByValue": "按市场价降序",
      "marketValue": "市场价", "odds": "概率", "tierLabel": "等级", "tierBar": "等级构成", "upToLabel": "最高头奖", "rtpLabel": "返还率 RTP", "floorLabel": "保底返还", "floorPct": "最低 {pct}%", "preciseOddsLink": "公平性验证 (Provably Fair)", "preciseOdds": "精确概率表 · Provably Fair", "expand": "展开", "collapse": "收起", "openVerifier": "打开 3 步可视化验证器", "imageCredits": "图片来源"
    },
    "fairness": {
      "title": "公平性验证", "eyebrow": "Provably Fair · HMAC-SHA256",
      "subtitle": "每次开启结果由服务器种子 + 客户端种子 + Nonce 决定。服务器种子的 SHA-256 哈希在开启前公开，开启后公开原文，任何人都可复现相同结果。",
      "formula": "roll = HMAC-SHA256(服务器种子, 客户端种子:Nonce) 的前 8 位 hex → 整数 → mod {range}",
      "step1": "开启前，公开服务器种子的 SHA-256 哈希。", "step2": "用户可自行设定客户端种子或随机获取。Nonce 每次开启递增 1。",
      "step3": "开启后公开服务器种子原文。填入下方验证器，即可完整复现哈希、roll 与中奖商品。",
      "serverSeed": "服务器种子", "serverSeedHash": "已公开的服务器种子哈希（可选）", "clientSeed": "客户端种子", "nonce": "Nonce", "box": "盲盒",
      "verify": "验证", "verifying": "计算中…", "clear": "清空",
      "resultHash": "服务器种子 SHA-256", "resultHmac": "HMAC-SHA256", "resultRoll": "Roll 数值", "resultItem": "中奖商品", "resultRange": "中奖区间",
      "hashMatch": "与公开哈希一致", "hashMismatch": "与公开哈希不一致 — 服务器种子不同", "hashSkipped": "未填写公开哈希",
      "rangeNote": "Roll 范围 0 ~ {max}（{resolution}% 精度）", "outOf": "{roll} / {max}",
      "tryTitle": "亲手试试种子承诺", "tryBody": "生成新的服务器种子后仅显示哈希。点击公开后显示原文，可填入验证器复现结果。",
      "generate": "生成服务器种子", "reveal": "公开服务器种子", "hidden": "开启前 — 原文未公开", "useInVerifier": "填入验证器",
      "invalidInput": "请输入服务器种子与客户端种子，Nonce 须为 ≥ 0 的整数。",
      "open": "打开公平性验证", "close": "关闭",
      "visual": {
        "eyebrow": "一键可视化验证", "title": "3 秒公平性验证", "body": "无需数学公式。选择最近一次开箱并点击「验证」，三个步骤依次完成。128 位十六进制输入位于专家模式。",
        "expert": "专家模式", "expertTitle": "手动验证器（服务器种子 · 客户端种子 · Nonce）",
        "pick": "选择最近开箱", "noRecent": "暂无可验证的开箱记录。", "goOpen": "去开盲盒", "verify": "验证", "reverify": "再次验证", "verifying": "验证中…", "close": "关闭",
        "s1Title": "🔒 事前加密封存", "s1Body": "开箱之前结果已由 SHA-256 哈希封存，即使服务器管理员也无法中途更改。",
        "s1Pass": "封存一致 — 服务器种子与开箱前公布的哈希相符", "s1Fail": "封存不一致 — 服务器种子与公布的哈希不符",
        "s2Title": "🎲 结合我的浏览器随机数", "s2Body": "与您设备的客户端种子结合，推导出确定性的掷点数字。", "rollLabel": "掷点数字",
        "s3Title": "🎯 区间匹配", "s3Body": "掷点精确落在该盲盒中奖区间的仪表条内，证明中奖合法。",
        "s3Pass": "区间匹配 —", "s3Fail": "区间不匹配 —", "bracket": "区间 {from} ~ {to}（{pct}%）", "gaugeHint": "中奖区间仪表 · 白线为您的掷点",
        "verdictPass": "验证完成 · 未被篡改", "verdictPassBody": "三个步骤全部通过。任何人都能复现同样的结果。",
        "verdictFail": "验证失败", "verdictFailBody": "复现值与记录不符。请在专家模式检查输入值。"
      }
    },
    "unbox": {
      "open1": "开启 ×1", "open5": "连续开启 ×5", "trialLabel": "免费过把瘾", "trialCongrats": "手感不错！免费试玩抽中 {item}（{n}）", "trialBody": "用 {bonus} 新人奖励开启真实盲盒吧！", "trialCta": "领取奖励并开启真实盲盒", "trialCtaClaimed": "开启真实盲盒", "trialNote": "免费试玩结果不参与配送与折现。真正开箱请点上方按钮。", "spinning": "开启中…", "landing": "结果已锁定",
      "result": "获得", "results": "5 次结果", "total": "总价值", "paid": "已支付 {price}",
      "sellBack": "95% 立即折现 · {amount}", "sellBackAll": "全部 95% 立即折现 · {amount}", "cashoutCta": "⚡ 95% USDT 即时折现", "noFee": "0 手续费", "shipSub": "实物 · 免费配送", "cashCredited": "{amount} 已即时计入余额", "respin": "🔥 {price} 再来一发", "sellBackNote": "按市场价的 {rate} 即时计入余额",
      "sold": "已折现 — 余额 +{amount}", "claimShipping": "寄到家",
      "shippingNotice": "国际运费与关税说明", "shippingBody": "目的地关税/增值税及国际运费（DHL/FedEx 实付）另行收取。",
      "verify": "1 秒公平性验证", "close": "关闭", "keep": "存入仓库", "kept": "已存入仓库 — 关闭后仍会保留",
      "insufficient": "余额不足 — 需要 {price}", "topUp": "充值", "toppedUp": "+{amount} 已计入",
      "mute": "关闭音效", "unmute": "开启音效",
      "seedHash": "服务器种子哈希（开启前公开）", "serverSeed": "服务器种子", "clientSeed": "客户端种子", "nonce": "Nonce", "roll": "Roll",
      "fairNote": "本次结果由以下种子与 Nonce 决定。可在[验证本次结果]中完整复现。"
    },
    "deposit": {
      "title": "充值", "eyebrow": "Wallet · Deposit", "tabUsdt": "USDT 充值", "tabCard": "信用卡支付",
      "network": "选择网络", "recommended": "推荐 · 手续费低于 1 USDT", "chain": "{chain}",
      "address": "充值钱包地址", "copy": "一键复制", "copied": "地址已复制", "qrHint": "请用钱包 App 扫描二维码",
      "addressIssuing": "正在生成充值地址…", "addressError": "地址生成失败，请稍后重试。", "addressPending": "向专属充值地址转入 USDT，12 个区块确认后即自动计入账户余额。",
      "guideTitle": "充值说明", "guideMin": "最低充值 {min}", "guideConfirm": "区块链 {n} 次确认后自动到账", "guideToken": "仅发送所选网络的 USDT。其他币种或网络无法找回",
      "guideTime": "约 {sec} 秒/区块 · 约 {min} 分钟",
      "status": "充值状态", "waiting": "等待入账", "watching": "正在实时监测区块链网络确认。", "confirming": "确认 {n} / {total}", "credited": "已计入余额",
     
      "amount": "金额 (USDT)", "belowMin": "最低充值为 {min}",
      "creditedToast": "+{amount} 已计入余额",
      "close": "关闭"
    },
    "cardPay": {
      "quick": "快捷充值", "custom": "自定义金额", "amount": "支付金额", "credit": "计入余额",
      "provider": "支付方式", "providerStripe": "Stripe · 国际信用卡", "providerPortone": "PortOne · 韩国信用卡", "cardSoon": "信用卡支付即将开放，目前请使用 USDT 充值。",
     
      "pay": "支付 {amount}", "processing": "支付处理中…", "belowMin": "最低支付金额为 {min}", "aboveMax": "最高支付金额为 {max}", "invalid": "请检查金额",
      "declined": "卡片被拒绝", "declinedHint": "发卡行拒绝了此卡，请换一张卡重试。",
      "receipt": "收据", "receiptId": "交易编号", "receiptAt": "批准时间", "receiptCard": "卡片", "receiptPaid": "支付金额", "receiptCredited": "计入余额", "receiptProvider": "支付方式",
      "done": "完成", "creditedToast": "+{amount} 已计入余额（信用卡）", "history": "最近充值记录", "noHistory": "暂无充值记录",
      "txDepositCard": "信用卡充值", "txDepositUsdt": "USDT 充值", "txOpen": "开启盲盒", "txSellback": "即时回收"
    },
    "inventory": {
      "title": "仓库", "eyebrow": "My Vault", "empty": "仓库还是空的。开启盲盒来填满它吧。", "goBoxes": "浏览盲盒",
      "summary": "共 {n} 件 · 仓库总价值 {value}", "storedCount": "保管中 {n}", "shippingCount": "发货 {n}", "soldCount": "已回收 {n}",
      "filterStatus": "状态", "filterTier": "等级", "all": "全部", "tabHeld": "持有中 ({n})", "tabDone": "已处理 ({n})", "cashableValue": "可即时折现总价值", "doneSold": "95% 折现完成 +{amount}", "doneCash": "返现已计入 +{amount}", "archived": "已处理", "doneShipping": "已发货", "donePreparing": "备货中", "emptyDone": "暂无已处理记录。折现或发货的商品会归档在这里。",
      "status": {"IN_STORAGE": "保管中", "SHIPPING_REQUESTED": "备货中", "SHIPPING": "运输中", "SOLD": "已回收"},
      "acquired": "获得于 {date}", "from": "{box}", "soldFor": "已退回 {amount}", "tracking": "运单号", "trackingPending": "等待运单号",
      "sell": "⚡ 95% USDT 即时折现", "noFee": "0 手续费", "ship": "📦 寄到我家", "verify": "1 秒公平性验证", "select": "选择", "selected": "已选 {n} 件", "selectAll": "全选", "clearSelection": "取消选择",
      "sellSelected": "所选按 {rate} 批量折现", "selectedValue": "总价值：", "soldForLabel": "已退回",
      "totalValue": "仓库总资产", "sellAll": "全部 95% 折现", "sort": "排序", "sorts": {"newest": "最新", "valueDesc": "价值从高到低", "valueAsc": "价值从低到高"},
      "emptyFiltered": "没有符合条件的商品。", "hotTitle": "当前最热盲盒 TOP 3", "hotTop": "最高倍数",
      "track": "查看物流", "trackingTitle": "物流状态", "copyTracking": "复制运单号", "trackOnCarrier": "在 {carrier} 实时查询",
      "carriers": {"CJ": "CJ大韩通运", "EPOST": "韩国邮政", "DHL": "DHL", "FEDEX": "FedEx"},
      "steps": {"requested": "已受理发货申请", "label": "已出运单", "transit": "运输中", "delivered": "已签收"}, "stepCurrent": "当前环节",
      "trackingNote": "出库完成后，物流公司与运单号会显示在此，并开放实时查询链接。", "trackingIssuedNote": "运单已生成。可在 {carrier} 官方查询页面实时查看配送状态。",
      "sellTitle": "95% 即时回收", "sellBody": "确定回收该商品？市场价的 {rate}（{amount}）将即时计入账户余额。",
      "sellBodyMulti": "确定回收 {n} 件商品？市场价的 {rate}（{amount}）将即时计入账户余额。",
      "confirm": "确认", "cancel": "取消", "soldToast": "已回收 — 余额 +{amount}",
      "shipTitle": "申请发货", "shipBody": "国际运费从余额中扣除，目的地关税与增值税在签收时另行支付。",
      "recipient": "收件人姓名", "country": "国家/地区", "phone": "联系电话", "postalCode": "邮政编码", "address": "详细地址",
      "pccc": "个人通关固有编码 (PCCC)", "pcccHint": "P + 12 位数字", "residentId": "居民身份证号", "residentIdHint": "18 位",
      "fee": "运费", "feeFree": "免运费活动", "itemsToShip": "发货 {n} 件", "submitShip": "申请发货 · {fee}", "shipInsufficient": "余额不足以支付运费 {fee}",
      "shipRequestedToast": "已申请发货 — 出单后将显示运单号",
      "errors": {"recipient": "请输入收件人姓名", "phone": "请检查电话格式", "postalCode": "请输入邮政编码", "address": "请输入详细地址", "customsId": "通关标识格式不正确"},
      "countries": {"KR": "韩国", "US": "美国", "CN": "中国", "JP": "日本", "SG": "新加坡", "HK": "中国香港", "TW": "中国台湾", "GB": "英国", "DE": "德国", "FR": "法国", "AU": "澳大利亚", "CA": "加拿大", "AE": "阿联酋"}
    },
    "daily": {
      "title": "每日免费盲盒", "pill": "免费盲盒", "openFree": "免费开启", "nextIn": "距下次开启 {time}",
      "stripBody": "每 24 小时一次，无需支付，{min} ~ {max} 直接计入余额。", "body": "每 24 小时一次。选一张卡，{min} ~ {max} 即时计入余额。无需充值或注册。",
      "card": "卡片 {n}", "pickOne": "请选择一张卡片", "revealing": "结果确定中…", "won": "已计入", "credited": "恭喜！免费中奖金额 {amount} 已即时计入您的钱包余额。",
      "odds": "概率表", "fairNote": "与付费盲盒相同的 Provably Fair 掷点 — 选卡仅为演出，不会改变结果",
      "creditedToast": "每日免费盲盒 — 已计入 {amount}", "close": "关闭",
      "cooldownNote": "每日免费盲盒每 24 小时可开启一次。"
    },
    "community": {
      "eyebrow": "Community Wall", "title": "实物开箱晒单", "you": "我", 
      "bonusBanner": "收到实物后发布照片晒单，立即获得", "bonusBannerTail": "奖励返现", "write": "发布晒单",
      "badgeShipping": "运单已验证", "badgeOnchain": "{explorer} 链上证明",
      "writeTitle": "发布照片晒单", "writeBonus": "提交即得奖励", "noEligible": "需要有已发货的商品才能晒单。请先在仓库申请发货。",
      "pickItem": "已收到的商品", "photo": "开箱照片", "photoHint": "选择照片（可选）", "rating": "评分", "text": "一句话评价", "textHint": "一句真实感受即可（5 字以上）",
      "submit": "提交并领取 {bonus}", "bonusToast": "晒单已发布 — 奖励 {amount} 已计入",
      "errors": {"item": "请选择商品", "text": "评价至少 5 个字", "photo": "无法加载照片"},
      "bonusNote": "晒单发布后，{bonus} 奖励立即计入您的账户余额。",
      "empty": "还没有晒单。收到实物了？发第一条晒单领取 10 USDT 奖励。", "emptyCta": "去开盲盒", "close": "关闭"
    },
    "ticker": {"label": "实时开箱动态", "live": "LIVE", "lineup": "{box} · {item} {mult} 头奖", "win": "{box} ➔ 开出 {item}", "cashout": "已折现 {amount}", "ship": "申请发货 {item}", "ago": "（{s} 秒前）"},
    "onboarding": {
      "title": "3 秒看懂流程",
      "step1Title": "选盲盒", "step1Desc": "1 美元起。劳力士、特斯拉、苹果。",
      "step2Title": "公平开箱", "step2Desc": "SHA-256 封存，无法篡改。",
      "step3Title": "发货或 95% 折现", "step3Desc": "免费寄到家，或 1 秒折现 USDT。"
    },
    "counters": {"label": "信任指标", "shipments": "今日已出库实物", "shipmentsUnit": "件", "cashouts": "今日已结算折现", "verification": "公平性验证完成率", "odds": "已公开概率项", "oddsUnit": "项", "sellback": "即时折现率", "verifiedOf": "我的 {n} 次开箱已复核"},
    "proof": {
      "title": "实付与实发实时证明", "live": "LIVE", "tab": {"payouts": "USDT 实付", "shipments": "实物发货"},
      "kind": {"withdraw": "提现", "sellback": "即时回收"}, "viewOnExplorer": "在 {explorer} 查看", "track": "运单追踪",
      "carriers": {"CJ": "CJ大韩通运", "EPOST": "韩国邮政", "DHL": "DHL", "FEDEX": "FedEx"},
      "reserveEyebrow": "Proof of Reserves · 储备金", "reserveBody": "为保护用户资产并保证即时提现，GACHAFLIX 在链上钱包持有流动性储备金，任何人都可通过下方地址查询余额。",
      "reserveWallet": "储备钱包", "reserveBalance": "当前持有", "copyAddress": "复制地址",
      "emptyPayouts": "暂无支付记录。", "emptyShipments": "暂无发货记录。", "emptyCta": "去开盲盒", "pendingTx": "等待广播", "settledInstant": "即时结算"
    },
    "withdraw": {
      "title": "USDT 提现", "close": "关闭", "available": "可提现余额", "network": "提现网络", "address": "收款钱包地址", "addressHint": "以 {hint} 开头的地址",
      "amount": "提现数量", "min": "最低 {min}", "max": "全部", "fee": "网络手续费", "feeShort": "手续费", "net": "实际到账", "netLabel": "实际到账金额",
      "submit": "提交提现申请", "requested": "提现申请已受理", "txId": "交易 ID", "at": "申请时间", "another": "再次提现", "done": "确定", "history": "最近提现",
      "status": {"PENDING": "审核中", "BROADCASTING": "广播中", "COMPLETED": "已完成"},
      "txHash": "链上 TxID", "txHashPending": "广播后显示 TxID", "copyHash": "复制 TxID", "viewOnExplorer": "在 {explorer} 查看",
      "errors": {"TRC20": "TRC-20 地址为以 T 开头的 34 位字符", "BEP20": "BEP-20 地址为以 0x 开头的 42 位字符", "min": "最低提现数量为 {min}", "insufficient": "余额不足", "nan": "请输入提现数量"},
      "processingNote": "提现经安全审核后签名并广播，完成后 TxID 与浏览器链接会显示在此。", "networkNote": "提现申请后立即发送至区块链网络，链上交易可在 TronScan / BscScan 实时查询。",
      "requestedToast": "提现申请已提交 — 已扣除 {amount}"
    },
    "vip": {"title": "VIP 等级 {tier}", "tiers": {"member": "会员", "silver": "白银", "gold": "黄金", "black": "黑金"}},
    "footer": {
      "slogan": "基于区块链、最透明的实物奢品盲盒平台",
      "service": "服务", "guide": "使用指南", "support": "客户支持",
      "links": {"dollar": "1 美元盲盒", "vault": "奢品金库", "feed": "实时支付动态", "verifier": "公平性验证器", "terms": "服务条款", "privacy": "隐私政策", "policy": "发货与 95% 折现政策", "faq": "常见问题", "telegram": "Telegram 24/7 在线客服", "discord": "官方 Discord", "notice": "公告频道"},
      "disclaimer": "GACHAFLIX 是面向全球用户的电商盲盒平台。所有开箱结果均通过不可篡改的 SHA-256 算法透明公开，中奖商品保证 100% 实物发货或即时折现为 USDT。"
    },
    "legalDocs": {
      "eyebrow": "使用指南", "updated": "最近更新 2026 年 9 月 18 日",
      "terms": {"title": "服务条款", "sections": [
        {"h": "1. 服务", "p": "GACHAFLIX 销售概率完全公开的盲盒，中奖商品可实物发货，或按市场价 95% 即时折现为 USDT。"},
        {"h": "2. 账户与余额", "p": "余额以 USDT 计。充值、提现、开箱与折现均记录为交易，仅用于购买与提现。"},
        {"h": "3. 概率与公平", "p": "每个盲盒在开启前公开各商品概率。结果由事先公布的服务器种子哈希与用户客户端种子决定，任何人都可复现验证。"},
        {"h": "4. 取消与退款", "p": "开箱开始后不可取消。中奖商品可随时选择 95% 折现或实物发货。"},
        {"h": "5. 责任", "p": "用户须遵守所在地法律。服务故障时以交易记录为准恢复余额。"}
      ]},
      "privacy": {"title": "隐私政策", "sections": [
        {"h": "1. 收集项目", "p": "发货所需的收件人姓名、电话、地址与通关标识；提现所需的钱包地址；支付处理所需的交易标识。卡片信息由支付机构处理，本公司不存储。"},
        {"h": "2. 使用目的", "p": "仅用于发货、提现、防止滥用及客服。"},
        {"h": "3. 保存与销毁", "p": "发货或提现完成后按法定期限保存，随后立即销毁。"},
        {"h": "4. 第三方提供", "p": "仅向物流公司（发货信息）与支付机构（支付信息）提供最少必要信息。"},
        {"h": "5. 用户权利", "p": "可随时通过客服申请查阅、更正或删除。"}
      ]},
      "policy": {"title": "发货与 95% 折现政策", "sections": [
        {"h": "1. 即时折现", "p": "仓库中的中奖商品可随时按市场价 95% 即时折现为 USDT，即刻计入余额。"},
        {"h": "2. 实物发货", "p": "国际运费在申请时从余额扣除，目的地关税与增值税在签收时另付。韩国由 CJ 大韩通运发货，海外由 DHL/FedEx 发货，运单号生成后显示在仓库中。"},
        {"h": "3. 提现", "p": "USDT 提现支持 TRC-20（手续费 1.00 USDT）或 BEP-20（手续费 0.80 USDT），最低 20 USDT。广播后提供 TxID 与浏览器链接。"},
        {"h": "4. 保底价值", "p": "每个盲盒的最低商品都能以开启价 80% 以上的价值即时折现。"}
      ]},
      "faq": {"title": "常见问题", "sections": [
        {"h": "真的能从 1 USDT 开始吗？", "p": "是的。1 美元盲盒以 1.00 USDT 开启，即使落空也立即返还 0.85 USDT。"},
        {"h": "如何确认结果没有被操控？", "p": "在结果弹窗或仓库卡片点击「1 秒公平性验证」，会分三步复现事前封存哈希、掷点数字与区间匹配。"},
        {"h": "可以不要实物直接拿现金吗？", "p": "随时可以 — 在仓库中按市场价 95% 折现为 USDT。"},
        {"h": "提现需要多久？", "p": "经安全审核后广播，完成后显示 TxID 与 TronScan/BscScan 链接。"}
      ]}
    },
    "actions": {"sellBack": "95% 即时回收", "claimShipping": "寄到家", "provablyFair": "公平性验证"},
    "legal": {"disclaimer": "所示金额均为市场价。即时折现按市场价的 {refund} 支付，因此现金回收额低于开启价。全部概率在「看看里面有什么」中完整公开。"},
    "badges": {"dream": "梦想盲盒", "mobility": "出行", "tech": "科技", "audio": "音频", "watch": "腕表", "luxury": "奢侈品", "lifestyle": "生活方式", "guaranteed": "保底", "dollar": "1 美元", "gold": "黄金"},
  },
}

# 한국어 badge 문자열 → badges 키
BADGE_KEY = {"드림 박스": "dream", "모빌리티": "mobility", "테크": "tech", "오디오": "audio", "워치": "watch", "럭셔리": "luxury", "라이프스타일": "lifestyle", "가치 보장": "guaranteed", "1달러": "dollar", "골드": "gold"}

ZH_BOX = {
  "dollar-apple": ("1 美元苹果大奖", "1 美元博 iPhone 16 Pro。没中退 0.85 USDT。"),
  "dollar-galaxy": ("1 美元 Galaxy 大奖", "1 美元博 Galaxy Z Fold8。没中退 0.85 USDT。"),
  "dollar-gaming": ("1 美元游戏大奖", "1 美元博 RTX 5090、Switch 2。没中退 0.85 USDT。"),
  "starter-ps5": ("咖啡价 PS5 入门", "3 美元博 PS5 Pro。没中退 2.5 USDT。"),
  "starter-macbook": ("咖啡汉堡 MacBook 大奖", "5 美元博 MacBook Pro M4 Max。没中退 4.2 USDT。"),
  "starter-phone": ("5 美元 iPhone 17 大奖", "5 美元博 iPhone 17 Pro Max。没中退 4.2 USDT。"),
  "vault-submariner": ("劳力士潜航者金库", "20 美元博劳力士潜航者。没中退 17.5 USDT。"),
  "vault-omega": ("瑞士腕表金库", "25 美元博欧米茄、帝舵、天梭。没中退 21.8 USDT。"),
  "vault-handbag": ("奢侈手袋金库", "30 美元博爱马仕 Birkin。没中退 26 USDT。"),
  "vault-gold": ("金条金库", "50 美元博 1kg 金条。没中退 43.7 USDT。"),
  "jackpot-cybertruck": ("Cybertruck 头奖", "100 美元博 Cybertruck。没中退 95 USDT。"),
  "jackpot-supercar": ("超跑头奖", "100 美元博保时捷 911。没中退 95 USDT。"),
  "cybertruck-dream": ("赛博皮卡梦想", "以一辆特斯拉 Cybertruck 为顶配的出行组合。最低档商品同样实物发货。"),
  "urban-mobility": ("都市出行", "以城市通勤工具为核心。电动滑板车与折叠自行车位于上层。"),
  "apex-workstation": ("巅峰工作站", "以 MacBook Pro M4 Max 为顶配的生产力装备组合，外设亦实物发货。"),
  "flagship-phone": ("旗舰手机", "最新旗舰智能手机阵容。最低档亦为正品配件。"),
  "gpu-rig": ("显卡主机", "以显卡与外设为核心。顶配为 RTX 5090 Founders Edition。"),
  "camera-studio": ("影像工作室", "以无反机身与定焦镜头为核心。最低档为正品背带套装。"),
  "reference-audio": ("参考级音频", "以监听音箱与耳机为核心。最低档为正品线材套装。"),
  "rolex-vault": ("劳力士金库", "附正品保卡的腕表组合。顶配为劳力士迪通拿 116500LN。"),
  "swiss-watch": ("瑞士腕表", "以入门级瑞士制造为核心。所有商品均附正品保卡。"),
  "luxury-leather": ("奢华皮具", "奢侈品皮具组合。附正品发票与防尘袋一同发货。"),
  "grail-handbag": ("圣杯手袋", "仅由高端手袋构成的上层盲盒。最低档亦为奢侈品正品。"),
  "sneaker-drop": ("球鞋发售", "以限量发售球鞋为核心。全部商品经正品验证后发货。"),
  "guaranteed-tech": ("科技保底", "全部商品的市场价均不低于开启价。最低档亦为正品原价商品。"),
  "guaranteed-luxury": ("奢侈品保底", "全部商品的市场价均不低于开启价。附正品发票。"),
  "guaranteed-daily": ("日常保底", "全部商品的市场价均不低于开启价。贴近生活的组合。"),
}

ZH_ITEM = {
  "da-iphone16": "iPhone 16 Pro 256GB", "da-watchse": "Apple Watch SE 3", "da-airpods4": "AirPods 4 ANC", "da-magsafe": "MagSafe 充电器 25W", "da-cable": "Apple USB-C 充电线 1m", "da-sticker": "Apple 贴纸包 + 理线带",
  "da-buds": "Galaxy Buds4 Pro", "da-charger": "三星 45W 超快充充电器", "da-tag": "Galaxy SmartTag2", "da-strap": "Galaxy Watch 运动表带", "da-sticker2": "Galaxy 贴纸包 + 理线带",
  "dg-ps5": "PlayStation 5 Slim", "dg-switch2": "任天堂 Switch 2", "dg-gift": "Steam 礼品卡 10 USDT", "dg-keycap": "手工键帽 1 枚",
  "sp-ps5pro": "PlayStation 5 Pro", "sp-switch2": "任天堂 Switch 2", "sp-headset": "索尼 INZONE H9 耳机", "sp-dualsense": "DualSense Edge 手柄", "sp-game": "最新游戏 1 款（数字版）", "sp-gift": "PSN 礼品卡 10 USDT", "sp-cable": "USB-C 游戏线 2m",
  "sm-gift": "Apple 礼品卡 10 USDT", "sm-stand": "铝合金笔记本支架",
  "sp2-airpods": "AirPods 4", "sp2-gift": "Apple 礼品卡 10 USDT",
  "vs-nato": "NATO 表带 2 条装",
  "vh-pouch": "皮革手拿包 + 防尘袋",
  "vg-gold1kg": "金条 1kg（99.99%）", "vg-gold100g": "金条 100g", "vg-gold10g": "金条 10g", "vg-coin": "金币 1/10 盎司", "vg-silver": "银条 100g",
  "jc-diecast": "Cybertruck 1:18 合金模型 + 周边套装",
  "js-porsche": "保时捷 911 Carrera", "js-modely": "特斯拉 Model Y 长续航版", "js-ducati": "杜卡迪 Panigale V2", "js-model": "保时捷 911 1:18 模型车 + 周边套装",
  "ctd-cybertruck": "特斯拉 Cybertruck 创始版", "ctd-model3": "特斯拉 Model 3 高性能版", "ctd-visionpro": "Apple Vision Pro 1TB",
  "ctd-segway": "九号 GT3 Pro 电动滑板车", "ctd-brompton": "Brompton P Line Urban 折叠车", "ctd-dji": "DJI Air 3S 畅飞套装",
  "ctd-helmet": "Schuberth C5 头盔", "ctd-jordan": "Nike Air Jordan 1 Retro High", "ctd-tracker": "AirTag 4件装 + 皮革扣", "ctd-cable": "Anker 尼龙充电线套装",
  "urb-vanmoof": "VanMoof S5 电动自行车", "urb-segway": "九号 Max G2", "urb-brompton": "Brompton C Line Explore", "urb-garmin": "Garmin Edge 1050 码表",
  "urb-helmet": "POC Urbane 头盔", "urb-lock": "ABUS Granit 链条锁", "urb-light": "Lumos 智能车灯套装", "urb-bottle": "CamelBak 保温水壶",
  "apx-mbp": "MacBook Pro 16 M4 Max 128GB", "apx-studio": "Mac Studio M4 Ultra", "apx-xdr": "Pro Display XDR", "apx-mba": "MacBook Air 15 M4",
  "apx-ipad": "iPad Pro 13 M5", "apx-mx": "罗技 MX Master 4 + MX 键盘", "apx-dock": "CalDigit TS5 Plus 扩展坞", "apx-hub": "Anker Prime USB-C 集线器",
  "apx-sleeve": "Bellroy 笔记本内胆包", "apx-cable": "Belkin 240W USB-C 线",
  "flg-fold": "Galaxy Z Fold8 1TB", "flg-iphone": "iPhone 17 Pro Max 1TB", "flg-flip": "Galaxy Z Flip8", "flg-pixel": "Pixel 10 Pro XL",
  "flg-watch": "Apple Watch Ultra 3", "flg-buds": "AirPods Pro 3", "flg-case": "MagSafe 皮革保护壳", "flg-charger": "Anker MagGo 三合一充电支架", "flg-film": "钢化玻璃膜 2 片装",
  "gpu-5090": "GeForce RTX 5090 Founders", "gpu-5080": "GeForce RTX 5080", "gpu-cpu": "锐龙 9 9950X3D", "gpu-monitor": "LG UltraGear 27 OLED 480Hz",
  "gpu-ssd": "三星 990 Pro 4TB", "gpu-kb": "Wooting HE65 磁轴键盘", "gpu-mouse": "雷蛇 Basilisk V4 Pro", "gpu-pad": "Artemus XL 桌垫", "gpu-fan": "猫头鹰 NF-A12 3 只装",
  "cam-a1": "索尼 A1 II 机身", "cam-r5": "佳能 EOS R5 Mark II", "cam-leica": "徕卡 Q3 43", "cam-lens": "索尼 FE 50mm F1.2 GM", "cam-fuji": "富士 X100VI",
  "cam-gimbal": "DJI RS 4 Pro", "cam-tripod": "捷信 GT2545T 旅行者", "cam-sd": "索尼 TOUGH CFexpress 320GB", "cam-bag": "Peak Design Everyday 30L 背包", "cam-strap": "Peak Design Leash 背带套装",
  "aud-genelec": "真力 8361A 一对", "aud-focal": "劲浪 Utopia 2022", "aud-he1000": "HIFIMAN Susvara Unveiled", "aud-dac": "Chord Anni DAC",
  "aud-sony": "索尼 WH-1000XM6", "aud-airpods": "AirPods Max USB-C", "aud-iem": "Unique Melody MEST MK3", "aud-stand": "胡桃木耳机架", "aud-cable": "Mogami 2549 平衡线",
  "rlx-daytona": "劳力士迪通拿 116500LN", "rlx-sub": "劳力士潜航者 126610LN", "rlx-gmt": "劳力士 GMT-Master II 百事圈", "rlx-ap": "爱彼皇家橡树 15500ST",
  "rlx-omega": "欧米茄超霸 Pro", "rlx-tudor": "帝舵碧湾 58", "rlx-seiko": "精工 Prospex Marinemaster", "rlx-hamilton": "汉米尔顿卡其野战机械款", "rlx-strap": "正品皮革表带 + 工具套装", "rlx-roll": "腕表卷收纳袋",
  "sws-omega": "欧米茄海马 Aqua Terra 150M", "sws-tudor": "帝舵 Pelagos 39", "sws-longines": "浪琴先行者 Zulu Time", "sws-oris": "豪利时 Aquis Date",
  "sws-tissot": "天梭 PRX Powermatic 80", "sws-hamilton": "汉米尔顿爵士开心款", "sws-certina": "雪铁纳 DS Action 潜水表", "sws-strap": "瑞士橡胶表带 2 条", "sws-box": "胡桃木表盒 6 格",
  "lth-birkin": "爱马仕 Birkin 30 Togo", "lth-kelly": "爱马仕 Kelly 28", "lth-chanel": "香奈儿 Classic Flap 中号", "lth-lv": "路易威登 Capucines MM",
  "lth-loewe": "罗意威 Puzzle 小号", "lth-goyard": "戈雅 Saint Louis PM", "lth-wallet": "葆蝶家 Intrecciato 钱包", "lth-card": "普拉达 Saffiano 卡包", "lth-belt": "万宝龙双面腰带", "lth-key": "意大利皮革钥匙包",
  "grl-birkin25": "爱马仕 Birkin 25 鳄鱼皮", "grl-kelly25": "爱马仕 Kelly 25 Sellier", "grl-chanel19": "香奈儿 19 大号", "grl-dior": "迪奥 Lady Dior 中号",
  "grl-lv": "路易威登 Alma BB Epi", "grl-celine": "思琳 Triomphe 中号", "grl-ysl": "圣罗兰 Loulou 小号", "grl-polene": "Polène Numéro Un Nano", "grl-charm": "皮革包挂 + 防尘袋",
  "snk-dior": "Air Jordan 1 High x Dior", "snk-offwhite": "Nike Dunk Low x Off-White", "snk-travis": "AJ1 Low x Travis Scott", "snk-yeezy": "Yeezy Boost 350 V2",
  "snk-nb": "New Balance 990v6 美产", "snk-dunk": "Nike Dunk Low Retro", "snk-sambda": "阿迪达斯 Samba OG", "snk-care": "Jason Markk 鞋履护理套装", "snk-lace": "高级蜡质鞋带 3 套",
  "gtc-mbp": "MacBook Pro 14 M4 Pro", "gtc-ipadpro": "iPad Pro 11 M5", "gtc-mba": "MacBook Air 13 M4", "gtc-iphone": "iPhone 17 256GB",
  "gtc-watch": "Apple Watch Series 11 GPS", "gtc-xm6": "索尼 WH-1000XM6", "gtc-buds": "Galaxy Buds4 Pro + Watch8", "gtc-mx": "罗技 MX Master 4 套装", "gtc-anker": "Anker 727 户外电源",
  "glx-lv": "路易威登 Alma BB", "glx-btv": "葆蝶家 Cassette 迷你", "glx-gucci": "古驰 Marmont 迷你", "glx-polene": "Polène Numéro Un 迷你",
  "glx-wallet": "圣罗兰 Monogram 钱包", "glx-belt": "万宝龙双面腰带", "glx-scarf": "爱马仕 Twilly 丝巾", "glx-card": "普拉达 Saffiano 卡包", "glx-key": "Delvaux 皮革钥匙包",
  "gdy-breville": "铂富 Barista Express", "gdy-lamp": "Louis Poulsen PH 5 迷你", "gdy-dyson": "戴森 Supersonic Nural", "gdy-balmuda": "BALMUDA The Toaster Pro",
  "gdy-airpods": "AirPods 4 ANC", "gdy-kettle": "BALMUDA The Pot", "gdy-towel": "Ikeuchi 有机毛巾套装", "gdy-candle": "蒂普提克 Baies 300g", "gdy-mug": "Kinto 陶瓷马克杯 4 只 + 托盘",
  "gc-apple100": "Apple 礼品卡 $100", "gc-apple500": "Apple 礼品卡 $500", "gc-amazon100": "Amazon 全球礼品卡 $100", "gc-steam50": "Steam 钱包 $50",
  "usdt-50": "50 USDT 即时到账", "usdt-100": "100 USDT 即时到账",
  "cb-085": "0.85 USDT 即时返现", "cb-265": "2.65 USDT 即时返现", "cb-440": "4.4 USDT 即时返现", "cb-1850": "18.5 USDT 即时返现",
  "cb-2300": "23 USDT 即时返现", "cb-2750": "27.5 USDT 即时返现", "cb-4600": "46 USDT 即时返现", "cb-9500": "95 USDT 即时返现",
}


def load_dump(path=".dump.txt"):
    boxes, items = {}, {}
    cur = None
    for line in io.open(path, encoding="utf-8"):
        line = line.rstrip("\n")
        if line.startswith("BOX "):
            slug, ko, en, badge, tagline = [x.strip() for x in line[4:].split("|")]
            cur = slug
            boxes[slug] = {"ko": ko, "en": en, "badge": badge, "tagline": tagline}
        elif line.startswith("  ") and cur:
            iid, ko, en = [x.strip() for x in line.split("|")]
            items[iid] = {"ko": ko, "en": en}
    return boxes, items


def build(locale, boxes, items):
    ui = UI[locale]
    prod = {"boxes": {}, "items": {}}
    for slug, b in boxes.items():
        badge_key = BADGE_KEY[b["badge"]]
        if locale == "ko":
            prod["boxes"][slug] = {"title": b["ko"], "tagline": b["tagline"], "badge": ui["badges"][badge_key]}
        elif locale == "en":
            title = b["en"].title().replace("Gpu", "GPU")
            prod["boxes"][slug] = {"title": title, "tagline": EN_TAGLINE[slug], "badge": ui["badges"][badge_key]}
        else:
            zt, ztag = ZH_BOX[slug]
            prod["boxes"][slug] = {"title": zt, "tagline": ztag, "badge": ui["badges"][badge_key]}
    for iid, it in items.items():
        prod["items"][iid] = it["ko"] if locale == "ko" else it["en"] if locale == "en" else ZH_ITEM[iid]
    return {**ui, "products": prod}


EN_TAGLINE = {
  "dollar-apple": "$1 for an iPhone 16 Pro. Miss, 0.85 USDT instant cashback.",
  "dollar-galaxy": "$1 for a Galaxy Z Fold8. Miss, 0.85 USDT instant cashback.",
  "dollar-gaming": "$1 for RTX 5090 or Switch 2. Miss, 0.85 USDT instant cashback.",
  "starter-ps5": "$3 for a PS5 Pro. Miss, 2.65 USDT instant cashback.",
  "starter-macbook": "$5 for a MacBook Pro M4 Max. Miss, 4.4 USDT instant cashback.",
  "starter-phone": "$5 for an iPhone 17 Pro Max. Miss, 4.4 USDT instant cashback.",
  "vault-submariner": "$20 for a Rolex Submariner. Miss, 18.5 USDT instant cashback.",
  "vault-omega": "$25 for Omega, Tudor, Tissot. Miss, 23 USDT instant cashback.",
  "vault-handbag": "$30 for a Hermès Birkin. Miss, 27.5 USDT instant cashback.",
  "vault-gold": "$50 for a 1kg gold bar. Miss, 46 USDT instant cashback.",
  "jackpot-cybertruck": "$100 for a Cybertruck. Miss, 95 USDT instant cashback.",
  "jackpot-supercar": "$100 for a Porsche 911. Miss, 95 USDT instant cashback.",
  "cybertruck-dream": "A mobility lineup topped by one Tesla Cybertruck. Even the lowest tier ships as a physical item.",
  "urban-mobility": "Built around city commuting. E-scooters and folding bikes sit at the top.",
  "apex-workstation": "A workstation lineup topped by the MacBook Pro M4 Max. Peripherals ship as physical items too.",
  "flagship-phone": "The latest flagship smartphones. Even the lowest tier is a genuine accessory.",
  "gpu-rig": "Graphics cards and peripherals. The top item is the RTX 5090 Founders Edition.",
  "camera-studio": "Mirrorless bodies and prime lenses. The lowest tier is a genuine strap set.",
  "reference-audio": "Monitor speakers and headphones. The lowest tier is a genuine cable set.",
  "rolex-vault": "Watches shipped with authenticity papers. The top item is the Rolex Daytona 116500LN.",
  "swiss-watch": "Entry-level Swiss made. Every item includes authenticity papers.",
  "luxury-leather": "Luxury leather goods. Ships with the original invoice and dust bag.",
  "grail-handbag": "A top-tier box of high-end handbags only. Even the lowest tier is an authentic luxury piece.",
  "sneaker-drop": "Limited-release sneakers. Every item is authenticated before shipping.",
  "guaranteed-tech": "Every item is worth at least the open price. Even the lowest tier is a genuine full-price product.",
  "guaranteed-luxury": "Every item is worth at least the open price. Ships with the original invoice.",
  "guaranteed-daily": "Every item is worth at least the open price. Everyday essentials.",
}


def keyset(d, prefix=""):
    out = set()
    for k, v in d.items():
        p = f"{prefix}.{k}" if prefix else k
        if isinstance(v, dict):
            out |= keyset(v, p)
        else:
            out.add(p)
    return out


if __name__ == "__main__":
    boxes, items = load_dump()
    missing = [i for i in items if i not in ZH_ITEM]
    if missing:
        raise SystemExit(f"ZH_ITEM 누락: {missing}")
    built = {loc: build(loc, boxes, items) for loc in ("ko", "en", "zh")}
    ks = {loc: keyset(b) for loc, b in built.items()}
    if not (ks["ko"] == ks["en"] == ks["zh"]):
        raise SystemExit(f"키 불일치: ko-en {ks['ko'] ^ ks['en']} / ko-zh {ks['ko'] ^ ks['zh']}")
    for loc, b in built.items():
        io.open(f"messages/{loc}.json", "w", encoding="utf-8").write(json.dumps(b, ensure_ascii=False, indent=2) + "\n")
        print(loc, len(ks[loc]), "keys")
