/**
 * n 배지 — docs/11-ui-guide.md §2.2
 *
 * 상관이 나오는 모든 자리에 붙는다. 예외 없다.
 * 같은 .30이라도 500명이면 확실하고 43명이면 거의 의미가 없다.
 * 숫자만 놓으면 보는 사람이 그 차이를 알 수 없다.
 */

/** 사내 통계를 표시할 수 있는 최소 인원 (00 D-24) */
export const MIN_N = 30;

export type CorrelationValue = {
  /** 상관계수. −1 ~ +1 */
  r: number;
  /** 이 값을 낸 표본 수 */
  n: number;
  /** 95% 신뢰구간 [하한, 상한] */
  ci: [number, number];
};

/** 신뢰구간이 0을 걸치면 방향조차 확정할 수 없다 */
export function crossesZero(ci: [number, number]): boolean {
  return ci[0] <= 0 && ci[1] >= 0;
}

/** 소수 둘째 자리, 앞의 0 생략, 부호 항상 표기 — `+.28` (11 §3.2) */
export function formatR(r: number): string {
  const sign = r < 0 ? "−" : "+";
  return sign + Math.abs(r).toFixed(2).replace(/^0/, "");
}

export function NBadge({ value }: { value: CorrelationValue }) {
  if (value.n < MIN_N) {
    return <span className="text-axis text-ink-muted">n 부족</span>;
  }

  const uncertain = crossesZero(value.ci);

  return (
    <span className={uncertain ? "opacity-50" : undefined}>
      <span className="text-table tabular font-medium">{formatR(value.r)}</span>
      {uncertain && (
        <span
          aria-hidden
          className="ml-1 inline-block size-1.5 rounded-full align-middle"
          style={{ background: "var(--status-warn)" }}
        />
      )}
      <span className="text-axis tabular ml-2 text-ink-muted">
        n={value.n} {formatR(value.ci[0])}~{formatR(value.ci[1])}
      </span>
      {uncertain && <span className="sr-only">신뢰구간이 0을 걸칩니다.</span>}
    </span>
  );
}
