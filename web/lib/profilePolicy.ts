/** Shared rules for UI, browser transport and server implementations. */
export const NICKNAME_CHANGE_INTERVAL_MS = 14 * 24 * 60 * 60 * 1000;
export const AVATAR_MAX_FILE_BYTES = 5 * 1024 * 1024;
export const AVATAR_MAX_DATA_LENGTH = 350_000;
export type NicknameIssue = "nickname_length" | "nickname_format" | "nickname_prohibited" | "nickname_reserved";
export const normalizeNickname = (value: string) => value.normalize("NFKC").trim();
export const nicknameKey = (value: string) => normalizeNickname(value).toLowerCase();
const compact = (value: string) => nicknameKey(value).replace(/[_\-\s]/g, "");
const forbiddenCharacters = new RegExp("[\\p{C}\\p{Z}]", "u");
const permittedCharacters = new RegExp("^[\\p{L}\\p{N}_-]+$", "u");
const blocked = ["시발", "씨발", "씨빨", "씨바", "시바새끼", "개새끼", "병신", "븅신", "좆", "지랄", "보지", "자지", "ㅅㅂ", "ㅆㅂ", "ㅂㅅ", "fuck", "bitch", "asshole", "nigger", "nigga", "faggot", "傻逼", "傻屄", "操你", "草你", "妈的", "他妈", "死ね", "くたばれ"].map(compact);
export function nicknameIssue(value: string): NicknameIssue | null {
  const normalized = normalizeNickname(value);
  const length = Array.from(normalized).length;
  if (length < 2 || length > 20) return "nickname_length";
  if (forbiddenCharacters.test(value.trim()) || !permittedCharacters.test(normalized)) return "nickname_format";
  const key = compact(normalized);
  const latin = key.replace(/0/g, "o").replace(/[1!]/g, "i").replace(/3/g, "e").replace(/4/g, "a").replace(/5/g, "s").replace(/7/g, "t");
  if (blocked.some(word => key.includes(word) || latin.includes(word)) || /^(shit|shithead|cunt|dick|sex|porn)\d*$/.test(key)) return "nickname_prohibited";
  if (/(admin|administrator|moderator|customer.?support|운영자|관리자|고객센터|공식계정|客服|管理员|管理員)/.test(key)
    || /^(support|official|voila(?:official|support|admin|team))[0-9]*$/.test(key) || key === "voila") return "nickname_reserved";
  return null;
}
export const validNickname = (value: string) => nicknameIssue(value) === null;
export function nextNicknameChangeAt(user: { nicknameChangedAt?: string; nextNicknameChangeAt?: string }): string | null {
  const changed = Date.parse(user.nicknameChangedAt ?? "");
  const next = Date.parse(user.nextNicknameChangeAt ?? "");
  const time = Math.max(Number.isFinite(changed) ? changed + NICKNAME_CHANGE_INTERVAL_MS : 0, Number.isFinite(next) ? next : 0);
  return time ? new Date(time).toISOString() : null;
}
export function validAvatarData(value: unknown): value is string {
  if (typeof value !== "string" || value.length > AVATAR_MAX_DATA_LENGTH) return false;
  // Require a raster signature as well as the declared MIME type. SVG/HTML and remote URLs are rejected.
  return /^data:image\/png;base64,iVBORw0KGgo[A-Za-z0-9+/]*={0,2}$/.test(value)
    || /^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/]*={0,2}$/.test(value)
    || /^data:image\/webp;base64,UklGR[A-Za-z0-9+/]*={0,2}$/.test(value);
}
export function validAvatarUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  if (validAvatarData(value)) return true;
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password; } catch { return false; }
}
