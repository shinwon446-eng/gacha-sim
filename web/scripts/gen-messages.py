# -*- coding: utf-8 -*-
"""
messages/{ko,en,zh}.json 생성기.

  lib/products.ts 의 BOXES를 직접 읽어 ko/en 상품 문자열을 만들고,
  zh 는 아래 ZH_BOX / ZH_ITEM 사전에서 가져온다. UI 문자열은 messages JSON이 원본이며 그대로 보존한다.

  실행: python scripts/gen-messages.py
규칙: 세 파일의 키 집합은 완전히 같아야 한다 (tests/i18n.test.ts 가 검증).
"""
import io, json, os, re, subprocess, sys
from decimal import Decimal
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

# ── UI 문자열 ──────────────────────────────────────────────
# UI copy is authored in the checked-in locale files. Only products are generated.
ROOT = Path(__file__).resolve().parents[1]
LOCALES = ("ko", "en", "zh")
UI = {locale: json.loads((ROOT / "messages" / f"{locale}.json").read_text(encoding="utf-8-sig")) for locale in LOCALES}

# 한국어 badge 문자열 → badges 키
BADGE_KEY = {"드림 박스": "dream", "모빌리티": "mobility", "테크": "tech", "오디오": "audio", "워치": "watch", "럭셔리": "luxury", "라이프스타일": "lifestyle", "가치 보장": "guaranteed", "1달러": "dollar", "골드": "gold"}

ZH_BOX = {
  "dollar-apple": ("1 美元苹果盒", "1 美元挑战 iPhone 16 Pro。0.5 倍即时返现到 15 倍以上大奖。"),
  "dollar-galaxy": ("1 美元 Galaxy 盒", "1 美元挑战 Galaxy Z Fold8。0.5 倍即时返现到 15 倍以上大奖。"),
  "dollar-gaming": ("1 美元游戏盒", "1 美元挑战 RTX 5090、Switch 2。0.5 倍即时返现到 15 倍以上大奖。"),
  "starter-ps5": ("PS5 Pro 入门盒", "3 美元挑战 PS5 Pro。0.5 倍即时返现到 15 倍以上大奖。"),
  "starter-macbook": ("MacBook Pro M4 盒", "5 美元挑战 MacBook Pro M4 Max。0.5 倍即时返现到 15 倍以上大奖。"),
  "starter-phone": ("iPhone 17 Pro 盒", "5 美元挑战 iPhone 17 Pro Max。0.5 倍即时返现到 15 倍以上大奖。"),
  "vault-submariner": ("劳力士潜航者系列", "20 美元挑战劳力士潜航者。0.5 倍即时返现到 15 倍以上大奖。"),
  "vault-omega": ("瑞士奢华腕表系列", "25 美元挑战欧米茄、帝舵、天梭。0.5 倍即时返现到 15 倍以上大奖。"),
  "vault-handbag": ("爱马仕与香奈儿精品店", "30 美元挑战爱马仕 Birkin。0.5 倍即时返现到 15 倍以上大奖。"),
  "vault-gold": ("足金金条系列", "50 美元挑战 1kg 金条。0.5 倍即时返现到 15 倍以上大奖。"),
  "jackpot-cybertruck": ("特斯拉 Cybertruck 版", "100 美元挑战 Cybertruck。0.5 倍即时返现到 15 倍以上大奖。"),
  "jackpot-supercar": ("保时捷 911 超跑版", "100 美元挑战保时捷 911。0.5 倍即时返现到 15 倍以上大奖。"),
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


def load_dump(path=None):
    if path is None:
        tsx = ROOT / "node_modules" / ".bin" / ("tsx.cmd" if os.name == "nt" else "tsx")
        script = 'import { BOXES } from "./lib/products"; for (const box of BOXES) { console.log(`BOX ${box.slug}|${box.title}|${box.titleEn}|${box.badge}|${box.tagline}`); for (const item of box.items) console.log(`  ${item.id}|${item.name}|${item.nameEn}`); }'
        lines = subprocess.check_output([str(tsx), "-e", script], cwd=ROOT, text=True, encoding="utf-8").splitlines()
    else:
        lines = Path(path).read_text(encoding="utf-8").splitlines()
    boxes, items = {}, {}
    cur = None
    for line in lines:
        if line.startswith("BOX "):
            slug, ko, en, badge, tagline = [x.strip() for x in line[4:].split("|")]
            cur = slug
            boxes[slug] = {"ko": ko, "en": en, "badge": badge, "tagline": tagline}
        elif line.startswith("  ") and cur:
            iid, ko, en = [x.strip() for x in line.split("|")]
            items[iid] = {"ko": ko, "en": en}
    return boxes, items


def zh_item_name(iid):
    if iid in ZH_ITEM:
        return ZH_ITEM[iid]
    match = re.fullmatch(r"wave-(cashback|drop|gift)-(\d+)", iid)
    if not match:
        raise KeyError(f"ZH_ITEM 누락: {iid}")
    amount = format((Decimal(match.group(2)) / 100).normalize(), "f")
    suffix = {"cashback": "即时返现", "drop": "即时到账", "gift": "数字礼品卡"}[match.group(1)]
    return f"{amount} USDT {suffix}"


def build(locale, boxes, items):
    ui = UI[locale]
    prod = {"boxes": {}, "items": {}}
    for slug, b in boxes.items():
        badge_key = BADGE_KEY[b["badge"]]
        if locale == "ko":
            prod["boxes"][slug] = {"title": b["ko"], "tagline": b["tagline"], "badge": ui["badges"][badge_key]}
        elif locale == "en":
            title = b["en"].title().replace("Gpu", "GPU").replace("Ps5", "PS5").replace("Iphone", "iPhone").replace("Macbook", "MacBook").replace("Rtx", "RTX").replace("Hermes And Chanel", "Hermès & Chanel").replace("M4", "M4")
            prod["boxes"][slug] = {"title": title, "tagline": EN_TAGLINE[slug], "badge": ui["badges"][badge_key]}
        else:
            zt, ztag = ZH_BOX[slug]
            prod["boxes"][slug] = {"title": zt, "tagline": ztag, "badge": ui["badges"][badge_key]}
    for iid, it in items.items():
        prod["items"][iid] = it["ko"] if locale == "ko" else it["en"] if locale == "en" else zh_item_name(iid)
    return {**ui, "products": prod}


EN_TAGLINE = {
  "dollar-apple": "$1 for an iPhone 16 Pro. From 0.5x cashback to 15x+ prizes.",
  "dollar-galaxy": "$1 for a Galaxy Z Fold8. From 0.5x cashback to 15x+ prizes.",
  "dollar-gaming": "$1 for RTX 5090 or Switch 2. From 0.5x cashback to 15x+ prizes.",
  "starter-ps5": "$3 for a PS5 Pro. From 0.5x cashback to 15x+ prizes.",
  "starter-macbook": "$5 for a MacBook Pro M4 Max. From 0.5x cashback to 15x+ prizes.",
  "starter-phone": "$5 for an iPhone 17 Pro Max. From 0.5x cashback to 15x+ prizes.",
  "vault-submariner": "$20 for a Rolex Submariner. From 0.5x cashback to 15x+ prizes.",
  "vault-omega": "$25 for Omega, Tudor, Tissot. From 0.5x cashback to 15x+ prizes.",
  "vault-handbag": "$30 for a Hermès Birkin. From 0.5x cashback to 15x+ prizes.",
  "vault-gold": "$50 for a 1kg gold bar. From 0.5x cashback to 15x+ prizes.",
  "jackpot-cybertruck": "$100 for a Cybertruck. From 0.5x cashback to 15x+ prizes.",
  "jackpot-supercar": "$100 for a Porsche 911. From 0.5x cashback to 15x+ prizes.",
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
    missing = [i for i in items if i not in ZH_ITEM and not re.fullmatch(r"wave-(cashback|drop|gift)-\d+", i)]
    if missing:
        raise SystemExit(f"ZH_ITEM 누락: {missing}")
    built = {loc: build(loc, boxes, items) for loc in ("ko", "en", "zh")}
    ks = {loc: keyset(b) for loc, b in built.items()}
    if not (ks["ko"] == ks["en"] == ks["zh"]):
        raise SystemExit(f"키 불일치: ko-en {ks['ko'] ^ ks['en']} / ko-zh {ks['ko'] ^ ks['zh']}")
    for loc, b in built.items():
        io.open(ROOT / "messages" / f"{loc}.json", "w", encoding="utf-8").write(json.dumps(b, ensure_ascii=False, indent=2) + "\n")
        print(loc, len(ks[loc]), "keys")
