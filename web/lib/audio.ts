// Web Audio API 기반 시네마틱 효과음 (외부 오디오 에셋 불필요)
import type { Line } from "./types";

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

/** 당첨 — 라인업별 아르페지오 */
export function playWin(line: Line) {
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;
  const chords: Record<Line, number[]> = {
    jackpot: [523, 659, 784, 1047, 1319, 1568],
    value: [392, 494, 587, 784],
    start: [330, 392],
  };
  chords[line].forEach((f, i) => tone(ac, f, t + i * 0.09, 0.9, { type: "triangle", gain: 0.14 }));
  if (line === "jackpot") tone(ac, 65, t, 2.5, { type: "sawtooth", gain: 0.2, slideTo: 55 });
}

/** 결제/충전 완료 */
export function playChime() {
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;
  tone(ac, 880, t, 0.25, { type: "sine", gain: 0.12 });
  tone(ac, 1320, t + 0.12, 0.4, { type: "sine", gain: 0.12 });
}

/** 3단계 문지기 1단계 — 금고 휠 '찰칵' */
export function playGearClick() {
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;
  tone(ac, 420, t, 0.05, { type: "square", gain: 0.06, slideTo: 180 });
  tone(ac, 1200, t + 0.02, 0.04, { type: "square", gain: 0.04, slideTo: 600 });
}

/** 3단계 문지기 3단계 — 암전 속 심장 박동 '쿵... 쿵...' */
export function playHeartbeat() {
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;
  tone(ac, 58, t, 0.18, { type: "sine", gain: 0.5, slideTo: 40 });
  tone(ac, 58, t + 0.22, 0.14, { type: "sine", gain: 0.35, slideTo: 40 });
}

/** 승급 반전 — 화면 갈라짐 노이즈 + 번개 */
export function playGlitch() {
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;
  for (let i = 0; i < 6; i++) tone(ac, 220 + Math.random() * 1800, t + i * 0.045, 0.04, { type: "sawtooth", gain: 0.05, slideTo: 90 });
  tone(ac, 1800, t + 0.3, 0.35, { type: "sawtooth", gain: 0.12, slideTo: 120 });
  tone(ac, 55, t + 0.3, 0.6, { type: "sine", gain: 0.4, slideTo: 38 });
}

/** 니어미스 — 경계에서 멈칫거릴 때 짧은 이중 틱 */
export function playTension() {
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;
  tone(ac, 1400, t, 0.05, { type: "square", gain: 0.05, slideTo: 700 });
  tone(ac, 1400, t + 0.12, 0.05, { type: "square", gain: 0.05, slideTo: 700 });
  tone(ac, 90, t, 0.4, { type: "sine", gain: 0.25, slideTo: 60 });
}
