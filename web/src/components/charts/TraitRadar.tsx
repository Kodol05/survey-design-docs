"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";

/**
 * 7축 레이더 — 01 §3.6, 11 §3.1
 *
 * - 축 스케일 0~100 고정. 자동 스케일을 쓰면 프로파일 모양이 왜곡된다
 * - 기질/성격을 색으로 나누지 않는다. 축 라벨을 항상 표시한다 (색맹 대응)
 * - 사내 평균을 겹칠 때는 점선 테두리만. 둘 다 채우면 겹친 부분이 안 읽힌다
 */
export type RadarPoint = { scale: string; percent: number; average?: number };

/** 축 이름 아래에 값을 같이 적는다. 별도 라벨을 띄우면 선과 겹친다. */
type TickProps = {
  payload?: { value?: string };
  x?: number | string;
  y?: number | string;
  textAnchor?: string;
  values?: Map<string, number>;
  compact?: boolean;
};

/**
 * 결과지(종이 안)에서는 **작게** 그린다 — 글자 크기가 한 단 작은 자리라
 * 19/21px 라벨은 차트를 압도한다. 긴 이름(「사회적민감성」)은 좁은 반지름에서
 * 옆 축과 부딪히므로 **두 줄로 곱게 나눈다** (「사회적 / 민감성」).
 */
function Tick({ payload, x, y, textAnchor, values, compact }: TickProps) {
  const name = payload?.value ?? "";
  const v = values?.get(name);
  const nameSize = compact ? 12 : 19;
  const valueSize = compact ? 14 : 21;
  const lines =
    compact && name.length >= 6
      ? [name.slice(0, Math.ceil(name.length / 2)), name.slice(Math.ceil(name.length / 2))]
      : [name];
  // 전체 블록(이름 줄들 + 값)이 꼭짓점을 중심으로 오게 위로 밀어 올린다
  const lineH = nameSize + 2;
  const total = lines.length * lineH + (v === undefined ? 0 : valueSize + 2);
  const first = -(total / 2) + lineH / 2;
  return (
    <text x={x} y={y} textAnchor={textAnchor as never} dominantBaseline="central">
      {lines.map((ln, i) => (
        <tspan
          key={i}
          x={x}
          dy={i === 0 ? first : lineH}
          fill="var(--ink-secondary)"
          fontSize={nameSize}
        >
          {ln}
        </tspan>
      ))}
      {v !== undefined && (
        <tspan
          x={x}
          dy={valueSize + 2}
          fill="var(--ink)"
          fontSize={valueSize}
          fontWeight={600}
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {Math.round(v)}
        </tspan>
      )}
    </text>
  );
}

export function TraitRadar({
  data,
  showAverage,
  showValues,
  compact,
}: {
  data: RadarPoint[];
  showAverage?: boolean;
  showValues?: boolean;
  /** 결과지 종이 안처럼 작은 자리 — 라벨을 작게, 긴 이름은 두 줄로 */
  compact?: boolean;
}) {
  const values = showValues
    ? new Map(data.map((d) => [d.scale, d.percent]))
    : undefined;

  return (
    <div className="w-full" style={{ aspectRatio: "1 / 0.9" }}>
      <ResponsiveContainer>
        <RadarChart data={data} outerRadius={compact ? "62%" : "66%"}>
          <PolarGrid stroke="var(--grid)" />
          <PolarAngleAxis
            dataKey="scale"
            tick={(props: TickProps) => (
              <Tick {...props} values={values} compact={compact} />
            )}
          />
          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
          {showAverage && (
            <Radar
              name="사내 평균"
              dataKey="average"
              stroke="var(--series-2)"
              strokeWidth={2}
              strokeDasharray="4 3"
              fill="none"
            />
          )}
          <Radar
            name="본인"
            dataKey="percent"
            stroke="var(--series-1)"
            strokeWidth={2}
            fill="var(--series-1)"
            fillOpacity={0.18}
          />
        </RadarChart>
      </ResponsiveContainer>

      {/*
        선이 둘이면 **범례가 반드시 있어야 한다.** 색과 점선만으로 어느 쪽이
        본인이고 어느 쪽이 사내 평균인지 알 수 없다. 색을 못 보는 사람에게는
        점선/실선만 남는데, 그것도 이름이 있어야 뜻이 생긴다.
      */}
      {showAverage && (
        <div className="text-axis mt-2 flex flex-wrap justify-center gap-x-5 gap-y-1">
          <span className="flex items-center gap-2">
            <span
              className="inline-block h-0.5 w-7"
              style={{ background: "var(--series-1)" }}
            />
            <span className="text-ink-secondary">본인</span>
          </span>
          <span className="flex items-center gap-2">
            <span
              className="inline-block h-0.5 w-7"
              style={{
                background:
                  "repeating-linear-gradient(90deg, var(--series-2) 0 4px, transparent 4px 7px)",
              }}
            />
            <span className="text-ink-secondary">사내 평균</span>
          </span>
        </div>
      )}
    </div>
  );
}
