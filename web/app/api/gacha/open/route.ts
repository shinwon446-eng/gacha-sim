// 뽑기 API — 확률 계산과 난수 생성은 전부 여기(서버)에서 실행된다.
// 클라이언트에는 최종 당첨 아이템 id 목록과 갱신된 pityCount, boosterTriggered 만 내려준다.
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getBox } from "@/lib/data";
import { runPulls } from "@/lib/engine";
import { sessions } from "@/server/state";
import { secureRandom as rand } from "@/server/rng";
import { MULTI_DISCOUNT } from "@/lib/types";

export async function POST(req: NextRequest) {
  let body: { boxId?: string; count?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const count = body.count === 10 ? 10 : 1;
  let box;
  try {
    box = getBox(String(body.boxId));
  } catch {
    return NextResponse.json({ error: "unknown_box" }, { status: 400 });
  }

  const sid = req.cookies.get("gsid")?.value ?? randomUUID();
  const session = sessions.get(sid) ?? { pityCount: 0, totalSpent: 0 };

  const cost = count === 10 ? Math.round(box.price * 10 * MULTI_DISCOUNT) : box.price;
  const result = runPulls(box, count, session, rand);

  session.pityCount = result.pityCount;
  session.totalSpent += cost;
  sessions.set(sid, session);

  const res = NextResponse.json({
    itemIds: result.items.map((i) => i.id),
    pityCount: result.pityCount,
    boosterTriggered: result.boosterTriggered,
    tier: result.tier,
    totalSpent: session.totalSpent,
  });
  res.cookies.set("gsid", sid, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  return res;
}
