/**
 * 상관을 말로 옮긴다.
 *
 * `+.62 n=37 · +.37~+.78` 은 통계를 아는 사람에게만 읽힌다. 이 시스템에서
 * 이 화면을 보는 사람은 대표님이고(00 D-15), 숫자 읽는 훈련을 전제할 수 없다.
 *
 * 그래서 **등급을 숫자 옆에 붙인다.** 숫자를 지우지는 않는다 — 지우면 근거를
 * 확인할 방법이 사라지고, n·신뢰구간 배지는 11 §2.2에서 필수로 못 박혀 있다.
 */

/** 받침이 있으면 `이`, 없으면 `가` */
function subjectParticle(word: string): string {
  const c = word.charCodeAt(word.length - 1);
  if (c < 0xac00 || c > 0xd7a3) return "가";
  return (c - 0xac00) % 28 === 0 ? "가" : "이";
}

export type Strength = "매우 뚜렷함" | "뚜렷함" | "어느 정도" | "약함" | "없음";
export type Grade = Strength | "불확실";

/**
 * 세기 구분 — 기준선을 **Cohen이 아니라 Funder·Ozer로 잡는다.**
 *
 * Cohen(1988)의 .10/.30/.50은 실험 연구를 놓고 만든 값이라, 성향처럼 사람마다
 * 다른 것을 다루는 자리에서는 기준이 너무 높다. 성격 연구에서 |r|이 .50을
 * 넘는 일은 사실상 없어서, Cohen을 그대로 쓰면 **쓸 만한 관계가 전부 "약함"으로
 * 깎여 보인다.**
 *
 * Gignac & Szodorai(2016)가 개인차 연구 708개 상관을 모아 본 실제 분포는
 * 25% 지점 .11 · 중앙값 .19 · 75% 지점 .29였다. 그래서 .10 / .20 / .30을
 * 경계로 삼는다 — 이 분야에서 **평범한가, 위쪽 4분의 1인가**를 가르는 선이다.
 * Funder & Ozer(2019)도 같은 이유로 .30을 "매우 큼"으로 본다.
 *
 * .50 칸은 실제로는 거의 안 나온다. 나오면 그건 두 값이 사실상 같은 것을
 * 재고 있다는 신호라 따로 볼 수 있게 남겨 둔다.
 */
export const BANDS: { min: number; label: Strength }[] = [
  { min: 0.5, label: "매우 뚜렷함" },
  { min: 0.3, label: "뚜렷함" },
  { min: 0.2, label: "어느 정도" },
  { min: 0.1, label: "약함" },
  { min: 0, label: "없음" },
];

export function strengthOf(r: number): Strength {
  const a = Math.abs(r);
  return (BANDS.find((b) => a >= b.min) ?? BANDS[BANDS.length - 1]).label;
}

/** 표에서 굵게 둘 만한가 — .30 위 (위 4분의 1) */
export function isNotable(r: number): boolean {
  return Math.abs(r) >= 0.3;
}

/**
 * 화면에 붙일 등급.
 *
 * **신뢰구간이 0을 걸치면 등급을 주지 않는다.** 세기를 말하려면 먼저 방향이
 * 정해져야 하는데, 구간이 0을 넘나든다는 것은 같이 오르는지 반대로 가는지조차
 * 확정이 안 됐다는 뜻이다. 그 자리에 "뚜렷함"을 적으면 없는 것을 봤다고
 * 말하는 셈이 된다.
 *
 * 사람이 44명일 때 0을 안 걸치려면 |r|이 대략 .30은 넘어야 한다. 그래서
 * 사내 표는 상당수 칸이 `불확실`로 나온다 — 감추는 게 아니라 실제로 그렇다.
 */
export function gradeOf(r: number, ci?: [number, number]): Grade {
  if (ci && ci[0] <= 0 && ci[1] >= 0) return "불확실";
  return strengthOf(r);
}

/**
 * "연대감이 높은 사람일수록 조직생활 점수도 높습니다"
 *
 * **"~일수록"으로 쓰고 "~때문에"로 쓰지 않는다.** 같이 움직인다는 것이지
 * 한쪽이 다른 쪽을 만든다는 뜻이 아니다. 화면 아래 주석에도 한 번 더 적는다.
 */
export function describeCorrelation(scale: string, axis: string, r: number): string {
  const p = subjectParticle(scale);
  return r >= 0
    ? `${scale}${p} 높은 사람일수록 ${axis} 점수도 높습니다`
    : `${scale}${p} 높은 사람일수록 ${axis} 점수는 낮습니다`;
}
