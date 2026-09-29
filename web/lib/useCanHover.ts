"use client";
import { useEffect, useState } from "react";

const QUERY = "(hover: hover) and (pointer: fine)";

/**
 * 마우스 호버가 가능한 입력 장치인지. 터치 기기는 탭 한 번에 mouseenter → click 이 연달아 오고
 * mouseleave 는 오지 않아 호버 상태가 눌러붙는다 — 그런 기기에서는 호버 확장을 아예 켜지 않는다.
 * SSR 과 첫 렌더는 false (정적 export 와 마크업이 일치해야 한다).
 */
export function useCanHover(): boolean {
  const [can, setCan] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const sync = () => setCan(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return can;
}
