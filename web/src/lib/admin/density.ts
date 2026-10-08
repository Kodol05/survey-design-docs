import { quantile } from "./spread";

/**
 * 한 축의 **언덕 모양** — 커널 밀도 추정 (2026-10-07 사용자 결정).
 *
 * 분포 탭을 점 쌓기에서 언덕(밀도 곡선)으로 바꾸었다. 점 쌓기는 4점 칸에
 * 따라 모양이 들쭉날쭉해서 「사람이 어디에 몰려 있나」를 한눈에 말하지
 * 못했다. 사람 한 명 한 명은 곡선 아래 눈금(러그)으로 남긴다.
 *
 * 여기에는 그리는 일과 상관없는 계산만 둔다 — 띠 폭, 곡선, 사분위.
 * 화면 없이 시험할 수 있어야 「곡선 넓이가 1인가」 같은 것을 붙잡아 둘 수 있다.
 */

/** 눈금의 양 끝. 성향·직무능력 모두 0~100 */
export const LO = 0;
export const HI = 100;

/*
  **띠 폭의 바닥** (2026-10-07).

  실버먼 규칙은 사람이 마흔 명 안팎이고 몇 명이 한 점수에 몰리면 폭을 너무
  좁게 잡는다 — 곡선이 사람 수만큼 뾰족뾰족해져서 언덕이 아니라 빗살이 된다.
  점 쌓기 때 칸 폭이 4점이었으니 그보다 잘게 볼 이유가 없다. 4점 아래로는
  내려가지 않게 막는다.
*/
export const MIN_BANDWIDTH = 4;

export type Curve = {
  /** 0, 1, 2, … 100 — 곡선을 재는 자리 */
  xs: number[];
  /** 그 자리의 밀도. 0~100 위에서 넓이가 1 (값이 없으면 모두 0) */
  ys: number[];
  /** 쓴 띠 폭 */
  bandwidth: number;
  /** 가장 높은 밀도 — 줄 높이를 맞추는 데 쓴다 */
  peak: number;
};

const clamp = (v: number) => Math.max(LO, Math.min(HI, v));

/**
 * 실버먼 규칙: 0.9 · min(표준편차, 사분위 범위/1.34) · n^(-1/5).
 *
 * 사분위 범위가 0이면(절반 넘게 같은 값) 표준편차만 쓴다. 그것도 0이거나
 * 값이 하나뿐이면 바닥값을 쓴다.
 */
export function silvermanBandwidth(
  values: number[],
  min = MIN_BANDWIDTH,
): number {
  const n = values.length;
  if (n < 2) return min;
  const sorted = [...values].sort((a, b) => a - b);
  const mean = sorted.reduce((a, b) => a + b, 0) / n;
  const sd = Math.sqrt(
    sorted.reduce((acc, v) => acc + (v - mean) ** 2, 0) / (n - 1),
  );
  const iqr = quantile(sorted, 0.75) - quantile(sorted, 0.25);
  const spread = iqr > 0 ? Math.min(sd, iqr / 1.34) : sd;
  const h = 0.9 * spread * n ** -0.2;
  return Number.isFinite(h) ? Math.max(min, h) : min;
}

const SQRT_2PI = Math.sqrt(2 * Math.PI);
const gauss = (u: number) => Math.exp(-0.5 * u * u) / SQRT_2PI;

/** 사다리꼴 넓이 — 시험에서도 같은 방식으로 잰다 */
export function integrate(xs: number[], ys: number[]): number {
  let area = 0;
  for (let i = 1; i < xs.length; i++)
    area += ((ys[i] + ys[i - 1]) / 2) * (xs[i] - xs[i - 1]);
  return area;
}

/**
 * 가우스 커널 밀도 곡선. 0~100을 `step` 간격으로 잰다.
 *
 * ## 양 끝을 **접어서** 0~100 안에 가둔다
 *
 * 그대로 그리면 90점인 사람의 언덕 꼬리가 100 밖으로 흘러나가서, 끝에 몰린
 * 축일수록 끝 쪽이 실제보다 낮아 보인다. 0과 100에서 거울에 비춘 값을 함께
 * 더하면(반사법) 흘러나간 몫이 안으로 되돌아온다. 그다음 넓이를 다시 재서
 * 1로 맞춘다 — 띠 폭이 아주 넓어 두 번 넘게 접혀야 하는 경우까지 덮는다.
 */
export function densityCurve(
  values: number[],
  { bandwidth, step = 1 }: { bandwidth?: number; step?: number } = {},
): Curve {
  const count = Math.max(1, Math.round((HI - LO) / step));
  const xs = Array.from({ length: count + 1 }, (_, i) =>
    i === count ? HI : LO + i * ((HI - LO) / count),
  );

  const usable = values.filter((v) => Number.isFinite(v)).map(clamp);
  const h = bandwidth ?? silvermanBandwidth(usable);
  if (usable.length === 0)
    return { xs, ys: xs.map(() => 0), bandwidth: h, peak: 0 };

  const ys = xs.map((x) => {
    let sum = 0;
    for (const v of usable)
      sum +=
        gauss((x - v) / h) +
        gauss((x + v - 2 * LO) / h) + // 0에서 비춘 값 (-v)
        gauss((x - (2 * HI - v)) / h); // 100에서 비춘 값 (200 - v)
    return sum / (usable.length * h);
  });

  const area = integrate(xs, ys);
  const norm = area > 0 ? ys.map((y) => y / area) : ys;
  return { xs, ys: norm, bandwidth: h, peak: Math.max(...norm) };
}

/** 곡선 위 임의 자리의 높이 — 잰 자리 사이는 직선으로 잇는다 */
export function densityAt(c: Curve, x: number): number {
  const v = clamp(x);
  let i = 1;
  while (i < c.xs.length - 1 && c.xs[i] < v) i++;
  const x0 = c.xs[i - 1];
  const x1 = c.xs[i];
  const t = x1 === x0 ? 0 : (v - x0) / (x1 - x0);
  return c.ys[i - 1] + t * (c.ys[i] - c.ys[i - 1]);
}

/**
 * `from`~`to` 사이 곡선 조각. 양 끝은 잰 자리가 아니어도 정확히 그 값에서
 * 끊는다 — 가운데 절반을 칠할 때 경계가 1점 단위로 어긋나지 않게.
 */
export function sliceCurve(
  c: Curve,
  from: number,
  to: number,
): [number, number][] {
  const a = clamp(Math.min(from, to));
  const b = clamp(Math.max(from, to));
  const pts: [number, number][] = [[a, densityAt(c, a)]];
  c.xs.forEach((x, i) => {
    if (x > a && x < b) pts.push([x, c.ys[i]]);
  });
  pts.push([b, densityAt(c, b)]);
  return pts;
}

/** 중앙값과 사분위 (R type 7 — `spread.ts`와 같은 방식). 값이 없으면 NaN */
export function quartiles(values: number[]): {
  q1: number;
  median: number;
  q3: number;
} {
  const sorted = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  return {
    q1: quantile(sorted, 0.25),
    median: quantile(sorted, 0.5),
    q3: quantile(sorted, 0.75),
  };
}
