"use client";

import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
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

export function TraitBars({ rows, height = 280 }: { rows: BarRow[]; height?: number }) {
  const data = rows.map((r) => ({ ...r, value: Math.round(r.percent) }));

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer>
        <BarChart
          data={data}
          margin={{ top: 24, right: 4, bottom: 0, left: 4 }}
          /* 막대 사이를 벌린다. 붙어 있으면 일곱 개가 한 덩어리로 읽힌다 */
          barCategoryGap="26%"
        >
          <YAxis domain={[0, 100]} hide />
          <XAxis
            dataKey="scale"
            tickLine={false}
            axisLine={{ stroke: "var(--axis)" }}
            tick={(props: TickProps) => <AxisTick {...props} />}
            interval={0}
            height={46}
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
              fontSize: 18,
            }}
          />
          {/* 값을 짚어 볼 수단이 막대 위 라벨뿐이었다. 좁은 화면에서 라벨이 겹치면 읽을 방법이 없다 */}
          <Tooltip
            cursor={{ fill: "var(--wash)" }}
            contentStyle={{
              background: "var(--page)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 17,
            }}
            labelStyle={{ color: "var(--ink)", fontWeight: 600 }}
            formatter={(v) => [String(v), "점수"] as [string, string]}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={30} isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.scale} fill={colorAt(d.percent)} />
            ))}
            <LabelList
              dataKey="value"
              position="top"
              fill="var(--ink)"
              fontSize={19}
              fontWeight={600}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * 축 이름을 **두 줄로 접는다.**
 *
 * 한 칸이 60px 안팎인데 「사회적민감성」은 한 줄로 100px이 넘는다. 그대로 두면
 * 옆 이름과 겹쳐 글자가 뭉개진다 — 개인 결과 화면에서 실제로 그랬다.
 *
 * 줄이거나 자르지 않고 **접는다.** 「민감성」처럼 잘라 쓰면 무슨 축인지
 * 알아보기 어렵고, 글자를 줄이면 안 읽힌다.
 *
 * 두 줄이 되는 것은 여섯 자짜리 둘(사회적민감성·자기초월은 넉 자라 한 줄)뿐이라
 * 대부분은 한 줄 그대로다.
 */
const WRAP: Record<string, [string, string]> = {
  사회적민감성: ["사회적", "민감성"],
};

type TickProps = {
  x?: number | string;
  y?: number | string;
  payload?: { value?: string };
};

function AxisTick({ x, y, payload }: TickProps) {
  const name = payload?.value ?? "";
  const lines = WRAP[name] ?? [name];
  return (
    <text
      x={x}
      y={Number(y ?? 0) + 18}
      textAnchor="middle"
      fill="var(--ink-secondary)"
      fontSize={17}
    >
      {lines.map((line, i) => (
        <tspan key={line} x={x} dy={i === 0 ? 0 : 19}>
          {line}
        </tspan>
      ))}
    </text>
  );
}
