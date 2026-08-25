"use client";

import Link from "next/link";
import { useState } from "react";
import { ScatterPlot } from "@/components/analysis/ScatterPlot";
import { formatR } from "@/components/analysis/correlationColor";
import { GradeTag } from "@/components/analysis/GradeTag";
import type { RatingCompare } from "@/lib/admin/ratingCompare";

/** 이만큼 벌어지면 「갈렸다」고 본다. 100점 눈금 */
const NOTABLE = 15;

/**
 * 본인 답 ↔ 대표님 평가 대조 (Task 31).
 *
 * 축을 골라 보되, **사람 목록은 늘 아래에 둔다.** 상관계수 하나로는
 * "누구를 봐야 하나"에 답할 수 없다. 이 화면의 답은 이름이다.
 */
export function AgreementPanel({ data }: { data: RatingCompare }) {
  const [axis, setAxis] = useState(data.axes[0]?.axis ?? "");
  const cur = data.axes.find((a) => a.axis === axis) ?? data.axes[0];
  if (!cur) return null;

  const notable = data.gaps.filter((g) => g.worst >= NOTABLE);

  return (
    <div>
      <div className="text-axis mb-8 flex flex-wrap items-center gap-1.5">
        <span className="text-ink-muted mr-1">직무능력</span>
        {data.axes.map((a) => (
          <button
            key={a.axis}
            type="button"
            onClick={() => setAxis(a.axis)}
            className="rounded-md px-3 py-1.5"
            style={{
              background: a.axis === cur.axis ? "var(--ink)" : "var(--wash)",
              color: a.axis === cur.axis ? "var(--page)" : "var(--ink-secondary)",
              fontWeight: a.axis === cur.axis ? 600 : 400,
            }}
          >
            {a.axis}
            <span className="tabular ml-2">{formatR(a.corr.r)}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-12 xl:grid-cols-[minmax(0,34rem)_minmax(0,1fr)]">
        <div>
          <div className="mb-1 flex flex-wrap items-baseline gap-x-3">
            <h3 className="text-section-title">{cur.axis}</h3>
            <span className="text-table">
              <span className="tabular">{formatR(cur.corr.r)}</span>
              <GradeTag r={cur.corr.r} ci={cur.corr.ci} className="ml-2" />
              <span className="tabular text-axis text-ink-muted ml-2">
                n={cur.corr.n} · {formatR(cur.corr.ci[0])}~{formatR(cur.corr.ci[1])}
              </span>
            </span>
          </div>
          <p className="text-axis text-ink-muted mb-3">
            <strong>대각선은 두 값이 똑같다는 선</strong>입니다. 위에 있으면 대표님이
            더 높게, 아래면 본인이 더 높게 본 사람입니다.
          </p>

          <ScatterPlot
            height={460}
            points={cur.points.map((p) => ({
              id: p.id,
              name: `${p.name} · 본인 ${Math.round(p.self)} → 대표님 ${Math.round(p.boss)}`,
              x: p.self,
              y: p.boss,
              quality: "ok",
            }))}
            trend={null}
            guides={[
              {
                points: [
                  { x: 0, y: 0 },
                  { x: 100, y: 100 },
                ],
                color: "var(--ink-muted)",
                dashed: true,
              },
            ]}
            xLabel="본인 답"
            yLabel="대표님 평가"
          />

          <p className="text-axis text-ink-muted mt-3">
            대표님 평가가 본인 답보다 평균{" "}
            <strong className="tabular">
              {cur.meanShift >= 0 ? "+" : "−"}
              {Math.abs(cur.meanShift).toFixed(1)}점
            </strong>{" "}
            {cur.meanShift >= 0 ? "높습니다" : "낮습니다"}. 이건 누가 맞았는지가 아니라{" "}
            <strong>두 자의 눈금이 다르다</strong>는 뜻에 가깝습니다.
          </p>
        </div>

        <div>
          <h3 className="text-section-title mb-1">갈리는 사람</h3>
          <p className="text-axis text-ink-muted mb-4">
            한 축이라도 <span className="tabular">{NOTABLE}</span>점 넘게 벌어진 사람{" "}
            <strong className="text-ink tabular">{notable.length}</strong>명 · 전체{" "}
            <span className="tabular">{data.n}</span>명
          </p>

          {notable.length === 0 ? (
            <p className="text-ink-secondary">
              크게 갈리는 사람이 없습니다. 본인 답과 대표님이 보시는 것이 대체로
              맞았다는 뜻입니다.
            </p>
          ) : (
            <ul className="flex flex-col">
              {notable.map((g) => (
                <li
                  key={g.employeeId}
                  className="border-b border-[--border] py-3 last:border-0"
                >
                  <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3">
                    <Link
                      href={`/admin/employees/${g.employeeId}`}
                      className="text-table underline"
                    >
                      {g.name}
                    </Link>
                    <span className="text-axis text-ink-muted">
                      {g.meanGap >= 0 ? "대표님이 더 높게" : "본인이 더 높게"}
                    </span>
                  </div>
                  <ul className="flex flex-col gap-1">
                    {g.byAxis.map((a) => (
                      <li
                        key={a.axis}
                        className="text-axis grid grid-cols-[6rem_1fr_5rem] items-center gap-3"
                      >
                        <span className="text-ink-secondary truncate">{a.axis}</span>
                        <GapBar gap={a.gap} />
                        <span className="tabular text-ink-muted text-right">
                          {Math.round(a.self)} → {Math.round(a.boss)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

/** 0을 가운데 두고 좌우로. 오른쪽이면 대표님이 더 높게 보신 것 */
function GapBar({ gap }: { gap: number }) {
  const FULL = 50;
  // 시작점과 폭에 같은 값을 쓴다 — 다르게 쓰면 작은 음수에서 가운데를 넘어간다
  const w = Math.max(1.6, Math.min(50, (Math.abs(gap) / FULL) * 50));
  const big = Math.abs(gap) >= NOTABLE;
  return (
    <span className="relative block h-3" title={`${gap >= 0 ? "+" : "−"}${Math.abs(Math.round(gap))}점`}>
      <span
        className="absolute inset-y-0 left-1/2 w-px"
        style={{ background: "var(--ink)", opacity: 0.3 }}
      />
      <span
        className="absolute inset-y-0 rounded-sm"
        style={{
          left: gap < 0 ? `${50 - w}%` : "50%",
          width: `${w}%`,
          background: gap < 0 ? "var(--diverge-neg)" : "var(--diverge-pos)",
          opacity: big ? 1 : 0.4,
        }}
      />
    </span>
  );
}
