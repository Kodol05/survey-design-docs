"use client";

import { useState } from "react";
import { formatR } from "@/components/analysis/correlationColor";
import {
  describeCorrelation,
  gradeOf,
  isNotable,
  isUncertain,
} from "@/components/analysis/correlationWords";

export type Relation = {
  scale: string;
  axis: string;
  r: number;
  n: number;
  ci: [number, number];
};

/** 한 번에 보여주는 개수. 대시보드 한 칸에 들어가는 만큼만. */
const PAGE = 3;

/**
 * 가장 뚜렷한 관련 — 세 개씩 넘겨 본다.
 *
 * 전에는 상위 세 개에서 끊었다. 그런데 넷째가 셋째와 거의 같은 값인 경우가
 * 있어서, **끊긴 자리가 어디인지 모르면 셋이 특별해 보인다.** 실제로는
 * 그냥 위에서 셋일 뿐이다. 넘겨 볼 수 있게 해서 `4 / 9`처럼 전체 중 몇 번째인지
 * 같이 보이게 한다.
 *
 * ⚠️ 여기 오는 것은 **신뢰구간이 0을 벗어난 조합만**이다. 그 걸러내기는
 *    서버에서 이미 끝났다. 이 컴포넌트는 순서와 쪽만 다룬다.
 */
export function TopRelations({ items }: { items: Relation[] }) {
  const [page, setPage] = useState(0);

  if (items.length === 0)
    return (
      <p className="text-ink-secondary">
        신뢰구간이 0을 벗어나는 조합이 아직 없습니다. 사람이 더 모여야 합니다.
      </p>
    );

  const pages = Math.ceil(items.length / PAGE);
  const from = page * PAGE;
  const shown = items.slice(from, from + PAGE);

  return (
    <>
      <ul className="flex flex-col">
        {shown.map((it, i) => (
          <li
            key={`${it.scale}-${it.axis}`}
            className="flex gap-3 border-b border-[--border] py-3 last:border-0"
          >
            <span className="tabular text-ink-muted text-table w-5 shrink-0 pt-0.5 text-right">
              {from + i + 1}
            </span>
            <div className="flex flex-col gap-1">
              <p className="leading-snug">
                {describeCorrelation(it.scale, it.axis, it.r)}
              </p>
              <p className="text-axis text-ink-muted flex flex-wrap items-baseline gap-x-3">
                <span
                  className={isNotable(it.r) ? "font-medium" : undefined}
                  style={{ color: isNotable(it.r) ? "var(--ink-secondary)" : undefined }}
                >
                  {gradeOf(it.r)}
                  {isUncertain(it.ci) && (
                    <span className="text-ink-muted ml-1">아직 확정 아님</span>
                  )}
                </span>
                <span className="tabular">{it.n}명</span>
                <span className="tabular" title="두 값이 함께 움직인 정도. −1에서 +1 사이">
                  관련도 {formatR(it.r)}
                </span>
                <span
                  className="tabular"
                  title="사람이 바뀌어도 이 범위 안에 들어올 것으로 보는 구간"
                >
                  95% 구간 {formatR(it.ci[0])}~{formatR(it.ci[1])}
                </span>
              </p>
            </div>
          </li>
        ))}
      </ul>

      {pages > 1 && (
        <div className="text-axis mt-3 flex items-center justify-between">
          <span className="text-ink-muted tabular">
            {from + 1}–{Math.min(from + PAGE, items.length)} / {items.length}
          </span>
          <span className="flex gap-2">
            <PageButton onClick={() => setPage(page - 1)} disabled={page === 0}>
              이전
            </PageButton>
            <PageButton
              onClick={() => setPage(page + 1)}
              disabled={page >= pages - 1}
            >
              다음
            </PageButton>
          </span>
        </div>
      )}
    </>
  );
}

function PageButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-md px-3 py-1 disabled:cursor-default"
      style={{
        background: disabled ? "transparent" : "var(--wash)",
        color: disabled ? "var(--ink-muted)" : "var(--ink-secondary)",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  );
}
