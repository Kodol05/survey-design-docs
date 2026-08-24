"use client";

import { useState } from "react";
import { correlationFill, formatR } from "@/components/analysis/correlationColor";
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
            className="border-b border-[--border] py-3 last:border-0"
          >
            {/*
              **막대를 먼저 둔다.** 전에는 문장과 숫자 넷이 줄줄이 있어서
              어느 것이 크고 어느 쪽으로 가는지 다 읽어야 알 수 있었다.
              0을 가운데 둔 막대를 앞에 놓으면 크기와 방향이 먼저 들어오고
              문장은 그 확인이 된다.
            */}
            <div className="grid grid-cols-[1.5rem_7rem_1fr_auto] items-center gap-2 lg:gap-3 xl:grid-cols-[1.5rem_11rem_1fr_auto]">
              <span className="tabular text-ink-muted text-axis text-right">
                {from + i + 1}
              </span>
              <span className="text-axis truncate" title={`${it.scale} × ${it.axis}`}>
                {it.scale}
                <span className="text-ink-muted mx-1">×</span>
                {it.axis}
              </span>
              <MiniBar r={it.r} uncertain={isUncertain(it.ci)} />
              <span className="text-axis tabular whitespace-nowrap">
                <strong className={isNotable(it.r) ? "text-table" : undefined}>
                  {formatR(it.r)}
                </strong>
                <span className="text-ink-muted ml-2">{gradeOf(it.r)}</span>
              </span>
            </div>

            <p className="text-axis text-ink-secondary mt-1.5 pl-[2.25rem] leading-snug">
              {describeCorrelation(it.scale, it.axis, it.r)}
              <span className="text-ink-muted ml-2 tabular">
                {it.n}명 · 95% 구간 {formatR(it.ci[0])}~{formatR(it.ci[1])}
              </span>
              {isUncertain(it.ci) && (
                <span className="text-ink-muted ml-2">아직 확정 아님</span>
              )}
            </p>
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

/** 값이 여기까지 가면 막대가 끝까지 찬다. 실제 데이터에서 |r|이 1에 가는 일은 없다 */
const FULL = 0.7;

/** 0을 가운데 두고 좌우로. 순위 탭 막대와 같은 색 언어를 쓴다 */
function MiniBar({ r, uncertain }: { r: number; uncertain: boolean }) {
  const w = Math.min(50, (Math.abs(r) / FULL) * 50);
  return (
    <div className="relative h-4" title={`${formatR(r)}`}>
      <div
        className="absolute inset-y-0 left-1/2 w-px"
        style={{ background: "var(--axis)" }}
      />
      <div
        className="absolute inset-y-1 rounded-sm"
        style={{
          background: correlationFill(r, uncertain),
          left: r < 0 ? `${50 - w}%` : "50%",
          width: `${w}%`,
        }}
      />
    </div>
  );
}
