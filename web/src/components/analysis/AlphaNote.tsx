import type { ScaleReliability } from "@/lib/admin/analysis";

/**
 * 척도 이름 옆에 붙는 **α 한 줄.**
 *
 * ## 왜 상관 화면에 α가 있어야 하는가
 *
 * α는 「이 척도의 문항들이 같은 것을 재고 있는가」다. 안 맞물리면 그 척도로
 * 잰 점수에 잡음이 섞이고, **잡음이 섞인 값으로 잰 상관은 실제보다 작게
 * 나온다**(attenuation). 그래서 α가 낮은 축의 상관은 「관련이 약하다」가
 * 아니라 **「아직 말할 수 없다」**로 읽어야 한다.
 *
 * 그동안 이 사실이 화면에 없었다. 「검사 신뢰도」 탭에만 α가 있고, 상관표는
 * 모든 열을 똑같이 진하게 그렸다. 두 화면이 서로를 몰랐다.
 *
 * ## 판정 낱말
 *
 * 「미달」이라고 쓰지 않는다. 사람을 깎는 말로 읽히는 것도 있지만, 여기서
 * 낮은 것은 **우리가 만든 문항**이지 응답자가 아니다.
 */
export function AlphaNote({
  r,
  className = "",
}: {
  r: ScaleReliability | undefined;
  className?: string;
}) {
  if (!r || r.alpha === null) return null;

  const poor = r.verdict === "poor";
  const fair = r.verdict === "fair";
  return (
    <span
      className={`text-axis mt-0.5 block leading-tight font-normal ${className}`}
      style={{
        color: poor
          ? "var(--status-critical)"
          : fair
            ? "var(--status-warn-ink)"
            : "var(--ink-muted)",
      }}
      title={`문항 ${r.itemCount}개의 Cronbach's α — 문항끼리 얼마나 맞물리는지`}
    >
      {/* 앞의 0을 뗀다 — 화면 다른 곳의 상관 표기(`+.44`)와 같은 규칙 */}
      <span className="tabular">α {r.alpha.toFixed(2).replace(/^0/, "")}</span>
      {poor && <> · 기준 아래</>}
    </span>
  );
}

/** α가 기준 아래인 척도 이름들. 빈 배열이면 다 괜찮다는 뜻 */
export function poorScales(
  rows: ScaleReliability[],
  kind?: ScaleReliability["kind"],
): string[] {
  return rows
    .filter((r) => r.verdict === "poor" && (!kind || r.kind === kind))
    .map((r) => r.scale);
}
