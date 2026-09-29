export const NICKNAME_CHANGE_INTERVAL_MS = 14 * 24 * 60 * 60 * 1000;

const forbiddenWords = [
  "admin", "administrator", "operator", "system", "official", "voila",
  "관리자", "운영자", "고객센터", "대표", "공식",
  "씨발", "시발", "병신", "좆", "씹", "fuck", "shit", "bitch", "asshole", "bastard",
  "야동", "포르노", "성인", "섹스", "성관계", "자위", "음란", "누드", "노출", "성매매", "매춘", "창녀", "강간", "원나잇", "보지", "자지",
  "porn", "porno", "sex", "xxx", "nude", "naked", "erotic", "hentai", "onlyfans", "camgirl", "camsex", "escort", "prostitute", "prostitution", "slut", "whore", "rape",
];

function timestamp(value?: string | number | null): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function canChangeNickname(lastUpdatedAt?: string | number | null, now = Date.now()) {
  const lastChanged = timestamp(lastUpdatedAt);
  if (lastChanged === null) return { allowed: true, remainingDays: 0, nextAvailableAt: null };

  const nextAvailable = lastChanged + NICKNAME_CHANGE_INTERVAL_MS;
  if (now >= nextAvailable) return { allowed: true, remainingDays: 0, nextAvailableAt: new Date(nextAvailable).toISOString() };
  return {
    allowed: false,
    remainingDays: Math.ceil((nextAvailable, now) / (24 * 60 * 60 * 1000)),
    nextAvailableAt: new Date(nextAvailable).toISOString(),
  };
}

export function containsForbiddenNicknameWord(nickname: string): boolean {
  const normalized = nickname.normalize("NFC").toLocaleLowerCase();
  const compact = normalized.replace(/[_-]/g, "");
  return forbiddenWords.some(word => normalized.includes(word) || compact.includes(word));
}

export function validateNewNickname(nickname: string, currentNickname?: string): { valid: boolean; reason?: "format" | "same" | "forbidden" } {
  const normalized = nickname.trim().normalize("NFC");
  if (!/^[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7A3A-Za-z0-9]{2,12}$/.test(normalized)) return { valid: false, reason: "format" };
  if (currentNickname && normalized.toLocaleLowerCase() === currentNickname.trim().normalize("NFC").toLocaleLowerCase()) return { valid: false, reason: "same" };
  if (containsForbiddenNicknameWord(normalized)) return { valid: false, reason: "forbidden" };
  return { valid: true };
}
