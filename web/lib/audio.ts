// Web Audio API 기반 시네마틱 효과음 (외부 오디오 에셋 불필요)
import type { Tier } from "./types";

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(
  ac: AudioContext,
  freq: number,
  start: number,
  duration: number,
  opts: { type?: OscillatorType; gain?: number; slideTo?: number } = {},
) {
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = opts.type ?? "sine";
  osc.frequency.setValueAtTime(freq, start);
  if (opts.slideTo) osc.frequency.exponentialRampToValueAtTime(opts.slideTo, start + duration);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(opts.gain ?? 0.2, start + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(g).connect(ac.destination);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

/** 극장 조명이 꺼질 때 — 시그니처 "타-덤" 풍 저음 두 방 */
export function playTaDum() {
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;
  tone(ac, 98, t, 0.5, { type: "sawtooth", gain: 0.18, slideTo: 82 });
  tone(ac, 196, t, 0.5, { type: "triangle", gain: 0.1 });
  tone(ac, 65, t + 0.55, 2.2, { type: "sawtooth", gain: 0.22, slideTo: 49 });
  tone(ac, 130, t + 0.55, 2.2, { type: "sine", gain: 0.12 });
}

/** 릴이 한 칸 지날 때 */
export function playTick() {
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;
  tone(ac, 1600, t, 0.045, { type: "square", gain: 0.05, slideTo: 900 });
}

/** 당첨 — 티어별 아르페지오 */
export function playWin(tier: Tier) {
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;
  const chords: Record<Tier, number[]> = {
    SSR: [523, 659, 784, 1047, 1319, 1568],
    SR: [440, 554, 659, 880, 1109],
    R: [392, 494, 587, 784],
    N: [330, 392],
  };
  const notes = chords[tier];
  notes.forEach((f, i) => tone(ac, f, t + i * 0.09, 0.9, { type: "triangle", gain: 0.14 }));
  if (tier === "SSR") tone(ac, 65, t, 2.5, { type: "sawtooth", gain: 0.2, slideTo: 55 });
}

/** 결제/충전 완료 */
export function playChime() {
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;
  tone(ac, 880, t, 0.25, { type: "sine", gain: 0.12 });
  tone(ac, 1320, t + 0.12, 0.4, { type: "sine", gain: 0.12 });
}
