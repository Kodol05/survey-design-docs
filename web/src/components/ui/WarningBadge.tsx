/**
 * 경고 배지 — docs/11-ui-guide.md §2.3
 *
 * 색만으로 표시하지 않는다. 아이콘 + 글자를 항상 같이 쓴다.
 * 이 문구들은 임의로 바꾸지 말 것 — 화면이 하지 않는 일을 명확히 하는 장치다.
 */

export const WARNINGS = {
  /** 세부 28항목 × 능력 3개 = 84개 상관. 관계가 없어도 네댓 개는 우연히 높게 나온다 */
  multipleComparison:
    "탐색용입니다. 우연히 높게 나온 값이 섞여 있을 수 있습니다",
  /** 회귀식을 만든 데이터로 그 식을 검증하면 반드시 잘 맞는다 */
  overfitting: "이 회사 데이터로 만든 식이라 실제 오차는 더 큽니다",
  /** α가 .60 아래면 그 척도의 상관은 볼 필요가 없다 */
  lowReliability: "이 척도는 아직 안정적이지 않습니다",
  /** 00 D-24 */
  smallSample: "아직 비교할 만큼 모이지 않았습니다",
} as const;

export type WarningKind = keyof typeof WARNINGS;

const tone: Record<WarningKind, string> = {
  multipleComparison: "var(--status-serious)",
  overfitting: "var(--status-serious)",
  lowReliability: "var(--status-critical)",
  smallSample: "var(--status-warn)",
};

export function WarningBadge({ kind }: { kind: WarningKind }) {
  return (
    <p
      role="note"
      className="text-axis inline-flex items-start gap-1.5 rounded-md px-2 py-1"
      style={{ color: tone[kind], background: "var(--surface)" }}
    >
      <span aria-hidden>⚠</span>
      <span className="text-ink-secondary">{WARNINGS[kind]}</span>
    </p>
  );
}
