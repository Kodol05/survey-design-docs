import { gradeOf } from "./correlationWords";

/**
 * 상관 숫자 옆에 붙는 등급 딱지.
 *
 * `+.31` 하나만 놓으면 큰지 작은지 알 수 없다. 딱지가 그 자리에서 기준을
 * 같이 준다 — `+.31 뚜렷함`.
 *
 * **색으로 세기를 말하지 않는다.** 표 칸은 이미 관계의 방향으로 칠해져 있어서
 * 딱지까지 색을 가지면 무슨 색이 무슨 뜻인지 헷갈린다. 하나 예외가 `불확실`인데,
 * 이건 값에 대한 말이 아니라 **읽지 말라는 표시**라 경고색을 쓴다.
 *
 * @param onFill 칠해진 칸 위에 얹히는가. **칠 위에서는 전부 본문 잉크로 쓴다.**
 *   옅은 회색이나 노랑은 색 있는 배경에서 대비가 무너져 안 보인다.
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
  const g = gradeOf(r, ci);
  const warn = g === "불확실";
  return (
    <span
      className={`text-axis whitespace-nowrap ${className}`}
      style={{
        color: onFill
          ? "var(--ink)"
          : warn
            ? "var(--status-warn-ink)"
            : "var(--ink-secondary)",
        fontWeight: warn && onFill ? 600 : undefined,
      }}
    >
      {g}
    </span>
  );
}
