"use client";

// 확률 공시 — 코드베이스 전체에서 확률을 표로 보여주는 유일한 컴포넌트.
// 라인별 합산 확률 + 수록 항목 전체를 한 테이블에 담는다. (중복 렌더링 금지)
// 표기 규칙: 수치는 전부 tabular-nums 모노스페이스. 라인 헤더에는 브래킷 등급을 앞세운다.
import { Fragment } from "react";
import { ExternalLink } from "lucide-react";
import type { Box } from "@/lib/types";
import { LINE_META, LINE_ORDER } from "@/lib/types";
import { itemProbability, lineProbabilities, itemsOfLine } from "@/lib/rng";
import { compactUsd } from "@/lib/format";
import { AssetPlate } from "./AssetPlate";
import { useCopy } from "@/lib/i18n";

export function ProbabilityTable({ box }: { box: Box }) {
  const lineProbs = lineProbabilities(box);
  const { t: tc } = useCopy();

  return (
    <div className="overflow-x-auto">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-white/[0.08] pb-2">
        <span className="display text-base font-bold text-white">{tc("probabilityIndex")}</span>
        <span className="label-caps">
          {tc("guaranteedMin")}
          <span className="ml-1.5 font-mono tracking-normal text-neutral-300">
            {compactUsd(box.guaranteed_min_value)}
          </span>
        </span>
      </div>
      <table className="w-full min-w-[560px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-white/[0.08] text-left">
            <th className="label-caps py-2.5 pr-3">라인업 / 항목</th>
            <th className="label-caps py-2.5 pr-3">실판매가</th>
            <th className="label-caps py-2.5 pr-3">인증</th>
            <th className="label-caps py-2.5 text-right">확률</th>
          </tr>
        </thead>
        <tbody>
          {LINE_ORDER.map((line) => {
            const items = itemsOfLine(box, line);
            if (!items.length) return null;
            const meta = LINE_META[line];
            const isTop = line === "jackpot";
            return (
              <Fragment key={line}>
                <tr className="border-b border-white/[0.08] bg-white/[0.02]">
                  <td className="py-2.5 pr-3">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span
                        className="font-display text-[15px] font-bold uppercase leading-none tracking-tight"
                        style={{ color: meta.color }}
                      >
                        {meta.grade}
                      </span>
                      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-200">
                        {meta.label}
                      </span>
                    </div>
                    <div className="mt-1 text-[11px] leading-snug text-neutral-500">{meta.desc}</div>
                  </td>
                  <td className="py-2.5 pr-3 font-mono text-xs tabular-nums text-neutral-500">{items.length}종</td>
                  <td className="py-2.5 pr-3" />
                  <td
                    className="py-2.5 text-right font-mono text-sm font-bold tabular-nums"
                    style={{ color: meta.color }}
                  >
                    {lineProbs[line].toFixed(2)}%
                  </td>
                </tr>
                {items.map((it) => (
                  <tr
                    key={it.id}
                    className="border-b border-white/[0.05] text-neutral-300 transition-colors duration-300 ease-cine hover:bg-white/[0.03]"
                  >
                    <td className="py-2 pr-3">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <AssetPlate code={it.code} tone={it.art} size="xs" active={isTop} />
                        <span className="min-w-0 truncate font-medium text-neutral-200">{it.name}</span>
                      </div>
                    </td>
                    <td className="py-2 pr-3 font-mono text-xs tabular-nums text-neutral-200">
                      {compactUsd(it.value)}
                    </td>
                    <td className="py-2 pr-3">
                      <span className="inline-flex items-center gap-1 font-mono text-[10px] tabular-nums text-neutral-500">
                        {it.cert}
                        <ExternalLink className="h-3 w-3 flex-none" />
                      </span>
                    </td>
                    <td className="py-2 text-right font-mono text-xs tabular-nums text-neutral-200">
                      {itemProbability(box, it).toFixed(3)}%
                    </td>
                  </tr>
                ))}
              </Fragment>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t border-white/[0.08]">
            <td className="py-2.5 pr-3 text-[11px] leading-relaxed text-neutral-500" colSpan={3}>
              라인업은 실판매가 기준으로 자동 분류됩니다 (100만원 이상 / 14만원 이상 / 그 외)
            </td>
            <td className="py-2.5 text-right font-mono text-sm font-bold tabular-nums text-white">100.00%</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
