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

export function TraitRadar({
  data,
  showAverage,
}: {
  data: RadarPoint[];
  showAverage?: boolean;
}) {
  return (
    <div className="w-full" style={{ aspectRatio: "1 / 0.85" }}>
      <ResponsiveContainer>
        <RadarChart data={data} outerRadius="70%">
          <PolarGrid stroke="var(--grid)" />
          <PolarAngleAxis
            dataKey="scale"
            tick={{ fill: "var(--ink-secondary)", fontSize: 13 }}
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
