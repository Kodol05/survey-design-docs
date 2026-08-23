"use client";

import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { colorAt } from "./scale";

/**
 * 세로 막대 — 어느 축이 높고 낮은지 크기로 바로 비교된다.
 *
 * 레이더는 형태를, 이 막대는 크기 비교를 맡는다. 둘이 다른 일을 한다.
 *
 * - 축 0~100 고정. 자동 스케일을 쓰면 차이가 실제보다 크게 보인다
 * - 50에 기준선. 모든 문항에 중립으로 답했을 때의 값이라 여기가 가운데다
 * - 막대 색은 아래 축별 상세의 눈금과 같은 색이다. 같은 값이면 같은 색
 */

export type BarRow = { scale: string; percent: number };

export function TraitBars({ rows }: { rows: BarRow[] }) {
  const data = rows.map((r) => ({ ...r, value: Math.round(r.percent) }));

  return (
    <div className="w-full" style={{ height: 280 }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 24, right: 4, bottom: 4, left: 4 }}>
          <YAxis domain={[0, 100]} hide />
          <XAxis
            dataKey="scale"
            tickLine={false}
            axisLine={{ stroke: "var(--axis)" }}
            tick={{ fill: "var(--ink-secondary)", fontSize: 12 }}
            interval={0}
          />
          {/* 중립선 — 전 문항에 "보통"으로 답하면 나오는 값 */}
          <ReferenceLine
            y={50}
            stroke="var(--axis)"
            strokeDasharray="3 3"
            label={{
              value: "보통",
              position: "left",
              fill: "var(--ink-muted)",
              fontSize: 12,
            }}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={44} isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.scale} fill={colorAt(d.percent)} />
            ))}
            <LabelList
              dataKey="value"
              position="top"
              fill="var(--ink)"
              fontSize={13}
              fontWeight={600}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
