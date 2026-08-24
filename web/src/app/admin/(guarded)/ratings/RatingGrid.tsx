"use client";

import { useState, useTransition } from "react";
import { rate } from "./actions";
import { RATING } from "@/lib/admin/abilitySource";
import { ABILITY_AXES } from "@/lib/items/types";

export type RatingRow = {
  id: string;
  name: string;
  /** 축 이름 → 1~10. 아직 안 매긴 축은 없다 */
  scores: Record<string, number>;
};

const STEPS = Array.from(
  { length: RATING.max - RATING.min + 1 },
  (_, i) => RATING.min + i,
);

/**
 * 대표님 평가 입력 — 한 사람당 세 축, 1~10.
 *
 * ## 저장 버튼을 두지 않는다
 *
 * 44명 × 3칸 = 132칸이다. 마지막에 한 번 저장하게 하면 중간에 창을 닫는
 * 순간 다 날아간다. **누르는 즉시 저장**하고, 저장된 것은 색으로 남는다.
 *
 * ## 숫자를 그대로 늘어놓는다
 *
 * 슬라이더를 쓰면 손이 미끄러진 값과 고른 값이 구분되지 않는다. 1~10은
 * 버튼 열 개로 다 보이는 수라 굳이 줄일 이유가 없다.
 */
export function RatingGrid({ rows, locked }: { rows: RatingRow[]; locked: boolean }) {
  return (
    <ul className="flex flex-col">
      {rows.map((r) => (
        <li
          key={r.id}
          className="grid items-center gap-x-8 gap-y-3 border-b border-[--border] py-5 lg:grid-cols-[12rem_1fr]"
        >
          <span className="text-table font-medium">{r.name}</span>
          <div className="flex flex-col gap-2">
            {ABILITY_AXES.map((axis) => (
              <AxisRow
                key={axis}
                employeeId={r.id}
                axis={axis}
                initial={r.scores[axis]}
                locked={locked}
              />
            ))}
          </div>
        </li>
      ))}
    </ul>
  );
}

function AxisRow({
  employeeId,
  axis,
  initial,
  locked,
}: {
  employeeId: string;
  axis: string;
  initial: number | undefined;
  locked: boolean;
}) {
  const [score, setScore] = useState(initial);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  const pick = (v: number) => {
    const before = score;
    setScore(v); // 눌린 것이 바로 보여야 한다. 실패하면 되돌린다
    setError(undefined);
    start(async () => {
      const res = await rate(employeeId, axis, v);
      if (res?.error) {
        setScore(before);
        setError(res.error);
      }
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <span className="text-axis text-ink-secondary w-24 shrink-0">{axis}</span>
      <div className="flex gap-1" style={{ opacity: pending ? 0.6 : 1 }}>
        {STEPS.map((v) => {
          const on = score === v;
          return (
            <button
              key={v}
              type="button"
              disabled={locked}
              onClick={() => pick(v)}
              aria-pressed={on}
              aria-label={`${axis} ${v}점`}
              className="tabular text-axis size-10 rounded-md disabled:cursor-default"
              style={{
                background: on ? "var(--series-1)" : "var(--wash)",
                color: on ? "#fff" : "var(--ink-secondary)",
                fontWeight: on ? 600 : 400,
                opacity: locked ? 0.5 : 1,
              }}
            >
              {v}
            </button>
          );
        })}
      </div>
      {score === undefined ? (
        <span className="text-axis text-ink-muted">아직 안 매김</span>
      ) : null}
      {error && (
        <span className="text-axis" style={{ color: "var(--status-critical)" }}>
          {error}
        </span>
      )}
    </div>
  );
}
