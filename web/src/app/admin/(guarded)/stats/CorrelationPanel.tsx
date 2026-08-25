"use client";

import { useState } from "react";
import {
  CorrelationLegend,
  CorrelationTable,
  type Cell,
  type Selected,
} from "@/components/analysis/CorrelationTable";
import { ScatterPlot, type Point } from "@/components/analysis/ScatterPlot";
import { WarningBadge } from "@/components/ui/WarningBadge";
import { formatR } from "@/components/analysis/correlationColor";
import { GradeTag } from "@/components/analysis/GradeTag";
import { AlphaNote } from "@/components/analysis/AlphaNote";
import type { ScaleReliability } from "@/lib/admin/analysis";

/**
 * 관련도 표 + 산점도.
 *
 * 표는 **어디를 볼지 고르는 도구**이고, 실제로 보는 것은 산점도다.
 * 한두 명이 상관을 끌고 있는지는 점을 봐야만 안다 (08 차별점).
 */
export function CorrelationPanel({
  rows,
  cols,
  cells,
  scatter,
  trends,
  inHouse,
  aside,
  reliability,
}: {
  rows: string[];
  cols: string[];
  cells: Record<string, Cell>;
  scatter: Record<string, Point[]>;
  trends: Record<string, { x: number; y: number }[] | null>;
  inHouse: boolean;
  /**
   * 척도별 α. 열 이름 아래에 적고, 기준 아래인 열은 통째로 흐리게 한다.
   *
   * **연구 표에는 주지 않는다** — 저기 값은 남이 다른 도구로 잰 것이라
   * 우리 문항의 α와 아무 상관이 없다.
   */
  reliability?: Record<string, ScaleReliability>;
  /**
   * 오른쪽 칸에 대신 넣을 것. 연구 표에는 점 분포가 없어 이 칸이 비는데,
   * 안내 문구로 채우면 화면 절반이 놀게 된다. 볼 것을 넣는다.
   */
  aside?: React.ReactNode;
}) {
  /*
    처음에는 **아무것도 안 고른 상태**로 둔다.

    전에는 첫 값 칸을 자동으로 골라 뒀는데, 그러면 표에서 위쪽 왼쪽 칸이
    별 이유 없이 특별해 보인다. 지금은 고르기 전에 **볼 만한 것 넷**을
    먼저 보여주고, 고르면 그것 하나로 좁힌다.
  */
  const [sel, setSel] = useState<Selected>(null);

  /** 문항이 안 맞물리는 열 — 여기 상관은 축소 편향되어 그대로 읽으면 안 된다 */
  const dimmed = new Set(
    cols.filter((c) => reliability?.[c]?.verdict === "poor"),
  );

  /** 같은 칸을 다시 누르면 선택이 풀려 다시 넷으로 돌아간다 */
  const toggle = (next: { row: string; col: string }) =>
    setSel((cur) =>
      cur && cur.row === next.row && cur.col === next.col ? null : next,
    );

  const k = sel ? `${sel.row}|${sel.col}` : "";
  const cell = sel ? cells[k] : undefined;
  const points = sel ? (scatter[k] ?? []) : [];

  /*
    고르기 전에 보여줄 넷 — **볼 만한 순서**로 고른다.

    신뢰구간이 0을 벗어난 것(방향이 확정된 것)을 먼저 두고, 그 안에서
    관련도가 큰 순이다. 확정된 것이 넷이 안 되면 남은 자리는 큰 값으로 채운다.
    아무 기준 없이 위에서 넷을 자르면 표의 왼쪽 위만 계속 보게 된다.
  */
  const featured = Object.entries(cells)
    .filter(([key, c]) => c.kind === "value" && !dimmed.has(key.split("|")[1]))
    .map(([key, c]) => {
      const v = c as Extract<Cell, { kind: "value" }>;
      return {
        key,
        row: key.split("|")[0],
        col: key.split("|")[1],
        cell: v,
        settled: !(v.ci[0] <= 0 && v.ci[1] >= 0),
      };
    })
    .sort(
      (a, b) =>
        Number(b.settled) - Number(a.settled) ||
        Math.abs(b.cell.r) - Math.abs(a.cell.r),
    )
    .slice(0, 4);

  return (
    <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div>
        <CorrelationTable
          rows={rows}
          cols={cols}
          cell={(r, c) => cells[`${r}|${c}`] ?? { kind: "unstudied" }}
          selected={sel}
          onSelect={inHouse ? toggle : undefined}
          colNote={
            reliability ? (c) => <AlphaNote r={reliability[c]} /> : undefined
          }
          dimCol={dimmed.size ? (c) => dimmed.has(c) : undefined}
        />
        <CorrelationLegend inHouse={inHouse} />
        {/*
          흐린 이유를 표 바로 아래에 적는다. 열 머리의 「α .08 · 기준 아래」만
          으로는 **왜 흐린지**까지는 말하지 못한다.
        */}
        {dimmed.size > 0 && (
          <div className="mt-4">
            <WarningBadge kind="lowReliability" />
            <p className="text-axis text-ink-secondary mt-2 max-w-[42rem] leading-relaxed">
              <strong>{[...dimmed].join(" · ")}</strong> 열을 흐리게 두었습니다.
              이 척도는 문항끼리 맞물리지 않아서, 여기서 잰 상관은{" "}
              <strong>실제보다 작게</strong> 나옵니다. 「관련이 약하다」가 아니라{" "}
              <strong>「아직 말할 수 없다」</strong>로 읽어 주십시오.{" "}
              <a href="/admin/stats?tab=reliability" className="underline">
                검사 신뢰도에서 보기
              </a>
            </p>
          </div>
        )}
      </div>

      <div>
        {!inHouse ? (
          aside
        ) : sel && cell?.kind === "value" ? (
          <>
            <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h3 className="text-section-title">
                {sel.row} <span className="text-ink-muted">×</span> {sel.col}
              </h3>
              <span className="text-table">
                <span className="tabular">{formatR(cell.r)}</span>
                <GradeTag r={cell.r} ci={cell.ci} className="ml-2" />
                <span className="tabular text-axis text-ink-muted ml-2">
                  n={cell.n} · {formatR(cell.ci[0])}~{formatR(cell.ci[1])}
                </span>
              </span>
              <button
                type="button"
                onClick={() => setSel(null)}
                className="text-axis text-ink-muted ml-auto underline"
              >
                넷 다 보기
              </button>
            </div>
            {/*
              하나만 볼 때는 **왼쪽 표와 키를 맞춘다.** 표가 7행이라 500px쯤
              되는데 그래프만 360px이면 오른쪽이 허전하고 점도 뭉친다.
            */}
            <ScatterPlot
              height={520}
              points={points}
              trend={trends[k] ?? null}
              xLabel={sel.row}
              yLabel={sel.col}
            />
            <p className="text-axis text-ink-muted mt-2">
              점 하나가 한 사람입니다. 마우스를 올리면 누구인지 나옵니다. 같은
              칸을 다시 누르면 넷으로 돌아갑니다.
              {dimmed.has(sel.col) && (
                <>
                  {" "}
                  <span style={{ color: "var(--status-critical)" }}>
                    {sel.col}은 문항이 아직 맞물리지 않아 이 그림의 기울기를
                    그대로 믿을 수 없습니다.
                  </span>
                </>
              )}
            </p>
          </>
        ) : featured.length === 0 ? (
          <p className="text-ink-muted py-16 text-center">
            아직 그려 볼 값이 없습니다.
          </p>
        ) : (
          <>
            <p className="text-axis text-ink-muted mb-4">
              볼 만한 조합 {featured.length}개입니다 — 방향이 확정된 것부터, 그
              안에서 관련도가 큰 순. <strong>왼쪽 표에서 칸을 누르면</strong> 그
              하나만 크게 봅니다.
            </p>
            <div className="grid gap-6 sm:grid-cols-2">
              {featured.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setSel({ row: f.row, col: f.col })}
                  /*
                    바탕색을 깔지 않는다. 11 §2 — 바탕은 한 톤, 감싸는 테두리도
                    쓰지 않는다. 넷을 상자로 묶으면 그래프보다 상자가 먼저 보인다.
                    구분은 여백과 제목으로만 한다.
                  */
                  className="-mx-2 rounded-xl px-2 py-1 text-left transition hover:bg-[--wash]"
                >
                  <p className="text-table mb-1 font-medium">
                    {f.row} <span className="text-ink-muted">×</span> {f.col}
                    <span className="tabular text-axis text-ink-secondary ml-2">
                      {formatR(f.cell.r)}
                    </span>
                    <GradeTag r={f.cell.r} ci={f.cell.ci} className="ml-1.5" />
                  </p>
                  <ScatterPlot
                    height={210}
                    points={scatter[f.key] ?? []}
                    trend={trends[f.key] ?? null}
                    xLabel={f.row}
                    yLabel={f.col}
                  />
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {inHouse && (
        <div className="xl:col-span-2">
          <WarningBadge kind="multipleComparison" />
        </div>
      )}
    </div>
  );
}
