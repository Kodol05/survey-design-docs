import { gradeOf, isUncertain } from "./correlationWords";

/**
 * 상관 숫자 옆에 붙는 등급 딱지.
 *
 * `+.31` 하나만 놓으면 큰지 작은지 알 수 없다. 딱지가 그 자리에서 기준을
 * 같이 준다 — `+.31 뚜렷함`.
 *
 * **크기와 확실함을 따로 말한다.** 등급은 언제나 크기로 적고, 신뢰구간이
 * 0을 걸치면 뒤에 `?`를 붙이고 색을 죽인다. 등급 자리를 「불확실」로
 * 덮어쓰면 `.20~.29`짜리 「어느 정도」가 영영 화면에 못 나온다 —
 * 그 구간은 37명에서 항상 0을 걸치기 때문이다.
 *
 * @param onFill 칠해진 칸 위에 얹히는가. 칠 위에서는 본문 잉크로 쓴다.
 *   옅은 회색은 색 있는 배경에서 대비가 무너져 안 보인다.
 */
export function GradeTag({
  r,
  ci,
  onFill = false,
  className = "",
}: {
  r: number;
  ci?: [number, number];
  onFill?: boolean;
  className?: string;
}) {
  const soft = isUncertain(ci);
  return (
    <span
      className={`text-axis whitespace-nowrap ${className}`}
      style={{
        color: onFill ? "var(--ink)" : "var(--ink-secondary)",
        opacity: soft ? 0.65 : 1,
      }}
      title={soft ? "신뢰구간이 0을 걸칩니다 — 방향이 아직 확정되지 않았습니다" : undefined}
    >
      {gradeOf(r)}
      {soft && (
        <span aria-hidden className="ml-0.5">
          ?
        </span>
      )}
      {soft && <span className="sr-only">, 아직 확정되지 않음</span>}
    </span>
  );
}
