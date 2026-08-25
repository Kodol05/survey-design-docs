"use client";

import { useState } from "react";
import { CHARACTER } from "../charts/scale";
import { formatR } from "./correlationColor";
import { DivergingBar } from "./DivergingBar";
import { GradeTag } from "./GradeTag";
import { AlphaNote } from "./AlphaNote";
import { ScatterPlot, type Point } from "./ScatterPlot";
import { describeCorrelation, gradeOf, subjectParticle } from "./correlationWords";
import type { ScaleReliability } from "@/lib/admin/analysis";

/**
 * 능력 하나에 대해 **성향 7축을 순위로** (2026-08-25 사용자 요청).
 *
 * ## 위 표와 같은 수치를 쓴다
 *
 * 표를 그린 값을 그대로 정렬해 쓴다 — 새로 계산하지 않으므로 두 화면이
 * 어긋날 일이 없다. 표는 7×3 격자라 「협력 열에서 어느 것이 큰가」를 세로로
 * 훑어야 하는데, 여기는 **이미 순위**다.
 *
 * ## 없는 것은 접어 둔다 (2026-08-25 사용자 요청)
 *
 * 일곱 줄 중 네댓이 「없음」이면 **볼 것이 세 줄인데 화면은 일곱 줄**이다.
 * 관련이 없다는 것도 정보이므로 지우지는 않고 **접는다** — 「더 보기」로
 * 언제든 펼 수 있다.
 *
 *   매우 뚜렷함 · 뚜렷함 · 어느 정도   그대로
 *   약함                              막대를 옅게 (있긴 한데 작다)
 *   없음                              접어 둔다
 *
 * ## α가 낮아도 흐리게 두지 않는다 (2026-08-25 사용자 정정)
 *
 * 한때 α가 기준 아래인 능력의 목록 전체를 `opacity .55`로 눌러 뒀다.
 * **읽을 수가 없었다.** 경고는 열 머리의 `α .08 · 기준 아래`와 화면 맨
 * 아래 유의사항이 이미 하고 있다 — 글자를 안 보이게 하는 것은 경고가
 * 아니라 그냥 불편함이다.
 */

export type AxisRow = {
  scale: string;
  r: number;
  n: number;
  ci: [number, number];
};

export function AxisRanking({
  axis,
  rows,
  reliability,
  scatter,
  trends,
}: {
  axis: string;
  /** 이미 큰 순으로 정렬된 7축 */
  rows: AxisRow[];
  reliability?: ScaleReliability;
  /** `축이름` → 점. 줄을 눌렀을 때 그린다 */
  scatter?: Record<string, Point[]>;
  trends?: Record<string, { x: number; y: number }[] | null>;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const settled = rows.filter((r) => !crosses(r.ci));
  const none = rows.filter((r) => gradeOf(r.r) === "없음");
  const shown = showAll ? rows : rows.filter((r) => gradeOf(r.r) !== "없음");

  return (
    <div>
      <p className="mb-3 flex flex-wrap items-baseline gap-x-3 border-b border-[--border] pb-2">
        <span className="text-section-title">{axis}</span>
        <AlphaNote r={reliability} className="!mt-0 !inline" />
      </p>

      {/* 한 줄 결론 */}
      <p className="text-ink-secondary mb-5 max-w-[52rem] leading-relaxed">
        {settled.length === 0 ? (
          <>
            <strong>뚜렷하게 관련된 축이 아직 없습니다.</strong> 일곱 줄 모두
            방향이 확정되지 않았습니다.
          </>
        ) : (
          <>
            {axis}
            {subjectParticle(axis)} 뚜렷하게 관련된 것은{" "}
            {settled.slice(0, 3).map((r, i) => (
              <span key={r.scale}>
                {i > 0 && ", "}
                <strong className="text-ink">{r.scale}</strong>
                <span className="tabular text-ink-muted"> {formatR(r.r)}</span>
              </span>
            ))}
            입니다
            {settled.length > 3 && ` (그 밖에 ${settled.length - 3}개 더)`}.{" "}
            <span className="text-ink-muted">줄을 누르면 점 분포를 봅니다.</span>
          </>
        )}
      </p>

      <ul className="flex flex-col">
        {shown.map((r, i) => {
          const on = !crosses(r.ci);
          const weak = gradeOf(r.r) === "약함" || gradeOf(r.r) === "없음";
          const expanded = open === r.scale;
          const pts = scatter?.[r.scale] ?? [];
          return (
            <li key={r.scale} className="border-b border-[--border] last:border-0">
              <div
                role="button"
                tabIndex={0}
                aria-expanded={expanded}
                onClick={() => setOpen(expanded ? null : r.scale)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setOpen(expanded ? null : r.scale);
                  }
                }}
                className="-mx-2 grid cursor-pointer grid-cols-[minmax(0,12rem)_minmax(0,1fr)_3.5rem_5rem_1.25rem] items-center gap-x-5 rounded-lg px-2 py-2.5 hover:bg-[--wash]"
              >
                <span className="flex items-baseline gap-2">
                  <span
                    className="text-axis text-ink-muted tabular w-4 text-right"
                    style={{ opacity: on ? 1 : 0.45 }}
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
                  **약한 것은 막대만 옅게.** 숫자와 이름은 그대로 둔다 —
                  「작다」는 말이지 「읽지 말라」는 말이 아니다.
                */}
                <DivergingBar
                  r={r.r}
                  faded={!on || weak}
                  ci={r.ci}
                  height={16}
                />

                <span className="text-table tabular text-right font-medium">
                  {formatR(r.r)}
                </span>

                <GradeTag r={r.r} ci={r.ci} />

                <span aria-hidden className="text-ink-muted text-right">
                  {expanded ? "▾" : "▸"}
                </span>
              </div>

              {expanded && (
                <Detail
                  scale={r.scale}
                  axis={axis}
                  row={r}
                  points={pts}
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
          className="text-axis text-ink-muted mt-3 underline"
        >
          {showAll
            ? "관련 없는 축 접기"
            : `관련 없는 축 ${none.length}개 더 보기`}
        </button>
      )}
    </div>
  );
}

/**
 * 한 줄을 펼쳤을 때 — **점 분포와 짧은 해설.**
 *
 * 위 상관표에서 칸을 눌렀을 때 나오는 것과 **같은 그림**이다. 다만 화면
 * 위쪽으로 올라가지 않고 **그 줄 자리에서** 열린다 (구성원 목록과 같은
 * 방식) — 순위를 읽다가 하나를 들여다보고 다시 순위로 돌아오는 흐름이라
 * 자리를 옮기면 읽던 곳을 잃는다.
 *
 * 크게 그리지 않는다. 여기는 **곁눈질하는 자리**이고, 크게 볼 자리는 위
 * 상관표다.
 */
function Detail({
  scale,
  axis,
  row,
  points,
  trend,
}: {
  scale: string;
  axis: string;
  row: AxisRow;
  points: Point[];
  trend: { x: number; y: number }[] | null;
}) {
  const uncertain = crosses(row.ci);
  return (
    <div className="grid gap-x-8 gap-y-4 px-2 pb-6 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:items-center">
      <div>
        {points.length > 0 ? (
          <ScatterPlot
            height={260}
            points={points}
            trend={trend}
            xLabel={scale}
            yLabel={axis}
          />
        ) : (
          <p className="text-axis text-ink-muted">그려 볼 점이 없습니다.</p>
        )}
      </div>

      <div className="text-axis text-ink-secondary flex flex-col gap-2 leading-relaxed">
        <p className="text-table text-ink">
          {describeCorrelation(scale, axis, row.r)}
        </p>
        <p>
          점 하나가 한 사람입니다 (<span className="tabular">{row.n}</span>명).
          마우스를 올리면 누구인지 나옵니다. 선은 전체 흐름입니다.
        </p>
        <p className="text-ink-muted">
          95% 구간 <span className="tabular">{formatR(row.ci[0])}</span>~
          <span className="tabular">{formatR(row.ci[1])}</span>
          {uncertain
            ? " — 0을 지나가므로 방향이 아직 확정된 것이 아닙니다."
            : " — 0을 벗어나므로 방향은 확정입니다."}
        </p>
      </div>
    </div>
  );
}

const crosses = (ci: [number, number]) => ci[0] <= 0 && ci[1] >= 0;
