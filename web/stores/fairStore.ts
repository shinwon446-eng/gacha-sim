"use client";

/**
 * Provably Fair 세션 (데모).
 *
 * 실제 서비스에서는 서버 시드가 서버에만 있고 해시만 내려온다. 정적 데모라 서버가 없으므로
 * 브라우저가 시드를 만들고 "해시만 먼저 보여주는" 절차를 그대로 따른다.
 *   · serverSeed 는 세션 동안 유지, hash 는 언제나 화면에 공개
 *   · nonce 는 오픈마다 1 증가 (persist)
 *   · clientSeed 는 유저가 바꿀 수 있다 (persist)
 *   · 개봉 후 결과 팝업이 serverSeed 원문을 보여주고, 검증기가 그 값으로 재현한다
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { generateClientSeed, generateServerSeed, hashServerSeed } from "@/lib/fairness";

interface FairState {
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  hydrated: boolean;
  /** 마운트 후 서버 시드가 없으면 만들고 해시를 계산한다 */
  ensureSeeds: () => Promise<void>;
  /** 서버 시드 교체 — 이전 시드는 결과 팝업에서 이미 공개됐다 */
  rotateServerSeed: () => Promise<void>;
  setClientSeed: (s: string) => void;
  /** 이번 오픈에 쓸 nonce 를 돌려주고 1 올린다 */
  takeNonce: () => number;
}

export const useFairStore = create<FairState>()(
  persist(
    (set, get) => ({
      serverSeed: "",
      serverSeedHash: "",
      clientSeed: "",
      nonce: 0,
      hydrated: false,
      ensureSeeds: async () => {
        const s = get();
        const next: Partial<FairState> = {};
        if (!s.serverSeed) {
          const seed = generateServerSeed();
          next.serverSeed = seed;
          next.serverSeedHash = await hashServerSeed(seed);
        }
        if (!s.clientSeed) next.clientSeed = generateClientSeed();
        if (Object.keys(next).length) set(next);
      },
      rotateServerSeed: async () => {
        const seed = generateServerSeed();
        set({ serverSeed: seed, serverSeedHash: await hashServerSeed(seed), nonce: 0 });
      },
      setClientSeed: (clientSeed) => set({ clientSeed: clientSeed.trim() || generateClientSeed(), nonce: 0 }),
      takeNonce: () => {
        const n = get().nonce;
        set({ nonce: n + 1 });
        return n;
      },
    }),
    {
      name: "gachaflix.fair",
      storage: createJSONStorage(() => localStorage),
      // 서버 시드도 저장한다 — 데모라 브라우저가 "서버" 역할. 새로고침해도 커밋이 유지되어야 검증이 성립한다.
      partialize: (s) => ({ serverSeed: s.serverSeed, serverSeedHash: s.serverSeedHash, clientSeed: s.clientSeed, nonce: s.nonce }),
      skipHydration: true,
      onRehydrateStorage: () => () => useFairStore.setState({ hydrated: true }),
    },
  ),
);
