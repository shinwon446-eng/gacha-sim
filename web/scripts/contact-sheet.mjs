// 검수용 컨택트 시트 생성: node scripts/contact-sheet.mjs <out.png> [slug,slug,...]
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { MANIFEST } from "./image-manifest.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const REPORT = JSON.parse(await fs.readFile(path.join(ROOT, "scripts", "image-report.json"), "utf8"));
const out = process.argv[2];
const only = process.argv[3] ? new Set(process.argv[3].split(",")) : null;

const CELL = 300, LABEL = 34, COLS = 6;
const entries = MANIFEST.filter((e) => !only || only.has(e.slug));
const rows = Math.ceil(entries.length / COLS);
const composites = [];

for (let i = 0; i < entries.length; i++) {
  const e = entries[i];
  const x = (i % COLS) * CELL, y = Math.floor(i / COLS) * (CELL + LABEL);
  const r = REPORT[e.slug];
  let thumb;
  if (r) {
    thumb = await sharp(path.join(ROOT, r.file)).resize(CELL, CELL, { fit: "contain", background: "#222" }).png().toBuffer();
  } else {
    thumb = await sharp({ create: { width: CELL, height: CELL, channels: 3, background: "#5a1a1a" } }).png().toBuffer();
  }
  const label = Buffer.from(
    `<svg width="${CELL}" height="${LABEL}"><rect width="100%" height="100%" fill="#000"/><text x="6" y="22" font-family="Arial" font-size="16" fill="#fff">${i + 1}. ${e.slug}${r ? "" : " (없음)"}</text></svg>`,
  );
  composites.push({ input: thumb, left: x, top: y }, { input: label, left: x, top: y + CELL });
}

await sharp({ create: { width: COLS * CELL, height: rows * (CELL + LABEL), channels: 3, background: "#111" } })
  .composite(composites).png().toFile(out);
console.log(`wrote ${out} (${entries.length} cells)`);
