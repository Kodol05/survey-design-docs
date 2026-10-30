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
import { Note } from "@/components/ui/Note";

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
 *
 * ## 처음에는 큰 순 넷을 함께 (2026-10-30 사용자 요청)
 *
 * 아무것도 안 골랐을 때는 |r| 큰 순 **넷을 2×2로** 깔아 둔다. 표의 칸은 어느
 * 것도 고른 상태로 두지 않는다 — 전에는 가장 큰 칸(예: 0.55)이 처음부터
 * 테두리를 두르고 있어 누른 것처럼 보였다. 칸이나 작은 그림 제목을 누르면
 * 그 조합 하나를 크게 보고, 「뒤로가기」나 같은 칸을 다시 누르면 넷으로 돌아온다.
 */

/** 처음 화면에 깔아 둘 조합 수 */
const OVERVIEW = 4;
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
  /** 고른 조합 — 안 골랐으면 없음(큰 순 넷을 보여 준다) */
  const cur = sel ? ranked[i] : undefined;
  const top = ranked.slice(0, OVERVIEW);
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
    <>
    {/*
      표와 그림을 **비슷한 무게로** 나눈다 (2026-10-30 사용자 요청 — 오른쪽 그림이
      너무 커서 표가 먹혀 보였다). 그림 쪽에 상한을 두고 남는 폭은 표에 준다.
    */}
    <div className="grid gap-8 xl:grid-cols-[minmax(32rem,1fr)_minmax(0,46rem)]">
      <div>
        <CorrelationTable
          rows={rows}
          cols={cols}
          cell={(r, c) => cells[`${r}|${c}`] ?? { kind: "unstudied" }}
          selected={cur ? { row: cur.row, col: cur.col } : null}
          /*
            **고른 칸을 다시 누르면 풀린다** (2026-10-30 사용자 요청) — 큰 순
            넷으로 돌아간다.
          */
          onSelect={(x) =>
            setSel(
              cur && x.row === cur.row && x.col === cur.col ? null : x,
            )
          }
          groups={groups}
          colsLabel="직무능력"
        />
        <CorrelationLegend />
      </div>

      <div className="min-w-0">
        {ranked.length === 0 ? (
          <p className="text-ink-muted py-16 text-center">
            표시할 데이터가 없습니다.
          </p>
        ) : !cur ? (
          /* 큰 순 넷 — 제목을 누르면 그 조합 하나를 크게 본다 */
          /*
            넷을 합쳐도 하나 크게 볼 때와 **비슷한 크기**로 (2026-10-30 사용자 요청).
          */
          <div className="grid gap-x-6 gap-y-4 lg:grid-cols-2">
            {top.map((x, k) => (
              <div key={`${x.row}|${x.col}`} className="min-w-0">
                <button
                  type="button"
                  onClick={() => setSel({ row: x.row, col: x.col })}
                  className="group mb-1 flex w-full flex-wrap items-baseline gap-x-3 text-left"
                >
                  <span className="text-axis text-ink-muted tabular">{k + 1}</span>
                  <span className="text-table font-semibold group-hover:underline group-hover:underline-offset-4">
                    {x.row} <span className="text-ink-muted font-normal">×</span> {x.col}
                  </span>
                  <span className="flex items-baseline gap-1.5">
                    <span className="text-table tabular">{formatR(x.r)}</span>
                    <GradeTag r={x.r} ci={x.ci} />
                  </span>
                </button>
                <ScatterPlot
                  height={180}
                  points={scatter[`${x.row}|${x.col}`] ?? []}
                  trend={trends[`${x.row}|${x.col}`] ?? null}
                  xLabel={x.row}
                  yLabel={x.col}
                />
              </div>
            ))}
          </div>
        ) : (
          /*
            하나를 크게 볼 때는 **카드 하나로 묶는다** (2026-10-30 사용자 요청) —
            테두리·다른 바탕 없이 그림자로만 떠 보이게. 왼쪽 위 「뒤로가기」나
            표에서 같은 칸을 다시 누르면 큰 순 넷으로 돌아간다.
          */
          <div className="bg-card rounded-xl px-5 pt-4 pb-3 shadow-(--card-shadow-hover)">
            <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-2">
              <button
                type="button"
                onClick={() => setSel(null)}
                className="text-axis rounded-full bg-(--wash)/70 px-3 py-1 transition hover:bg-(--wash)"
              >
                뒤로가기
              </button>
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
              height={380}
              points={scatter[`${cur.row}|${cur.col}`] ?? []}
              trend={trends[`${cur.row}|${cur.col}`] ?? null}
              xLabel={cur.row}
              yLabel={cur.col}
            />
          </div>
        )}
      </div>
    </div>

    {/*
      표 아래 범례에 있던 「흐린 칸」 뜻 · 등급 기준 · 칸마다 인원을 여기로 모았다
      (2026-10-30 사용자 요청). 위의 가는 선은 뺐다.
    */}
    <Note label="표 설명" className="mt-5">
      <p className="mb-2">
        직무능력은 직원 본인이 설문에 답한 값입니다. 성향과 같은 설문에서 나온
        값이라 관련도가 실제보다 조금 높게 나올 수 있습니다.
      </p>
      <p className="mb-2">
        <strong>흐린 칸</strong>은 방향(+/−)이 아직 확정되지 않은 칸입니다.
      </p>
      <p className={nRange ? "mb-2" : undefined}>
        등급 기준: <span className="tabular">0.10</span> 약함 ·{" "}
        <span className="tabular">0.20</span> 약간 뚜렷함 ·{" "}
        <span className="tabular">0.30</span> 뚜렷함 ·{" "}
        <span className="tabular">0.50</span> 매우 뚜렷함
      </p>
      {nRange && (
        <p>
          칸마다 인원이 다릅니다(
          <span className="tabular">
            {nRange[0]}~{nRange[1]}
          </span>
          명).
        </p>
      )}
    </Note>
    </>
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
    "text-axis rounded-full bg-(--wash)/70 px-3 py-1 transition enabled:hover:bg-(--wash) disabled:opacity-40";
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
