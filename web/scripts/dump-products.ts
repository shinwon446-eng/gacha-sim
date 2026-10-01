/** gen-messages.py 입력(.dump.txt) 생성 — `npx tsx scripts/dump-products.ts` */
import { writeFileSync } from "node:fs";
import { BOXES } from "../lib/products";

const lines: string[] = [];
for (const b of BOXES) {
  lines.push(`BOX ${b.slug} | ${b.title} | ${b.titleEn} | ${b.badge} | ${b.tagline}`);
  for (const it of b.items) lines.push(`  ${it.id} | ${it.name} | ${it.nameEn}`);
}
writeFileSync(".dump.txt", lines.join("\n") + "\n", "utf-8");
console.log(`dumped ${BOXES.length} boxes`);
