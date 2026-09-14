"use client";

// 확률 공시 — 코드베이스 전체에서 확률을 표로 보여주는 유일한 컴포넌트.
// 라인별 합산 확률 + 포함 상품 전체를 한 테이블에 담는다. (중복 렌더링 금지)
import { ExternalLink } from "lucide-react";
import type { Box } from "@/lib/types";
import { LINE_META, LINE_ORDER } from "@/lib/types";
import { itemProbability, lineProbabilities, itemsOfLine } from "@/lib/rng";
import { compactUsd } from "@/lib/format";

export function ProbabilityTable({ box }: { box: Box }) {
  const lineProbs = lineProbabilities(box);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-white/15 text-left text-[11px] uppercase tracking-wider text-gray-500">
            <th className="py-2 pr-3 font-semibold">라인업 / 상품</th>
            <th className="py-2 pr-3 font-semibold">실판매가</th>
            <th className="py-2 pr-3 font-semibold">인증</th>
            <th className="py-2 text-right font-semibold">확률</th>
          </tr>
        </thead>
        <tbody>
          {LINE_ORDER.map((line) => {
            const items = itemsOfLine(box, line);
            if (!items.length) return null;
            const meta = LINE_META[line];
            return (
              <>
                <tr key={line} className="border-b border-white/10 bg-white/[0.03]">
                  <td className="py-2 pr-3">
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: meta.color }} />
                      <span className="font-bold" style={{ color: meta.color }}>
                        {meta.label}
                      </span>
                    </span>
                    <div className="pl-[18px] text-[11px] text-gray-500">{meta.desc}</div>
                  </td>
                  <td className="py-2 pr-3 text-xs text-gray-500">{items.length}종</td>
                  <td className="py-2 pr-3" />
                  <td className="py-2 text-right font-mono font-bold" style={{ color: meta.color }}>
                    {lineProbs[line].toFixed(2)}%
                  </td>
                </tr>
                {items.map((it) => (
                  <tr key={it.id} className="border-b border-white/5 text-gray-300">
                    <td className="py-1.5 pl-[18px] pr-3">
                      <span className="mr-1.5">{it.emoji}</span>
                      {it.name}
                    </td>
                    <td className="py-1.5 pr-3 font-mono text-xs">{compactUsd(it.value)}</td>
                    <td className="py-1.5 pr-3">
                      <span className="inline-flex items-center gap-1 font-mono text-[10px] text-gray-500">
                        {it.cert}
                        <ExternalLink className="h-3 w-3" />
                      </span>
                    </td>
                    <td className="py-1.5 text-right font-mono text-xs">{itemProbability(box, it).toFixed(3)}%</td>
                  </tr>
                ))}
              </>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t border-white/15 text-xs text-gray-500">
            <td className="py-2" colSpan={3}>
              라인업은 실판매가 기준으로 자동 분류됩니다 (100만원 이상 / 14만원 이상 / 그 외)
            </td>
            <td className="py-2 text-right font-mono font-bold text-white">100.00%</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
