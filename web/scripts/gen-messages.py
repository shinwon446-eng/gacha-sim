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
    "nav": {"boxes": "박스", "battles": "배틀", "inventory": "보관함", "fairness": "공정성 검증", "highRoller": "하이롤러", "tech": "테크", "luxury": "럭셔리"},
    "header": {"balance": "잔액", "demo": "데모", "language": "언어", "currency": "통화", "deposit": "충전하기"},
    "hero": {
      "royalSelection": "로열 셀렉션", "top": "TOP {n}", "pricePerOpen": "1회 오픈", "topPull": "최고 구성",
      "noBlank": "100% 실물 지급 · 꽝 없음", "guaranteedMinLabel": "최소 보장 금액",
      "guaranteedMin": "최소 보장 금액 {value}", "aboveOpenPrice": "오픈가 이상",
      "openNow": "지금 오픈하기", "viewContents": "구성품 확인", "billboardPicker": "빌보드 선택", "billboardOf": "{title} 빌보드"
    },
    "card": {"perOpen": "1회", "top": "최고", "guaranteedMinShort": "최소 {value}", "guaranteed": "보장", "openNow": "지금 오픈", "contents": "구성품", "details": "{title} 상세 정보", "expand": "확대"},
    "rows": {"trending": "지금 가장 많이 열리는 박스", "techMobility": "테크 & 모빌리티", "luxuryWatch": "럭셔리 & 워치", "guaranteed": "최소 가치 보장", "prev": "이전", "next": "다음"},
    "grid": {"title": "전체 박스", "sort": "정렬", "loadMore": "더 보기 ({n}개)"},
    "categories": {"all": "전체", "mobility": "모빌리티", "tech": "테크", "watch": "워치", "luxury": "럭셔리", "lifestyle": "라이프스타일"},
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
      "guaranteedYes": "이 박스는 최저 구성의 실판매가({min})가 오픈 가격 이상입니다.",
      "guaranteedNo": "이 박스의 최저 구성 실판매가는 {min}이며 오픈 가격보다 낮습니다.",
      "prototype": "현재 화면은 프로토타입이고 상품 데이터는 모의값입니다.",
      "allPrizes": "전체 당첨 가능 상품", "count": "{n}종", "sortedByValue": "실판매가 내림차순",
      "marketValue": "실판매가", "odds": "확률", "imageCredits": "이미지 출처"
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
      "demoTitle": "시드 커밋 데모", "demoBody": "새 서버 시드를 만들면 해시만 먼저 보입니다. 공개(Reveal) 를 누르면 원문이 드러나고, 그걸 검증기에 넣어 재현할 수 있습니다.",
      "generate": "새 서버 시드 생성", "reveal": "서버 시드 공개", "hidden": "개봉 전 — 원문 비공개", "useInVerifier": "검증기에 넣기",
      "invalidInput": "서버 시드와 클라이언트 시드를 입력하고 Nonce 는 0 이상의 정수여야 합니다.",
      "open": "공정성 검증 열기", "close": "닫기"
    },
    "unbox": {
      "open1": "1회 오픈", "open5": "5회 연속 오픈", "spinning": "개봉 중…", "landing": "결과 확정",
      "result": "당첨", "results": "5회 결과", "total": "합계 가치", "paid": "지불 {price}",
      "sellBack": "즉시 판매 · {amount}", "sellBackAll": "전체 즉시 판매 · {amount}", "sellBackNote": "실판매가의 {rate}가 잔액으로 즉시 반영됩니다",
      "sold": "판매 완료 — {amount} 잔액 반영", "claimShipping": "실물 배송 신청",
      "shippingNotice": "국제 배송비 및 세관 수수료 안내", "shippingBody": "수취국 관세·부가세와 국제 배송비(DHL/FedEx 실비)가 별도 청구됩니다. 데모에서는 접수되지 않습니다.",
      "verify": "이 결과 검증", "close": "닫기", "keep": "보관함으로", "kept": "보관함에 저장됐습니다 (데모)",
      "insufficient": "잔액 부족 — {price} 필요", "topUp": "데모 잔액 충전", "toppedUp": "+{amount} 데모 잔액",
      "mute": "효과음 끄기", "unmute": "효과음 켜기",
      "seedHash": "서버 시드 해시 (개봉 전 공개)", "serverSeed": "서버 시드", "clientSeed": "클라이언트 시드", "nonce": "Nonce", "roll": "롤",
      "fairNote": "이 결과는 아래 시드와 Nonce 로 결정됐습니다. [이 결과 검증]에서 그대로 재현할 수 있습니다."
    },
    "actions": {"sellBack": "즉시 판매", "claimShipping": "실물 배송 신청", "provablyFair": "공정성 검증"},
    "legal": {"disclaimer": "표기 금액은 실판매가 기준입니다. 받은 실물을 즉시 판매하면 실판매가의 {refund}를 돌려받으므로 회수액은 오픈 가격보다 낮습니다. 확률은 구성품 확인에서 전량 공개됩니다. 현재 화면은 프로토타입이며 상품 데이터는 모의값입니다."},
    "badges": {"dream": "드림 박스", "mobility": "모빌리티", "tech": "테크", "audio": "오디오", "watch": "워치", "luxury": "럭셔리", "lifestyle": "라이프스타일", "guaranteed": "가치 보장"},
  },
  "en": {
    "nav": {"boxes": "Boxes", "battles": "Battles", "inventory": "Inventory", "fairness": "Provably Fair", "highRoller": "High-Roller", "tech": "Tech", "luxury": "Luxury"},
    "header": {"balance": "Balance", "demo": "Demo", "language": "Language", "currency": "Currency", "deposit": "Deposit"},
    "hero": {
      "royalSelection": "Royal Selection", "top": "TOP {n}", "pricePerOpen": "Per Open", "topPull": "Top Pull",
      "noBlank": "100% physical payout · No blanks", "guaranteedMinLabel": "Guaranteed Minimum",
      "guaranteedMin": "Guaranteed Minimum {value}", "aboveOpenPrice": "Above open price",
      "openNow": "Open Now", "viewContents": "View Contents", "billboardPicker": "Billboard picker", "billboardOf": "{title} billboard"
    },
    "card": {"perOpen": "Open", "top": "Top", "guaranteedMinShort": "Min {value}", "guaranteed": "guaranteed", "openNow": "Open Now", "contents": "Contents", "details": "{title} details", "expand": "Expand"},
    "rows": {"trending": "Trending Mystery Boxes", "techMobility": "Tech & Mobility", "luxuryWatch": "Luxury & Watches", "guaranteed": "Guaranteed Minimum", "prev": "Previous", "next": "Next"},
    "grid": {"title": "All Boxes", "sort": "Sort", "loadMore": "Load more ({n})"},
    "categories": {"all": "All", "mobility": "Mobility", "tech": "Tech", "watch": "Watches", "luxury": "Luxury", "lifestyle": "Lifestyle"},
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
      "guaranteedYes": "This box's lowest item ({min}) is worth at least the open price.",
      "guaranteedNo": "This box's lowest item is worth {min}, below the open price.",
      "prototype": "This screen is a prototype and product data is mock.",
      "allPrizes": "All possible prizes", "count": "{n} items", "sortedByValue": "By market value, descending",
      "marketValue": "Market value", "odds": "Odds", "imageCredits": "Image credits"
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
      "demoTitle": "Seed commitment demo", "demoBody": "Generate a server seed and only its hash is shown. Reveal it, then paste it into the verifier to reproduce a roll.",
      "generate": "Generate server seed", "reveal": "Reveal server seed", "hidden": "Before opening — seed hidden", "useInVerifier": "Use in verifier",
      "invalidInput": "Enter a server seed and a client seed; the nonce must be an integer ≥ 0.",
      "open": "Open Provably Fair", "close": "Close"
    },
    "unbox": {
      "open1": "Open ×1", "open5": "Open ×5", "spinning": "Opening…", "landing": "Result locked",
      "result": "You won", "results": "5 results", "total": "Total value", "paid": "Paid {price}",
      "sellBack": "Instant Sell-Back · {amount}", "sellBackAll": "Sell all back · {amount}", "sellBackNote": "{rate} of market value is credited to your balance instantly",
      "sold": "Sold — {amount} credited", "claimShipping": "Claim Shipping",
      "shippingNotice": "International shipping & customs notice", "shippingBody": "Destination duties/VAT and international shipping (DHL/FedEx at cost) are billed separately. Not accepted in the demo.",
      "verify": "Verify this result", "close": "Close", "keep": "Keep in inventory", "kept": "Saved to inventory (demo)",
      "insufficient": "Insufficient balance — {price} required", "topUp": "Top up demo balance", "toppedUp": "+{amount} demo balance",
      "mute": "Mute sound", "unmute": "Unmute sound",
      "seedHash": "Server seed hash (published before open)", "serverSeed": "Server seed", "clientSeed": "Client seed", "nonce": "Nonce", "roll": "Roll",
      "fairNote": "This result was determined by the seeds and nonce below. Reproduce it exactly under [Verify this result]."
    },
    "actions": {"sellBack": "Instant Sell-Back", "claimShipping": "Claim Shipping", "provablyFair": "Provably Fair"},
    "legal": {"disclaimer": "Amounts shown are market value. Instant sell-back pays {refund} of market value, so cash recovery is below the open price. All odds are published under View Contents. This screen is a prototype and product data is mock."},
    "badges": {"dream": "Dream Box", "mobility": "Mobility", "tech": "Tech", "audio": "Audio", "watch": "Watches", "luxury": "Luxury", "lifestyle": "Lifestyle", "guaranteed": "Guaranteed"},
  },
  "zh": {
    "nav": {"boxes": "盲盒", "battles": "对战", "inventory": "仓库", "fairness": "公平性验证", "highRoller": "高额玩家", "tech": "科技", "luxury": "奢侈品"},
    "header": {"balance": "余额", "demo": "演示", "language": "语言", "currency": "货币", "deposit": "充值"},
    "hero": {
      "royalSelection": "皇家精选", "top": "TOP {n}", "pricePerOpen": "单次开启", "topPull": "最高奖品",
      "noBlank": "100% 实物发放 · 无空奖", "guaranteedMinLabel": "保底价值",
      "guaranteedMin": "保底价值 {value}", "aboveOpenPrice": "不低于开启价",
      "openNow": "立即开启", "viewContents": "查看内含", "billboardPicker": "选择展示", "billboardOf": "{title} 展示"
    },
    "card": {"perOpen": "单次", "top": "最高", "guaranteedMinShort": "保底 {value}", "guaranteed": "保底", "openNow": "立即开启", "contents": "内含", "details": "{title} 详情", "expand": "展开"},
    "rows": {"trending": "当前最热盲盒", "techMobility": "科技与出行", "luxuryWatch": "奢侈品与腕表", "guaranteed": "保底价值", "prev": "上一页", "next": "下一页"},
    "grid": {"title": "全部盲盒", "sort": "排序", "loadMore": "加载更多（{n}）"},
    "categories": {"all": "全部", "mobility": "出行", "tech": "科技", "watch": "腕表", "luxury": "奢侈品", "lifestyle": "生活方式"},
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
      "guaranteedYes": "本盲盒最低档商品的市场价（{min}）不低于开启价。",
      "guaranteedNo": "本盲盒最低档商品的市场价为 {min}，低于开启价。",
      "prototype": "当前页面为原型，商品数据为模拟数据。",
      "allPrizes": "全部可得商品", "count": "{n} 件", "sortedByValue": "按市场价降序",
      "marketValue": "市场价", "odds": "概率", "imageCredits": "图片来源"
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
      "demoTitle": "种子承诺演示", "demoBody": "生成新的服务器种子后仅显示哈希。点击公开后显示原文，可填入验证器复现结果。",
      "generate": "生成服务器种子", "reveal": "公开服务器种子", "hidden": "开启前 — 原文未公开", "useInVerifier": "填入验证器",
      "invalidInput": "请输入服务器种子与客户端种子，Nonce 须为 ≥ 0 的整数。",
      "open": "打开公平性验证", "close": "关闭"
    },
    "unbox": {
      "open1": "开启 ×1", "open5": "连续开启 ×5", "spinning": "开启中…", "landing": "结果已锁定",
      "result": "获得", "results": "5 次结果", "total": "总价值", "paid": "已支付 {price}",
      "sellBack": "即时回收 · {amount}", "sellBackAll": "全部即时回收 · {amount}", "sellBackNote": "按市场价的 {rate} 即时计入余额",
      "sold": "已回收 — 余额 +{amount}", "claimShipping": "申请发货",
      "shippingNotice": "国际运费与关税说明", "shippingBody": "目的地关税/增值税及国际运费（DHL/FedEx 实付）另行收取。演示中不受理。",
      "verify": "验证本次结果", "close": "关闭", "keep": "存入仓库", "kept": "已存入仓库（演示）",
      "insufficient": "余额不足 — 需要 {price}", "topUp": "充值演示余额", "toppedUp": "+{amount} 演示余额",
      "mute": "关闭音效", "unmute": "开启音效",
      "seedHash": "服务器种子哈希（开启前公开）", "serverSeed": "服务器种子", "clientSeed": "客户端种子", "nonce": "Nonce", "roll": "Roll",
      "fairNote": "本次结果由以下种子与 Nonce 决定。可在[验证本次结果]中完整复现。"
    },
    "actions": {"sellBack": "即时回收", "claimShipping": "申请发货", "provablyFair": "公平性验证"},
    "legal": {"disclaimer": "所示金额均为市场价。即时回收仅按市场价的 {refund} 支付，因此现金回收额低于开启价。全部概率在「查看内含」中公开。当前页面为原型，商品数据为模拟数据。"},
    "badges": {"dream": "梦想盲盒", "mobility": "出行", "tech": "科技", "audio": "音频", "watch": "腕表", "luxury": "奢侈品", "lifestyle": "生活方式", "guaranteed": "保底"},
  },
}

# 한국어 badge 문자열 → badges 키
BADGE_KEY = {"드림 박스": "dream", "모빌리티": "mobility", "테크": "tech", "오디오": "audio", "워치": "watch", "럭셔리": "luxury", "라이프스타일": "lifestyle", "가치 보장": "guaranteed"}

ZH_BOX = {
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
