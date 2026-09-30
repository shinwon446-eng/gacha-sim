"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { BadgeCheck, Coins, Hash, PackageCheck, ScanLine, ShieldCheck, Truck, Wallet } from "lucide-react";
import { cn } from "@/lib/format";
import { BOXES, BOX_BY_SLUG, dropTable, sellValueOf, type ProductItem } from "@/lib/products";
import { useProductText } from "@/lib/useProductText";
import { ProductArt } from "@/components/box/ProductArt";
import { Money } from "@/components/ui/Money";

/* ─────────────── ② 발견과 신뢰를 위해 설계된 시스템 — 3열 매트릭스 ─────────────── */

/** 1열은 실제 상품 썸네일, 2·3열은 아이콘 배지. 배지 자리는 40×40 으로 고정해 세 열의 리듬이 맞는다. */
const MATRIX = [
  { col: 1, rows: [{ item: "rlx-sub" }, { item: "da-iphone16" }, { item: "js-porsche" }] },
  { col: 2, rows: [{ icon: ShieldCheck }, { icon: Hash }, { icon: ScanLine }] },
  { col: 3, rows: [{ icon: PackageCheck }, { icon: Coins }, { icon: Wallet }] },
] as const;

function MatrixBadge({ item, icon: Icon, alt }: { item?: ProductItem; icon?: typeof ShieldCheck; alt: string }) {
  return (
    <span className="row-span-2 flex h-10 w-10 items-center justify-center overflow-hidden rounded-[10px] border border-white/10 bg-surface">
      {item ? (
        <span className="relative h-full w-full">
          <ProductArt image={item.image} alt={alt} accent="#d9c39a" glowStrength={0.02} bordered={false} fallbackSize="sm" kind={item.kind} />
        </span>
      ) : Icon ? (
        <Icon className="h-[18px] w-[18px] text-gold-champagne" strokeWidth={1.6} />
      ) : null}
    </span>
  );
}

export function DiscoveryMatrix() {
  const t = useTranslations("editorialPages");
  const { itemName } = useProductText();
  const itemById = useMemo(() => {
    const all = BOXES.flatMap((b) => b.items);
    return (id: string) => all.find((x) => x.id === id);
  }, []);

  return (
    <section className="border-t border-hairline py-14 md:py-20">
      <div className="grid gap-5 md:grid-cols-[1fr_1.4fr] md:gap-16">
        <p className="text-xs uppercase tracking-[0.2em] text-gold-champagne">BUILT FOR DISCOVERY</p>
        <div>
          <h2 className="text-3xl font-semibold tracking-[-0.035em] text-white md:text-4xl">{t("matrixTitle")}</h2>
          <p className="mt-4 max-w-xl text-base leading-7 text-muted">{t("matrixBody")}</p>
        </div>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-8 md:mt-14 lg:grid-cols-3">
        {MATRIX.map((column) => (
          <div key={column.col} className="border-t border-hairline pt-6">
            <h3 className="mb-5 text-base font-semibold text-white">{t(`matrixCol${column.col}` as "matrixCol1")}</h3>
            <ul className="grid gap-5">
              {column.rows.map((row, i) => {
                const n = i + 1;
                const title = t(`m${column.col}${n}Title` as "m11Title");
                const product = "item" in row ? itemById(row.item) : undefined;
                return (
                  <li key={n} className="grid grid-cols-[40px_minmax(0,1fr)] items-start gap-x-3.5">
                    <MatrixBadge item={product} icon={"icon" in row ? row.icon : undefined} alt={product ? itemName(product) : title} />
                    <b className="text-[15px] font-semibold leading-[1.4] text-white">{title}</b>
                    <span className="mt-0.5 break-keep text-[13.5px] leading-[1.55] text-muted">{t(`m${column.col}${n}Body` as "m11Body")}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─────────────── ③ 지금 VOILA에서 작동하는 방식 — 2열 쇼케이스 + 용어 툴팁 ─────────────── */

type TermKey = "seed" | "slot" | "cashback" | "ship";

/** 점선 밑줄 용어. 누르면 카드 안에서 뜻이 열린다 — 초보자가 페이지를 떠나지 않아도 된다. */
function Term({ id, open, onToggle, children }: { id: TermKey; open: TermKey | null; onToggle: (k: TermKey) => void; children: ReactNode }) {
  const t = useTranslations("editorialPages");
  const isOpen = open === id;
  return (
    <span className="relative inline-block">
      <button
        type="button"
        onClick={() => onToggle(id)}
        aria-expanded={isOpen}
        className={cn(
          "underline decoration-dotted underline-offset-4 transition-colors",
          isOpen ? "text-white decoration-white" : "text-secondary decoration-white/40 hover:text-white hover:decoration-white",
        )}
      >
        {children}
      </button>
      {isOpen && (
        <span
          role="note"
          className="absolute bottom-[calc(100%+8px)] left-0 z-20 block w-[min(19rem,72vw)] rounded-lg border border-white/15 bg-elevation p-3 text-xs leading-relaxed text-secondary shadow-2xl"
        >
          {t(`term${id[0].toUpperCase()}${id.slice(1)}Body` as "termSeedBody")}
        </span>
      )}
    </span>
  );
}

interface Scenario {
  key: "case1" | "case2";
  item: ProductItem;
  price: number;
  stats: { label: string; value: ReactNode; tone?: "gold" | "emerald" }[];
}

function ScenarioCard({ scenario }: { scenario: Scenario }) {
  const t = useTranslations("editorialPages");
  const { itemName } = useProductText();
  const [open, setOpen] = useState<TermKey | null>(null);
  const toggle = (k: TermKey) => setOpen((cur) => (cur === k ? null : k));

  const terms = {
    seed: (chunks: ReactNode) => (
      <Term id="seed" open={open} onToggle={toggle}>
        {chunks}
      </Term>
    ),
    slot: (chunks: ReactNode) => (
      <Term id="slot" open={open} onToggle={toggle}>
        {chunks}
      </Term>
    ),
    cashback: (chunks: ReactNode) => (
      <Term id="cashback" open={open} onToggle={toggle}>
        {chunks}
      </Term>
    ),
    ship: (chunks: ReactNode) => (
      <Term id="ship" open={open} onToggle={toggle}>
        {chunks}
      </Term>
    ),
  };

  return (
    <article className="relative rounded-[18px] border border-hairline bg-surface p-6 md:p-8">
      {/* 헤더 — 썸네일 + 도킹 배지 */}
      <header className="flex items-center gap-4">
        <span className="relative h-14 w-14 flex-none">
          <span className="block h-full w-full overflow-hidden rounded-full ring-1 ring-white/10">
            <ProductArt image={scenario.item.image} alt={itemName(scenario.item)} accent="#d9c39a" glowStrength={0.03} bordered={false} fallbackSize="sm" kind={scenario.item.kind} />
          </span>
          <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border border-obsidian bg-gold-champagne">
            <BadgeCheck className="h-3 w-3 text-obsidian" strokeWidth={2.4} />
          </span>
        </span>
        <span className="min-w-0">
          <span className="block truncate text-base font-semibold text-white">{itemName(scenario.item)}</span>
          <span className="mt-0.5 block text-[13px] text-muted">{t(`${scenario.key}Sub` as "case1Sub")}</span>
        </span>
      </header>

      {/* 3단 숫자 띠 */}
      <dl className="my-5 grid grid-cols-3 gap-6 border-y border-hairline py-4">
        {scenario.stats.map((stat, i) => (
          <div key={stat.label} className={cn(i > 0 && "border-l border-hairline pl-6")}>
            <dt className="text-xs text-muted">{stat.label}</dt>
            <dd
              className={cn(
                "mt-1.5 text-lg font-semibold tabular-nums tracking-tight md:text-[22px]",
                stat.tone === "gold" ? "text-gold-champagne" : stat.tone === "emerald" ? "text-emerald-300" : "text-white",
              )}
            >
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>

      {/* 시나리오 설명 — 핵심 용어는 점선 밑줄 버튼 */}
      <p className="break-keep text-sm leading-7 text-secondary">{t.rich(`${scenario.key}Body` as "case1Body", terms)}</p>
    </article>
  );
}

export function ScenarioShowcase() {
  const t = useTranslations("editorialPages");

  const scenarios = useMemo<Scenario[]>(() => {
    const out: Scenario[] = [];
    // ① 실물 명품 수령 — 그 컬렉션의 최고 구성품
    const luxury = BOX_BY_SLUG["vault-submariner"];
    if (luxury) {
      const top = dropTable(luxury)[0];
      if (top) {
        out.push({
          key: "case1",
          item: top,
          price: luxury.price,
          stats: [
            { label: t("statPrice"), value: <Money value={luxury.price} size="sm" numberClassName="text-white" /> },
            { label: t("statRetail"), value: <Money value={top.value} size="sm" numberClassName="text-white" /> },
            { label: t("statMultiple"), value: `${Math.round(top.value / luxury.price)}x`, tone: "gold" },
          ],
        });
      }
    }
    // ② 즉시 캐시백 — 1달러 컬렉션에서 실물/디지털 중 가운데 값을 고른다(최고 상품을 캐시백하는 예시는 앞뒤가 안 맞는다)
    const starter = BOX_BY_SLUG["dollar-apple"];
    if (starter) {
      const sellable = dropTable(starter).filter((x) => x.kind !== "cash");
      const pick = sellable[Math.floor(sellable.length / 2)] ?? sellable[sellable.length - 1];
      if (pick) {
        out.push({
          key: "case2",
          item: pick,
          price: starter.price,
          stats: [
            { label: t("statPrice"), value: <Money value={starter.price} size="sm" numberClassName="text-white" /> },
            { label: t("statRetail"), value: <Money value={pick.value} size="sm" numberClassName="text-white" /> },
            { label: t("statCashback"), value: <Money value={sellValueOf(pick)} size="sm" numberClassName="text-emerald-300" />, tone: "emerald" },
          ],
        });
      }
    }
    return out;
  }, [t]);

  return (
    <section className="border-t border-hairline py-14 md:py-20">
      <div className="grid gap-5 md:grid-cols-[1fr_1.4fr] md:gap-16">
        <p className="text-xs uppercase tracking-[0.2em] text-gold-champagne">IN PRACTICE</p>
        <div>
          <h2 className="text-3xl font-semibold tracking-[-0.035em] text-white md:text-4xl">{t("nowTitle")}</h2>
          <p className="mt-4 max-w-xl text-base leading-7 text-muted">{t("nowBody")}</p>
        </div>
      </div>
      <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-2">
        {scenarios.map((s) => (
          <ScenarioCard key={s.key} scenario={s} />
        ))}
      </div>
    </section>
  );
}

/* ─────────────── ④ 5:7 비대칭 신뢰 가드레일 ─────────────── */

const GUARDS = [ShieldCheck, Hash, Truck, Coins] as const;

export function TrustGuardrails({ action }: { action: ReactNode }) {
  const t = useTranslations("editorialPages");
  return (
    <section className="grid gap-9 border-t border-hairline py-14 md:py-20 lg:grid-cols-12 lg:gap-16">
      <div className="lg:col-span-5">
        <h2 className="text-3xl font-semibold tracking-[-0.035em] text-white md:text-4xl">{t("trustTitle")}</h2>
        <p className="mt-4 whitespace-pre-line text-base leading-7 text-muted">{t("trustBody")}</p>
        <div className="mt-6">{action}</div>
      </div>
      <ul className="border-t border-hairline lg:col-span-7">
        {GUARDS.map((Icon, i) => (
          <li key={i} className="grid grid-cols-[28px_1fr] gap-x-3.5 border-b border-hairline py-5">
            <Icon className="mt-0.5 h-[18px] w-[18px] text-gold-champagne" strokeWidth={1.7} />
            <div>
              <b className="text-[15px] font-semibold leading-[1.4] text-white">{t(`guard${i + 1}Title` as "guard1Title")}</b>
              <span className="mt-1 block break-keep text-[13.5px] leading-[1.55] text-muted">{t(`guard${i + 1}Body` as "guard1Body")}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
