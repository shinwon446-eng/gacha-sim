const BLOCKED_TERMS = [
  "porn", "xxx", "onlyfans", "nude", "sex", "야동", "음란", "노출", "성인물",
  "바카라", "토토", "슬롯", "도박", "카지노", "betting", "gambling", "casino",
  "텔레그램", "카톡", "오픈채팅", "대출", "투자방", "무료머니", "spam",
];

function normalized(value: string) {
  return value.normalize("NFKC").toLocaleLowerCase().replace(/[\s._-]+/g, "");
}

/** Shared client-side policy gate for every community authoring surface. */
export function assertCommunitySafeText(...values: string[]) {
  const text = normalized(values.join(" "));
  if (BLOCKED_TERMS.some(term => text.includes(normalized(term)))) throw new Error("community-content-blocked");
}

export function assertCommunityImageFile(file: File) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 8 * 1024 * 1024) throw new Error("community-image-invalid");
  assertCommunitySafeText(file.name);
}

export function assertCommunityImages(images: unknown): asserts images is string[] | undefined {
  if (images === undefined) return;
  if (!Array.isArray(images) || images.length > 3 || images.some(image => typeof image !== "string" || !/^data:image\/(jpeg|png|webp);base64,/.test(image) || image.length > 1_500_000)) throw new Error("community-image-invalid");
}
