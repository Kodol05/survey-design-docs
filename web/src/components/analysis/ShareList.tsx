"use client";

import { useState } from "react";
import { CHARACTER } from "../charts/scale";
import { formatR } from "./correlationColor";
import { gradeOf, isUncertain } from "./correlationWords";
import { DivergingBar } from "./DivergingBar";
import { ScatterPlot, type Point } from "./ScatterPlot";
import { formatShare, sharePct, shareOf } from "./share";

/**
 * 성향 일곱 축을 **「차이의 몇 %」 순으로** 늘어놓는 목록 (2026-10-07 사용자 결정).
 *
 * 「각 직무능력별 정리」와 「모든 직무능력과 가장 연관된 성향」 두 카드가 같은
 * 줄 모양을 쓴다 — 순위 · 축 이름 · 0을 가운데 둔 막대 · `+15% (+0.39)`.
 * 따로 두었더니 조금씩 어긋났던 일이 있어 한 부품으로 모았다.
 *
 * - 막대 길이는 r²(%)에 비례한다. 눈금 끝(`full`)은 **화면 전체가 하나**를
 *   쓰도록 부르는 쪽이 정해 넘긴다 (`shareFull` 참고).
 * - 등급 말(「뚜렷함」)은 줄에 적지 않는다. %가 크기를 말한다.
 * - 신뢰구간이 0을 걸치는 줄은 막대와 순번을 옅게 둔다.
 * - 줄을 누르면 그 자리에서 점 분포가 열린다.
 */

export type ShareRow = {
  scale: string;
  r: number;
  n: number;
  ci: [number, number];
};

export function ShareList({
  rows,
  full,
  target,
  sentence,
  scatter,
  trends,
  foldNone = false,
}: {
  /** 이미 |r| 큰 순으로 정렬된 줄 */
  rows: ShareRow[];
  /** 막대가 끝까지 차는 % */
  full: number;
  /** 세로축 이름이자 「○○ 차이의 15%」의 ○○ */
  target: string;
  /** 펼친 줄의 한 문장 */
  sentence: (row: ShareRow) => React.ReactNode;
  /** `축이름` → 점. 줄을 눌렀을 때 그린다 */
  scatter?: Record<string, Point[]>;
  trends?: Record<string, { x: number; y: number }[] | null>;
  /**
   * 「없음」(|r| < .10) 줄을 접어 둘지 (2026-08-25 사용자 요청).
   * 능력 하나에 일곱 줄 중 네댓이 「없음」이면 볼 것보다 화면이 길어진다.
   */
  foldNone?: boolean;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const none = foldNone ? rows.filter((r) => gradeOf(r.r) === "없음") : [];
  const shown =
    foldNone && !showAll ? rows.filter((r) => gradeOf(r.r) !== "없음") : rows;

  return (
    <div>
      <ul className="flex flex-col">
        {shown.map((r, i) => {
          const settled = !isUncertain(r.ci);
          const expanded = open === r.scale;
          const toggle = () => setOpen(expanded ? null : r.scale);
          return (
            <li
              key={r.scale}
              className="border-b border-(--border) last:border-0"
            >
              <div
                role="button"
                tabIndex={0}
                aria-expanded={expanded}
                onClick={toggle}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggle();
                  }
                }}
                className={`-mx-2 grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-x-5 gap-y-1 sm:grid-cols-[minmax(0,11rem)_minmax(0,40rem)_8.5rem] rounded-lg px-2 py-2 hover:bg-card-head ${
                  expanded ? "bg-card-head" : ""
                }`}
              >
                <span className="flex items-baseline gap-2">
                  <span
                    className="text-axis text-ink-muted tabular w-4 text-right"
                    style={{ opacity: settled ? 1 : 0.45 }}
                  >
                    {i + 1}
                  </span>
                  <span className="text-table truncate">{r.scale}</span>
                  <span className="text-axis text-ink-muted shrink-0">
                    {(CHARACTER as readonly string[]).includes(r.scale)
                      ? "성격"
                      : "기질"}
                  </span>
                </span>

                {/*
                  막대 칸은 40rem에서 멈춘다 — 카드 폭 끝까지 늘이면 0이 화면 한가운데로
                  밀려 이름과 값 사이를 눈이 한참 건너야 한다. 좁은 화면에서는
                  막대가 이름·값 아래 한 줄을 통째로 쓴다.

                  구간 선은 깔지 않는다 — 신뢰구간은 r 눈금이라 % 막대 아래에
                  두면 길이가 서로 안 맞는다. 확정 여부는 옅기로만 말한다.
                */}
                <span className="order-last col-span-2 sm:order-none sm:col-span-1">
                  <DivergingBar
                    r={shareOf(r.r)}
                    full={full}
                    faded={!settled}
                    height={14}
                  />
                </span>

                <span
                  className="text-table tabular text-right whitespace-nowrap"
                  style={{ color: settled ? undefined : "var(--ink-secondary)" }}
                >
                  {formatShare(r.r)}
                </span>
              </div>

              {expanded && (
                <Detail
                  row={r}
                  target={target}
                  sentence={sentence(r)}
                  points={scatter?.[r.scale] ?? []}
                  trend={trends?.[r.scale] ?? null}
                />
              )}
            </li>
          );
        })}
      </ul>

      {none.length > 0 && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="text-axis text-ink-muted hover:text-ink-secondary mt-2 underline decoration-dotted underline-offset-4"
        >
          {showAll ? "관련 없는 축 접기" : `관련 없는 축 ${none.length}개 더 보기`}
        </button>
      )}
    </div>
  );
}

/**
 * 펼친 줄 — 점 분포와 한 문장, 그 아래 숫자 한 줄.
 *
 * 순위를 읽다가 하나를 들여다보고 돌아오는 흐름이라 **그 줄 자리에서**
 * 열린다. 크게 볼 자리는 맨 위 카드다.
 */
function Detail({
  row,
  target,
  sentence,
  points,
  trend,
}: {
  row: ShareRow;
  target: string;
  sentence: React.ReactNode;
  points: Point[];
  trend: { x: number; y: number }[] | null;
}) {
  const pct = Math.abs(sharePct(row.r));
  return (
    <div className="grid gap-x-8 gap-y-3 px-2 pt-2 pb-5 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:items-center">
      {points.length > 0 ? (
        <ScatterPlot
          height={260}
          points={points}
          trend={trend}
          xLabel={row.scale}
          yLabel={target}
        />
      ) : (
        <p className="text-axis text-ink-muted">그려 볼 점이 없습니다.</p>
      )}

      <div className="flex flex-col gap-1.5 leading-relaxed">
        <p className="text-table">{sentence}</p>
        <p className="text-axis text-ink-muted">
          관련도 <span className="tabular">{formatR(row.r)}</span> · {target}{" "}
          차이의 <span className="tabular">{pct}%</span>
          {isUncertain(row.ci) && " · 방향 아직 확정 아님"}
        </p>
      </div>
    </div>
  );
}
