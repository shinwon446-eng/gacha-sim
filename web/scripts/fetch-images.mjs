// 고화질 제품 이미지 수집 + 기계 검증 파이프라인
//   node scripts/fetch-images.mjs            # 미보유 항목만 수집
//   node scripts/fetch-images.mjs --force    # 전부 다시 수집
//   node scripts/fetch-images.mjs --only ct-iphone,rx-sub
//   node scripts/fetch-images.mjs --report   # 저장된 파일 재검증 + 표 출력만
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import {
  MANIFEST, MIN_SIDE, HARD_MIN_SIDE, MIN_BYTES, PREFER_BYTES, ASPECT_MIN, ASPECT_MAX,
} from "./image-manifest.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT_DIR = path.join(ROOT, "public", "images", "products");
const REPORT_PATH = path.join(ROOT, "scripts", "image-report.json");
const REVIEW_PATH = path.join(ROOT, "scripts", "image-review.json");
const UA = "GachaflixImageFetcher/1.0 (https://github.com/shinwon446-eng/gacha-sim; shinwon446@gmail.com)";

const args = process.argv.slice(2);
const FORCE = args.includes("--force");
const REPORT_ONLY = args.includes("--report");
const ONLY = (args[args.indexOf("--only") + 1] || "").split(",").filter(Boolean);
const onlySet = args.includes("--only") ? new Set(ONLY) : null;

const log = (...a) => console.log(...a);

async function readJson(p, fallback) {
  try { return JSON.parse(await fs.readFile(p, "utf8")); } catch { return fallback; }
}

/** 메타데이터 기준 사전 필터 */
function passesMeta(c) {
  if (!c.width || !c.height) return false;
  if (Math.min(c.width, c.height) < MIN_SIDE) return false;
  const ar = c.width / c.height;
  if (ar < ASPECT_MIN || ar > ASPECT_MAX) return false;
  if (c.mime && !/^image\/(jpeg|png|webp)$/.test(c.mime)) return false;
  return true;
}

/** 후보 점수: 용량 ≥200KB 가산, 제목에 제품샷 힌트 가산, 픽셀 수 */
function score(c) {
  let s = 0;
  if (!c.bytes || c.bytes >= PREFER_BYTES) s += 2;
  const t = (c.title || "").toLowerCase();
  if (/white background|studio|product|isolated|transparent|cutout|\.png$/.test(t)) s += 3;
  if (/crowd|people|event|expo|show|booth|street|screenshot|logo|icon|map|diagram|\.svg|convention|tournament|championship|vending|painting|portrait|museum|exhibition|store|keynote|wwdc|ces |ifa |auto show|salon|motorshow|festival|comic|con \d|fair|display|stand|press|conference|party|fans|cosplay|wrist|hand|teardown|inside|disassembl|box art|packaging inside|unboxing/.test(t)) s -= 4;
  s += Math.min(2, (c.width * c.height) / 8_000_000);
  return s;
}

// ── 소스 1: Wikimedia Commons ──
async function searchCommons(q) {
  const url = new URL("https://commons.wikimedia.org/w/api.php");
  url.search = new URLSearchParams({
    action: "query", generator: "search", gsrsearch: `${q} filetype:bitmap`, gsrnamespace: "6", gsrlimit: "25",
    prop: "imageinfo", iiprop: "url|size|mime|extmetadata", iiextmetadatafilter: "LicenseShortName|Artist",
    format: "json",
  }).toString();
  const r = await fetch(url, { headers: { "User-Agent": UA } });
  if (!r.ok) return [];
  const j = await r.json();
  const pages = Object.values(j?.query?.pages ?? {});
  return pages.map((p) => {
    const ii = p.imageinfo?.[0] ?? {};
    return {
      source: "wikimedia", title: p.title, url: ii.url, width: ii.width, height: ii.height,
      bytes: ii.size, mime: ii.mime, license: ii.extmetadata?.LicenseShortName?.value ?? "",
      page: ii.descriptionurl,
    };
  });
}

// ── 소스 1b: Commons 카테고리 → 파일 목록 (풀텍스트보다 훨씬 정확) ──
async function findCategories(q) {
  const url = new URL("https://commons.wikimedia.org/w/api.php");
  url.search = new URLSearchParams({
    action: "query", list: "search", srsearch: q, srnamespace: "14", srlimit: "4", format: "json",
  }).toString();
  const r = await fetch(url, { headers: { "User-Agent": UA } });
  if (!r.ok) return [];
  const j = await r.json();
  return (j?.query?.search ?? []).map((s) => s.title);
}

async function listCategory(cat) {
  const url = new URL("https://commons.wikimedia.org/w/api.php");
  url.search = new URLSearchParams({
    action: "query", generator: "categorymembers", gcmtitle: cat, gcmtype: "file", gcmlimit: "100",
    prop: "imageinfo", iiprop: "url|size|mime|extmetadata", iiextmetadatafilter: "LicenseShortName|Artist",
    format: "json",
  }).toString();
  const r = await fetch(url, { headers: { "User-Agent": UA } });
  if (!r.ok) return [];
  const j = await r.json();
  return Object.values(j?.query?.pages ?? {}).map((p) => {
    const ii = p.imageinfo?.[0] ?? {};
    return {
      source: `wikimedia:${cat.replace(/^Category:/, "")}`, title: p.title, url: ii.url, width: ii.width, height: ii.height,
      bytes: ii.size, mime: ii.mime, license: ii.extmetadata?.LicenseShortName?.value ?? "", page: ii.descriptionurl,
    };
  });
}

async function searchByCategory(q, explicitCats) {
  const cats = explicitCats?.length ? explicitCats : await findCategories(q);
  const out = [];
  for (const c of cats.slice(0, 3)) out.push(...(await listCategory(c)));
  return out;
}

// ── 소스 2a: Pexels (PEXELS_API_KEY 필요, https://www.pexels.com/api/) ──
async function searchPexels(q) {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return [];
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=30&orientation=square`;
  const r = await fetch(url, { headers: { Authorization: key, "User-Agent": UA } });
  if (!r.ok) { log(`  (pexels ${r.status})`); return []; }
  const j = await r.json();
  return (j.photos ?? []).map((p) => ({
    source: "pexels", title: p.alt || `pexels-${p.id}`, url: p.src.original, width: p.width, height: p.height,
    bytes: null, mime: "image/jpeg", license: "Pexels License", page: p.url,
  }));
}

// ── 소스 2b: Unsplash (UNSPLASH_ACCESS_KEY 필요, https://unsplash.com/developers) ──
async function searchUnsplash(q) {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return [];
  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&per_page=30&content_filter=high`;
  const r = await fetch(url, { headers: { Authorization: `Client-ID ${key}`, "Accept-Version": "v1", "User-Agent": UA } });
  if (!r.ok) { log(`  (unsplash ${r.status})`); return []; }
  const j = await r.json();
  return (j.results ?? []).map((p) => ({
    source: "unsplash", title: p.alt_description || p.description || `unsplash-${p.id}`,
    url: `${p.urls.raw}&w=2400&fit=max&fm=jpg&q=90`, width: p.width, height: p.height,
    bytes: null, mime: "image/jpeg", license: "Unsplash License", page: p.links.html,
  }));
}

// ── 소스 2: Openverse (상업 이용 가능 라이선스만) ──
async function searchOpenverse(q) {
  const url = new URL("https://api.openverse.org/v1/images/");
  url.search = new URLSearchParams({ q, license_type: "commercial", page_size: "40" }).toString();
  await new Promise((res) => setTimeout(res, 1500)); // 익명 한도 보호
  const r = await fetch(url, { headers: { "User-Agent": UA } });
  if (!r.ok) { log(`  (openverse ${r.status})`); return []; }
  const j = await r.json();
  return (j.results ?? []).map((x) => ({
    source: `openverse/${x.source}`, title: x.title, url: x.url, width: x.width, height: x.height,
    bytes: x.filesize ?? null, mime: x.filetype ? `image/${x.filetype === "jpg" ? "jpeg" : x.filetype}` : null,
    license: `${x.license} ${x.license_version ?? ""}`.trim(), page: x.foreign_landing_url,
  }));
}

/** 다운로드 + 기계 검증. 실패 시 이유 문자열 반환 */
async function download(c) {
  const r = await fetch(c.url, { headers: { "User-Agent": UA, Accept: "image/*" } });
  if (!r.ok) return { error: `HTTP ${r.status}` };
  const ct = r.headers.get("content-type") ?? "";
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length < MIN_BYTES) return { error: `too small (${buf.length}B) — HTML 에러 파일 의심` };
  if (!ct.startsWith("image/")) return { error: `content-type ${ct}` };
  let meta;
  try { meta = await sharp(buf).metadata(); } catch (e) { return { error: `sharp 파싱 실패: ${e.message}` }; }
  if (!["jpeg", "png", "webp"].includes(meta.format)) return { error: `format ${meta.format}` };
  if (Math.min(meta.width, meta.height) < HARD_MIN_SIDE) return { error: `실측 ${meta.width}x${meta.height} < ${HARD_MIN_SIDE}` };
  if (Math.min(meta.width, meta.height) < MIN_SIDE) return { error: `실측 ${meta.width}x${meta.height} < ${MIN_SIDE}` };
  const ar = meta.width / meta.height;
  if (ar < ASPECT_MIN || ar > ASPECT_MAX) return { error: `aspect ${ar.toFixed(2)}` };
  return { buf, meta };
}

/** WebP 변환 저장. 긴 변 2400 상한, 짧은 변은 1200 미만으로 절대 줄이지 않음 */
async function saveWebp(buf, meta, outPath) {
  // long/short 는 EXIF 회전과 무관하므로 정사각 바운딩 박스로 리사이즈 (회전 후 방향에 안전)
  const long = Math.max(meta.width, meta.height);
  const short = Math.min(meta.width, meta.height);
  let targetLong = Math.min(long, 2400);
  if (short * (targetLong / long) < MIN_SIDE) targetLong = Math.min(long, Math.ceil((MIN_SIDE * long) / short));
  let img = sharp(buf).rotate();
  if (targetLong < long) img = img.resize({ width: targetLong, height: targetLong, fit: "inside", withoutEnlargement: true });
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await img.webp({ quality: 88 }).toFile(outPath);
  const saved = await sharp(outPath).metadata();
  const st = await fs.stat(outPath);
  return { width: saved.width, height: saved.height, bytes: st.size };
}

async function processEntry(entry, report) {
  const outPath = path.join(OUT_DIR, entry.category, `${entry.slug}.webp`);
  const rejects = new Set(entry.reject ?? []);
  // 다른 상품에 이미 쓰인 파일은 재사용하지 않음 (같은 카테고리에서 다양성 확보)
  for (const [slug, r] of Object.entries(report)) if (slug !== entry.slug) { rejects.add(r.title); rejects.add(r.url); }
  const candidates = [];

  if (entry.pick) {
    if (entry.pick.startsWith("File:")) {
      const url = new URL("https://commons.wikimedia.org/w/api.php");
      url.search = new URLSearchParams({
        action: "query", titles: entry.pick, prop: "imageinfo", iiprop: "url|size|mime|extmetadata",
        iiextmetadatafilter: "LicenseShortName|Artist", format: "json",
      }).toString();
      const r = await fetch(url, { headers: { "User-Agent": UA } });
      const j = r.ok ? await r.json() : {};
      const p = Object.values(j?.query?.pages ?? {})[0];
      const ii = p?.imageinfo?.[0];
      if (ii) candidates.push({
        source: "wikimedia:pick", title: p.title, url: ii.url, width: ii.width, height: ii.height, bytes: ii.size,
        mime: ii.mime, license: ii.extmetadata?.LicenseShortName?.value ?? "", page: ii.descriptionurl,
      });
      else log(`  ✗ pick 을 찾을 수 없음: ${entry.pick}`);
    } else {
      candidates.push({ source: "manual", title: entry.pick, url: entry.pick });
    }
  }
  // 스톡 소스 우선 (Pexels/Unsplash 는 API 키가 있을 때만 동작, Openverse 는 익명 한도 내에서)
  if (candidates.length === 0 && entry.prefer === "stock") {
    for (const search of [searchPexels, searchUnsplash, searchOpenverse]) {
      for (const q of entry.queries) {
        const os = (await search(q)).filter(passesMeta).filter((c) => !rejects.has(c.url) && !rejects.has(c.title));
        candidates.push(...os.sort((a, b) => score(b) - score(a)).slice(0, 6));
        if (candidates.length >= 3) break;
      }
      if (candidates.length >= 3) break;
    }
  }
  if (candidates.length === 0) {
    // 1) 카테고리 기반
    for (const q of entry.queries) {
      const cs = (await searchByCategory(q, entry.cats)).filter(passesMeta).filter((c) => !rejects.has(c.title));
      candidates.push(...cs.sort((a, b) => score(b) - score(a)).slice(0, 4));
      if (candidates.length >= 4) break;
    }
    // 2) 풀텍스트
    if (candidates.length < 2) {
      for (const q of entry.queries) {
        const cs = (await searchCommons(q)).filter(passesMeta).filter((c) => !rejects.has(c.title));
        candidates.push(...cs.sort((a, b) => score(b) - score(a)).slice(0, 4));
        if (candidates.length >= 4) break;
      }
    }
    // 3) Openverse
    if (candidates.length < 2) {
      for (const q of entry.queries) {
        const os = (await searchOpenverse(q)).filter(passesMeta).filter((c) => !rejects.has(c.url) && !rejects.has(c.title));
        candidates.push(...os.sort((a, b) => score(b) - score(a)).slice(0, 4));
        if (candidates.length >= 4) break;
      }
    }
  }

  for (const c of candidates) {
    process.stdout.write(`  ↳ ${c.source} | ${c.title?.slice(0, 60)} | ${c.width ?? "?"}x${c.height ?? "?"} … `);
    const d = await download(c);
    if (d.error) { log(`REJECT (${d.error})`); continue; }
    const saved = await saveWebp(d.buf, d.meta, outPath);
    log(`OK → ${saved.width}x${saved.height} ${Math.round(saved.bytes / 1024)}KB`);
    report[entry.slug] = {
      slug: entry.slug, name: entry.name, category: entry.category,
      file: path.relative(ROOT, outPath).replaceAll("\\", "/"),
      width: saved.width, height: saved.height, bytes: saved.bytes,
      original: { width: d.meta.width, height: d.meta.height, bytes: d.buf.length },
      source: c.source, title: c.title, url: c.url, page: c.page ?? "", license: c.license ?? "",
    };
    return true;
  }
  log(`  ✗ ${entry.slug}: 통과 후보 없음`);
  delete report[entry.slug];
  return false;
}

/** 저장된 파일 재검증 (--report) */
async function reverify(report) {
  for (const [slug, r] of Object.entries(report)) {
    const p = path.join(ROOT, r.file);
    try {
      const m = await sharp(p).metadata();
      const st = await fs.stat(p);
      r.width = m.width; r.height = m.height; r.bytes = st.size;
    } catch { delete report[slug]; }
  }
}

function printTable(report, review) {
  const rows = [];
  let fails = 0;
  for (const e of MANIFEST) {
    const r = report[e.slug];
    const v = review[e.slug];
    if (!r) { rows.push(`| ${e.name} | (없음) | - | - | ❌ 미확보 |`); fails++; continue; }
    const resOk = Math.min(r.width, r.height) >= HARD_MIN_SIDE;
    const styleOk = v?.ok === true;
    const style = v ? `${v.note}${styleOk ? " (통과)" : " (탈락)"}` : "미검수";
    if (!resOk || !styleOk) fails++;
    rows.push(`| ${e.name} | ${path.basename(r.file)} | ${r.width}x${r.height}${resOk ? "" : " ⚠️"} | ${Math.round(r.bytes / 1024)}KB | ${style} |`);
  }
  log("\n| 상품명 | 매핑된 이미지 파일명 | 실제 해상도(W x H) | 파일 용량 | 스타일 적합 여부 (스튜디오/누끼) |");
  log("|---|---|---|---|---|");
  rows.forEach((r) => log(r));
  log(`\n총 ${MANIFEST.length}개 중 기준 미달/미검수 ${fails}개`);
  return fails;
}

async function main() {
  const report = await readJson(REPORT_PATH, {});
  const review = await readJson(REVIEW_PATH, {});

  const REDO = args.includes("--redo"); // 검수 미통과(ok!==true) 항목만 재수집

  if (!REPORT_ONLY) {
    for (const e of MANIFEST) {
      if (onlySet && !onlySet.has(e.slug)) continue;
      if (REDO) {
        if (review[e.slug]?.ok === true) continue;
      } else if (!FORCE && !onlySet && report[e.slug]) continue;
      // 검수 탈락 파일은 자동 reject
      if (review[e.slug]?.ok === false && report[e.slug]) {
        e.reject = [...(e.reject ?? []), report[e.slug].title, report[e.slug].url];
      }
      log(`\n● ${e.slug} — ${e.name}`);
      const prevTitle = report[e.slug]?.title;
      try { await processEntry(e, report); } catch (err) { log(`  ✗ 오류: ${err.message}`); }
      // 파일이 바뀌면 이전 검수 결과는 무효
      if (report[e.slug]?.title !== prevTitle) { delete review[e.slug]; await fs.writeFile(REVIEW_PATH, JSON.stringify(review, null, 2)); }
      await fs.writeFile(REPORT_PATH, JSON.stringify(report, null, 2));
    }
  }
  await reverify(report);
  await fs.writeFile(REPORT_PATH, JSON.stringify(report, null, 2));

  // 프론트엔드 매핑: 해상도 + 시각 검수 모두 통과한 항목만 내보낸다
  const mapping = {};
  for (const e of MANIFEST) {
    const r = report[e.slug];
    if (r && review[e.slug]?.ok === true && Math.min(r.width, r.height) >= HARD_MIN_SIDE) {
      mapping[e.slug] = { src: "/" + r.file.replace(/^public\//, ""), width: r.width, height: r.height, credit: r.page, license: r.license };
    }
  }
  await fs.writeFile(path.join(ROOT, "lib", "product-images.json"), JSON.stringify(mapping, null, 2));
  log(`\nlib/product-images.json → ${Object.keys(mapping).length}개 매핑`);

  const fails = printTable(report, review);
  process.exitCode = fails > 0 ? 1 : 0;
}

main();
