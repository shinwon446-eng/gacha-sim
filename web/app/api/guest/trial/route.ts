// 게스트 무료체험 API — 다층 어뷰징 방어.
// 1) HttpOnly 쿠키(_guest_trial_claim): 같은 브라우저 재요청 차단 (localStorage 삭제로 우회 불가)
// 2) IP + Canvas/WebGL Fingerprint 해시를 서버 캐시에 기록: 쿠키 삭제/시크릿 창 우회 차단 → 429
import { NextRequest, NextResponse } from "next/server";
import { pickWeightedAdjusted, TRIAL_POOL, TRIAL_DURATION_MS } from "@/lib/engine";
import { guestClaims } from "@/server/state";
import { secureRandom as rand } from "@/server/rng";

const ALREADY = {
  error: "already_claimed",
  message: "이미 체험을 완료하셨습니다",
  // 클라이언트가 가입 모달을 띄우도록 하는 트리거 데이터
  action: "signup_modal",
};

export async function POST(req: NextRequest) {
  let body: { fingerprint?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  // 방어 1: HttpOnly 쿠키
  if (req.cookies.get("_guest_trial_claim")?.value) {
    return NextResponse.json(ALREADY, { status: 429 });
  }

  // 방어 2: IP + fingerprint 해시
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "127.0.0.1";
  const fp = String(body.fingerprint ?? "fp-unavailable").slice(0, 128);
  const key = `${ip}:${fp}`;
  if (guestClaims.has(key)) {
    return NextResponse.json(ALREADY, { status: 429 });
  }

  const prize = pickWeightedAdjusted(TRIAL_POOL, { boost: false, tierMult: 1 }, rand);
  guestClaims.set(key, Date.now());

  const res = NextResponse.json({ prizeId: prize.id, deadline: Date.now() + TRIAL_DURATION_MS });
  res.cookies.set("_guest_trial_claim", "1", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 });
  return res;
}
