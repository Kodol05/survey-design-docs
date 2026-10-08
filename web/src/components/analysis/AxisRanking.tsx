"use client";

import type { Point } from "./ScatterPlot";
import { describeCorrelation } from "./correlationWords";
import { ShareList, type ShareRow } from "./ShareList";

/**
 * 능력 하나에 대해 **성향 7축을 순위로** (2026-08-25 사용자 요청).
 *
 * 위 상관표를 그린 값을 그대로 정렬해 쓴다 — 새로 계산하지 않으므로 두 화면이
 * 어긋날 일이 없다. 표는 7×3 격자라 「협력 열에서 어느 것이 큰가」를 세로로
 * 훑어야 하는데, 여기는 이미 순위다.
 *
 * 줄 모양은 `ShareList`가 맡는다 — 값은 `+15% (+0.39)` 꼴로 적고 막대는
 * r²에 비례한다 (2026-10-07 사용자 결정). 능력 이름 아래의 한 줄 결론
 * 문장은 지웠다 — 순위가 이미 그 말을 한다.
 *
 * 「없음」 줄은 접어 둔다 (2026-08-25 사용자 요청). 관련이 없다는 것도
 * 정보라 지우지는 않는다.
 */

export type AxisRow = ShareRow;

export function AxisRanking({
  axis,
  rows,
  full,
  scatter,
  trends,
}: {
  axis: string;
  /** 이미 큰 순으로 정렬된 7축 */
  rows: AxisRow[];
  /** 막대가 끝까지 차는 % — 화면 전체가 같은 값을 쓴다 */
  full: number;
  /** `축이름` → 점. 줄을 눌렀을 때 그린다 */
  scatter?: Record<string, Point[]>;
  trends?: Record<string, { x: number; y: number }[] | null>;
}) {
  return (
    <div>
      <h3 className="text-table mb-1 font-semibold">{axis}</h3>
      <ShareList
        rows={rows}
        full={full}
        target={axis}
        sentence={(r) => `${describeCorrelation(r.scale, axis, r.r)}.`}
        scatter={scatter}
        trends={trends}
        foldNone
      />
    </div>
  );
}
