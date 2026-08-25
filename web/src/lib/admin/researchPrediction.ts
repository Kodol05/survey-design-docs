import { ABILITY_AXES, COMPOSITE_AXIS, TRAIT_SCALES } from "@/lib/items/types";
import { getCell, loadResearchTable } from "@/lib/research/correlations";
import { MIN_N } from "@/components/ui/NBadge";
import type { Person } from "./analysis";
import { fitLine } from "./stats";

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
  weights: { scale: string; r: number; estimated?: boolean }[];
  /** 가중치가 직접 잰 값이 아니라 계산한 추정치인가 (조직생활) */
  fromEstimates: boolean;
  rows: PredictionRow[];
  /** 예측 ↔ 실제 상관. 이 값이 예측이 맞았는지를 말한다 */
  corr: number;
  /** 평균 |차이| */
  meanAbsGap: number;
  /** 10점 넘게 어긋난 사람 수 */
  farOff: number;
  /**
   * 실제값을 예측값에 대해 회귀한 선.
   *
   * **기울기가 이 화면의 답이다.** 대각선(기울기 1)은 「논문 예측이 그대로
   * 맞았다면」이고, 이 선의 기울기는 「실제로 그중 얼마가 나타났는가」다.
   * 0.35면 논문이 본 차이의 3분의 1쯤만 실제로 벌어졌다는 뜻이다.
   *
   * 예측값을 실제값의 퍼진 정도에 맞춰 뒀으므로 이 기울기는 상관계수와 같다.
   * 그래도 최소제곱으로 직접 구한다 — 그 성질이 깨지면 바로 드러나야 한다.
   */
  fit: { slope: number; intercept: number };
};

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const sd = (xs: number[]) => {
  const m = mean(xs);
  return Math.sqrt(
    xs.reduce((n, x) => n + (x - m) ** 2, 0) / Math.max(1, xs.length - 1),
  );
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

/**
 * 세 능력을 묶은 값도 같은 방식으로 예측해 본다 (2026-08-26 사용자 요청).
 *
 * ## 가중치를 어떻게 정하나
 *
 * 묶은 값은 세 축의 **평균**이다. 그래서 어떤 성향이 그 평균과 어떻게 얽히는지도
 * 세 축 계수의 평균으로 잡는다 — 논문이 안 잰 축은 0으로 친다.
 *
 * ⚠️ **이건 「논문이 잰 값」이 아니라 우리가 만든 조합이다.** 셋 중 하나라도
 * 추정치를 쓰면(조직생활이 그렇다) 묶은 값도 추정치가 섞인 것이므로
 * `fromEstimates`가 켜진다. 화면이 그 경고를 그대로 띄운다.
 *
 * ## 왜 볼 만한가
 *
 * 축 하나하나는 잡음이 커서 예측이 잘 안 맞을 수 있지만, **셋을 묶으면 잡음이
 * 상쇄되어 대개 더 잘 맞는다.** 「전반적으로 일이 되는 사람」을 성격으로 얼마나
 * 짚을 수 있는지는 축 하나로는 답할 수 없는 물음이다.
 */
export function predictComposite(people: Person[]): ResearchPrediction | null {
  const table = loadResearchTable();

  const weights: { scale: string; r: number; estimated?: boolean }[] = [];
  for (const scale of TRAIT_SCALES) {
    let sum = 0;
    let estimated = false;
    for (const axis of ABILITY_AXES) {
      const c = getCell(table, scale, axis);
      if (c.kind === "value") sum += c.value;
      else if (c.kind === "expected" && typeof c.estimate === "number") {
        sum += c.estimate;
        estimated = true;
      }
    }
    const r = sum / ABILITY_AXES.length;
    if (r !== 0)
      weights.push({ scale, r, ...(estimated ? { estimated } : {}) });
  }
  if (weights.length === 0) return null;

  /*
    한 축이라도 없는 사람은 뺀다. 있는 것만 평균 내면 **사람마다 다른 잣대**가
    된다 — 두 축만 있는 사람의 평균과 세 축 다 있는 사람의 평균은 같은 수가
    아니다 (`composite.ts`와 같은 규칙).
  */
  const withMean = people
    .filter((p) =>
      ABILITY_AXES.every((a) => typeof p.abilities[a] === "number"),
    )
    .map((p) => ({
      ...p,
      abilities: {
        ...p.abilities,
        [COMPOSITE_AXIS]:
          ABILITY_AXES.reduce((n, a) => n + p.abilities[a], 0) /
          ABILITY_AXES.length,
      },
    }));

  return predictWith(withMean, COMPOSITE_AXIS, weights);
}

export function predictFromResearch(
  people: Person[],
  axis: string,
): ResearchPrediction | null {
  const table = loadResearchTable();
  const weights: { scale: string; r: number; estimated?: boolean }[] = [];
  for (const scale of TRAIT_SCALES) {
    const c = getCell(table, scale, axis);
    // `없음`(연구했는데 관련 없음)과 `—`(안 쟀음) 둘 다 가중치가 없다
    if (c.kind === "value" && c.value !== 0)
      weights.push({ scale, r: c.value });
    /*
      가까운 개념을 섞어 **계산한** 추정치도 가중치로 쓴다 (조직생활).
      직접 잰 값과 섞이지 않도록 표시를 달아 화면에서 구분한다.
      부호만 있고 숫자가 없는 칸(위험회피)은 쓸 수 없다 — 크기가 없으면
      더할 수가 없다.
    */
    if (
      c.kind === "expected" &&
      typeof c.estimate === "number" &&
      c.estimate !== 0
    )
      weights.push({ scale, r: c.estimate, estimated: true });
  }
  if (weights.length === 0) return null;
  return predictWith(people, axis, weights);
}

/** 가중치가 정해진 뒤의 계산 — 축 하나든 묶은 값이든 여기서 똑같이 한다 */
function predictWith(
  people: Person[],
  axis: string,
  weights: { scale: string; r: number; estimated?: boolean }[],
): ResearchPrediction | null {
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

  // 최소제곱 회귀 — 평가 대조와 **같은 함수**로 긋는다 (D-?)
  const line = fitLine(predicted, actual) ?? {
    slope: 0,
    intercept: mean(actual),
  };

  return {
    axis,
    n: usable.length,
    fromEstimates: weights.some((w) => w.estimated),
    fit: line,
    weights,
    rows,
    corr: corrOf(predicted, actual),
    meanAbsGap: mean(rows.map((r) => Math.abs(r.gap))),
    farOff: rows.filter((r) => Math.abs(r.gap) >= FAR).length,
  };
}
