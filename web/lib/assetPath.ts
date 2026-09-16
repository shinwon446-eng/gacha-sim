/**
 * public/ 정적 자산 경로에 배포 basePath 를 붙인다.
 *
 * 데이터는 항상 "/assets/…" 절대 경로만 들고 있고, GitHub Pages(/gacha-sim) 같은
 * 하위 경로 배포 여부는 next.config 가 NEXT_PUBLIC_BASE_PATH 로 알려준다.
 * 원격 URL(http/https)은 그대로 통과한다.
 */
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function assetPath(src: string): string {
  if (/^https?:\/\//.test(src) || src.startsWith("data:")) return src;
  if (!BASE) return src;
  return src.startsWith(BASE + "/") ? src : BASE + src;
}
