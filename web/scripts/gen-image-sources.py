# -*- coding: utf-8 -*-
"""source-images.out.json → lib/productImages.ts 의 SOURCES 블록을 생성한다. HEAD 재검증 포함."""
import json, re, urllib.request

REJECT = {
    "guaranteed-luxury", "glx-lv", "gpu-5080", "gpu-cpu", "glx-btv", "gdy-breville",
    "aud-focal", "aud-he1000", "glx-gucci",
}
UA = "voila-image-sourcing/1.0 (prototype; shinwon446@gmail.com)"

def head_ok(url):
    try:
        r = urllib.request.urlopen(urllib.request.Request(url, method="HEAD", headers={"User-Agent": UA}), timeout=30)
        return r.status == 200 and r.headers.get("Content-Type", "").startswith("image/")
    except Exception:
        return False

d = json.load(open("scripts/source-images.out.json", encoding="utf-8"))
lines = []
n = 0
for pid, v in d.items():
    if not v or pid in REJECT:
        continue
    url = v["url"].split("?")[0]
    if not head_ok(url):
        print("DROP (HEAD 실패)", pid, url); continue
    title = re.sub(r"^File:", "", v["title"]).replace('"', "'")
    credit = f"{title} · {v['artist'] or 'Wikimedia Commons'} · {v['license']}".replace('"', "'")
    cutout = "true" if v["mime"] == "image/png" else "false"
    lines.append(f'  "{pid}": {{ src: "{url}", credit: "{credit}", cutout: {cutout} }},')
    n += 1

ts = open("lib/productImages.ts", encoding="utf-8").read()
block = "const SOURCES: Record<string, ProductImage> = {\n" + "\n".join(lines) + "\n};"
ts2 = re.sub(r"const SOURCES: Record<string, ProductImage> = \{[\s\S]*?\n\};", block, ts, count=1)
assert ts2 != ts
open("lib/productImages.ts", "w", encoding="utf-8").write(ts2)
print(f"{n} 항목 기록")
