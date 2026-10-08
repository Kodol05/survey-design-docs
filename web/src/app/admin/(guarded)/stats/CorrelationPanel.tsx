"use client";

import { useState } from "react";
import {
  CorrelationLegend,
  CorrelationTable,
  type Cell,
  type Selected,
} from "@/components/analysis/CorrelationTable";
import { ScatterPlot, type Point } from "@/components/analysis/ScatterPlot";
import { formatR } from "@/components/analysis/correlationColor";
import { GradeTag } from "@/components/analysis/GradeTag";
import { rankByAbs } from "@/components/analysis/share";

/**
 * 관련도 표 + 산점도 하나.
 *
 * 표는 **어디를 볼지 고르는 도구**이고, 실제로 보는 것은 산점도다.
 * 한두 명이 상관을 끌고 있는지는 점을 봐야만 안다 (08 차별점).
 *
 * ## 작은 그림 넷 대신 큰 그림 하나 + 이전·다음 (2026-10-07 사용자 결정)
 *
 * 전에는 아무것도 안 고르면 「방향이 확정된 것부터」 작은 산점도 넷을 깔았다.
 * 210px짜리 넷은 점이 뭉쳐 정작 점을 볼 수가 없었다. 이제 늘 **하나를 크게**
 * 그린다 —
 *
 *   - 처음에는 |r|이 가장 큰 조합 (음이든 양이든)
 *   - 이전·다음은 값이 있는 조합 전부를 |r| 큰 순으로 넘긴다
 *   - 표에서 칸을 누르면 그 조합으로 가고, 이전·다음은 그 순번에서 이어진다
 *
 * 그리는 조합의 칸에는 표에서 늘 테두리가 둘려 있어 두 쪽이 이어진다.
 */
export function CorrelationPanel({
  rows,
  cols,
  cells,
  scatter,
  trends,
  groups,
}: {
  rows: string[];
  cols: string[];
  cells: Record<string, Cell>;
  scatter: Record<string, Point[]>;
  trends: Record<string, { x: number; y: number }[] | null>;
  /** 행 묶음 — 기질 4 / 성격 3 */
  groups?: { label: string; note?: string; rows: string[] }[];
}) {
  /*
    값이 있는 조합을 표 순서(행 → 열)로 모은 다음 |r| 큰 순으로 세운다.
    같은 크기면 표 순서를 지킨다 — 넘길 때마다 차례가 흔들리지 않게.
  */
  const ranked = rankByAbs(
    rows.flatMap((row) =>
      cols.flatMap((col) => {
        const c = cells[`${row}|${col}`];
        return c?.kind === "value" ? [{ row, col, ...c }] : [];
      }),
    ),
  );

  /*
    순번이 아니라 **조합을** 기억한다. 「신뢰도 낮은 응답 빼기」를 켜고 끄면
    순위가 바뀌는데, 순번으로 들고 있으면 보던 그림이 말없이 다른 조합으로
    바뀐다. 조합으로 들고 있으면 같은 그림에서 숫자만 달라진다.
    아무것도 안 골랐으면 맨 앞(가장 큰 것)을 그린다.
  */
  const [sel, setSel] = useState<Selected>(null);
  const found = sel
    ? ranked.findIndex((x) => x.row === sel.row && x.col === sel.col)
    : -1;
  const i = Math.max(0, found);
  const cur = ranked[i];
  const go = (j: number) =>
    ranked[j] && setSel({ row: ranked[j].row, col: ranked[j].col });

  /*
    칸마다 n이 같으면 범례에 적지 않는다 — 카드 머리줄의 「N명」이 같은
    말이다. 다를 때만 범위를 적는다 (D-65).
  */
  const ns = ranked.map((x) => x.n);
  const nRange: [number, number] | null =
    ns.length && Math.min(...ns) !== Math.max(...ns)
      ? [Math.min(...ns), Math.max(...ns)]
      : null;

  return (
    <div className="grid gap-8 xl:grid-cols-[34rem_minmax(0,1fr)]">
      <div>
        <CorrelationTable
          rows={rows}
          cols={cols}
          cell={(r, c) => cells[`${r}|${c}`] ?? { kind: "unstudied" }}
          selected={cur ? { row: cur.row, col: cur.col } : null}
          onSelect={setSel}
          groups={groups}
        />
        <CorrelationLegend nRange={nRange} />
      </div>

      <div className="min-w-0">
        {!cur ? (
          <p className="text-ink-muted py-16 text-center">
            아직 그려 볼 값이 없습니다.
          </p>
        ) : (
          <>
            <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-2">
              <h3 className="text-table font-semibold">
                {cur.row} <span className="text-ink-muted font-normal">×</span>{" "}
                {cur.col}
              </h3>
              <span className="flex items-baseline gap-1.5">
                <span className="text-table tabular">{formatR(cur.r)}</span>
                <GradeTag r={cur.r} ci={cur.ci} />
              </span>
              <Stepper
                at={i}
                total={ranked.length}
                onPrev={() => go(i - 1)}
                onNext={() => go(i + 1)}
              />
            </div>
            <ScatterPlot
              height={420}
              points={scatter[`${cur.row}|${cur.col}`] ?? []}
              trend={trends[`${cur.row}|${cur.col}`] ?? null}
              xLabel={cur.row}
              yLabel={cur.col}
            />
          </>
        )}
      </div>
    </div>
  );
}

/** 이전 · `1 / 21` · 다음. 끝에서 돌아가지 않는다 — 순번이 곧 크기 순위라서 */
function Stepper({
  at,
  total,
  onPrev,
  onNext,
}: {
  at: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  const btn =
    "text-axis rounded-md border border-(--border) px-2.5 py-1 transition enabled:hover:bg-card-head disabled:opacity-40";
  return (
    <span className="ml-auto flex items-center gap-2">
      <button type="button" className={btn} onClick={onPrev} disabled={at <= 0}>
        이전
      </button>
      <span className="text-axis text-ink-secondary tabular min-w-[3.5rem] text-center">
        {at + 1} / {total}
      </span>
      <button
        type="button"
        className={btn}
        onClick={onNext}
        disabled={at >= total - 1}
      >
        다음
      </button>
    </span>
  );
}
