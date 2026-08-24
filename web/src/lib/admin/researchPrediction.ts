import { TRAIT_SCALES } from "@/lib/items/types";
import { getCell, loadResearchTable } from "@/lib/research/correlations";
import { MIN_N } from "@/components/ui/NBadge";
import type { Person } from "./analysis";

/**
 * 논문 값으로 예측하고 실제와 맞대 본다.
 *
 * ## 전에 있던 「계산식」과 무엇이 다른가
 *
 * 전 화면은 **우리 데이터로 만든 회귀식**이 우리 데이터를 얼마나 맞추는지를
 * 봤다. 그건 "설문 안에서 앞뒤가 맞는가"라 답은 거의 늘 "맞는다"였다.
 * 자기 답으로 자기 답을 맞추는 셈이라 새로 알게 되는 것이 적다.
 *
 * 여기서는 **바깥에서 온 값**을 쓴다. 논문에서 나온 성향×직무능력 상관을
 * 가중치로 삼아 이 사람의 직무능력이 얼마쯤일지 계산하고, 실제로 나온 값과
 * 나란히 놓는다. 어긋나면 **우리 회사가 논문과 다르다**는 뜻이거나
 * **그 사람이 남다르다**는 뜻이다. 둘 다 볼 만한 이야기다.
 *
 * ## 어떻게 계산하는가
 *
 *   1. 성향 일곱 축을 우리 사람들 안에서 표준화한다 (평균 0, 표준편차 1)
 *   2. 논문 상관을 가중치로 곱해 더한다 — 관계가 클수록 많이 반영된다
 *   3. 나온 합을 **실제 직무능력의 평균·표준편차에 맞춰 되돌린다**
 *
 * 3단계가 필요한 이유는 논문이 주는 것이 **모양**이지 **눈금**이 아니기
 * 때문이다. 상관만으로는 "이 사람이 62점"이라고 말할 수 없다. 우리 데이터의
 * 퍼진 정도를 빌려야 점수가 된다.
 *
 * ⚠️ **서로 다른 논문에서 온 값을 한 식에 넣는다.** 표본도 지표도 나라도
 *    다르다. 이렇게 만든 예측은 대략의 눈금이지 정밀한 값이 아니다.
 *    화면에도 적어 둔다.
 *
 * ⚠️ **조직생활은 예측할 수 없다.** 이 개념을 정의한 연구를 찾지 못해
 *    가중치가 하나도 없다 (07). 빈칸으로 둔다 — 0으로 채우면 "예측이
 *    맞았다"는 착각이 생긴다.
 */

export type PredictionRow = {
  employeeId: string;
  name: string;
  predicted: number;
  actual: number;
  /** 실제 − 예측. 양수면 논문이 본 것보다 실제가 높다 */
  gap: number;
};

export type ResearchPrediction = {
  axis: string;
  n: number;
  /** 예측에 쓴 성향 축과 그 가중치 */
  weights: { scale: string; r: number }[];
  rows: PredictionRow[];
  /** 예측 ↔ 실제 상관. 이 값이 예측이 맞았는지를 말한다 */
  corr: number;
  /** 평균 |차이| */
  meanAbsGap: number;
  /** 10점 넘게 어긋난 사람 수 */
  farOff: number;
};

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const sd = (xs: number[]) => {
  const m = mean(xs);
  return Math.sqrt(xs.reduce((n, x) => n + (x - m) ** 2, 0) / Math.max(1, xs.length - 1));
};

function corrOf(xs: number[], ys: number[]): number {
  const mx = mean(xs);
  const my = mean(ys);
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < xs.length; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    dx += (xs[i] - mx) ** 2;
    dy += (ys[i] - my) ** 2;
  }
  return dx && dy ? num / Math.sqrt(dx * dy) : 0;
}

export function predictFromResearch(
  people: Person[],
  axis: string,
): ResearchPrediction | null {
  const table = loadResearchTable();
  const weights: { scale: string; r: number }[] = [];
  for (const scale of TRAIT_SCALES) {
    const c = getCell(table, scale, axis);
    // `없음`(연구했는데 관련 없음)과 `—`(안 쟀음) 둘 다 가중치가 없다
    if (c.kind === "value" && c.value !== 0) weights.push({ scale, r: c.value });
  }
  if (weights.length === 0) return null;

  const usable = people.filter(
    (p) =>
      typeof p.abilities[axis] === "number" &&
      weights.every((w) => typeof p.traits[w.scale] === "number"),
  );
  if (usable.length < MIN_N) return null;

  // 1. 성향을 우리 사람들 안에서 표준화
  const z: Record<string, number[]> = {};
  for (const w of weights) {
    const raw = usable.map((p) => p.traits[w.scale]);
    const m = mean(raw);
    const s = sd(raw) || 1;
    z[w.scale] = raw.map((v) => (v - m) / s);
  }

  // 2. 논문 상관을 가중치로 곱해 더한다
  const composite = usable.map((_, i) =>
    weights.reduce((n, w) => n + w.r * z[w.scale][i], 0),
  );

  // 3. 실제 직무능력의 눈금에 맞춰 되돌린다
  const actual = usable.map((p) => p.abilities[axis]);
  const cm = mean(composite);
  const cs = sd(composite) || 1;
  const am = mean(actual);
  const as_ = sd(actual) || 1;
  const predicted = composite.map((c) => ((c - cm) / cs) * as_ + am);

  const rows: PredictionRow[] = usable.map((p, i) => ({
    employeeId: p.employeeId,
    name: p.name,
    predicted: predicted[i],
    actual: actual[i],
    gap: actual[i] - predicted[i],
  }));

  /*
    ⚠️ **구간별 평균 차이는 넣지 않는다 — 계산해 보면 늘 기울어진다.**

    3단계에서 예측값을 실제값의 평균·표준편차에 맞춰 되돌린다. 그러면 두 값의
    퍼진 정도가 같아지는데, 상관이 1보다 작으면 수학적으로

        (예측이 낮은 쪽) 실제가 더 높게  ·  (예측이 높은 쪽) 실제가 더 낮게

    나올 수밖에 없다. 평균으로의 회귀(regression to the mean)다.

    실제로 **상관이 0인 난수로도 `+13.7 / −3.1 / −10.3`이 나왔다.** 데이터에서
    발견한 것처럼 보이지만 만드는 방식이 만들어낸 모양이다. 화면에 두면
    없는 것을 봤다고 말하게 된다.

    같은 이유로 「예측보다 높음 / 낮음」 인원수도 뺐다. 두 평균이 정확히 같게
    맞춰져 있어 **언제나 반반**으로 나온다.
  */
  const FAR = 10;

  return {
    axis,
    n: usable.length,
    weights,
    rows,
    corr: corrOf(predicted, actual),
    meanAbsGap: mean(rows.map((r) => Math.abs(r.gap))),
    farOff: rows.filter((r) => Math.abs(r.gap) >= FAR).length,
  };
}
