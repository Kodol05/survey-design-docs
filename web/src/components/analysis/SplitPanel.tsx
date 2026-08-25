"use client";

import { useState } from "react";
import { CHARACTER } from "../charts/scale";
import { subjectParticle } from "./correlationWords";
import { DivergingBar } from "./DivergingBar";
import { ScatterPlot, type Point } from "./ScatterPlot";
import type { Split } from "@/lib/admin/split";

/**
 * 축이 높은 무리와 낮은 무리를 갈라, **직무능력 평균이 몇 점 차이인지**.
 *
 * ## 위 절과 같은 모양으로 (2026-08-25 사용자 정정)
 *
 * 한때 여기에 점 두 개를 선으로 잇는 덤벨 그림을 썼다. 점수 눈금 위에 두
 * 무리를 찍는 방식이라 그 자체로는 정확했는데, **바로 위 「능력마다」 절과
 * 모양이 달라서** 두 화면이 머릿속에서 이어지지 않았다.
 *
 * 지금은 위 절과 **같은 줄 모양**을 쓴다 — 순위 · 축 이름 · 0을 가운데 둔
 * 막대 · 숫자 · 방향. 다른 것은 **눈금뿐이다**: 위는 상관계수, 여기는
 * 점수 차이. 그 차이는 숫자에 「점」을 붙여 말한다.
 *
 * ## 막대 길이는 이 목록 안에서만 견준다
 *
 * 점수 차이에는 상관의 `.7` 같은 자연스러운 상한이 없다. 그래서 이 목록의
 * **가장 큰 값**에 맞춰 눈금을 잡는다 — 목록 안에서 서로 견주는 데는
 * 충분하고, 밖의 숫자와 견줄 일은 없다. 차이가 다 작을 때 막대가 과장되지
 * 않도록 최소 눈금을 둔다.
 */

/** 눈금 최소 폭(점) */
const MIN_FULL = 10;

export function SplitList({
  splits,
  scatter,
  trends,
  target = "직무능력 평균",
}: {
  splits: Split[];
  /** `축이름` → 점. 줄을 눌렀을 때 그린다 */
  scatter?: Record<string, Point[]>;
  trends?: Record<string, { x: number; y: number }[] | null>;
  /** 세로축 이름 */
  target?: string;
}) {
  const [open, setOpen] = useState<string | null>(null);

  if (splits.length === 0)
    return (
      <p className="text-ink-muted text-axis">
        아직 갈라 볼 만큼 모이지 않았습니다.
      </p>
    );

  const full = Math.max(MIN_FULL, ...splits.map((s) => Math.abs(s.diff)));

  return (
    <ul className="flex flex-col">
      {splits.map((s, i) => {
        const expanded = open === s.scale;
        return (
          <li key={s.scale} className="border-b border-[--border] last:border-0">
          <div
            role="button"
            tabIndex={0}
            aria-expanded={expanded}
            onClick={() => setOpen(expanded ? null : s.scale)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setOpen(expanded ? null : s.scale);
              }
            }}
            className="-mx-2 grid cursor-pointer grid-cols-[minmax(0,12rem)_minmax(0,1fr)_4rem_7rem_1.25rem] items-center gap-x-5 rounded-lg px-2 py-2.5 hover:bg-[--wash]"
          >
            <span className="flex items-baseline gap-2">
              <span
                className="text-axis text-ink-muted tabular w-4 text-right"
                style={{ opacity: s.settled ? 1 : 0.45 }}
              >
                {i + 1}
              </span>
              <span className="text-table truncate">{s.scale}</span>
              <span className="text-axis text-ink-muted shrink-0">
                {(CHARACTER as readonly string[]).includes(s.scale)
                  ? "성격"
                  : "기질"}
              </span>
            </span>

            {/*
              **위 절과 똑같은 막대를 쓴다.** 눈금만 다르다 — 저기는 상관,
              여기는 점수 차이. 레일까지 같이 오므로 0이 어디인지가 보인다.
            */}
            <DivergingBar
              r={s.diff}
              full={full}
              faded={!s.settled}
              height={16}
              title={`높은 무리 ${Math.round(s.upperMean)}점 · 낮은 무리 ${Math.round(s.lowerMean)}점`}
            />

            <span className="text-table tabular text-right font-medium">
              {Math.round(s.diff) === 0 ? "" : s.diff > 0 ? "+" : "−"}
              {Math.abs(Math.round(s.diff))}점
            </span>

            <span
              className="text-axis text-ink-secondary"
              style={{ opacity: s.settled ? 1 : 0.6 }}
            >
              {/* 0이면 방향이 없다. 「높을수록」이라 적으면 없는 방향을 만든다 */}
              {Math.round(s.diff) === 0 ? (
                "—"
              ) : (
                <>
                  {s.diff > 0 ? "높을수록" : "낮을수록"}
                  {!s.settled && <span aria-hidden> ?</span>}
                </>
              )}
            </span>

            <span aria-hidden className="text-ink-muted text-right">
              {expanded ? "▾" : "▸"}
            </span>
          </div>

          {expanded && (
            <SplitDetail
              s={s}
              target={target}
              points={scatter?.[s.scale] ?? []}
              trend={trends?.[s.scale] ?? null}
            />
          )}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * 한 줄을 펼쳤을 때 — **점 분포와 짧은 해설.**
 *
 * 위 절과 같은 방식이다. 다만 세로축이 능력 하나가 아니라 **세 능력의
 * 평균**이라, 점 하나가 「그 사람의 평균」이다.
 *
 * 무리를 갈라 본 값(위 막대)과 점 전체(이 그림)는 **같은 데이터를 다르게
 * 본 것**이다. 막대는 양끝 3분의 1만 쓰고, 점은 다 쓴다.
 */
function SplitDetail({
  s,
  target,
  points,
  trend,
}: {
  s: Split;
  target: string;
  points: Point[];
  trend: { x: number; y: number }[] | null;
}) {
  return (
    <div className="grid gap-x-8 gap-y-4 px-2 pb-6 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:items-center">
      <div>
        {points.length > 0 ? (
          <ScatterPlot
            height={260}
            points={points}
            trend={trend}
            xLabel={s.scale}
            yLabel={target}
          />
        ) : (
          <p className="text-axis text-ink-muted">그려 볼 점이 없습니다.</p>
        )}
      </div>

      <div className="text-axis text-ink-secondary flex flex-col gap-2 leading-relaxed">
        <p className="text-table text-ink">
          {s.scale}
          {subjectParticle(s.scale)} {s.diff >= 0 ? "높은" : "낮은"} 쪽{" "}
          <span className="tabular">
            {Math.round(s.diff >= 0 ? s.upperMean : s.lowerMean)}점
          </span>
          , 반대쪽{" "}
          <span className="tabular">
            {Math.round(s.diff >= 0 ? s.lowerMean : s.upperMean)}점
          </span>
        </p>
        <p>
          점 하나가 한 사람의 <strong>{target}</strong>입니다. 막대는 양끝{" "}
          <span className="tabular">{s.groupN}</span>명씩만 견준 것이고, 이
          그림은 <strong>전부</strong>를 그립니다.
        </p>
        <p className="text-ink-muted">
          차이의 95% 구간{" "}
          <span className="tabular">
            {s.ci[0] >= 0 ? "+" : "−"}
            {Math.abs(s.ci[0]).toFixed(1)}
          </span>
          ~
          <span className="tabular">
            {s.ci[1] >= 0 ? "+" : "−"}
            {Math.abs(s.ci[1]).toFixed(1)}
          </span>
          점
          {s.settled
            ? " — 0을 벗어나므로 방향은 확정입니다."
            : " — 0을 지나가므로 방향이 아직 확정된 것이 아닙니다."}
        </p>
      </div>
    </div>
  );
}

/**
 * 위에서 셋을 **문장으로** 말한다 (2026-08-25 사용자 요청).
 *
 * 「연대감이 높으면 직무능력 평균이 가장 높았습니다 — 56점 대 47점, 9점
 * 차이.」 이렇게 옮겨 적을 수 있는 말이 나와야 회의에서 쓸 수 있다.
 *
 * ⚠️ **확정된 것만 순위로 말한다.** 구간이 0을 걸치는 축을 「세 번째」라고
 *    부르면 없는 순서를 만드는 셈이다.
 */
export function SplitHeadline({ splits }: { splits: Split[] }) {
  const settled = splits.filter((s) => s.settled).slice(0, 3);
  const ORD = ["가장", "두 번째로", "세 번째로"];

  if (settled.length === 0)
    return (
      <p className="text-item text-ink-secondary max-w-[52rem] leading-relaxed">
        아직 <strong>방향이 확정된 축이 없습니다.</strong> 무리마다{" "}
        <span className="tabular">{splits[0]?.groupN ?? 0}</span>명 안팎이라 이
        정도 차이는 관계가 없어도 나옵니다.
      </p>
    );

  return (
    <ol className="text-item flex max-w-[52rem] flex-col gap-2">
      {settled.map((s, i) => (
        <li key={s.scale} className="text-ink-secondary leading-relaxed">
          {/* 받침 없는 이름에서 「위험회피이」가 되지 않게 (D-76) */}
          <strong className="text-ink">
            {s.scale}
            {subjectParticle(s.scale)} {s.diff >= 0 ? "높으면" : "낮으면"}
          </strong>{" "}
          직무능력 평균이 <strong>{ORD[i]} 높았습니다</strong> —{" "}
          <span className="tabular">
            {Math.round(s.diff >= 0 ? s.upperMean : s.lowerMean)}점
          </span>{" "}
          대{" "}
          <span className="tabular">
            {Math.round(s.diff >= 0 ? s.lowerMean : s.upperMean)}점
          </span>
          , <strong className="tabular">{Math.abs(Math.round(s.diff))}점</strong>{" "}
          차이.
        </li>
      ))}
      {settled.length < 3 && (
        <li className="text-axis text-ink-muted">
          나머지 축은 아직 방향이 확정되지 않아 순위를 매기지 않았습니다.
        </li>
      )}
    </ol>
  );
}
