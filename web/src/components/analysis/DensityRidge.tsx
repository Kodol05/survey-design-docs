"use client";

import { useMemo, useState } from "react";
import type { Spread } from "@/lib/admin/spread";
import { densityCurve, sliceCurve, type Curve } from "@/lib/admin/density";

/**
 * 축마다 한 줄씩 쌓은 **언덕 그림** (2026-10-07 사용자 결정).
 *
 * 점 쌓기(DotStrip)를 이것으로 바꾸었다. 물음은 둘이었다 — 「사람이 어디에
 * 몰려 있나」와 「가운데가 어디인가」. 점 쌓기는 4점 칸에 따라 모양이
 * 들쭉날쭉해서 첫 물음에 바로 답하지 못했다. 언덕은 봉우리가 곧 답이다.
 *
 * ## 한 사람은 눈금으로 남긴다
 *
 * 곡선만 두면 마흔 명이 사라진다. 곡선 아래 바닥에 사람마다 가는 눈금을
 * 하나씩 긋고, 마우스를 올리면 「이름 · 점수」가 뜬다. 이름을 글로 박아
 * 두지는 않는다 — 성향에는 좋고 나쁨이 없는데 이름을 끝자리에 적어 두면
 * 그 약속이 깨진다.
 *
 * ## 줄마다 봉우리 높이를 맞춘다
 *
 * 줄마다 가장 높은 곳이 줄 높이의 약 90%에 닿게 늘린다. 밀도 그대로 그리면
 * 좁게 모인 축은 솟고 넓게 퍼진 축은 바닥에 깔려서 모양을 읽을 수 없다.
 * 그래서 **줄끼리 높이를 견주면 안 된다** — 퍼진 정도는 폭(가로)으로 본다.
 *
 * ## 색
 *
 * 곡선은 성향 줄이 `--series-1`, 직무능력 줄(과 세 능력 평균)이 직무능력
 * 색(`--ability-*`)이다. 두 무리가 다른 잣대라는 것을 색으로만 가른다.
 *
 * 눈금은 **값마다 색을 바꾸지 않고 중립색 하나**로 둔다. 자리가 이미 값을
 * 말하는데 색까지 값을 따라 바뀌면 같은 말을 두 번 하는 셈이고, 성향 쪽은
 * 양쪽으로 갈라지는 색이라 다시 색 열쇠가 필요해진다(그 문장을 지웠다).
 * 곡선 색 위에 또 다른 색이 얹히지 않아야 언덕이 먼저 읽힌다.
 *
 * ## 그리는 방식
 *
 * 곡선·선은 줄마다 SVG 하나에 `viewBox` 가로 0~100(=점수)으로 그리고
 * 가로로만 늘린다(`preserveAspectRatio="none"`). 선 굵기는
 * `vector-effect`로 늘어나지 않게 막는다. **글자는 SVG 밖 HTML에** 둔다 —
 * SVG 안에 두면 화면 폭에 따라 글자가 같이 늘어나거나 줄어든다.
 */

export type RidgeRow = { s: Spread; dim: boolean };
export type RidgeGroup = { key: string; label?: string; rows: RidgeRow[] };

/** 줄 높이(px). viewBox 세로도 같은 값이라 세로 단위가 곧 px다 */
const ROW_H = 76;
/** 곡선 바닥선 */
const BASE = 56;
/** 봉우리 높이 — 바닥선에서 위로 (줄 높이의 약 90% 자리까지) */
const PEAK_H = 50;
/** 눈금(러그) 띠 — 바닥선 아래 */
const RUG_TOP = 60;
const RUG_BOTTOM = 70;
/** 눈금 하나가 마우스를 받는 폭의 반 (점수 단위) */
const HIT_HALF = 2.5;

const TICKS = [0, 25, 50, 75, 100];

const TONE = {
  trait: {
    fill: "var(--series-1)",
    stroke: "var(--series-1)",
  },
  ability: {
    fill: "var(--ability-65)",
    stroke: "var(--ability-100)",
  },
} as const;

/** 눈금 밖 값(있으면 안 되지만)도 그림 안에 머물게 */
const inside = (v: number) => Math.max(0, Math.min(100, v));
const pct = (v: number) => `${inside(v)}%`;

export function DensityRidge({
  groups,
  label,
}: {
  groups: RidgeGroup[];
  /** 그림 전체 이름 — 읽기 도구가 맨 앞에 읽는다 */
  label: string;
}) {
  const [hover, setHover] = useState<{ scale: string; at: number } | null>(
    null,
  );

  const rows = groups.flatMap((g) => g.rows);
  const aria = `${label}. ${rows
    .map(
      ({ s }) =>
        `${s.scale} ${s.n}명, 중앙값 ${Math.round(s.median)}, 가운데 절반 ${Math.round(
          s.q1,
        )}에서 ${Math.round(s.q3)}`,
    )
    .join(". ")}.`;

  return (
    <div
      role="img"
      aria-label={aria}
      className="[--label-w:7rem] sm:[--label-w:9.5rem]"
    >
      <div className="relative">
        {/* 세로 격자 — 줄을 가로질러 이어지도록 줄 밖에 한 번만 긋는다 */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 left-(--label-w)"
        >
          {TICKS.map((t) => (
            <span
              key={t}
              className="absolute inset-y-0 w-px"
              style={{ left: `${t}%`, background: "var(--grid)" }}
            />
          ))}
        </div>

        {groups.map((g, gi) => (
          <div key={g.key}>
            {g.label && (
              <div className="relative grid grid-cols-[var(--label-w)_minmax(0,1fr)]">
                <p
                  className={`text-axis text-ink-muted pb-1 ${gi === 0 ? "" : "pt-4"}`}
                >
                  {g.label}
                </p>
              </div>
            )}
            {g.rows.map((r) => (
              <Ridge
                key={r.s.scale}
                row={r}
                hoverAt={hover?.scale === r.s.scale ? hover.at : null}
                onHover={(at) =>
                  setHover(at === null ? null : { scale: r.s.scale, at })
                }
              />
            ))}
          </div>
        ))}
      </div>

      {/* 하나뿐인 가로 눈금 */}
      <div className="grid grid-cols-[var(--label-w)_minmax(0,1fr)]">
        <span />
        <div className="text-axis text-ink-muted tabular relative mt-1 h-6">
          {TICKS.map((t) => (
            <span
              key={t}
              className="absolute top-0 -translate-x-1/2"
              style={{ left: `${t}%` }}
            >
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function Ridge({
  row: { s, dim },
  hoverAt,
  onHover,
}: {
  row: RidgeRow;
  /** 지금 마우스가 올라간 눈금 묶음의 점수 (없으면 null) */
  hoverAt: number | null;
  onHover: (at: number | null) => void;
}) {
  const tone = s.kind === "ability" ? TONE.ability : TONE.trait;
  const curve = useMemo(() => densityCurve(s.dots.map((d) => d.value)), [s]);

  /*
    눈금 묶음 — **반올림한 점수가 같은 사람은 한 묶음**으로 마우스를 받는다.
    한 자리에 두셋이 겹치면 맨 위 눈금 하나만 이름을 보여 주게 되므로,
    같은 자리의 이름을 함께 띄운다. 마우스를 받는 폭은 옆 묶음과의
    한가운데까지(최대 ±2.5점) — 가는 눈금을 정확히 겨누지 않아도 된다.
  */
  const bunches = useMemo(() => {
    const m = new Map<number, string[]>();
    for (const d of s.dots) {
      const k = Math.max(0, Math.min(100, Math.round(d.value)));
      m.set(k, [...(m.get(k) ?? []), d.name]);
    }
    const list = [...m.entries()].sort((a, b) => a[0] - b[0]);
    return list.map(([at, names], i) => {
      const prev = list[i - 1]?.[0];
      const next = list[i + 1]?.[0];
      const from =
        prev === undefined
          ? at - HIT_HALF
          : Math.max(at - HIT_HALF, (prev + at) / 2);
      const to =
        next === undefined
          ? at + HIT_HALF
          : Math.min(at + HIT_HALF, (at + next) / 2);
      return { at, names, from, to };
    });
  }, [s]);

  const hovered = bunches.find((b) => b.at === hoverAt) ?? null;
  const median = Math.round(s.median);

  return (
    <div className="relative grid grid-cols-[var(--label-w)_minmax(0,1fr)]">
      {/*
        믿을 만하지 않은 축(신뢰도 낮음)은 줄 전체를 흐리게 둔다. 다만 마우스를
        올렸을 때 뜨는 이름 상자는 흐리게 하지 않는다 — 그것까지 흐리면
        밑의 곡선이 비쳐 읽히지 않는다. 그래서 흐림을 줄 바깥이 아니라
        이름 칸과 그림 칸에 따로 건다.
      */}
      <div
        className="flex flex-col justify-center pr-3"
        style={{ height: ROW_H, opacity: dim ? 0.5 : 1 }}
      >
        <p className="text-table leading-tight font-medium">{s.scale}</p>
        <span className="text-axis text-ink-muted tabular">{s.n}명</span>
      </div>

      <div className="relative" style={{ height: ROW_H }}>
        <div className="absolute inset-0" style={{ opacity: dim ? 0.5 : 1 }}>
          <svg
            viewBox={`0 0 100 ${ROW_H}`}
            preserveAspectRatio="none"
            width="100%"
            height={ROW_H}
            className="absolute inset-0 block overflow-visible"
          >
            {/* 언덕 전체 */}
            <path
              d={areaPath(curve, sliceCurve(curve, 0, 100))}
              fill={tone.fill}
              fillOpacity={0.16}
            />
            {/* 가운데 절반 — 한 단 진하게 */}
            <path
              d={areaPath(curve, sliceCurve(curve, s.q1, s.q3))}
              fill={tone.fill}
              fillOpacity={0.34}
            />
            {/* 윤곽선 */}
            <path
              d={linePath(curve)}
              fill="none"
              stroke={tone.stroke}
              strokeWidth={1.5}
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
            {/* 바닥선 */}
            <line
              x1={0}
              x2={100}
              y1={BASE}
              y2={BASE}
              stroke="var(--axis)"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
            {/* 중앙값 */}
            <line
              x1={inside(s.median)}
              x2={inside(s.median)}
              y1={2}
              y2={BASE}
              stroke="var(--ink-secondary)"
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
            />

            {/* 한 사람 = 눈금 하나 */}
            {s.dots.map((d) => {
              const on = hovered !== null && Math.round(d.value) === hovered.at;
              return (
                <line
                  key={d.employeeId}
                  x1={inside(d.value)}
                  x2={inside(d.value)}
                  y1={on ? RUG_TOP - 2 : RUG_TOP}
                  y2={on ? RUG_BOTTOM + 3 : RUG_BOTTOM}
                  stroke={on ? "var(--ink)" : "var(--ink-muted)"}
                  strokeWidth={on ? 2.5 : 1}
                  vectorEffect="non-scaling-stroke"
                />
              );
            })}

            {/* 마우스를 받는 칸 — 보이지 않는다 */}
            {bunches.map((b) => (
              <rect
                key={b.at}
                x={b.from}
                width={b.to - b.from}
                y={BASE - 6}
                height={ROW_H - BASE + 6}
                fill="transparent"
                pointerEvents="all"
                onPointerEnter={() => onHover(b.at)}
                onPointerDown={() => onHover(b.at)}
                onPointerLeave={() => onHover(null)}
              />
            ))}
          </svg>

          {/*
          중앙값 숫자 — 줄 맨 위, 선의 오른쪽. 오른쪽 끝에 가까우면 왼쪽으로
          돌린다. 봉우리와 겹칠 수 있어 카드 바탕색으로 글자 둘레를 두른다.
        */}
          <span
            className="text-axis text-ink-muted pointer-events-none absolute top-0 whitespace-nowrap"
            style={{
              left: pct(s.median),
              transform:
                s.median > 80
                  ? "translateX(calc(-100% - 6px))"
                  : "translateX(6px)",
              textShadow:
                "0 0 3px var(--card), 0 0 3px var(--card), 0 0 2px var(--card)",
              lineHeight: 1.2,
            }}
          >
            중앙값{" "}
            <span className="tabular text-ink font-medium">{median}</span>
          </span>
        </div>

        {hovered && (
          <span
            role="tooltip"
            className="text-axis tabular pointer-events-none absolute z-10 rounded-md border border-(--border) px-2.5 py-1 whitespace-nowrap"
            style={{
              left: pct(hovered.at),
              bottom: ROW_H - RUG_TOP + 6,
              transform:
                hovered.at < 15
                  ? "translateX(-8px)"
                  : hovered.at > 85
                    ? "translateX(calc(-100% + 8px))"
                    : "translateX(-50%)",
              background: "var(--card)",
              color: "var(--ink)",
              boxShadow: "var(--card-shadow)",
            }}
          >
            {hovered.names.join(", ")} <span className="text-ink-muted">·</span>{" "}
            {hovered.at}
          </span>
        )}
      </div>
    </div>
  );
}

/** 곡선 높이 → 줄 안의 y. 봉우리가 BASE − PEAK_H에 닿는다 */
function yOf(c: Curve, density: number) {
  return c.peak > 0 ? BASE - (density / c.peak) * PEAK_H : BASE;
}

/** 조각 아래를 바닥선까지 닫은 면 */
function areaPath(c: Curve, pts: [number, number][]) {
  if (pts.length === 0) return "";
  const top = pts
    .map(([x, d]) => `${x.toFixed(2)} ${yOf(c, d).toFixed(2)}`)
    .join(" L ");
  return `M ${pts[0][0].toFixed(2)} ${BASE} L ${top} L ${pts[pts.length - 1][0].toFixed(2)} ${BASE} Z`;
}

/** 윤곽선 — 바닥으로 내려오지 않는 위 선만 */
function linePath(c: Curve) {
  return `M ${c.xs
    .map((x, i) => `${x.toFixed(2)} ${yOf(c, c.ys[i]).toFixed(2)}`)
    .join(" L ")}`;
}
