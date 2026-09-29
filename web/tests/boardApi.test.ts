import test from "node:test";
import assert from "node:assert/strict";
import { browserAccountRequest } from "../lib/browserAccount";
import { BOARD_STORAGE_KEY, loadBoard, submitBoardCommand } from "../lib/boardApi";
import type { BoardDraft } from "../lib/board";
const draft: BoardDraft = { title: "A saved story", body: "An actual member-authored post.", category: "general", pinned: false };
test("browser adapter persists actual posts, rechecks session, rejects unauthorized edits and preserves data on storage failures", async () => {
  const savedStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const savedWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const data = new Map<string, string>(); let fail = false;
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { if (fail && key === BOARD_STORAGE_KEY) throw new Error("quota"); data.set(key, value); }, removeItem: (key: string) => data.delete(key) } });
  Object.defineProperty(globalThis, "window", { configurable: true, value: {} });
  try {
    assert.deepEqual((await loadBoard()).posts, []);
    await assert.rejects(submitBoardCommand({ type: "create", draft }));
    await browserAccountRequest("/auth/login", { email: "writer@example.test", password: "password" });
    const results = await Promise.all([submitBoardCommand({ type: "create", draft }), submitBoardCommand({ type: "create", draft: { ...draft, title: "Second concurrent story" } })]);
    assert.equal(results[1].posts.length, 2, "queued writes do not drop an earlier post");
    assert.equal((await loadBoard()).posts.length, 2);
    assert.equal((await loadBoard()).canPublishNotice, false);
    await assert.rejects(submitBoardCommand({ type: "create", draft: { ...draft, category: "notice", pinned: true } }), /forbidden/);
    const before = data.get(BOARD_STORAGE_KEY); fail = true;
    await assert.rejects(submitBoardCommand({ type: "create", draft }), /quota/);
    assert.equal(data.get(BOARD_STORAGE_KEY), before); fail = false;
    await browserAccountRequest("/auth/logout", {});
    await browserAccountRequest("/auth/login", { email: "someone-else@example.test", password: "password" });
    const post = results[0].posts[0];
    await assert.rejects(submitBoardCommand({ type: "delete", id: post.id, revision: post.revision }), /forbidden/);
    assert.equal((await loadBoard()).posts.length, 2);
    data.set(BOARD_STORAGE_KEY, "corrupt");
    await assert.rejects(submitBoardCommand({ type: "create", draft }));
    assert.equal(data.get(BOARD_STORAGE_KEY), "corrupt", "corrupt history is never silently replaced");
  } finally {
    if (savedStorage) Object.defineProperty(globalThis, "localStorage", savedStorage); else Reflect.deleteProperty(globalThis, "localStorage");
    if (savedWindow) Object.defineProperty(globalThis, "window", savedWindow); else Reflect.deleteProperty(globalThis, "window");
  }
});
