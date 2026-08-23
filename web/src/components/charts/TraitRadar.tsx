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
      <tspan x={x} dy={v === undefined ? 0 : -6} fill="var(--ink-secondary)" fontSize={13}>
        {name}
      </tspan>
      {v !== undefined && (
        <tspan
          x={x}
          dy={17}
          fill="var(--ink)"
          fontSize={14}
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
    </div>
  );
}
