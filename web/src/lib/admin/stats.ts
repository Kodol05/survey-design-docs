/**
 * 분석 화면이 쓰는 통계 — 순수 함수. DB도 화면도 모른다.
 *
 * 이 파일의 값들이 관리자 화면 전부의 근거가 되므로, 계산 과정을 드러내고
 * **불확실성을 같이 내보낸다.** 상관계수만 반환하면 화면이 그것을 확정된
 * 값처럼 그리게 된다 (11 §2.2).
 */

export type Correlation = {
  r: number;
  n: number;
  /** 95% 신뢰구간 [하한, 상한] */
  ci: [number, number];
};

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

/** 피어슨 상관. 짝이 맞는 값만 넘긴다. */
export function pearson(xs: number[], ys: number[]): number {
  if (xs.length !== ys.length) throw new Error("두 배열의 길이가 다릅니다");
  const n = xs.length;
  if (n < 2) return 0;
  const mx = mean(xs);
  const my = mean(ys);
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    sxy += dx * dy;
    sxx += dx * dx;
    syy += dy * dy;
  }
  // 한쪽이 전부 같은 값이면 상관을 정의할 수 없다. 0으로 지어내지 않고 0을 반환하되
  // 호출부가 n으로 판단하게 둔다.
  if (sxx === 0 || syy === 0) return 0;
  return sxy / Math.sqrt(sxx * syy);
}

/**
 * 피셔 z 변환으로 낸 95% 신뢰구간.
 *
 * 이게 이 프로젝트에서 중요한 이유 — 같은 `.30`이라도 n=500이면 확실하고
 * n=37이면 구간이 `.00~.56`까지 벌어진다. 숫자만 보면 그 차이를 알 수 없다.
 */
export function fisherCI(r: number, n: number): [number, number] {
  if (n < 4) return [-1, 1];
  const clamped = Math.max(-0.9999, Math.min(0.9999, r));
  const z = Math.atanh(clamped);
  const se = 1 / Math.sqrt(n - 3);
  return [Math.tanh(z - 1.96 * se), Math.tanh(z + 1.96 * se)];
}

export function correlate(xs: number[], ys: number[]): Correlation {
  const r = pearson(xs, ys);
  return { r, n: xs.length, ci: fisherCI(r, xs.length) };
}

/** 신뢰구간이 0을 걸치면 방향조차 확정할 수 없다 */
export const crossesZero = (c: Correlation) => c.ci[0] <= 0 && c.ci[1] >= 0;

// ── 회귀 ────────────────────────────────────────────────────────────

export type Regression = {
  /** 절편 + 각 예측변수의 계수 */
  intercept: number;
  coefficients: number[];
};

/**
 * 최소제곱 다중회귀. 정규방정식을 가우스 소거로 푼다.
 * 예측변수가 7개, 표본이 40명 안팎이라 이 정도면 충분하다.
 */
export function fitLinear(X: number[][], y: number[]): Regression {
  const n = X.length;
  const p = X[0]?.length ?? 0;
  // 절편 항을 앞에 붙인다
  const A = X.map((row) => [1, ...row]);
  const m = p + 1;

  // XᵀX 와 Xᵀy
  const xtx: number[][] = Array.from({ length: m }, () => new Array(m).fill(0));
  const xty: number[] = new Array(m).fill(0);
  for (let i = 0; i < n; i++) {
    for (let a = 0; a < m; a++) {
      xty[a] += A[i][a] * y[i];
      for (let b = 0; b < m; b++) xtx[a][b] += A[i][a] * A[i][b];
    }
  }

  // 가우스 소거 (부분 피벗). 표본이 적어 특이해질 수 있으므로 작은 능선을 더한다
  for (let a = 0; a < m; a++) xtx[a][a] += 1e-8;
  const aug = xtx.map((row, i) => [...row, xty[i]]);
  for (let col = 0; col < m; col++) {
    let piv = col;
    for (let r = col + 1; r < m; r++)
      if (Math.abs(aug[r][col]) > Math.abs(aug[piv][col])) piv = r;
    [aug[col], aug[piv]] = [aug[piv], aug[col]];
    const d = aug[col][col];
    if (Math.abs(d) < 1e-12) continue;
    for (let c = col; c <= m; c++) aug[col][c] /= d;
    for (let r = 0; r < m; r++) {
      if (r === col) continue;
      const f = aug[r][col];
      for (let c = col; c <= m; c++) aug[r][c] -= f * aug[col][c];
    }
  }
  const sol = aug.map((row) => row[m]);
  return { intercept: sol[0], coefficients: sol.slice(1) };
}

export const predict = (reg: Regression, x: number[]) =>
  reg.intercept + x.reduce((s, v, i) => s + v * (reg.coefficients[i] ?? 0), 0);

export type LoocvResult = {
  /** 만든 데이터로 그대로 맞췄을 때의 평균 절대오차 */
  trainMae: number;
  /** 한 명씩 빼고 맞췄을 때의 평균 절대오차 */
  cvMae: number;
  /** 두 값의 차이가 곧 과적합 크기다 */
  gap: number;
  /** 사람별 (실제, 예측) — 산점도에 그대로 쓴다 */
  points: { actual: number; predicted: number }[];
  n: number;
};

/**
 * 한 명 빼고 나머지로 식을 만들어 뺀 사람을 맞춘다. n번 반복.
 *
 * 이걸 안 하면 반드시 잘 맞는다 — 회귀식은 주어진 데이터에 **맞춰서** 만들어지기
 * 때문이다. 외운 것을 다시 묻는 셈이다. `trainMae`와 `cvMae`의 차이가
 * 그 착시의 크기다 (10-core-ideas.md 계산식).
 */
export function loocv(X: number[][], y: number[]): LoocvResult {
  const n = X.length;
  const full = fitLinear(X, y);
  const trainMae = mean(X.map((x, i) => Math.abs(predict(full, x) - y[i])));

  const points: { actual: number; predicted: number }[] = [];
  for (let i = 0; i < n; i++) {
    const Xi = X.filter((_, k) => k !== i);
    const yi = y.filter((_, k) => k !== i);
    const reg = fitLinear(Xi, yi);
    points.push({ actual: y[i], predicted: predict(reg, X[i]) });
  }
  const cvMae = mean(points.map((p) => Math.abs(p.predicted - p.actual)));
  return { trainMae, cvMae, gap: cvMae - trainMae, points, n };
}

// ── 신뢰도 ──────────────────────────────────────────────────────────

/**
 * Cronbach's α — 한 척도의 문항들이 서로 맞물려 같은 것을 재는가.
 *
 * `rows[사람][문항]`. **응시 인원과 무관하게** 문항 품질을 말해주는 지표라
 * 표본이 작아도 볼 수 있다 (00 §5).
 */
export function cronbachAlpha(rows: number[][]): number | null {
  const n = rows.length;
  const k = rows[0]?.length ?? 0;
  if (n < 2 || k < 2) return null;

  const variance = (xs: number[]) => {
    const m = mean(xs);
    return xs.reduce((s, v) => s + (v - m) ** 2, 0) / (xs.length - 1);
  };

  let itemVarSum = 0;
  for (let j = 0; j < k; j++) itemVarSum += variance(rows.map((r) => r[j]));
  const totalVar = variance(rows.map((r) => r.reduce((a, b) => a + b, 0)));
  if (totalVar === 0) return null;
  return (k / (k - 1)) * (1 - itemVarSum / totalVar);
}

/** α 판정 기준. 편의값이지만 관행상 널리 쓰이는 선이다. */
export const ALPHA = { poor: 0.6, fair: 0.7 } as const;

export function alphaVerdict(a: number | null): "unknown" | "poor" | "fair" | "good" {
  if (a === null) return "unknown";
  if (a < ALPHA.poor) return "poor";
  if (a < ALPHA.fair) return "fair";
  return "good";
}

export type GroupDiff = {
  /** 위 무리 평균 − 아래 무리 평균 */
  diff: number;
  /** 차이의 95% 신뢰구간 */
  ci: [number, number];
  /** 표준화한 차이 (Cohen's d). 눈금이 달라도 크기를 견줄 수 있다 */
  d: number;
  upperMean: number;
  lowerMean: number;
  upperN: number;
  lowerN: number;
};

/**
 * 두 무리의 평균 차이 — **차이만 적으면 안 된다.**
 *
 * "상위 1/3은 62, 하위 1/3은 48"까지만 쓰면 14점이 큰 건지 우연인지 알 수 없다.
 * 사람이 12명씩이면 아무 관계가 없어도 10점 안팎은 그냥 나온다.
 *
 * 그래서 세 가지를 같이 낸다.
 *   - 차이의 **95% 신뢰구간** — 0을 걸치면 방향조차 확정이 아니다
 *   - **Cohen's d** — 퍼진 정도로 나눈 값이라 눈금이 달라도 견줄 수 있다
 *
 * 분산이 같다고 가정하지 않는다 (Welch). 무리 크기가 다르거나 한쪽이 더
 * 퍼져 있을 때 등분산 t는 구간을 실제보다 좁게 잡는다.
 */
export function groupDiff(upper: number[], lower: number[]): GroupDiff | null {
  const n1 = upper.length;
  const n2 = lower.length;
  if (n1 < 2 || n2 < 2) return null;

  const m1 = upper.reduce((a, b) => a + b, 0) / n1;
  const m2 = lower.reduce((a, b) => a + b, 0) / n2;
  const v1 = upper.reduce((n, x) => n + (x - m1) ** 2, 0) / (n1 - 1);
  const v2 = lower.reduce((n, x) => n + (x - m2) ** 2, 0) / (n2 - 1);

  const se = Math.sqrt(v1 / n1 + v2 / n2);
  const diff = m1 - m2;
  if (se === 0) return null;

  /*
    Welch-Satterthwaite 자유도. 정확한 t 임곗값 표를 들고 다니는 대신
    1.96에 작은 표본 보정을 얹는다 — df가 10을 넘으면 오차가 5% 안쪽이라
    화면에 적는 구간으로는 충분하다.
  */
  const df = (v1 / n1 + v2 / n2) ** 2 /
    ((v1 / n1) ** 2 / (n1 - 1) + (v2 / n2) ** 2 / (n2 - 1));
  const t = 1.96 + 2.4 / Math.max(1, df);

  // 합동 표준편차로 나눈 표준화 차이
  const pooled = Math.sqrt(((n1 - 1) * v1 + (n2 - 1) * v2) / (n1 + n2 - 2));

  return {
    diff,
    ci: [diff - t * se, diff + t * se],
    d: pooled === 0 ? 0 : diff / pooled,
    upperMean: m1,
    lowerMean: m2,
    upperN: n1,
    lowerN: n2,
  };
}
