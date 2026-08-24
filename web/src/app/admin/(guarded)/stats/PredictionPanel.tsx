"use client";

import { useState } from "react";
import Link from "next/link";
import { ScatterPlot } from "@/components/analysis/ScatterPlot";
import { formatR } from "@/components/analysis/correlationColor";
import { GradeTag } from "@/components/analysis/GradeTag";
import type { ResearchPrediction } from "@/lib/admin/researchPrediction";

/**
 * 논문 예측 ↔ 실제 대조.
 *
 * 두 가지를 같이 보여준다.
 *  - **흩어진 점** — 대각선에서 얼마나 벗어났는지, 한두 명이 끌고 있는지
 *  - **차이 막대** — 누가 예측보다 높고 낮은지, 이름이 붙어 있어 바로 찾아간다
 *
 * 축을 누르면 세 축을 오간다. 세 개를 한 화면에 늘어놓으면 각각이 너무
 * 작아져서 점이 뭉개진다.
 */
export function PredictionPanel({
  items,
  missing,
}: {
  items: ResearchPrediction[];
  /** 논문 값이 없어 예측할 수 없는 축 */
  missing: string[];
}) {
  const [axis, setAxis] = useState(items[0]?.axis ?? "");
  const cur = items.find((x) => x.axis === axis) ?? items[0];
  if (!cur) return null;

  const sorted = [...cur.rows].sort((a, b) => b.gap - a.gap);
  const widest = Math.max(...sorted.map((r) => Math.abs(r.gap)), 1);

  return (
    <div>
      <div className="text-axis mb-8 flex flex-wrap items-center gap-1.5">
        <span className="text-ink-muted mr-1">직무능력</span>
        {items.map((it) => (
          <button
            key={it.axis}
            type="button"
            onClick={() => setAxis(it.axis)}
            className="rounded-md px-3 py-1.5"
            style={{
              background: it.axis === cur.axis ? "var(--ink)" : "var(--wash)",
              color: it.axis === cur.axis ? "var(--page)" : "var(--ink-secondary)",
              fontWeight: it.axis === cur.axis ? 600 : 400,
            }}
          >
            {it.axis}
          </button>
        ))}
        {/*
          예측할 수 없는 축도 **자리는 남긴다.** 아예 빼 버리면 "협력과
          자율적실행만 있네, 조직생활은 어디 갔지?"가 된다. 실제로 그 질문이
          나왔다. 회색으로 눌리지 않게 두고 이유를 붙인다.
        */}
        {missing.map((axis) => (
          <span
            key={axis}
            className="rounded-md px-3 py-1.5"
            style={{
              background: "transparent",
              color: "var(--ink-muted)",
              outline: "1px dashed var(--border)",
            }}
            title="논문 값이 하나도 없어 예측할 수 없습니다"
          >
            {axis}
            <span className="ml-1.5">— 논문 값 없음</span>
          </span>
        ))}
      </div>

      {/* 한 줄 요약 — 이 화면의 답 */}
      <div className="mb-10 grid gap-4 sm:grid-cols-3">
        <Fact
          label="예측이 맞은 정도"
          value={formatR(cur.corr)}
          extra={<GradeTag r={cur.corr} className="mt-1 block" />}
        />
        <Fact
          label="평균 빗나간 폭"
          value={`${cur.meanAbsGap.toFixed(1)}점`}
          extra={<span className="text-axis text-ink-muted">100점 눈금</span>}
        />
        <Fact
          label="예측보다 높음 / 낮음"
          value={`${cur.above} / ${cur.below}`}
          extra={<span className="text-axis text-ink-muted">{cur.n}명 중</span>}
        />
      </div>

      <div className="grid gap-12 xl:grid-cols-[minmax(0,38rem)_minmax(0,1fr)]">
        <div>
          <h3 className="text-table mb-1 font-medium">예측 대 실제</h3>
          <p className="text-axis text-ink-muted mb-3">
            <strong>대각선은 「예측과 실제가 똑같다」는 선</strong>입니다 — 데이터로 그은
            추세선이 아닙니다. 위에 있으면 실제가 예측보다 높은 사람입니다.
          </p>
          <ScatterPlot
            height={480}
            points={cur.rows.map((r) => ({
              id: r.employeeId,
              name: `${r.name} · 예측 ${Math.round(r.predicted)} → 실제 ${Math.round(r.actual)}`,
              x: r.predicted,
              y: r.actual,
              quality: "ok",
            }))}
            trend={[
              { x: 0, y: 0 },
              { x: 100, y: 100 },
            ]}
            xLabel="논문으로 본 예측"
            yLabel="실제"
          />

          <h3 className="text-table mt-10 mb-1 font-medium">구간마다 다른가</h3>
          <p className="text-axis text-ink-muted mb-3">
            한쪽으로 쏠려 있으면 그 구간에서 예측이 계속 빗나간다는 뜻입니다
          </p>
          <ul className="flex flex-col gap-2">
            {cur.bins.map((b) => (
              <li key={b.label} className="grid grid-cols-[9rem_1fr] items-center gap-3">
                <span className="text-axis text-ink-secondary">{b.label}</span>
                <span className="text-axis tabular">
                  평균{" "}
                  <strong className="text-table">
                    {b.meanGap >= 0 ? "+" : "−"}
                    {Math.abs(b.meanGap).toFixed(1)}
                  </strong>
                  <span className="text-ink-muted ml-2">{b.count}명</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-table mb-1 font-medium">사람별 차이</h3>
          <p className="text-axis text-ink-muted mb-4">
            실제 − 예측. 위로 갈수록 논문이 본 것보다 실제가 높은 사람입니다
          </p>
          <ul className="flex flex-col">
            {sorted.map((r) => {
              const w = (Math.abs(r.gap) / widest) * 50;
              const up = r.gap >= 0;
              return (
                <li
                  key={r.employeeId}
                  className="grid grid-cols-[8rem_1fr_8rem] items-center gap-3 py-1.5"
                >
                  <Link
                    href={`/admin/employees/${r.employeeId}`}
                    className="text-axis truncate"
                  >
                    {r.name}
                  </Link>
                  <div className="relative h-4">
                    <div
                      className="absolute inset-y-0 left-1/2 w-px"
                      style={{ background: "var(--axis)" }}
                    />
                    <div
                      className="absolute inset-y-0.5 rounded-sm"
                      style={{
                        left: up ? "50%" : `${50 - w}%`,
                        width: `${w}%`,
                        background: up ? "var(--series-1)" : "var(--series-2)",
                      }}
                    />
                  </div>
                  <span className="text-axis tabular text-ink-muted text-right">
                    {Math.round(r.predicted)} → {Math.round(r.actual)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <p className="text-axis text-ink-muted mt-10">
        예측에 쓴 논문 값 —{" "}
        {cur.weights.map((w, i) => (
          <span key={w.scale}>
            {i > 0 && " · "}
            {w.scale} <span className="tabular">{formatR(w.r)}</span>
          </span>
        ))}
      </p>
    </div>
  );
}

function Fact({
  label,
  value,
  extra,
}: {
  label: string;
  value: string;
  extra?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl p-5" style={{ background: "var(--wash)" }}>
      <p className="text-axis text-ink-secondary">{label}</p>
      <p className="tabular mt-1 text-4xl font-semibold">{value}</p>
      {extra}
    </div>
  );
}
