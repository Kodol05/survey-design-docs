import { CHARACTER } from "../charts/scale";
import { formatR } from "./correlationColor";
import { DivergingBar } from "./DivergingBar";
import { GradeTag } from "./GradeTag";
import { AlphaNote } from "./AlphaNote";
import { subjectParticle } from "./correlationWords";
import type { ScaleReliability } from "@/lib/admin/analysis";

/**
 * 능력 하나에 대해 **성향 7축을 순위로** (2026-08-25 사용자 요청).
 *
 * ## 위 표와 같은 수치를 쓴다
 *
 * 한때 이 자리에 「높은 3분의 1 대 낮은 3분의 1」 덤벨 그림을 놓았다.
 * 점수 차이라 총합을 볼 때는 잘 읽혔는데, **능력마다 일곱 줄씩 세 벌**을
 * 놓으니 「이 그림이 위 표와 무슨 관계인가」가 안 잡혔다 (사용자 지적:
 * 「이해하기 어렵고 직관적이지 않다」).
 *
 * 그래서 **위 표와 똑같은 값**(상관계수)을 쓴다. 표는 7×3 격자라 「협력
 * 열에서 어느 것이 큰가」를 세로로 훑어야 하는데, 여기는 **이미 순위로
 * 정렬**되어 있다. 같은 숫자를 다른 방식으로 꺼내 보는 것이지 새 계산이
 * 아니다 — 그래서 두 화면이 어긋날 일이 없다.
 *
 * ## 뚜렷한 것만 문장으로 부른다
 *
 * 일곱 줄을 다 보여주되, 위에 **방향이 확정된 것**만 이름으로 부른다.
 * 확정 안 된 것을 「2위」라 부르면 없는 순서를 만드는 셈이다.
 */

export type AxisRow = {
  scale: string;
  r: number;
  n: number;
  ci: [number, number];
};

export function AxisRanking({
  axis,
  rows,
  reliability,
}: {
  axis: string;
  /** 이미 큰 순으로 정렬된 7축 */
  rows: AxisRow[];
  reliability?: ScaleReliability;
}) {
  const poor = reliability?.verdict === "poor";
  const settled = rows.filter((r) => !crosses(r.ci));

  return (
    <div>
      <p className="mb-3 flex flex-wrap items-baseline gap-x-3 border-b border-[--border] pb-2">
        <span className="text-section-title">{axis}</span>
        <AlphaNote r={reliability} className="!mt-0 !inline" />
      </p>

      {/* 한 줄 결론 */}
      <p className="text-ink-secondary mb-5 max-w-[52rem] leading-relaxed">
        {settled.length === 0 ? (
          <>
            <strong>뚜렷하게 관련된 축이 아직 없습니다.</strong> 일곱 줄 모두
            방향이 확정되지 않았습니다.
          </>
        ) : (
          <>
            {axis}
            {subjectParticle(axis)} 뚜렷하게 관련된 것은{" "}
            {settled.slice(0, 3).map((r, i) => (
              <span key={r.scale}>
                {i > 0 && (i === settled.slice(0, 3).length - 1 ? ", " : ", ")}
                <strong className="text-ink">{r.scale}</strong>
                <span className="tabular text-ink-muted"> {formatR(r.r)}</span>
              </span>
            ))}
            입니다
            {settled.length > 3 && ` (그 밖에 ${settled.length - 3}개 더)`}.
          </>
        )}
      </p>

      <ul className="flex flex-col" style={{ opacity: poor ? 0.55 : 1 }}>
        {rows.map((r, i) => {
          const on = !crosses(r.ci);
          return (
            <li
              key={r.scale}
              className="grid grid-cols-[minmax(0,12rem)_minmax(0,1fr)_3.5rem_5rem] items-center gap-x-5 border-b border-[--border] py-2.5 last:border-0"
            >
              <span className="flex items-baseline gap-2">
                <span
                  className="text-axis text-ink-muted tabular w-4 text-right"
                  style={{ opacity: on ? 1 : 0.45 }}
                >
                  {i + 1}
                </span>
                <span className="text-table truncate">{r.scale}</span>
                <span className="text-axis text-ink-muted shrink-0">
                  {(CHARACTER as readonly string[]).includes(r.scale)
                    ? "성격"
                    : "기질"}
                </span>
              </span>

              {/* 위 표의 칸막대와 같은 규칙 — 0이 가운데, 파랑 +, 주황 − */}
              <DivergingBar r={r.r} faded={!on} ci={r.ci} height={16} />

              <span className="text-table tabular text-right font-medium">
                {formatR(r.r)}
              </span>

              <GradeTag r={r.r} ci={r.ci} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const crosses = (ci: [number, number]) => ci[0] <= 0 && ci[1] >= 0;
