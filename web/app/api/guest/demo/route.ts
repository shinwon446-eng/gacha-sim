// 비회원 모의 체험 세션 API.
//
// ⚠️ 이 엔드포인트는 어떤 상품도 지급하지 않는다. 계정/보관함/쿠폰함에 쓰는 로직이 없으며,
//    반환값은 소멸 마감시각뿐이다. 노출 상품은 클라이언트가 카탈로그에서 결정한다(고정 1등 상품).
//
// 다층 어뷰징 방어:
// 1) HttpOnly 쿠키(guest_trial_completed): 같은 브라우저 재요청 차단 (localStorage 삭제로 우회 불가)
// 2) IP + Canvas/WebGL Fingerprint 해시를 서버 캐시에 기록: 쿠키 삭제/시크릿 창 우회 차단 → 429
import { NextRequest, NextResponse } from "next/server";
import { DEMO_DURATION_MS } from "@/lib/engine";
import { guestClaims } from "@/server/state";

const ALREADY = {
  error: "already_claimed",
  message: "이미 대박 기운을 확인하셨습니다",
  // 클라이언트가 가입 유도 모달을 띄우도록 하는 트리거 데이터
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
  if (req.cookies.get("guest_trial_completed")?.value) {
    return NextResponse.json(ALREADY, { status: 429 });
  }

  // 방어 2: IP + fingerprint 해시
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "127.0.0.1";
  const fp = String(body.fingerprint ?? "fp-unavailable").slice(0, 128);
  const key = `${ip}:${fp}`;
  if (guestClaims.has(key)) {
    return NextResponse.json(ALREADY, { status: 429 });
  }
  guestClaims.set(key, Date.now());

  const res = NextResponse.json({ deadline: Date.now() + DEMO_DURATION_MS });
  res.cookies.set("guest_trial_completed", "true", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
