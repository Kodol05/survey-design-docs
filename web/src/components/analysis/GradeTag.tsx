import { gradeOf } from "./correlationWords";

/**
 * 상관 숫자 옆에 붙는 등급 딱지.
 *
 * `+.31` 하나만 놓으면 큰지 작은지 알 수 없다. 딱지가 그 자리에서 기준을
 * 같이 준다 — `+.31 뚜렷함`.
 *
 * **색을 쓰지 않는다.** 표 칸은 이미 관계의 방향으로 칠해져 있어서 딱지까지
 * 색을 가지면 무슨 색이 무슨 뜻인지 헷갈린다. 하나 예외가 `불확실`인데,
 * 이건 값에 대한 말이 아니라 **읽지 말라는 표시**라 경고색을 쓴다.
 */
export function GradeTag({
  r,
  ci,
  className = "",
}: {
  r: number;
  ci?: [number, number];
  className?: string;
}) {
  const g = gradeOf(r, ci);
  const warn = g === "불확실";
  return (
    <span
      className={`text-axis whitespace-nowrap ${className}`}
      style={{ color: warn ? "var(--status-warn)" : "var(--ink-secondary)" }}
    >
      {g}
    </span>
  );
}
