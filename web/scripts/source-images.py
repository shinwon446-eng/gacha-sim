# -*- coding: utf-8 -*-
"""
Wikimedia Commons 에서 상품 이미지를 검색해 lib/productImages.ts 의 SOURCES 를 생성한다.

  python scripts/source-images.py

규칙
  - 검색 결과 중 폭 >= MIN_W, 높이 >= MIN_H, 비트맵(SVG 제외)만 후보.
  - 후보 URL 은 반드시 HEAD 200 을 확인한 뒤에만 기록한다. 검증 실패 항목은 null 로 남긴다.
  - 라이선스·저작자를 credit 으로 함께 기록한다. CC BY / BY-SA 는 표기 의무가 있다.
  - PNG(투명 배경 가능성)를 JPG 보다 우선한다. 누끼 여부는 사람이 확인해야 하므로 cutout 은 PNG 일 때만 true.
"""
import html
import json
import re
import sys
import urllib.parse
import urllib.request

API = "https://commons.wikimedia.org/w/api.php"
UA = "gachaflix-mock-sourcing/1.0 (prototype; shinwon446@gmail.com)"
MIN_W, MIN_H = 1000, 640
THUMB_W = 1600

# 제목에 이런 단어가 있으면 상품 사진이 아니다 — 사람, 행사, 분해, 매장, 풍경.
BAD_WORDS = re.compile(
    r"teardown|broken|launch event|event|park|flight|inspection|comparison|video|ports on|shop|street|"
    r"road|building|store|exhibition|ibc|messe|expo|wrist|hand|person|man |woman|girl|boy|people|"
    r"unboxing|box|packaging|archivio|museum|1960|1950|1970",
    re.I,
)

# id → (검색어 후보들). 앞의 것부터 시도한다.
QUERIES = {
    # 박스
    "cybertruck-dream": ["Tesla Cybertruck Foundation Series", "Tesla Cybertruck"],
    "urban-mobility": ["Brompton bicycle folded", "Brompton bicycle"],
    "apex-workstation": ["MacBook Pro 16-inch M1 Max", "MacBook Pro 2021 open", "MacBook Pro 16-inch"],
    "flagship-phone": ["iPhone 15 Pro", "Samsung Galaxy Z Fold"],
    "gpu-rig": ["GeForce RTX 4090 Founders Edition", "Nvidia GeForce RTX"],
    "camera-studio": ["Sony Alpha 1 camera", "Leica Q3"],
    "reference-audio": ["Genelec 8030", "Genelec 8040", "Genelec studio monitor"],
    "rolex-vault": ["Rolex Daytona", "Rolex Cosmograph Daytona"],
    "swiss-watch": ["Omega Seamaster Aqua Terra", "Tissot PRX"],
    "luxury-leather": ["Hermès Birkin", "Hermes Birkin bag"],
    "grail-handbag": ["Chanel flap bag", "Hermès Kelly bag"],
    "sneaker-drop": ["Air Jordan 1", "Nike Air Jordan"],
    "guaranteed-tech": ["MacBook Air M2", "MacBook Air"],
    "guaranteed-luxury": ["Louis Vuitton Speedy", "Louis Vuitton monogram handbag", "Louis Vuitton bag"],
    "guaranteed-daily": ["Dyson Supersonic hair dryer", "Dyson Supersonic", "hair dryer"],
    # 항목 (박스마다 상위 구성 위주)
    "ctd-cybertruck": ["Tesla Cybertruck Foundation Series"],
    "ctd-model3": ["Tesla Model 3 Performance", "Tesla Model 3"],
    "ctd-visionpro": ["Apple Vision Pro"],
    "ctd-segway": ["Segway Ninebot KickScooter", "Ninebot electric scooter", "Segway scooter"],
    "ctd-brompton": ["Brompton bicycle"],
    "ctd-dji": ["DJI Air 3", "DJI drone"],
    "urb-vanmoof": ["VanMoof S5", "VanMoof"],
    "urb-segway": ["Segway Ninebot KickScooter", "Ninebot electric scooter", "Segway scooter"],
    "urb-brompton": ["Brompton bicycle"],
    "apx-mbp": ["MacBook Pro 16-inch M1 Max", "MacBook Pro 2021 open", "MacBook Pro 16-inch"],
    "apx-studio": ["Mac Studio"],
    "apx-xdr": ["Pro Display XDR"],
    "flg-fold": ["Samsung Galaxy Z Fold5", "Galaxy Z Fold"],
    "flg-iphone": ["iPhone 15 Pro Max"],
    "flg-flip": ["Galaxy Z Flip5 closed", "Samsung Galaxy Z Flip", "Galaxy Z Flip 4"],
    "gpu-5090": ["GeForce RTX 4090 Founders Edition"],
    "gpu-5080": ["GeForce RTX 4080 Founders Edition", "GeForce RTX 4080", "GeForce RTX 4070"],
    "gpu-cpu": ["AMD Ryzen 9 7950X", "AMD Ryzen 9 processor", "AMD Ryzen CPU"],
    "cam-a1": ["Sony Alpha 1"],
    "cam-r5": ["Canon EOS R5"],
    "cam-leica": ["Leica Q3", "Leica Q2"],
    "aud-genelec": ["Genelec 8030", "Genelec 8040", "Genelec studio monitor"],
    "aud-focal": ["Focal Utopia", "Focal headphones", "Focal Clear headphones"],
    "aud-he1000": ["HiFiMAN Susvara", "HiFiMAN HE1000", "HiFiMAN Arya"],
    "rlx-daytona": ["Rolex Daytona"],
    "rlx-sub": ["Rolex Submariner"],
    "rlx-gmt": ["Rolex GMT-Master II Pepsi", "Rolex GMT-Master II"],
    "rlx-ap": ["Audemars Piguet Royal Oak"],
    "sws-omega": ["Omega Seamaster Aqua Terra"],
    "sws-tudor": ["Tudor Pelagos"],
    "sws-longines": ["Longines Spirit"],
    "lth-birkin": ["Hermès Birkin"],
    "lth-kelly": ["Hermès Kelly bag"],
    "lth-chanel": ["Chanel 2.55 bag", "Chanel quilted handbag", "Chanel handbag"],
    "grl-birkin25": ["Hermès Birkin crocodile", "Hermès Birkin"],
    "grl-kelly25": ["Hermès Kelly bag"],
    "grl-chanel19": ["Chanel 2.55 bag", "Chanel quilted handbag", "Chanel handbag"],
    "snk-dior": ["Air Jordan 1 High sneaker", "Air Jordan 1 Retro High", "Air Jordan 1"],
    "snk-offwhite": ["Nike Dunk Off-White", "Nike Dunk Low"],
    "snk-travis": ["Air Jordan 1 Low sneaker", "Air Jordan 1 Low", "Air Jordan 1"],
    "gtc-mbp": ["MacBook Pro 14-inch 2021", "MacBook Pro 14-inch", "MacBook Pro M1 Pro"],
    "gtc-ipadpro": ["iPad Pro"],
    "gtc-mba": ["MacBook Air M2"],
    "glx-lv": ["Louis Vuitton Alma bag", "Louis Vuitton Speedy", "Louis Vuitton monogram handbag"],
    "glx-btv": ["Bottega Veneta intrecciato", "Bottega Veneta"],
    "glx-gucci": ["Gucci Marmont bag", "Gucci Dionysus", "Gucci handbag"],
    "gdy-breville": ["Breville espresso machine", "Sage Barista Express", "espresso machine"],
    "gdy-lamp": ["Louis Poulsen PH 5"],
    "gdy-dyson": ["Dyson Supersonic hair dryer", "Dyson Supersonic", "hair dryer"],
}


def api(params):
    q = urllib.parse.urlencode({**params, "format": "json"})
    req = urllib.request.Request(f"{API}?{q}", headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def head_ok(url):
    req = urllib.request.Request(url, method="HEAD", headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status == 200 and r.headers.get("Content-Type", "").startswith("image/")
    except Exception:
        return False


def strip_tags(s):
    return html.unescape(re.sub(r"<[^>]+>", "", s or "")).strip()


def search(query):
    d = api({
        "action": "query",
        "generator": "search",
        "gsrsearch": f'{query} filetype:bitmap',
        "gsrnamespace": 6,
        "gsrlimit": 12,
        "prop": "imageinfo",
        "iiprop": "url|size|mime|extmetadata",
        "iiurlwidth": THUMB_W,
    })
    pages = d.get("query", {}).get("pages", {})
    out = []
    for p in pages.values():
        ii = p["imageinfo"][0]
        if ii["mime"] not in ("image/jpeg", "image/png"):
            continue
        if ii["width"] < MIN_W or ii["height"] < MIN_H:
            continue
        # 세로로 너무 긴 이미지는 카드 비주얼에 맞지 않는다
        if ii["height"] / ii["width"] > 1.6:
            continue
        if BAD_WORDS.search(p["title"]):
            continue
        meta = ii.get("extmetadata", {})
        out.append({
            "title": p["title"],
            "url": ii["thumburl"],
            "mime": ii["mime"],
            "w": ii["width"],
            "h": ii["height"],
            "license": strip_tags(meta.get("LicenseShortName", {}).get("value", "")),
            "artist": strip_tags(meta.get("Artist", {}).get("value", ""))[:60],
            "index": p.get("index", 99),
        })
    # PNG 우선, 그 다음 검색 관련도 순
    out.sort(key=lambda x: (x["mime"] != "image/png", x["index"]))
    return out


def main():
    only = set(sys.argv[1].split(",")) if len(sys.argv) > 1 else None
    try:
        result = json.load(open("scripts/source-images.out.json", encoding="utf-8"))
    except Exception:
        result = {}
    for pid, queries in QUERIES.items():
        if only and pid not in only:
            continue
        chosen = None
        for q in queries:
            try:
                cands = search(q)
            except Exception as e:
                print(f"  ! {pid}: 검색 실패 ({q}): {e}", file=sys.stderr)
                continue
            for c in cands:
                if head_ok(c["url"]):
                    chosen = {**c, "query": q}
                    break
            if chosen:
                break
        if chosen:
            print(f"OK   {pid:20s} {chosen['w']}x{chosen['h']} {chosen['mime'][6:]:4s} {chosen['license']:14s} {chosen['title'][5:60]}")
        else:
            print(f"MISS {pid:20s} (후보 없음)")
        result[pid] = chosen

    json.dump(result, open("scripts/source-images.out.json", "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    ok = sum(1 for v in result.values() if v)
    print(f"\n{ok}/{len(result)} 확보")


if __name__ == "__main__":
    main()
