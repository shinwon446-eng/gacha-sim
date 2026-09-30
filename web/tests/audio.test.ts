import assert from "node:assert/strict";
import { test } from "node:test";
import { playBulkOpen, playGearClick, playTaDum, playWin, preloadUnboxingAudio, primeUnboxingAudio } from "../lib/audio";

test("the confirmation gesture unlocks distinct real samples for single, bulk, and jackpot openings", async () => {
  const fetched: string[] = [];
  const played: number[] = [];
  let resumes = 0;
  const names = ["latch-click", "lid-open", "reveal", "bulk-open", "rare-jackpot"];
  const node = () => ({ connect() { return this; }, disconnect() {} });
  const parameter = () => ({ value: 0 });

  class FakeAudioContext {
    state = "suspended";
    currentTime = 0;
    destination = node();
    createDynamicsCompressor() {
      return { ...node(), threshold: parameter(), knee: parameter(), ratio: parameter(), attack: parameter(), release: parameter() };
    }
    createGain() { return { ...node(), gain: parameter() }; }
    createBufferSource() {
      return {
        ...node(), buffer: null as { id: number } | null, onended: null,
        start() { played.push(this.buffer?.id ?? -1); }, stop() {},
      };
    }
    async decodeAudioData(bytes: ArrayBuffer) { return { id: new Uint8Array(bytes)[0] }; }
    async resume() { resumes++; this.state = "running"; }
  }

  const oldWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const oldDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
  const oldFetch = globalThis.fetch;
  Object.defineProperty(globalThis, "window", { configurable: true, value: { AudioContext: FakeAudioContext, addEventListener() {}, setTimeout, clearTimeout } });
  Object.defineProperty(globalThis, "document", { configurable: true, value: { hidden: false, addEventListener() {} } });
  globalThis.fetch = (async (url: string | URL | Request) => {
    const name = names.find((item) => String(url).endsWith(`${item}.wav`));
    assert.ok(name, `unexpected audio URL: ${String(url)}`);
    fetched.push(String(url));
    return { ok: true, arrayBuffer: async () => Uint8Array.of(names.indexOf(name)).buffer } as Response;
  }) as typeof fetch;

  try {
    preloadUnboxingAudio();
    assert.equal(resumes, 0, "viewing a box must not unlock sound");
    const ready = primeUnboxingAudio();
    assert.equal(resumes, 1, "the confirm click must resume Web Audio before awaiting purchase");
    assert.equal(await ready, true, "all five box sounds must be decoded before opening the presentation");
    playGearClick();
    playTaDum();
    playBulkOpen();
    playWin("jackpot");
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.deepEqual(played, [0, 1, 3, 4]);
    assert.equal(fetched.length, 5, "all original samples load once from the deployed audio directory");
    assert.ok(fetched.every((url) => url.includes("/audio/sfx/")));
  } finally {
    if (oldWindow) Object.defineProperty(globalThis, "window", oldWindow);
    else Reflect.deleteProperty(globalThis, "window");
    if (oldDocument) Object.defineProperty(globalThis, "document", oldDocument);
    else Reflect.deleteProperty(globalThis, "document");
    globalThis.fetch = oldFetch;
  }
});
