"use client";

import { useState } from "react";
import { correlationFill } from "@/components/analysis/correlationColor";
import {
  describeCorrelation,
  isNotable,
  isUncertain,
} from "@/components/analysis/correlationWords";
import { formatShare, shareFull } from "@/components/analysis/share";

export type Relation = {
  scale: string;
  axis: string;
  r: number;
  n: number;
  ci: [number, number];
};

/**
 * 한 번에 보여주는 개수.
 *
 * 셋에서 다섯으로 늘렸다 (2026-10-07 사용자 결정). 대시보드를 다시 짜면서
 * 이 카드가 화면 폭의 2/3를 받는 주인공이 됐다 — 「가장 뚜렷한 관련은
 * 중요한 내용」이라 넘기지 않고도 더 많이 보이게 한다.
 */
const PAGE = 5;

/**
 * 가장 뚜렷한 관련 — 다섯 개씩 두 쪽 (2026-10-07 사용자 결정).
 *
 * 관련이 큰 순서로 열 개를 받아(`lib/admin/dashboard` `TOP_RELATIONS`)
 * 다섯 개씩 넘긴다. 아래에는 `1 / 2`처럼 **쪽 번호**만 적는다.
 *
 * 값은 분석 화면과 같은 모양 `+33% (+0.57)`로 쓴다 — 앞은 관련도를 제곱한
 * 비율(그 능력 점수 차이 가운데 성향과 함께 움직이는 몫), 괄호는 관련도.
 * 막대 길이도 %에 맞춘다. 사람 수와 95% 구간은 뺐다 — 카드 머리줄에
 * 「N명 기준」이 이미 있다. 방향이 아직 확정되지 않은 조합은 옅게 그리고
 * 「아직 확정 아님」만 붙인다.
 */
export function TopRelations({ items }: { items: Relation[] }) {
  const [page, setPage] = useState(0);

  if (items.length === 0)
    return (
      <p className="text-ink-secondary">
        아직 확정된 조합이 없습니다.
      </p>
    );

  const pages = Math.ceil(items.length / PAGE);
  const from = page * PAGE;
  const shown = items.slice(from, from + PAGE);
  // 막대 눈금 — 열 개 중 가장 큰 %를 10% 단위로 올린 값. 두 쪽이 같은 눈금이다
  const full = shareFull(items.map((it) => it.r));

  return (
    <>
      <ul className="flex flex-col">
        {shown.map((it, i) => (
          <li
            key={`${it.scale}-${it.axis}`}
            className="border-b border-(--border) py-2.5 last:border-0"
          >
            {/*
              **막대를 먼저 둔다.** 전에는 문장과 숫자 넷이 줄줄이 있어서
              어느 것이 크고 어느 쪽으로 가는지 다 읽어야 알 수 있었다.
              0을 가운데 둔 막대를 앞에 놓으면 크기와 방향이 먼저 들어오고
              문장은 그 확인이 된다.
            */}
            {/*
              ⚠️ 마지막 칸이 `auto`였다 — **글자 길이에 따라 막대 칸 폭이
              줄마다 달라졌다.** `+0.59 매우 뚜렷함`과 `−0.02 없음`은 길이가
              다르고, 줄마다 자기 격자를 쓰므로 그만큼 막대 칸이 밀린다.
              그래서 **0선이 줄마다 다른 자리에 있었다** (2026-08-26 사용자 지적).
              폭을 못 박아 모든 줄에서 같은 자리에 오게 한다.
            */}
            <div className="grid grid-cols-[1.5rem_7rem_1fr_8.5rem] items-center gap-2 lg:gap-3 xl:grid-cols-[1.5rem_11rem_1fr_8.5rem]">
              <span className="tabular text-ink-muted text-axis text-right">
                {from + i + 1}
              </span>
              <span
                className="text-axis truncate"
                title={`${it.scale} × ${it.axis}`}
              >
                {it.scale}
                <span className="text-ink-muted mx-1">×</span>
                {it.axis}
              </span>
              <MiniBar r={it.r} full={full} uncertain={isUncertain(it.ci)} />
              <span
                className={`tabular text-right whitespace-nowrap ${
                  isNotable(it.r) ? "text-table font-semibold" : "text-axis"
                }`}
                style={{ color: isUncertain(it.ci) ? "var(--ink-secondary)" : undefined }}
              >
                {formatShare(it.r)}
              </span>
            </div>

            <p className="text-axis text-ink-secondary mt-1 pl-[2.25rem] leading-snug">
              {describeCorrelation(it.scale, it.axis, it.r)}
              {isUncertain(it.ci) && (
                <span className="text-ink-muted ml-2">아직 확정 아님</span>
              )}
            </p>
          </li>
        ))}
      </ul>

      {pages > 1 && (
        <div className="text-axis mt-2 flex items-center justify-between">
          <span className="text-ink-muted tabular">
            {page + 1} / {pages}
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

/**
 * 0을 가운데 두고 좌우로. 길이는 **%(관련도의 제곱)** — 옆 숫자와 같은 말을
 * 하게 한다 (2026-10-07). 눈금 끝(`full`)은 열 개 중 가장 큰 %를 올린 값.
 *
 * ## 칸을 눈에 보이게 두른다 (2026-08-26 사용자 요청)
 *
 * 전에는 칠해진 부분만 떠 있고 **어디부터 어디까지가 눈금인지**가 안 보였다.
 * 그래서 **연한 테두리 칸을 먼저 그리고** 그 안에 채운다. 0이 정확히
 * 가운데라는 것이 눈으로 보인다.
 */
function MiniBar({
  r,
  full,
  uncertain,
}: {
  r: number;
  full: number;
  uncertain: boolean;
}) {
  const w = Math.min(50, ((r * r * 100) / full) * 50);
  return (
    <div
      className="relative h-5 rounded-md"
      title={`칸 양 끝은 ±${full}%`}
      style={{
        background: "var(--wash)",
        outline: "1px solid var(--border)",
      }}
    >
      {/* 0선 — 칸 한가운데. 테두리보다 진하게 해서 기준선임을 말한다 */}
      <div
        className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2"
        style={{ background: "var(--ink-muted)" }}
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
