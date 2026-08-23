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
}: {
  rows: string[];
  cols: string[];
  cells: Record<string, Cell>;
  scatter: Record<string, Point[]>;
  trends: Record<string, { x: number; y: number }[] | null>;
  inHouse: boolean;
}) {
  const firstValue = Object.entries(cells).find(([, c]) => c.kind === "value")?.[0];
  const [sel, setSel] = useState<Selected>(
    firstValue ? { row: firstValue.split("|")[0], col: firstValue.split("|")[1] } : null,
  );

  const k = sel ? `${sel.row}|${sel.col}` : "";
  const cell = sel ? cells[k] : undefined;
  const points = sel ? (scatter[k] ?? []) : [];

  return (
    <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div>
        <CorrelationTable
          rows={rows}
          cols={cols}
          cell={(r, c) => cells[`${r}|${c}`] ?? { kind: "unstudied" }}
          selected={sel}
          onSelect={inHouse ? setSel : undefined}
        />
        <CorrelationLegend inHouse={inHouse} />
      </div>

      <div>
        {!inHouse ? (
          <div className="text-ink-secondary flex h-full items-center">
            <p className="max-w-[26rem]">
              이 표는 논문에서 나온 값이라 우리 직원의 점 분포가 없습니다. 옆 탭의 우리
              회사 데이터에서는 칸을 누르면 실제 점을 볼 수 있습니다.
            </p>
          </div>
        ) : !sel || cell?.kind !== "value" ? (
          <p className="text-ink-muted py-16 text-center">
            왼쪽 표에서 칸을 누르면 그 조합의 점 분포가 여기 나옵니다.
          </p>
        ) : (
          <>
            <div className="mb-3 flex items-baseline gap-3">
              <h3 className="font-medium">
                {sel.row} × {sel.col}
              </h3>
              <span className="tabular text-table">
                {formatR(cell.r)}
                <span className="text-ink-muted ml-2">
                  n={cell.n} · {formatR(cell.ci[0])}~{formatR(cell.ci[1])}
                </span>
              </span>
            </div>
            <ScatterPlot
              points={points}
              trend={trends[k] ?? null}
              xLabel={sel.row}
              yLabel={sel.col}
            />
            <p className="text-axis text-ink-muted mt-2">
              점 하나가 한 사람입니다. 마우스를 올리면 누구인지 나옵니다.
            </p>
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
