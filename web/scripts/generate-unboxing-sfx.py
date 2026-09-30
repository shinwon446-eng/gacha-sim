#!/usr/bin/env python3
"""Render VOILA's physical mystery-box unboxing soundbank.

Pure standard library, fully deterministic (fixed seeds), no samples, no music.

    python web/scripts/generate-unboxing-sfx.py [--out-dir DIR]

Writes 24 kHz / 16-bit / stereo PCM WAVs to web/public/audio/sfx/:

    latch-click.wav   metal latch catch + release over a solid wooden box body
    lid-open.wav      cardboard stick-slip, paper rustle, velvet sweep,
                      low lift-off thump and a bright air release
    reveal.wav        restrained struck-crystal flourish over a felt bloom
    bulk-open.wav     accelerating cascade of small boxes + one final impact
    rare-jackpot.wav  deeper boom, rising crystal run and a held shimmer chord

Everything is physical modelling rather than oscillators: noise excitations
drive modal resonator banks (metal, wood, cardboard, glass), friction is an
impulse train with stick-slip jitter, and a small stereo room places it all on
a table. Each file is peak-normalised to -3.5 dBFS (never above -3 dBFS).
"""

from __future__ import annotations

import argparse
import hashlib
import math
import random
import struct
import sys
import wave
from pathlib import Path

SR = 24_000
TWO_PI = 2.0 * math.pi
TARGET_PEAK_DB = -3.5
TARGET_PEAK = 10 ** (TARGET_PEAK_DB / 20)
CEILING_DB = -3.0
SEED = 20261001

DEFAULT_OUT = Path(__file__).resolve().parent.parent / "public" / "audio" / "sfx"


def frames(t: float) -> int:
    return int(round(t * SR))


# --------------------------------------------------------------------------- #
# DSP primitives
# --------------------------------------------------------------------------- #

def noise(n: int, rng: random.Random) -> list[float]:
    r = rng.random
    return [r() * 2.0 - 1.0 for _ in range(n)]


def lowpass1(x: list[float], fc: float) -> list[float]:
    a = math.exp(-TWO_PI * fc / SR)
    b = 1.0 - a
    y, out = 0.0, [0.0] * len(x)
    for i, v in enumerate(x):
        y = b * v + a * y
        out[i] = y
    return out


def highpass1(x: list[float], fc: float) -> list[float]:
    lp = lowpass1(x, fc)
    return [v - l for v, l in zip(x, lp)]


def _biquad_coeffs(kind: str, f: float, q: float) -> tuple[float, ...]:
    f = min(max(f, 10.0), SR * 0.45)
    w = TWO_PI * f / SR
    cw, sw = math.cos(w), math.sin(w)
    al = sw / (2.0 * q)
    if kind == "bp":
        b0, b1, b2 = al, 0.0, -al
    elif kind == "lp":
        b0 = b2 = (1 - cw) / 2
        b1 = 1 - cw
    else:  # hp
        b0 = b2 = (1 + cw) / 2
        b1 = -(1 + cw)
    a0, a1, a2 = 1 + al, -2 * cw, 1 - al
    return b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0


def biquad(x: list[float], kind: str, f, q: float, block: int = 32) -> list[float]:
    """RBJ biquad; `f` may be a number or a function of time (seconds)."""
    sweep = callable(f)
    c = _biquad_coeffs(kind, f(0.0) if sweep else f, q)
    x1 = x2 = y1 = y2 = 0.0
    out = [0.0] * len(x)
    for i, v in enumerate(x):
        if sweep and i % block == 0:
            c = _biquad_coeffs(kind, f(i / SR), q)
        b0, b1, b2, a1, a2 = c
        y = b0 * v + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2
        x2, x1, y2, y1 = x1, v, y1, y
        out[i] = y
    return out


def modal(exc: list[float], modes, length: int) -> list[float]:
    """Bank of two-pole resonators: modes = [(freq, t60 seconds, gain)]."""
    out = [0.0] * length
    ne = len(exc)
    for freq, t60, gain in modes:
        if freq >= SR * 0.47:
            continue
        r = math.exp(-6.908 / (t60 * SR))
        w = TWO_PI * freq / SR
        c1, c2 = 2 * r * math.cos(w), -r * r
        g = gain * math.sin(w)  # unit ring amplitude per unit impulse at any pitch
        y1 = y2 = 0.0
        for i in range(length):
            y = (exc[i] if i < ne else 0.0) * g + c1 * y1 + c2 * y2
            y2, y1 = y1, y
            out[i] += y
            if i > ne and abs(y) < 1e-7 and abs(y2) < 1e-7:
                break
    return out


def burst(n: int, rng: random.Random, decay: float) -> list[float]:
    """Noise excitation with an exponential decay (decay = time constant, s)."""
    k = -1.0 / (decay * SR)
    return [(rng.random() * 2 - 1) * math.exp(k * i) for i in range(n)]


def env_seg(n: int, attack: float, release: float, shape: float = 2.0) -> list[float]:
    """Smooth rise over `attack` s, smooth fall over the last `release` s."""
    a, r = max(1, frames(attack)), max(1, frames(release))
    out = [1.0] * n
    for i in range(n):
        g = 1.0
        if i < a:
            g = math.sin(0.5 * math.pi * i / a) ** shape
        if i >= n - r:
            g *= math.sin(0.5 * math.pi * (n - 1 - i) / r) ** shape
        out[i] = g
    return out


def mul(x: list[float], e: list[float]) -> list[float]:
    return [a * b for a, b in zip(x, e)]


def smooth_random(n: int, rng: random.Random, rate: float) -> list[float]:
    """Positive, slowly wandering amplitude (grain density for rustle)."""
    raw = lowpass1([abs(v) for v in noise(n, rng)], rate)
    peak = max(raw) or 1.0
    return [v / peak for v in raw]


class Stereo:
    def __init__(self, dur: float):
        self.n = frames(dur)
        self.L = [0.0] * self.n
        self.R = [0.0] * self.n

    def add(self, sig: list[float], at: float, gain: float = 1.0, pan: float = 0.0,
            width_ms: float = 0.0) -> None:
        """Constant-power pan; width_ms delays the far channel (Haas) slightly."""
        start = frames(at)
        th = (pan + 1) * math.pi / 4
        gl, gr = math.cos(th) * gain, math.sin(th) * gain
        d = frames(width_ms / 1000)
        dl, dr = (d, 0) if pan > 0 else (0, d)
        for i, v in enumerate(sig):
            j = start + i + dl
            if 0 <= j < self.n:
                self.L[j] += v * gl
            j = start + i + dr
            if 0 <= j < self.n:
                self.R[j] += v * gr

    def add_lr(self, left: list[float], right: list[float], at: float, gain: float = 1.0) -> None:
        start = frames(at)
        for i in range(min(len(left), len(right))):
            j = start + i
            if j < self.n:
                self.L[j] += left[i] * gain
                self.R[j] += right[i] * gain


def room(st: Stereo, mix: float, decay: float, damp_hz: float = 4200.0) -> None:
    """Small tabletop room: 4 damped combs + 2 allpasses per channel."""
    delays = {"L": (23.3, 27.1, 31.7, 35.9), "R": (24.7, 28.9, 33.1, 37.3)}
    ap = {"L": (5.1, 1.7), "R": (5.9, 2.1)}
    a = math.exp(-TWO_PI * damp_hz / SR)
    mono = [(l + r) * 0.5 for l, r in zip(st.L, st.R)]
    for ch in ("L", "R"):
        wet = [0.0] * st.n
        for ms in delays[ch]:
            d = frames(ms / 1000)
            g = 10 ** (-3 * (ms / 1000) / decay)
            buf = [0.0] * d
            lp, p = 0.0, 0
            for i in range(st.n):
                out = buf[p]
                lp = (1 - a) * out + a * lp
                buf[p] = mono[i] + lp * g
                p = (p + 1) % d
                wet[i] += out * 0.25
        for ms in ap[ch]:
            d = frames(ms / 1000)
            buf = [0.0] * d
            p = 0
            for i in range(st.n):
                bo = buf[p]
                v = wet[i] + bo * 0.5
                buf[p] = v
                wet[i] = bo - v * 0.5
                p = (p + 1) % d
        dst = st.L if ch == "L" else st.R
        for i in range(st.n):
            dst[i] += wet[i] * mix


# --------------------------------------------------------------------------- #
# Physical voices
# --------------------------------------------------------------------------- #

def metal_click(rng: random.Random, detune: float = 1.0, bright: float = 1.0,
                dur: float = 0.14) -> list[float]:
    """Steel latch tongue snapping into its keeper: sharp tick + inharmonic ring."""
    n = frames(dur)
    exc = highpass1(burst(frames(0.002), rng, 0.0005), 1800)
    modes = [(2140 * detune, 0.060, 1.0), (3310 * detune, 0.045, 0.8),
             (4870 * detune, 0.030, 0.65 * bright), (6630 * detune, 0.020, 0.5 * bright),
             (8910 * detune, 0.012, 0.35 * bright)]
    ring = modal(exc, modes, n)
    tick = highpass1(burst(frames(0.0015), rng, 0.0003), 3000)
    out = [0.0] * n
    for i in range(n):
        out[i] = ring[i] * 0.55 + (tick[i] * 1.4 if i < len(tick) else 0.0)
    return out


def wood_impact(rng: random.Random, pitch: float = 1.0, dur: float = 0.35,
                soft: float = 0.0) -> list[float]:
    """Lid/body of a lacquered wooden box hitting the table."""
    n = frames(dur)
    exc = lowpass1(burst(frames(0.006), rng, 0.0018), 2500 - 1800 * soft)
    modes = [(92 * pitch, 0.20, 1.0), (147 * pitch, 0.13, 0.8), (233 * pitch, 0.09, 0.6),
             (388 * pitch, 0.06, 0.45), (610 * pitch, 0.04, 0.3), (1020 * pitch, 0.025, 0.18 * (1 - soft))]
    body = modal(exc, modes, n)
    # Air pushed out of the box: pitched-down sine pulse, felt more than heard.
    thump = [0.0] * n
    ph = 0.0
    for i in range(min(n, frames(0.16))):
        t = i / SR
        f = (58 + 55 * math.exp(-t / 0.025)) * pitch
        ph += TWO_PI * f / SR
        thump[i] = math.sin(ph) * math.exp(-t / 0.045) * (1 - math.exp(-t / 0.0015))
    knock = lowpass1(biquad(burst(frames(0.03), rng, 0.006), "bp", 420 * pitch, 1.1), 3000)
    out = [0.0] * n
    for i in range(n):
        out[i] = body[i] * 0.9 + thump[i] * 0.75 + (knock[i] * 0.9 if i < len(knock) else 0.0)
    return out


def glass_strike(rng: random.Random, f0: float, t60: float = 1.3, felt: float = 0.5,
                 dur: float = 1.6) -> list[float]:
    """Struck crystal (free bar partial ratios) hit with a felt-tipped mallet."""
    n = frames(dur)
    exc = lowpass1(burst(frames(0.004), rng, 0.0009 + 0.0012 * felt), 5000 - 3000 * felt)
    ratios = [(1.0, 1.0, 1.0), (2.32, 0.42, 0.45), (4.25, 0.22, 0.28),
              (6.63, 0.12, 0.16), (1.0035, 0.95, 0.6)]  # last = slight beating twin
    modes = [(f0 * r, t60 * tr, g) for r, tr, g in ratios]
    tone = modal(exc, modes, n)
    tap = highpass1(burst(frames(0.003), rng, 0.0006), 2500)
    for i in range(len(tap)):
        tone[i] += tap[i] * 0.25 * (1 - felt)
    return tone


def friction(rng: random.Random, dur: float, rate, centers, q: float = 1.3) -> list[float]:
    """Stick-slip impulse train (cardboard flap rubbing a sleeve)."""
    n = frames(dur)
    imp = [0.0] * n
    t = 0.0
    while True:
        t += (1.0 / max(rate(t), 1.0)) * (0.55 + 0.9 * rng.random())
        i = frames(t)
        if i >= n:
            break
        imp[i] += (0.35 + 0.65 * rng.random()) * (1 if rng.random() < 0.5 else -1)
    out = [0.0] * n
    for fc, g in centers:
        band = biquad(imp, "bp", fc, q)
        for i in range(n):
            out[i] += band[i] * g
    body = modal(imp, [(310, 0.03, 0.5), (540, 0.025, 0.4), (870, 0.02, 0.3)], n)
    for i in range(n):
        out[i] += body[i] * 0.35
    return out


def rustle(rng: random.Random, dur: float, hp: float = 3200.0, grain: float = 35.0) -> list[float]:
    """Tissue/paper crinkle: high-passed noise gated by a grainy random envelope."""
    n = frames(dur)
    hiss = highpass1(highpass1(noise(n, rng), hp), hp)
    dens = smooth_random(n, rng, grain)
    return [h * d * d for h, d in zip(hiss, dens)]


def swept_noise(rng: random.Random, dur: float, fn, q: float, lp_hz: float | None = None) -> list[float]:
    x = biquad(noise(frames(dur), rng), "bp", fn, q)
    return lowpass1(x, lp_hz) if lp_hz else x


def sub_bloom(dur: float, f_start: float, f_end: float, tau: float, attack: float) -> list[float]:
    n = frames(dur)
    out, ph = [0.0] * n, 0.0
    for i in range(n):
        t = i / SR
        f = f_end + (f_start - f_end) * math.exp(-t / (tau * 0.4))
        ph += TWO_PI * f / SR
        out[i] = math.sin(ph) * (1 - math.exp(-t / attack)) * math.exp(-t / tau)
    return out


# --------------------------------------------------------------------------- #
# Sounds
# --------------------------------------------------------------------------- #

def render_latch(rng: random.Random) -> Stereo:
    st = Stereo(0.45)
    st.add(metal_click(rng, 1.07, 0.6, 0.08), 0.008, 0.35, -0.15)        # spring catch
    st.add(metal_click(rng, 1.0, 1.0), 0.036, 1.0, 0.05, 0.3)           # latch snaps
    st.add(wood_impact(rng, 1.0, 0.38), 0.039, 1.0, 0.0)                # box body
    st.add(metal_click(rng, 1.21, 1.3, 0.05), 0.071, 0.14, 0.25, 0.4)   # rattle
    room(st, 0.14, 0.32)
    return st


def render_lid(rng: random.Random) -> Stereo:
    st = Stereo(1.6)
    st.add(metal_click(rng, 1.12, 0.7, 0.07), 0.0, 0.28, -0.2)
    # Cardboard lid dragging off its sleeve: stick-slip speeds up, then frees.
    fr = friction(rng, 0.72, lambda t: 70 + 190 * math.sin(math.pi * min(t / 0.72, 1.0)) ** 1.5,
                  [(1750, 1.0), (3300, 0.55), (950, 0.5)])
    st.add(mul(fr, env_seg(len(fr), 0.06, 0.18)), 0.04, 0.55, -0.25, 0.25)
    board = biquad(noise(frames(0.7), rng), "bp", 2400, 0.7)
    st.add(mul(board, env_seg(len(board), 0.1, 0.25)), 0.05, 0.08, -0.2)
    # Lid lifts clear, box body answers.
    st.add(wood_impact(rng, 0.85, 0.4, soft=0.8), 0.30, 0.55, 0.0)
    # Tissue paper parting.
    rs = rustle(rng, 0.9, 3000, 30)
    st.add(mul(rs, env_seg(len(rs), 0.15, 0.35)), 0.22, 0.55, 0.3, 0.6)
    rs2 = rustle(rng, 0.8, 4200, 45)
    st.add(mul(rs2, env_seg(len(rs2), 0.2, 0.3)), 0.28, 0.4, -0.35, 0.6)
    # Velvet lining sweep — soft, low-mid, panning left to right.
    vel_dur = 0.95
    vel = swept_noise(rng, vel_dur, lambda t: 380 + 1000 * math.sin(math.pi * min(t / vel_dur, 1.0)), 0.8, 2200)
    vel = mul(vel, env_seg(len(vel), 0.35, 0.45, 1.5))
    half = len(vel)
    left = [v * math.cos(0.5 * math.pi * i / half * 0.8 + 0.1) for i, v in enumerate(vel)]
    right = [v * math.sin(0.5 * math.pi * i / half * 0.8 + 0.1) for i, v in enumerate(vel)]
    st.add_lr(left, right, 0.36, 0.75)
    # Bright air release as the inner seal opens — decorrelated per channel.
    air_dur = 0.62
    af = lambda t: 2400 + 5200 * min(t / air_dur, 1.0) ** 0.7
    al = mul(swept_noise(rng, air_dur, af, 1.4), env_seg(frames(air_dur), 0.3, 0.3, 1.2))
    ar = mul(swept_noise(rng, air_dur, af, 1.4), env_seg(frames(air_dur), 0.3, 0.3, 1.2))
    st.add_lr(al, ar, 0.88, 0.5)
    room(st, 0.12, 0.35)
    return st


def render_reveal(rng: random.Random) -> Stereo:
    st = Stereo(1.8)
    # Inhale: short airy swell leading into the strike.
    sw = swept_noise(rng, 0.34, lambda t: 1800 + 5000 * (t / 0.34) ** 2, 1.2)
    env = [(i / len(sw)) ** 2.5 for i in range(len(sw))]
    st.add(mul(sw, env), 0.0, 0.28, 0.0, 0.5)
    st.add(sub_bloom(0.9, 90, 55, 0.28, 0.02), 0.32, 0.6)
    st.add(wood_impact(rng, 0.7, 0.4, soft=1.0), 0.32, 0.35)
    # Crystal strikes: Ab5, C6, Eb6, then a soft G6 on top.
    notes = [(830.61, 0.32, -0.35, 0.7), (1046.50, 0.39, 0.3, 0.6),
             (1244.51, 0.47, -0.1, 0.55), (1567.98, 0.60, 0.35, 0.38)]
    for f, at, pan, g in notes:
        st.add(glass_strike(rng, f, 1.1, 0.6, 1.8 - at), at, g, pan, 0.4)
    # Shimmer: narrow resonances of the chord excited by breath noise.
    sh_dur = 1.2
    base = noise(frames(sh_dur), rng)
    sh = [0.0] * len(base)
    for f in (1661.2, 2093.0, 2489.0):
        band = biquad(base, "bp", f, 40)
        for i in range(len(sh)):
            sh[i] += band[i]
    st.add(mul(sh, env_seg(len(sh), 0.35, 0.7, 1.5)), 0.5, 0.9, 0.0, 0.8)
    room(st, 0.3, 0.9, 6000)
    return st


def render_bulk(rng: random.Random) -> Stereo:
    st = Stereo(1.5)
    bed = rustle(rng, 1.1, 2800, 50)
    st.add(mul(bed, env_seg(len(bed), 0.1, 0.25)), 0.0, 0.3, 0.0, 0.8)
    t, gap, k = 0.02, 0.135, 0
    while t < 1.0:
        pan = (rng.random() * 2 - 1) * 0.75
        det = 0.9 + 0.22 * rng.random()
        g = 0.45 + 0.25 * rng.random()
        st.add(metal_click(rng, det, 0.8, 0.07), t, g, pan, 0.3)
        st.add(wood_impact(rng, 1.3 + 0.5 * rng.random(), 0.18, soft=0.3), t + 0.004, g * 0.55, pan)
        fr = friction(rng, 0.06, lambda _t: 260, [(2000 * det, 1.0), (3600, 0.4)])
        st.add(mul(fr, env_seg(len(fr), 0.01, 0.03)), t + 0.012, 0.35, -pan * 0.5)
        k += 1
        t += gap
        gap = max(0.045, gap * 0.87)
    # Final impact: the last, biggest box slams shut and settles.
    hit = 1.1
    st.add(wood_impact(rng, 0.8, 0.4), hit, 1.25, 0.0)
    st.add(sub_bloom(0.4, 95, 48, 0.12, 0.002), hit, 0.7)
    st.add(metal_click(rng, 0.95, 1.1), hit + 0.002, 0.9, 0.1, 0.3)
    air = mul(swept_noise(rng, 0.3, lambda tt: 5000 - 3000 * tt / 0.3, 1.0), env_seg(frames(0.3), 0.005, 0.25))
    st.add(air, hit, 0.35, -0.1, 0.8)
    room(st, 0.16, 0.4)
    return st


def render_jackpot(rng: random.Random) -> Stereo:
    st = Stereo(2.6)
    st.add(sub_bloom(1.0, 75, 42, 0.38, 0.004), 0.0, 0.85)
    st.add(wood_impact(rng, 0.65, 0.5), 0.0, 1.0)
    st.add(metal_click(rng, 0.9, 1.0), 0.002, 0.6, 0.0, 0.3)
    run = [(698.46, -0.5), (830.61, -0.25), (1046.50, 0.0), (1244.51, 0.25), (1396.91, 0.5)]
    for k, (f, pan) in enumerate(run):
        at = 0.14 + k * 0.095
        st.add(glass_strike(rng, f, 0.9, 0.5, 1.4), at, 0.5 + 0.04 * k, pan, 0.4)
    # Held chord: F6 + C7 + Ab6 with long rings.
    for f, pan in ((1396.91, -0.3), (1661.22, 0.3), (2093.0, 0.0)):
        st.add(glass_strike(rng, f, 1.7, 0.7, 1.8), 0.8, 0.42, pan, 0.5)
    sh_dur = 1.8
    base = noise(frames(sh_dur), rng)
    sh = [0.0] * len(base)
    for f in (2793.8, 3322.4, 4186.0):
        band = biquad(base, "bp", f, 45)
        for i in range(len(sh)):
            sh[i] += band[i]
    st.add(mul(sh, env_seg(len(sh), 0.5, 1.0, 1.5)), 0.6, 0.9, 0.0, 0.9)
    room(st, 0.32, 1.1, 6500)
    return st


SOUNDS = [
    ("latch-click.wav", render_latch),
    ("lid-open.wav", render_lid),
    ("reveal.wav", render_reveal),
    ("bulk-open.wav", render_bulk),
    ("rare-jackpot.wav", render_jackpot),
]


# --------------------------------------------------------------------------- #
# Mastering, output, metrics
# --------------------------------------------------------------------------- #

def master(st: Stereo) -> tuple[list[float], list[float]]:
    L, R = highpass1(st.L, 25), highpass1(st.R, 25)
    peak = max(max(abs(v) for v in L), max(abs(v) for v in R)) or 1.0
    # Gentle soft saturation lifts body relative to the first transient.
    k = 1.6
    norm = math.tanh(k)
    L = [math.tanh(k * v / peak) / norm for v in L]
    R = [math.tanh(k * v / peak) / norm for v in R]
    fade = frames(0.02)
    n = len(L)
    for i in range(fade):
        g = i / fade
        L[n - 1 - i] *= g
        R[n - 1 - i] *= g
    peak = max(max(abs(v) for v in L), max(abs(v) for v in R))
    gain = TARGET_PEAK / peak
    return [v * gain for v in L], [v * gain for v in R]


def write_wav(path: Path, L: list[float], R: list[float]) -> list[int]:
    ints: list[int] = []
    for l, r in zip(L, R):
        ints.append(max(-32767, min(32767, int(round(l * 32767)))))
        ints.append(max(-32767, min(32767, int(round(r * 32767)))))
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(struct.pack(f"<{len(ints)}h", *ints))
    return ints


def db(v: float) -> float:
    return 20 * math.log10(v) if v > 0 else -120.0


def metrics(path: Path) -> dict:
    with wave.open(str(path), "rb") as w:
        ch, sw, sr, n = w.getnchannels(), w.getsampwidth(), w.getframerate(), w.getnframes()
        raw = w.readframes(n)
    s = struct.unpack(f"<{n * ch}h", raw)
    f = [v / 32768 for v in s]
    peak = max(abs(v) for v in f)
    rms = math.sqrt(sum(v * v for v in f) / len(f))
    # RMS over the loudest 50 ms window (perceived punch).
    win = frames(0.05) * ch
    acc = sum(v * v for v in f[:win])
    best = acc
    for i in range(win, len(f), ch):
        acc += f[i] * f[i] + f[i + 1] * f[i + 1] - f[i - win] ** 2 - f[i - win + 1] ** 2
        best = max(best, acc)
    left = f[0::2]
    zc = sum(1 for a, b in zip(left, left[1:]) if (a < 0) != (b < 0))
    diff_e = sum((b - a) ** 2 for a, b in zip(left, left[1:]))
    sig_e = sum(v * v for v in left) or 1e-12
    bright_hz = SR / (2 * math.pi) * math.sqrt(diff_e / sig_e)  # RMS-frequency estimate
    return {
        "file": path.name, "channels": ch, "bits": sw * 8, "rate": sr, "frames": n,
        "seconds": n / sr, "bytes": path.stat().st_size,
        "peak_dbfs": db(peak), "rms_dbfs": db(rms), "max50ms_dbfs": db(math.sqrt(max(best, 0) / win)),
        "crest_db": db(peak) - db(rms), "clipped": sum(1 for v in s if abs(v) >= 32767),
        "dc": sum(f) / len(f), "zcr_per_s": zc / (n / sr), "rms_freq_hz": bright_hz,
        "sha256": hashlib.sha256(path.read_bytes()).hexdigest()[:16],
    }


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--out-dir", type=Path, default=DEFAULT_OUT)
    args = ap.parse_args()
    args.out_dir.mkdir(parents=True, exist_ok=True)

    results = []
    for idx, (name, fn) in enumerate(SOUNDS):
        rng = random.Random(SEED + idx * 7919)
        L, R = master(fn(rng))
        path = args.out_dir / name
        write_wav(path, L, R)
        results.append(metrics(path))

    hdr = f"{'file':<18}{'sec':>6}{'bytes':>9}{'peak':>8}{'rms':>8}{'max50':>8}{'crest':>7}{'clip':>5}{'dc':>9}{'zcr/s':>8}{'f_rms':>7}  sha256"
    print(f"{SR} Hz / 16-bit / stereo PCM -> {args.out_dir}")
    print(hdr)
    ok = True
    total = 0
    for m in results:
        total += m["bytes"]
        print(f"{m['file']:<18}{m['seconds']:>6.2f}{m['bytes']:>9}{m['peak_dbfs']:>8.2f}{m['rms_dbfs']:>8.2f}"
              f"{m['max50ms_dbfs']:>8.2f}{m['crest_db']:>7.1f}{m['clipped']:>5}{m['dc']:>9.5f}"
              f"{m['zcr_per_s']:>8.0f}{m['rms_freq_hz']:>7.0f}  {m['sha256']}")
        if m["peak_dbfs"] > CEILING_DB or m["clipped"] or m["rate"] != SR or m["channels"] != 2:
            ok = False
    print(f"total {total} bytes ({total / 1024:.1f} KiB); ceiling {CEILING_DB} dBFS: {'OK' if ok else 'FAIL'}")
    if total > 2 * 1024 * 1024:
        print("warning: soundbank exceeds 2 MiB", file=sys.stderr)
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
