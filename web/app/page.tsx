"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LOCALES, routing, type Locale } from "@/i18n/routing";

const STORAGE_KEY = "gachaflix.locale";

/** 브라우저 언어 → 지원 로케일. zh-* 는 전부 zh(간체)로. */
function detect(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && (LOCALES as readonly string[]).includes(saved)) return saved as Locale;
  } catch {
    /* 저장소 접근 불가 — 감지로 진행 */
  }
  const lang = (navigator.language || "").toLowerCase();
  if (lang.startsWith("ko")) return "ko";
  if (lang.startsWith("zh")) return "zh";
  if (lang.startsWith("en")) return "en";
  return routing.defaultLocale;
}

/**
 * 루트(/) — 정적 export 라 middleware 가 없으므로 클라이언트에서 로케일로 보낸다.
 * 저장된 선택 > 브라우저 언어 > 기본(ko).
 */
export default function RootRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace(`/${detect()}`);
  }, [router]);
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas">
      <span className="caption-luxury">GACHAFLIX</span>
    </main>
  );
}
