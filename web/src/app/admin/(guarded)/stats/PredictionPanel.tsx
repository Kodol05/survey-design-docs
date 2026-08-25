"use client";

import { useState } from "react";
import Link from "next/link";
import { ScatterPlot } from "@/components/analysis/ScatterPlot";
import { formatR } from "@/components/analysis/correlationColor";
import { GradeTag } from "@/components/analysis/GradeTag";
import {
  PeekGap,
  PeekToggle,
  usePeek,
} from "@/components/analysis/PeekList";
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
  const peek = usePeek(sorted);

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
            {it.fromEstimates && (
              <span aria-hidden className="ml-1.5" title="추정 가중치">
                ⚠
              </span>
            )}
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

      {cur.fromEstimates && (
        <div
          className="mb-8 max-w-[52rem] rounded-xl p-5"
          style={{ background: "var(--wash)" }}
        >
          <p className="text-table mb-2 font-medium">
            <span aria-hidden className="mr-1.5">
              ⚠
            </span>
            {cur.axis}은 <strong>세 축 중 예측이 가장 어렵습니다</strong>
          </p>
          <p className="text-axis text-ink-secondary leading-relaxed">
            직접 잰 연구가 하나도 없어, 가까운 개념 둘(<strong>조직시민행동</strong> 0.6
            + <strong>직무만족</strong> 0.4)을 섞어 <strong>계산한 값</strong>을
            가중치로 썼습니다. 잰 값이 아닙니다. 게다가 그 계수 자체가{" "}
            <span className="tabular">.08~.10</span>으로 작습니다 — 성격으로는 이 능력을
            거의 설명하지 못한다는 뜻입니다.
          </p>
          <p className="text-axis text-ink-secondary mt-2 leading-relaxed">
            <strong>여기 나오는 예측은 참고선으로만 보십시오.</strong> 이 축이야말로{" "}
            <strong>대표님 평가와 맞대 보는 것이 가장 중요합니다.</strong>
          </p>
        </div>
      )}

      {/* 한 줄 요약 — 이 화면의 답 */}
      <div className="mb-10 grid gap-4 sm:grid-cols-3">
        <Fact
          label="예측이 맞은 정도"
          value={formatR(cur.corr)}
          extra={<GradeTag r={cur.corr} className="mt-1 block" />}
        />
        <Fact
          label="실제로 나타난 기울기"
          value={cur.fit.slope.toFixed(2)}
          extra={
            <span className="text-axis text-ink-muted">
              논문이 본 차이의 {Math.round(Math.max(0, cur.fit.slope) * 100)}%
            </span>
          }
        />
        <Fact
          label="크게 어긋난 사람"
          value={`${cur.farOff}명`}
          extra={
            <span className="text-axis text-ink-muted">
              10점 넘게 · {cur.n}명 중 · 평균 {cur.meanAbsGap.toFixed(1)}점
            </span>
          }
        />
      </div>

      <div className="grid gap-12 xl:grid-cols-[minmax(0,1fr)_minmax(0,38rem)]">
        <div>
          <h3 className="text-table mb-1 font-medium">사람별 차이</h3>
          <p className="text-axis text-ink-muted mb-4">
            실제 − 예측. 위로 갈수록 논문이 본 것보다 실제가 높은 사람입니다
          </p>
          <ul className="flex flex-col">
            {peek.items.map((it) => {
              if (it.kind === "gap") return <PeekGap key={`g${it.n}`} n={it.n} />;
              const r = it.row;
              const w = (Math.abs(r.gap) / widest) * 50;
              const up = r.gap >= 0;
              return (
                <li
                  key={r.employeeId}
                  className="grid grid-cols-[5rem_1fr_6rem] items-center gap-2 py-1.5 sm:grid-cols-[8rem_1fr_8rem] sm:gap-3"
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
          {peek.foldable && (
            <PeekToggle
              all={peek.all}
              hidden={peek.hidden}
              onClick={peek.toggle}
            />
          )}
        </div>
        <div>
          <h3 className="text-table mb-1 font-medium">예측 대 실제</h3>
          {/* 선이 둘이라는 것을 글자로도 적는다. 색만으로 읽게 두지 않는다 */}
          <div className="text-axis mb-3 flex flex-wrap gap-x-6 gap-y-1">
            <span className="flex items-center gap-2">
              <span
                className="inline-block h-0.5 w-8"
                style={{
                  background:
                    "repeating-linear-gradient(90deg, var(--ink-muted) 0 6px, transparent 6px 11px)",
                }}
              />
              <span className="text-ink-secondary">
                논문대로면 <span className="tabular">기울기 1.00</span>
              </span>
            </span>
            <span className="flex items-center gap-2">
              <span
                className="inline-block h-0.5 w-8"
                style={{ background: "var(--series-1)" }}
              />
              <span className="text-ink-secondary">
                실제{" "}
                <strong className="tabular">
                  기울기 {cur.fit.slope.toFixed(2)}
                </strong>
              </span>
            </span>
          </div>
          <p className="text-axis text-ink-muted mb-3">
            두 축 모두 <strong>설문 점수 눈금(0~100)</strong>입니다. 논문이 정하는 것은{" "}
            <strong>사람들의 순서</strong>뿐이고, 가로축의 가운데와 퍼진 정도는{" "}
            <strong>설문 값에서 빌려온 것</strong>입니다.
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
            trend={null}
            guides={[
              // 논문 예측이 그대로 맞았다면 — 기울기 1
              {
                points: [
                  { x: 0, y: 0 },
                  { x: 100, y: 100 },
                ],
                color: "var(--ink-muted)",
                dashed: true,
              },
              // 실제로 나타난 기울기
              {
                points: [
                  { x: 0, y: cur.fit.intercept },
                  { x: 100, y: cur.fit.intercept + cur.fit.slope * 100 },
                ],
                color: "var(--series-1)",
                width: 3,
              },
            ]}
            xLabel="논문으로 본 예측"
            yLabel="실제"
          />

        </div>

      </div>

      <p className="text-axis text-ink-muted mt-10">
        예측에 쓴 가중치 —{" "}
        {cur.weights.map((w, i) => (
          <span key={w.scale}>
            {i > 0 && " · "}
            {w.scale}{" "}
            <span className="tabular">
              {w.estimated && "≈"}
              {formatR(w.r)}
            </span>
          </span>
        ))}
        {cur.fromEstimates && <> · ≈ 는 계산한 추정치입니다</>}
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
