"use client";

import {
  CartesianGrid,
  Line,
  ComposedChart,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";

/**
 * 산점도 — docs/11-ui-guide.md §3.3
 *
 * **점 50개를 그대로 두는 것이 핵심이다.** 한두 명이 상관을 끌고 있으면 눈으로
 * 보인다. 상관계수 하나로는 절대 안 보인다.
 *
 *  - 축 양쪽 0~100 고정. 자동 스케일이면 차이가 실제보다 크게 보인다
 *  - 겹치는 점은 바탕색 링으로 분리한다 (테두리를 그리지 않는다)
 *  - 점마다 숫자를 붙이지 않는다. 값은 마우스를 올리면 나온다
 */

export type Point = {
  id: string;
  name: string;
  x: number;
  y: number;
  quality: string;
};

export function ScatterPlot({
  height = 360,
  points,
  trend,
  guides,
  xLabel,
  yLabel,
}: {
  /** 기본 360. 화면이 넓은 자리에서는 키운다 */
  height?: number;
  points: Point[];
  trend: { x: number; y: number }[] | null;
  /**
   * 선을 여러 개 겹쳐 그린다.
   *
   * 예측 화면에서는 두 개가 필요하다 — **「예측대로면 이 기울기」(대각선)와
   * 「실제로는 이 기울기」(회귀선).** 대각선 하나만 두면 얼마나 벗어났는지는
   * 보이지만 실제 기울기가 몇인지는 안 보인다.
   */
  guides?: {
    points: { x: number; y: number }[];
    color: string;
    dashed?: boolean;
    width?: number;
  }[];
  xLabel: string;
  yLabel: string;
}) {
  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer>
        {/*
          ⚠️ `left`가 8이면 **세로로 쓴 축 이름이 잘린다.**

          `insideLeft`로 놓인 이름은 왼쪽 가장자리에 세로로 서는데, 90도 돌린
          글자는 그 자리를 중심으로 좌우로 퍼진다. 글자 절반이 그림 밖으로
          나가서 「협력」이 반쪽만 보였다. 글자 크기(19)의 절반보다 넉넉히 준다.
        */}
        <ComposedChart margin={{ top: 12, right: 16, bottom: 28, left: 22 }}>
          <CartesianGrid stroke="var(--grid)" />
          <XAxis
            type="number"
            dataKey="x"
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            tickLine={false}
            axisLine={{ stroke: "var(--axis)" }}
            tick={{ fill: "var(--ink-muted)", fontSize: 18 }}
            label={{
              value: xLabel,
              position: "insideBottom",
              offset: -16,
              fill: "var(--ink-secondary)",
              fontSize: 19,
            }}
          />
          <YAxis
            type="number"
            dataKey="y"
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            tickLine={false}
            axisLine={{ stroke: "var(--axis)" }}
            tick={{ fill: "var(--ink-muted)", fontSize: 16 }}
            label={{
              value: yLabel,
              angle: -90,
              position: "insideLeft",
              fill: "var(--ink-secondary)",
              fontSize: 19,
            }}
          />
          <ZAxis range={[90, 90]} />
          {trend && (
            <Line
              data={trend}
              dataKey="y"
              dot={false}
              stroke="var(--ink-muted)"
              strokeWidth={2}
              isAnimationActive={false}
              legendType="none"
            />
          )}
          {guides?.map((g, i) => (
            <Line
              key={i}
              data={g.points}
              dataKey="y"
              dot={false}
              stroke={g.color}
              strokeWidth={g.width ?? 2}
              strokeDasharray={g.dashed ? "6 5" : undefined}
              isAnimationActive={false}
              legendType="none"
            />
          ))}
          <Scatter
            data={points}
            fill="var(--series-1)"
            // 겹칠 때 서로 분리되도록 바탕색 링을 두른다 (테두리가 아니다)
            stroke="var(--page)"
            strokeWidth={2}
            isAnimationActive={false}
          />
          <Tooltip
            cursor={{ strokeDasharray: "3 3", stroke: "var(--axis)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload as Point;
              if (!p?.name) return null;
              return (
                <div className="rounded-lg border border-[--border] bg-surface px-3 py-2 shadow-sm">
                  <p className="tabular font-medium">
                    {Math.round(p.x)} · {Math.round(p.y)}
                  </p>
                  <p className="text-axis text-ink-secondary">{p.name}</p>
                  {p.quality !== "ok" && (
                    <p
                      className="text-axis"
                      style={{ color: "var(--status-warn)" }}
                    >
                      응답 품질 검토 필요
                    </p>
                  )}
                </div>
              );
            }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
