#!/usr/bin/env python3
"""Render "Velvet Vault" — VOILA's ambient background loop.

Pure standard library, fully deterministic (fixed seed), no external assets.

    python web/scripts/generate-audio.py [--out PATH]

Writes web/public/audio/velvet-vault.wav: 24 kHz / 16-bit / stereo PCM,
16 bars at 90 BPM = exactly 1,024,000 frames (42.667 s).

Music: warm F-minor pad progression (Fm9 - Dbmaj9 - Bbm9 - C9sus4 -
Fm9 - Dbmaj7#11 - Eb6/9 - C7b9), a soft FM Rhodes motif with sparse bells,
a restrained sub-bass and brushed swing percussion that thickens in the
second half. Everything sits well under the mix — no bleeps, no pounding drums.

Seamless loop: the whole piece is rendered on a circular timeline. Every note
tail that runs past the end is wrapped onto the start, the echo/reverb taps are
cyclic rotations of the send bus, and the send-bus lowpass is primed with the
loop's own tail. The last frame therefore flows into the first frame exactly
as any two adjacent frames do — no crossfade, no click.
"""

from __future__ import annotations

import argparse
import math
import random
import sys
import time
import wave
from array import array
from itertools import accumulate, repeat
from operator import mul
from pathlib import Path

SR = 24_000
BPM = 90
assert (SR * 60) % BPM == 0
BEAT = SR * 60 // BPM          # 16,000 frames
BAR = BEAT * 4
BARS = 16
N = BAR * BARS                 # 1,024,000 frames = 42.667 s
SEED = 20260928
TARGET_PEAK = 0.42             # ≈ -7.5 dBFS: quiet background bed

TL = 8192                      # wavetable length
MASK = TL - 1
TWO_PI = 2.0 * math.pi

DEFAULT_OUT = Path(__file__).resolve().parent.parent / "public" / "audio" / "velvet-vault.wav"

# Mix levels (relative; the final render is peak-normalised).
PAD_GAIN, PAD_SEND = 0.055, 0.12
BASS_GAIN = 0.30
MEL_GAIN, MEL_SEND = 0.20, 0.55
COMP_GAIN, COMP_SEND = 0.11, 0.35
BELL_GAIN, BELL_SEND = 0.07, 0.90
HAT_GAIN, HAT_SEND = 0.045, 0.12
SNARE_GAIN, SNARE_SEND = 0.05, 0.35
KICK_GAIN = 0.22
WET_GAIN = 0.55

# (bass root, pad voicing) — each chord lasts two bars.
CHORDS = [
    (41, [56, 60, 63, 67]),  # Fm9          Ab C Eb G
    (37, [53, 56, 60, 63]),  # Dbmaj9       F Ab C Eb
    (34, [56, 60, 61, 65]),  # Bbm9         Ab C Db F
    (36, [55, 58, 62, 65]),  # C9sus4       G Bb D F
    (41, [56, 60, 63, 67]),  # Fm9
    (37, [53, 55, 60, 65]),  # Dbmaj7#11    F G C F
    (39, [55, 58, 63, 65]),  # Eb6/9        G Bb Eb F
    (36, [55, 58, 61, 64]),  # C7b9         G Bb Db E
]

# Rhodes motif per chord: (beat within the 8-beat chord, midi, length in beats, velocity)
MOTIF = [
    [(0.5, 72, 1.4, 0.62), (1.0, 75, 1.2, 0.55), (2.0, 79, 2.4, 0.70), (5.5, 77, 1.2, 0.50), (6.0, 75, 2.0, 0.58)],
    [(0.5, 72, 1.2, 0.55), (1.5, 77, 1.2, 0.58), (2.0, 80, 2.4, 0.68), (6.0, 79, 1.0, 0.50), (6.5, 77, 1.8, 0.56)],
    [(0.5, 73, 1.2, 0.58), (1.0, 77, 1.2, 0.55), (2.0, 80, 2.0, 0.66), (5.5, 72, 1.0, 0.48), (6.0, 73, 1.8, 0.55)],
    [(1.0, 72, 1.2, 0.55), (1.5, 74, 1.2, 0.55), (2.0, 77, 2.4, 0.66), (6.0, 79, 1.0, 0.50), (6.5, 74, 1.8, 0.56)],
    [(0.0, 77, 1.0, 0.60), (0.5, 79, 1.0, 0.55), (1.0, 80, 1.6, 0.70), (2.5, 79, 1.0, 0.52), (3.0, 75, 2.0, 0.60),
     (5.5, 72, 1.0, 0.48), (6.0, 75, 1.0, 0.52), (6.5, 77, 1.8, 0.60)],
    [(0.5, 79, 1.2, 0.62), (1.0, 77, 1.2, 0.55), (2.0, 72, 2.2, 0.62), (6.0, 77, 1.0, 0.50), (6.5, 80, 1.8, 0.62)],
    [(0.5, 79, 1.2, 0.60), (1.0, 82, 1.2, 0.66), (2.0, 77, 2.2, 0.60), (5.5, 75, 1.0, 0.48), (6.0, 79, 2.0, 0.60)],
    [(0.5, 76, 1.2, 0.58), (1.0, 79, 1.2, 0.58), (2.0, 82, 1.4, 0.66), (3.0, 80, 1.6, 0.58), (6.0, 76, 1.0, 0.50),
     (6.5, 72, 2.4, 0.60)],
]


# ---------------------------------------------------------------- primitives

def hz(midi: float) -> float:
    return 440.0 * 2.0 ** ((midi - 69) / 12)


def at(beat: float) -> int:
    return int(round(beat * BEAT))


def pan(p: float) -> tuple[float, float]:
    a = (p + 1.0) * math.pi / 4.0
    return math.cos(a), math.sin(a)


def make_table(partials) -> list[float]:
    t = [sum(a * math.sin(TWO_PI * h * i / TL + ph) for h, a, ph in partials) for i in range(TL)]
    peak = max(abs(v) for v in t)
    return [v / peak for v in t]


SINE = make_table([(1, 1.0, 0.0)])
PAD_DARK = make_table([(h, (1 / h) ** 1.9 * (0.55 if h % 2 == 0 else 1.0), 0.7 * h * h) for h in range(1, 7)])
PAD_WARM = make_table([(h, (1 / h) ** 1.35 * (0.70 if h % 2 == 0 else 1.0), 0.7 * h * h) for h in range(1, 11)])
BASS_TABLE = make_table([(1, 1.0, 0.0), (2, 0.22, 0.0), (3, 0.06, 0.0)])

_UP: dict[int, list[float]] = {}


def ramp_up(n: int) -> list[float]:
    r = _UP.get(n)
    if r is None:
        r = [0.5 - 0.5 * math.cos(math.pi * (k + 0.5) / n) for k in range(n)]
        _UP[n] = r
    return r


def ramp_down(n: int) -> list[float]:
    return ramp_up(n)[::-1]


def geo(ratio: float, n: int) -> list[float]:
    """Exponential decay 1, r, r², … computed at C speed."""
    return list(accumulate(repeat(ratio, n - 1), mul, initial=1.0))


def decay(tau_s: float, n: int) -> list[float]:
    return geo(math.exp(-1.0 / (tau_s * SR)), n)


def fade_edges(sig: list[float], fin: int, fout: int) -> list[float]:
    fin = min(fin, len(sig))
    up = ramp_up(fin) if fin else []
    for k in range(fin):
        sig[k] *= up[k]
    fout = min(fout, len(sig))
    if fout:
        down = ramp_down(fout)
        off = len(sig) - fout
        for k in range(fout):
            sig[off + k] *= down[k]
    return sig


def onepole(x: list[float], a: float, y0: float = 0.0) -> list[float]:
    return list(accumulate(x, lambda y, v: y + a * (v - y), initial=y0))[1:]


def normalize(sig: list[float]) -> list[float]:
    p = max(abs(v) for v in sig) or 1.0
    return [v / p for v in sig]


def rot(x: list[float], d: int) -> list[float]:
    """Circular delay by d frames — the loop's own tail feeds its head."""
    d %= len(x)
    return x[-d:] + x[:-d] if d else x[:]


# ------------------------------------------------------------------- mixing

class Mix:
    def __init__(self) -> None:
        self.l = [0.0] * N
        self.r = [0.0] * N
        self.send = [0.0] * N


def add(buf: list[float], start: int, src: list[float], g: float) -> None:
    """Add src*g into buf at start, wrapping around the loop end."""
    if g == 0.0:
        return
    n = len(src)
    start %= N
    pos = 0
    while pos < n:
        end = min(N, start + n - pos)
        seg = end - start
        buf[start:end] = [x + g * y for x, y in zip(buf[start:end], src[pos:pos + seg])]
        pos += seg
        start = 0


def place(mix: Mix, start: int, sig: list[float], gain: float, p: float, send: float) -> None:
    gl, gr = pan(p)
    add(mix.l, start, sig, gain * gl)
    add(mix.r, start, sig, gain * gr)
    add(mix.send, start, sig, gain * send)


# -------------------------------------------------------------- instruments

def rhodes(midi: float, beats: float, vel: float) -> list[float]:
    f = hz(midi)
    n = int((beats * 60 / BPM + 0.6) * SR)
    ic = f * TL / SR
    it = ic * 5.0 if f * 5.0 < 10_000 else 0.0
    tine = 0.07 if it else 0.0
    amp = decay(1.3 * (261.6 / f) ** 0.35, n)
    idx = decay(0.2, n)
    K = (0.6 + 1.4 * vel) * TL / TWO_PI
    S, M = SINE, MASK
    sig = [
        (S[int(k * ic + K * d * S[int(k * ic) & M]) & M] + tine * d * S[int(k * it) & M]) * a
        for k, d, a in zip(range(n), idx, amp)
    ]
    return fade_edges(sig, 36, int(0.35 * SR))


def bell(midi: float) -> list[float]:
    f = hz(midi)
    n = int(3.6 * SR)
    base = f * TL / SR
    i1, i2, i3 = (base * r if f * r < 10_000 else 0.0 for r in (1.0, 2.756, 5.404))
    d1, d2, d3 = decay(1.5, n), decay(0.7, n), decay(0.3, n)
    S, M = SINE, MASK
    sig = [
        S[int(k * i1) & M] * a + 0.4 * S[int(k * i2) & M] * b + 0.18 * S[int(k * i3) & M] * c
        for k, a, b, c in zip(range(n), d1, d2, d3)
    ]
    return fade_edges(sig, 48, int(0.6 * SR))


def bass_note(f: float, beats: float) -> list[float]:
    hold = at(beats)
    rel = int(0.18 * SR)
    n = hold + rel
    env = fade_edges(decay(1.4, n), 480, rel)
    inc = f * TL / SR
    T, M = BASS_TABLE, MASK
    return [T[int(k * inc) & M] * e for k, e in zip(range(n), env)]


def make_hat(rng: random.Random, length: float, tau: float, attack: float) -> list[float]:
    n = int(length * SR)
    w = [rng.uniform(-1.0, 1.0) for _ in range(n + 1)]
    hp = [w[k] - w[k - 1] for k in range(1, n + 1)]
    soft = onepole(hp, 0.45)
    env = fade_edges(decay(tau, n), int(attack * SR), int(0.02 * SR))
    return normalize([s * e for s, e in zip(soft, env)])


def make_brush(rng: random.Random) -> list[float]:
    n = int(0.45 * SR)
    w = [rng.uniform(-1.0, 1.0) for _ in range(n)]
    band = [a - b for a, b in zip(onepole(w, 0.55), onepole(w, 0.10))]
    env = fade_edges(decay(0.11, n), int(0.025 * SR), int(0.05 * SR))
    return normalize([s * e for s, e in zip(band, env)])


def make_kick() -> list[float]:
    n = int(0.42 * SR)
    ph = 0.0
    out = []
    for k in range(n):
        t = k / SR
        ph += TWO_PI * (44.0 + 60.0 * math.exp(-t / 0.035)) / SR
        out.append(math.sin(ph) * math.exp(-t / 0.17))
    return fade_edges(out, 96, int(0.08 * SR))


# ------------------------------------------------------------------- layers

def render_pad(mix: Mix, rng: random.Random) -> None:
    att, rel, hold = int(1.1 * SR), int(1.7 * SR), BEAT * 8
    n = hold + rel
    env = ramp_up(att) + [1.0] * (hold - att) + ramp_down(rel)
    spread = 2.0 ** (5 / 1200)  # ±2.5 cents chorus between the two oscillator banks
    M = MASK
    for c, (_, voices) in enumerate(CHORDS):
        t = PAD_DARK if c < 4 else PAD_WARM  # the second half opens up
        a0, a1, a2, a3 = (hz(m) * TL / SR / math.sqrt(spread) for m in voices)
        b0, b1, b2, b3 = (hz(m) * TL / SR * math.sqrt(spread) for m in voices)
        p = [rng.randrange(TL) for _ in range(8)]
        A = [t[int(k * a0 + p[0]) & M] + t[int(k * a1 + p[1]) & M] + t[int(k * a2 + p[2]) & M]
             + t[int(k * a3 + p[3]) & M] for k in range(n)]
        B = [t[int(k * b0 + p[4]) & M] + t[int(k * b1 + p[5]) & M] + t[int(k * b2 + p[6]) & M]
             + t[int(k * b3 + p[7]) & M] for k in range(n)]
        L = [(a + 0.45 * b) * e for a, b, e in zip(A, B, env)]
        R = [(b + 0.45 * a) * e for a, b, e in zip(A, B, env)]
        start = c * hold
        add(mix.l, start, L, PAD_GAIN)
        add(mix.r, start, R, PAD_GAIN)
        add(mix.send, start, L, PAD_GAIN * PAD_SEND)


def render_bass(mix: Mix) -> None:
    for c, (root, _) in enumerate(CHORDS):
        base = c * 8
        f = hz(root)
        place(mix, at(base), bass_note(f, 3.6), BASS_GAIN, 0.0, 0.0)
        place(mix, at(base + 4), bass_note(f, 2.2), BASS_GAIN * 0.85, 0.0, 0.0)
        place(mix, at(base + 6 + 2 / 3), bass_note(hz(root + 7), 1.0), BASS_GAIN * 0.5, 0.0, 0.0)


def render_keys(mix: Mix, rng: random.Random) -> None:
    roll = int(0.035 * SR)
    for c, (_, voices) in enumerate(CHORDS):
        base = c * 8
        # Soft rolled comp on the chord change.
        for i, m in enumerate(voices[1:]):
            place(mix, at(base) + i * roll, rhodes(m, 3.0, 0.35), COMP_GAIN, -0.3, COMP_SEND)
        if c >= 4:
            for i, m in enumerate(voices[2:]):
                place(mix, at(base + 4 + 2 / 3) + i * roll, rhodes(m, 1.2, 0.25),
                      COMP_GAIN * 0.7, -0.35, COMP_SEND)
        # Melody, lightly swung and humanised.
        for rel_beat, m, beats, vel in MOTIF[c]:
            if rel_beat % 1.0 == 0.5:
                rel_beat += 0.08
            vel *= 0.92 + 0.16 * rng.random()
            start = at(base + rel_beat) + rng.randint(-90, 90)
            place(mix, start, rhodes(m, beats, vel), MEL_GAIN * vel, 0.18, MEL_SEND)


def render_bells(mix: Mix) -> None:
    for c, (_, voices) in enumerate(CHORDS):
        base = c * 8
        if c == 0 or c >= 4:
            place(mix, at(base), bell(voices[-1] + 12), BELL_GAIN * (0.6 if c == 0 else 1.0),
                  0.4 if c % 2 else -0.4, BELL_SEND)
        if c >= 4:
            place(mix, at(base + 3 + 2 / 3), bell(voices[2] + 12), BELL_GAIN * 0.6,
                  -0.4 if c % 2 else 0.4, BELL_SEND)


def render_drums(mix: Mix, rng: random.Random) -> None:
    hats = [make_hat(rng, 0.14, 0.030, 0.004), make_hat(rng, 0.16, 0.040, 0.006),
            make_hat(rng, 0.18, 0.050, 0.010), make_hat(rng, 0.22, 0.070, 0.020)]
    brush = make_brush(rng)
    kick = make_kick()

    def hat(beat: float, vel: float) -> None:
        start = at(beat) + rng.randint(-80, 80)
        v = vel * (0.85 + 0.3 * rng.random())
        place(mix, start, rng.choice(hats), HAT_GAIN * v, 0.3 + 0.2 * (rng.random() - 0.5), HAT_SEND)

    for bar in range(BARS):
        for b in range(4):
            beat = bar * 4 + b
            if bar >= 2:
                hat(beat, 0.35)
            hat(beat + 2 / 3, 0.6 if bar >= 2 else 0.35)
            if bar >= 8 and rng.random() < 0.55:
                hat(beat + 1 / 3, 0.16)
        if bar >= 4:
            place(mix, at(bar * 4), kick, KICK_GAIN * 0.9, 0.0, 0.0)
            if bar % 2 == 1:
                place(mix, at(bar * 4 + 2 + 2 / 3), kick, KICK_GAIN * 0.55, 0.0, 0.0)
        if bar >= 8:
            place(mix, at(bar * 4 + 1) + rng.randint(-60, 60), brush, SNARE_GAIN * 0.7, -0.2, SNARE_SEND)
            place(mix, at(bar * 4 + 3) + rng.randint(-60, 60), brush, SNARE_GAIN * 0.8, -0.2, SNARE_SEND)


def render_space(mix: Mix) -> tuple[list[float], list[float]]:
    """Cyclic diffusion + ping-pong echo on a warm (lowpassed) mono send."""
    a = 0.28
    y = 0.0
    for v in mix.send[-8000:]:  # prime the filter with the loop's own tail
        y += a * (v - y)
    wet = onepole(mix.send, a, y)
    d1 = [p + 0.55 * q + 0.42 * r + 0.33 * s
          for p, q, r, s in zip(wet, rot(wet, 1733), rot(wet, 2957), rot(wet, 4409))]
    del wet
    d2 = [p + 0.45 * q + 0.35 * r for p, q, r in zip(d1, rot(d1, 6007), rot(d1, 8513))]
    del d1
    wl = [0.5 * p + 0.38 * q + 0.2 * r
          for p, q, r in zip(rot(d2, 3701), rot(d2, BEAT * 3 // 4), rot(d2, BEAT * 9 // 4))]
    wr = [0.5 * p + 0.34 * q + 0.15 * r
          for p, q, r in zip(rot(d2, 4957), rot(d2, BEAT * 3 // 2), rot(d2, BEAT * 3))]
    return wl, wr


# ---------------------------------------------------------------------- main

def render() -> tuple[array, array]:
    rng = random.Random(SEED)
    mix = Mix()
    render_pad(mix, rng)
    render_bass(mix)
    render_keys(mix, rng)
    render_bells(mix)
    render_drums(mix, rng)
    wl, wr = render_space(mix)
    L = [d + WET_GAIN * w for d, w in zip(mix.l, wl)]
    R = [d + WET_GAIN * w for d, w in zip(mix.r, wr)]
    del mix, wl, wr

    ml, mr = sum(L) / N, sum(R) / N  # remove DC (a constant — loop-safe)
    peak = max(max(L) - ml, ml - min(L), max(R) - mr, mr - min(R)) or 1.0
    scale = TARGET_PEAK * 32767 / peak
    pl = array("h", [int(round((v - ml) * scale)) for v in L])
    pr = array("h", [int(round((v - mr) * scale)) for v in R])
    return pl, pr


def write_wav(path: Path, pl: array, pr: array) -> None:
    frames = array("h", bytes(4 * N))
    frames[0::2] = pl
    frames[1::2] = pr
    if sys.byteorder == "big":
        frames.byteswap()
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(frames.tobytes())


def db(x: float) -> float:
    return 20 * math.log10(x) if x > 0 else float("-inf")


def main() -> int:
    ap = argparse.ArgumentParser(description="Render the VOILA 'Velvet Vault' ambient loop.")
    ap.add_argument("--out", type=Path, default=DEFAULT_OUT, help=f"output WAV (default: {DEFAULT_OUT})")
    args = ap.parse_args()

    t0 = time.perf_counter()
    pl, pr = render()
    write_wav(args.out, pl, pr)
    elapsed = time.perf_counter() - t0

    size = args.out.stat().st_size
    peak = max(max(pl), -min(pl), max(pr), -min(pr)) / 32767
    rms = math.sqrt((sum(v * v for v in pl) + sum(v * v for v in pr)) / (2 * N)) / 32767
    seam = max(abs(pl[0] - pl[-1]), abs(pr[0] - pr[-1]))
    step = max(max(abs(pl[k] - pl[k - 1]) for k in range(1, N, 97)),
               max(abs(pr[k] - pr[k - 1]) for k in range(1, N, 97)))

    print(f"wrote {args.out}")
    print(f"  duration {N / SR:.3f} s  ({N:,} frames, {BARS} bars @ {BPM} BPM, seamless loop)")
    print(f"  format   {SR} Hz / 16-bit PCM / stereo")
    print(f"  size     {size / 1_048_576:.2f} MiB ({size:,} bytes)")
    print(f"  peak     {db(peak):.2f} dBFS   rms {db(rms):.1f} dBFS")
    print(f"  seam     end->start step {seam} LSB (typical adjacent step up to ~{step} LSB)")
    print(f"  rendered in {elapsed:.1f} s")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
