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
};

function Tick({ payload, x, y, textAnchor, values }: TickProps) {
  const name = payload?.value ?? "";
  const v = values?.get(name);
  return (
    <text x={x} y={y} textAnchor={textAnchor as never} dominantBaseline="central">
      <tspan x={x} dy={v === undefined ? 0 : -9} fill="var(--ink-secondary)" fontSize={19}>
        {name}
      </tspan>
      {v !== undefined && (
        <tspan
          x={x}
          dy={19}
          fill="var(--ink)"
          fontSize={21}
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
}: {
  data: RadarPoint[];
  showAverage?: boolean;
  showValues?: boolean;
}) {
  const values = showValues
    ? new Map(data.map((d) => [d.scale, d.percent]))
    : undefined;

  return (
    <div className="w-full" style={{ aspectRatio: "1 / 0.9" }}>
      <ResponsiveContainer>
        <RadarChart data={data} outerRadius="66%">
          <PolarGrid stroke="var(--grid)" />
          <PolarAngleAxis
            dataKey="scale"
            tick={(props: TickProps) => <Tick {...props} values={values} />}
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
