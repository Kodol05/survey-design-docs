"use client";

import { useState } from "react";
import Link from "next/link";
import { ScatterPlot } from "@/components/analysis/ScatterPlot";
import { Note } from "@/components/ui/Note";
import { formatR, formatRatio } from "@/components/analysis/correlationColor";
import { GradeTag } from "@/components/analysis/GradeTag";
import { PeekGap, PeekToggle, usePeek } from "@/components/analysis/PeekList";
import { COMPOSITE_AXIS } from "@/lib/items/types";
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

  /*
    ⚠️ **훅보다 먼저 빠져나가면 안 된다.**

    전에는 `if (!cur) return null`이 `usePeek` 위에 있었다. 그러면 볼 것이
    없을 때는 훅이 하나 적게 불린다. 값 출처를 바꿔 `items`가 있다가 없어지면
    React는 **「지난번보다 훅이 많다」며 화면을 통째로 떨어뜨린다.**
    훅은 늘 같은 순서로 다 부르고, 빠져나가는 것은 그 뒤에 한다.
  */
  const isComposite = cur?.axis === COMPOSITE_AXIS;
  const sorted = cur ? [...cur.rows].sort((a, b) => b.gap - a.gap) : [];
  const peek = usePeek(sorted);
  if (!cur) return null;

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
              color:
                it.axis === cur.axis ? "var(--page)" : "var(--ink-secondary)",
              fontWeight: it.axis === cur.axis ? 600 : 400,
            }}
          >
            {it.axis}
            {/* 묶은 값에는 달지 않는다 — 부실한 것은 조직생활 축이지 평균이 아니다 */}
            {it.fromEstimates && it.axis !== COMPOSITE_AXIS && (
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

      {/*
        접어 둔다 (2026-08-26 사용자 요청). 늘 펼쳐 두면 이 축을 볼 때마다
        같은 문단을 지나쳐야 하는데, **한 번 읽으면 되는 이야기**다.
        접힌 채로도 제목이 요점을 말한다.

        ⚠️ **묶은 값에는 띄우지 않는다** (2026-08-26 사용자 결정). 셋 중 하나가
        부실하다는 이야기는 **그 축을 볼 때 할 말**이다. 평균 화면에 같은 경고를
        또 띄우면 묶은 값 자체가 못 믿을 것처럼 읽히는데, 실제로는 묶으면 축
        하나하나보다 잘 맞는다.
      */}
      {cur.fromEstimates && !isComposite && (
        <Note
          label={`⚠ ${cur.axis}은 예측을 제대로 못 하고 있습니다 — 왜 그런지`}
          className="mb-8"
        >
          <p>
            <strong>{cur.axis}만 직접 잰 연구가 하나도 없습니다.</strong> 가까운
            개념 둘(<strong>조직시민행동</strong> 0.6 +{" "}
            <strong>직무만족</strong> 0.4)을 섞어 <strong>계산한 값</strong>을
            가중치로 쓰고 있습니다. 잰 값이 아닙니다. 게다가 그 계수 자체가{" "}
            <span className="tabular">0.08~0.10</span>으로 작습니다 — 성격으로는
            이 능력을 거의 설명하지 못한다는 뜻입니다.
          </p>
          <p className="mt-2">
            그래서 <strong>이 축의 예측은 틀릴 수 있습니다.</strong>{" "}
            참고선으로만 보시고, 이 축이야말로{" "}
            <strong>대표님 평가와 맞대 보는 것이 가장 중요합니다.</strong>
          </p>
        </Note>
      )}

      {/* 한 줄 요약 — 이 화면의 답 */}
      <div className="mb-10 grid gap-4 sm:grid-cols-3">
        <Fact
          label="예측이 맞은 정도"
          value={formatR(cur.corr)}
          extra={
            <>
              <GradeTag r={cur.corr} className="mt-1 block" />
              {/*
                숫자만으로는 어느 정도인지 안 잡힌다 (2026-08-26 사용자 지적).
                **눈금의 양 끝**을 적어 준다 — 그것만 알면 0.73이 어디쯤인지
                바로 감이 온다. 등급 낱말과 짝이 되는 자리다.
              */}
              <span className="text-axis text-ink-muted mt-1 block leading-snug">
                0.00 관계 없음 → 1.00 논문대로
              </span>
            </>
          }
        />
        <Fact
          label="실제로 나타난 기울기"
          value={formatRatio(cur.fit.slope)}
          extra={
            <span className="text-axis text-ink-muted mt-1 block leading-snug">
              논문이 본 차이의 {Math.round(Math.max(0, cur.fit.slope) * 100)}%
              <br />
              1.00 이면 논문과 똑같은 폭
            </span>
          }
        />
        <Fact
          label="크게 어긋난 사람"
          value={`${cur.farOff}명`}
          extra={
            <span className="text-axis text-ink-muted mt-1 block leading-snug">
              10점 넘게 · {cur.n}명 중
              <br />
              평균 {cur.meanAbsGap.toFixed(1)}점 어긋남
            </span>
          }
        />
      </div>

      <div className="grid gap-12 xl:grid-cols-[minmax(0,1fr)_minmax(0,38rem)]">
        <div>
          <h3 className="text-table mb-1 font-medium">사람별 차이</h3>
          <p className="text-axis text-ink-muted mb-4">
            실제 − 예측. 위쪽이 논문이 본 것보다 높게 나온 사람입니다
          </p>
          <ul className="flex flex-col">
            {peek.items.map((it) => {
              if (it.kind === "gap")
                return <PeekGap key={`g${it.n}`} n={it.n} />;
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
                  기울기 {formatRatio(cur.fit.slope)}
                </strong>
              </span>
            </span>
          </div>
          <p className="text-axis text-ink-muted mb-3">
            두 축 모두 설문 점수 눈금(0~100)입니다.
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
