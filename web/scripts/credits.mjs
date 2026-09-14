// 사용 중인 제품 사진의 출처/저작자/라이선스 표를 생성한다 → public/images/products/CREDITS.md
//   node scripts/credits.mjs
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const UA = "GachaflixImageFetcher/1.0 (https://github.com/shinwon446-eng/gacha-sim; shinwon446@gmail.com)";
const report = JSON.parse(await fs.readFile(path.join(ROOT, "scripts", "image-report.json"), "utf8"));
const mapping = JSON.parse(await fs.readFile(path.join(ROOT, "lib", "product-images.json"), "utf8"));

const strip = (html) => (html ?? "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

async function commonsMeta(titles) {
  const out = {};
  for (let i = 0; i < titles.length; i += 20) {
    const url = new URL("https://commons.wikimedia.org/w/api.php");
    url.search = new URLSearchParams({
      action: "query", titles: titles.slice(i, i + 20).join("|"), prop: "imageinfo", iiprop: "extmetadata",
      iiextmetadatafilter: "Artist|LicenseShortName|LicenseUrl|Credit", format: "json",
    }).toString();
    const r = await fetch(url, { headers: { "User-Agent": UA } });
    const j = await r.json();
    for (const p of Object.values(j?.query?.pages ?? {})) {
      const m = p.imageinfo?.[0]?.extmetadata ?? {};
      out[p.title] = { artist: strip(m.Artist?.value), license: m.LicenseShortName?.value ?? "", licenseUrl: m.LicenseUrl?.value ?? "" };
    }
  }
  return out;
}

const used = Object.keys(mapping).map((slug) => report[slug]).filter(Boolean);
const meta = await commonsMeta(used.filter((r) => r.source.startsWith("wikimedia")).map((r) => r.title));

const lines = [
  "# 제품 이미지 출처 및 라이선스",
  "",
  "아래 사진은 모두 Wikimedia Commons 에서 가져왔으며, 각 라이선스 조건(저작자 표기, 동일조건변경허락 등)을 준수해야 합니다.",
  "CC BY / CC BY-SA 사진은 서비스 화면 또는 크레딧 페이지에 저작자와 라이선스를 표기하세요.",
  "",
  "| 파일 | 상품 | 원본 | 저작자 | 라이선스 |",
  "|---|---|---|---|---|",
];
for (const r of used) {
  const m = meta[r.title] ?? {};
  const lic = m.license || r.license || "";
  const licCell = m.licenseUrl ? `[${lic}](${m.licenseUrl})` : lic;
  lines.push(`| ${path.basename(r.file)} | ${r.name} | [${r.title.replace(/^File:/, "")}](${r.page}) | ${m.artist || "-"} | ${licCell} |`);
}
const out = path.join(ROOT, "public", "images", "products", "CREDITS.md");
await fs.writeFile(out, lines.join("\n") + "\n");
console.log(`wrote ${path.relative(ROOT, out)} (${used.length} entries)`);

const byLicense = {};
for (const r of used) { const l = meta[r.title]?.license || r.license; byLicense[l] = (byLicense[l] ?? 0) + 1; }
console.log(byLicense);
