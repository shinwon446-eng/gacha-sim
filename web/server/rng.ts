import { randomBytes } from "node:crypto";

/**
 * CSPRNG 기반 [0,1) 난수.
 * crypto.randomInt 는 (max - min) <= 2**48 - 1 제약이 있어 경계값에서 RangeError 가 나므로,
 * 48비트 난수를 직접 만들어 2**48 로 나눈다. Math.random 은 확률 계산에 쓰지 않는다.
 */
export function secureRandom(): number {
  const b = randomBytes(6); // 48비트
  const v = b[0] * 2 ** 40 + b[1] * 2 ** 32 + b[2] * 2 ** 24 + b[3] * 2 ** 16 + b[4] * 2 ** 8 + b[5];
  return v / 2 ** 48;
}
