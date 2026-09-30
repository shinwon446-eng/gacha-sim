// Web Audio API 기반 효과음 + 배경 음악 컨트롤러
// 효과음은 합성(외부 에셋 없음), 배경 음악만 /audio/velvet-vault.wav 를 쓴다.
// 모든 진입점은 SSR 에서 아무 일도 하지 않는다(window 가 없으면 즉시 반환).
import type { Line } from "./types";

// ───────────────────────── 공통 오디오 그래프 ─────────────────────────
// voice → sfxBus(전체 볼륨) → limiter(소프트 리미터) → destination

const SFX_MASTER_GAIN = 0.5;
const MAX_VOICES = 64;

let ctx: AudioContext | null = null;
let sfxBus: GainNode | null = null;
let noiseBuffer: AudioBuffer | null = null;
let activeVoices = 0;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  installLifecycle();
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -18;
      limiter.knee.value = 12;
      limiter.ratio.value = 6;
      limiter.attack.value = 0.003;
      limiter.release.value = 0.25;
      sfxBus = ctx.createGain();
      sfxBus.gain.value = SFX_MASTER_GAIN;
      sfxBus.connect(limiter).connect(ctx.destination);
    }
    if (ctx.state === "suspended") void ctx.resume().catch(() => {});
    return ctx;
  } catch {
    return null;
  }
}

/** 효과음을 낼 수 있는 상태면 컨텍스트를, 아니면 null (탭이 숨겨졌거나 발음 수 초과) */
function sfxCtx(): AudioContext | null {
  if (typeof document !== "undefined" && document.hidden) return null;
  if (activeVoices > MAX_VOICES) return null;
  const ac = getCtx();
  return ac && sfxBus ? ac : null;
}

const lastPlayed: Record<string, number> = {};
/** 같은 효과음이 minMs 안에 다시 불리면 건너뛴다(릴 틱 폭주 방지) */
function rateLimited(key: string, minMs: number): boolean {
  const now = typeof performance !== "undefined" ? performance.now() : Date.now();
  if (now - (lastPlayed[key] ?? -Infinity) < minMs) return true;
  lastPlayed[key] = now;
  return false;
}

/** 소스가 끝나면 체인 전체를 끊어 노드가 쌓이지 않게 한다 */
function track(src: AudioScheduledSourceNode, nodes: AudioNode[]) {
  activeVoices++;
  src.onended = () => {
    activeVoices = Math.max(0, activeVoices - 1);
    for (const n of nodes) {
      try {
        n.disconnect();
      } catch {
        /* 이미 끊김 */
      }
    }
  };
}

function panNode(ac: AudioContext, pan: number | undefined): AudioNode | null {
  if (!pan || typeof ac.createStereoPanner !== "function") return null;
  const p = ac.createStereoPanner();
  p.pan.value = Math.max(-1, Math.min(1, pan));
  return p;
}

function connectChain(nodes: (AudioNode | null)[]): AudioNode[] {
  const chain = nodes.filter((n): n is AudioNode => n !== null);
  for (let i = 0; i < chain.length - 1; i++) chain[i].connect(chain[i + 1]);
  chain[chain.length - 1].connect(sfxBus as GainNode);
  return chain;
}

interface ToneOpts {
  type?: OscillatorType;
  gain?: number;
  slideTo?: number;
  attack?: number;
  lowpass?: number;
  detune?: number;
  pan?: number;
}

/** 부드러운 어택·지수 감쇠의 단일 발음 */
function tone(ac: AudioContext, freq: number, start: number, duration: number, opts: ToneOpts = {}) {
  const osc = ac.createOscillator();
  const g = ac.createGain();
  const attack = Math.min(opts.attack ?? 0.012, duration * 0.5);
  osc.type = opts.type ?? "sine";
  osc.frequency.setValueAtTime(freq, start);
  if (opts.detune) osc.detune.setValueAtTime(opts.detune, start);
  if (opts.slideTo) osc.frequency.exponentialRampToValueAtTime(opts.slideTo, start + duration);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, opts.gain ?? 0.1), start + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  let lp: BiquadFilterNode | null = null;
  if (opts.lowpass) {
    lp = ac.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = opts.lowpass;
    lp.Q.value = 0.5;
  }
  const chain = connectChain([osc, lp, g, panNode(ac, opts.pan)]);
  track(osc, chain);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

function getNoise(ac: AudioContext): AudioBuffer {
  if (noiseBuffer && noiseBuffer.sampleRate === ac.sampleRate) return noiseBuffer;
  const len = Math.floor(ac.sampleRate * 1);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  noiseBuffer = buf;
  return buf;
}

interface NoiseOpts {
  freq: number;
  q?: number;
  gain?: number;
  sweepTo?: number;
  attack?: number;
  filter?: BiquadFilterType;
  pan?: number;
}

/** 필터를 거친 짧은 노이즈 — 기계식 클릭, 공기감, 스윕 */
function noise(ac: AudioContext, start: number, duration: number, opts: NoiseOpts) {
  const src = ac.createBufferSource();
  src.buffer = getNoise(ac);
  src.loop = true; // 1초 버퍼보다 긴 스윕도 끊기지 않게
  const f = ac.createBiquadFilter();
  f.type = opts.filter ?? "bandpass";
  f.frequency.setValueAtTime(opts.freq, start);
  f.Q.value = opts.q ?? 1;
  if (opts.sweepTo) f.frequency.exponentialRampToValueAtTime(opts.sweepTo, start + duration);
  const g = ac.createGain();
  const attack = Math.min(opts.attack ?? 0.002, duration * 0.5);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, opts.gain ?? 0.05), start + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  const chain = connectChain([src, f, g, panNode(ac, opts.pan)]);
  track(src, chain);
  // 버퍼의 임의 지점에서 시작해 매번 결이 조금씩 다르게
  src.start(start, Math.random() * 0.5);
  src.stop(start + duration + 0.05);
}

/** 유리 벨 — 기음 + 옅은 배음 두 개, 고역은 깎아 둔다 */
function bell(ac: AudioContext, freq: number, start: number, duration: number, gain: number, pan = 0) {
  tone(ac, freq, start, duration, { gain, attack: 0.004, lowpass: 6000, pan });
  tone(ac, freq * 2, start, duration * 0.55, { gain: gain * 0.22, attack: 0.003, lowpass: 7000, pan });
  tone(ac, freq * 3.01, start, duration * 0.3, { gain: gain * 0.07, attack: 0.002, lowpass: 8000, pan });
}

/** 따뜻한 패드 — 살짝 디튠된 삼각파 두 겹을 저역 통과 */
function pad(ac: AudioContext, freqs: number[], start: number, duration: number, gain: number) {
  freqs.forEach((f, i) => {
    const pan = freqs.length > 1 ? (i / (freqs.length - 1)) * 0.6 - 0.3 : 0;
    tone(ac, f, start, duration, { type: "triangle", gain, attack: duration * 0.3, lowpass: 1400, detune: -6, pan });
    tone(ac, f, start, duration, { type: "triangle", gain, attack: duration * 0.3, lowpass: 1400, detune: 6, pan: -pan });
  });
}

// ───────────────────────── 효과음 ─────────────────────────

/** 극장 조명이 꺼질 때 — 부드러운 저음 말렛 + 따뜻한 패드 스웰 */
export function playTaDum() {
  const ac = sfxCtx();
  if (!ac) return;
  const t = ac.currentTime + 0.01;
  duckBgm(0.4, 1800);
  noise(ac, t, 0.07, { freq: 180, q: 1.2, gain: 0.12 });
  tone(ac, 73.42, t, 0.9, { gain: 0.28, attack: 0.008, lowpass: 500, slideTo: 70 });
  tone(ac, 146.83, t, 0.6, { gain: 0.06, attack: 0.008, lowpass: 700 });
  pad(ac, [146.83, 220, 329.63], t + 0.4, 2.2, 0.028);
  tone(ac, 73.42, t + 0.4, 2.0, { gain: 0.14, attack: 0.3, lowpass: 260 });
  bell(ac, 587.33, t + 0.55, 1.6, 0.03);
}

/** 릴이 한 칸 지날 때 — 짧은 기계식 클릭(초당 최대 ~28회) */
export function playTick() {
  if (rateLimited("tick", 36)) return;
  const ac = sfxCtx();
  if (!ac) return;
  const t = ac.currentTime;
  noise(ac, t, 0.022, { freq: 3200, q: 4, gain: 0.07 });
  tone(ac, 2400, t, 0.018, { gain: 0.012, attack: 0.001, slideTo: 1900 });
}

/** 당첨, 라인업별 벨 아르페지오 (D 리디안 계열 보이싱) */
export function playWin(line: Line) {
  if (rateLimited("win", 120)) return;
  const ac = sfxCtx();
  if (!ac) return;
  const t = ac.currentTime + 0.01;
  const chords: Record<Line, number[]> = {
    jackpot: [440, 587.33, 739.99, 880, 1108.73, 1318.51],
    value: [587.33, 739.99, 880, 1108.73],
    start: [587.33, 880],
  };
  const notes = chords[line];
  const step = line === "jackpot" ? 0.085 : 0.07;
  const level = line === "jackpot" ? 0.055 : line === "value" ? 0.05 : 0.045;
  duckBgm(line === "jackpot" ? 0.3 : 0.55, line === "jackpot" ? 2600 : 1000);
  notes.forEach((f, i) => {
    const pan = notes.length > 1 ? (i / (notes.length - 1)) * 0.5 - 0.25 : 0;
    bell(ac, f, t + i * step, line === "jackpot" ? 1.6 : 1.0, level, pan);
  });
  if (line === "jackpot") {
    pad(ac, [146.83, 220, 277.18], t, 2.8, 0.03);
    tone(ac, 73.42, t, 2.4, { gain: 0.12, attack: 0.25, lowpass: 240 });
    noise(ac, t + 0.2, 1.4, { freq: 6000, sweepTo: 9000, q: 0.8, gain: 0.018, attack: 0.4 });
  }
}

/** 결제/충전 완료 — 두 음 벨 */
export function playChime() {
  if (rateLimited("chime", 150)) return;
  const ac = sfxCtx();
  if (!ac) return;
  const t = ac.currentTime + 0.01;
  bell(ac, 1174.66, t, 0.7, 0.05, -0.1);
  bell(ac, 1760, t + 0.09, 0.9, 0.045, 0.1);
}

/** 3단계 문지기 1단계, 금고 휠 '찰칵' — 금속 래치 두 번 + 둔탁한 몸통음 */
export function playGearClick() {
  if (rateLimited("gear", 60)) return;
  const ac = sfxCtx();
  if (!ac) return;
  const t = ac.currentTime;
  noise(ac, t, 0.03, { freq: 2500, q: 6, gain: 0.1 });
  noise(ac, t + 0.035, 0.025, { freq: 1500, q: 5, gain: 0.07 });
  tone(ac, 150, t, 0.09, { gain: 0.1, attack: 0.002, lowpass: 600, slideTo: 95 });
}

/** 3단계 문지기 3단계, 암전 속 심장 박동 '쿵... 쿵...' */
export function playHeartbeat() {
  if (rateLimited("heart", 200)) return;
  const ac = sfxCtx();
  if (!ac) return;
  const t = ac.currentTime;
  duckBgm(0.45, 700);
  tone(ac, 55, t, 0.2, { gain: 0.3, attack: 0.006, lowpass: 180, slideTo: 41 });
  tone(ac, 55, t + 0.24, 0.16, { gain: 0.2, attack: 0.006, lowpass: 180, slideTo: 41 });
}

/** 승급 반전 — 짧은 디지털 스터터 → 공기 스윕 → 저음 낙하 + 옅은 반짝임 */
export function playGlitch() {
  if (rateLimited("glitch", 250)) return;
  const ac = sfxCtx();
  if (!ac) return;
  const t = ac.currentTime;
  duckBgm(0.35, 1400);
  for (let i = 0; i < 5; i++) {
    noise(ac, t + i * 0.05, 0.035, { freq: 900 + Math.random() * 3100, q: 3, gain: 0.05, pan: i % 2 ? 0.3 : -0.3 });
  }
  noise(ac, t + 0.28, 0.4, { freq: 600, sweepTo: 5000, q: 1.5, gain: 0.06, attack: 0.15 });
  tone(ac, 110, t + 0.3, 0.55, { gain: 0.22, attack: 0.01, lowpass: 300, slideTo: 46 });
  bell(ac, 1318.51, t + 0.42, 0.9, 0.035);
}

/** 니어미스, 경계에서 멈칫거릴 때 짧은 이중 클릭 + 낮은 긴장음 */
export function playTension() {
  if (rateLimited("tension", 90)) return;
  const ac = sfxCtx();
  if (!ac) return;
  const t = ac.currentTime;
  noise(ac, t, 0.025, { freq: 3000, q: 8, gain: 0.06 });
  noise(ac, t + 0.12, 0.025, { freq: 3000, q: 8, gain: 0.06 });
  tone(ac, 82, t, 0.45, { gain: 0.16, attack: 0.02, lowpass: 250, slideTo: 62 });
}

// ───────────────────────── 배경 음악 (싱글턴) ─────────────────────────
// 자동 재생하지 않는다 — startBgm() 은 반드시 클릭 등 사용자 제스처 핸들러에서 부른다.
// HTMLAudioElement 하나만 존재하므로 트랙이 겹칠 수 없다.

const BGM_URL = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/audio/velvet-vault.wav`;
const BGM_CEILING = 0.4; // 사용자 볼륨 1.0 일 때의 실제 최대 볼륨
const FADE_STEP_MS = 25;

let bgmEl: HTMLAudioElement | null = null;
let bgmSource: MediaElementAudioSourceNode | null = null;
let bgmGain: GainNode | null = null;
let bgmWanted = false;
let bgmStarting: Promise<boolean> | null = null;
let bgmUserVolume = 0.45;
let duckFactor = 1;
let fadeTimer: number | null = null;
let duckTimer: number | null = null;
let resumeOnVisible = false;

const clamp01 = (v: number) => (Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0);
const bgmTarget = () => clamp01(BGM_CEILING * bgmUserVolume * duckFactor);

function clearFade() {
  if (fadeTimer !== null) {
    window.clearInterval(fadeTimer);
    fadeTimer = null;
  }
}

function bgmLevel(): number {
  return bgmGain ? bgmGain.gain.value : (bgmEl?.volume ?? 0);
}

function setBgmLevel(level: number) {
  const next = clamp01(level);
  if (bgmGain) bgmGain.gain.value = next;
  else if (bgmEl) bgmEl.volume = next;
}

function fadeBgmTo(target: number, ms: number, done?: () => void) {
  const el = bgmEl;
  if (!el) return;
  clearFade();
  const from = bgmLevel();
  const steps = Math.max(1, Math.round(ms / FADE_STEP_MS));
  let i = 0;
  fadeTimer = window.setInterval(() => {
    i++;
    setBgmLevel(from + (target - from) * (i / steps));
    if (i >= steps) {
      clearFade();
      done?.();
    }
  }, FADE_STEP_MS);
}

function releaseBgm() {
  clearFade();
  if (duckTimer !== null) {
    window.clearTimeout(duckTimer);
    duckTimer = null;
  }
  duckFactor = 1;
  resumeOnVisible = false;
  const el = bgmEl;
  bgmEl = null;
  bgmSource?.disconnect();
  bgmGain?.disconnect();
  bgmSource = null;
  bgmGain = null;
  if (!el) return;
  try {
    el.pause();
    el.removeAttribute("src");
    el.load(); // 네트워크·디코더 자원 반납
  } catch {
    /* 무시 */
  }
}

/** 배경 음악 재생 — 사용자 제스처 안에서 호출. 이미 재생 중이면 그대로 둔다 */
export function startBgm(): Promise<boolean> {
  if (typeof window === "undefined" || typeof Audio === "undefined") return Promise.resolve(false);
  installLifecycle();
  bgmWanted = true;
  if (bgmEl && !bgmEl.paused) {
    fadeBgmTo(bgmTarget(), 300);
    return Promise.resolve(true);
  }
  if (bgmStarting) return bgmStarting;

  if (!bgmEl) {
    const el = new Audio();
    el.src = BGM_URL;
    el.loop = true;
    el.preload = "auto";
    el.volume = 0;
    // Safari ignores media-element volume. Web Audio gain keeps fades and
    // ducking consistent across desktop and mobile browsers.
    const audioCtx = getCtx();
    if (audioCtx) {
      try {
        bgmSource = audioCtx.createMediaElementSource(el);
        bgmGain = audioCtx.createGain();
        bgmGain.gain.value = 0;
        bgmSource.connect(bgmGain).connect(audioCtx.destination);
        el.volume = 1;
      } catch {
        bgmSource?.disconnect();
        bgmSource = null;
        bgmGain = null;
      }
    }
    bgmEl = el;
  }
  const el = bgmEl;
  bgmStarting = el
    .play()
    .then(() => {
      if (!bgmWanted || bgmEl !== el) {
        el.pause();
        return false;
      }
      if (typeof document !== "undefined" && document.hidden) {
        el.pause();
        resumeOnVisible = true;
        return true;
      }
      fadeBgmTo(bgmTarget(), 1200);
      return true;
    })
    .catch(() => {
      // 제스처 밖 호출·자동 재생 정책·파일 없음 — 조용히 실패
      if (bgmEl === el) releaseBgm();
      bgmWanted = false;
      return false;
    })
    .finally(() => {
      bgmStarting = null;
    });
  return bgmStarting;
}

/** 배경 음악 정지 — 짧게 페이드아웃한 뒤 자원까지 반납 */
export function stopBgm(fadeMs = 400) {
  if (typeof window === "undefined") return;
  bgmWanted = false;
  const el = bgmEl;
  if (!el) return;
  if (el.paused || fadeMs <= 0) {
    releaseBgm();
    return;
  }
  fadeBgmTo(0, fadeMs, () => {
    if (bgmEl === el && !bgmWanted) releaseBgm();
  });
}

/** 배경 음악 볼륨(0~1). 실제 출력은 BGM_CEILING 으로 한 번 더 눌러 낮게 유지된다 */
export function setBgmVolume(volume: number) {
  bgmUserVolume = clamp01(volume);
  if (typeof window === "undefined" || !bgmEl || bgmEl.paused) return;
  fadeBgmTo(bgmTarget(), 150);
}

/** 효과음이 나는 동안 배경 음악을 잠시 낮춘다. 연속 호출 시 가장 깊은 값과 마지막 유지 시간을 따른다 */
export function duckBgm(depth = 0.4, holdMs = 1000) {
  if (typeof window === "undefined" || !bgmEl || bgmEl.paused) return;
  duckFactor = Math.min(duckTimer !== null ? duckFactor : 1, clamp01(depth));
  fadeBgmTo(bgmTarget(), 120);
  if (duckTimer !== null) window.clearTimeout(duckTimer);
  duckTimer = window.setTimeout(() => {
    duckTimer = null;
    duckFactor = 1;
    if (bgmEl && !bgmEl.paused) fadeBgmTo(bgmTarget(), 700);
  }, Math.max(0, holdMs));
}

// ───────────────────────── 탭 가시성 · 페이지 이탈 ─────────────────────────

let lifecycleInstalled = false;

function installLifecycle() {
  if (lifecycleInstalled || typeof document === "undefined" || typeof window === "undefined") return;
  lifecycleInstalled = true;

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (bgmEl && !bgmEl.paused) {
        resumeOnVisible = true;
        clearFade();
        bgmEl.pause();
      }
      if (ctx && ctx.state === "running") void ctx.suspend().catch(() => {});
      return;
    }
    if (ctx && ctx.state === "suspended") void ctx.resume().catch(() => {});
    if (resumeOnVisible && bgmWanted && bgmEl) {
      resumeOnVisible = false;
      const el = bgmEl;
      setBgmLevel(0);
      el
        .play()
        .then(() => fadeBgmTo(bgmTarget(), 800))
        .catch(() => {
          /* 브라우저가 제스처를 다시 요구하면 다음 startBgm() 에서 재개 */
        });
    }
  });

  window.addEventListener("pagehide", () => {
    bgmWanted = false;
    releaseBgm();
  });
}
