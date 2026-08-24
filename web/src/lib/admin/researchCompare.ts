import { ABILITY_AXES, TRAIT_SCALES } from "@/lib/items/types";
import { getCell, loadResearchTable } from "@/lib/research/correlations";
import { cellOf } from "./analysis";
import type { Correlation } from "./stats";

/**
 * 연구값과 사내값을 칸 단위로 맞대 본다.
 *
 * ## "다르다"를 어떻게 판정하는가
 *
 * 두 숫자를 빼서 크면 다르다고 하면 안 된다. 우리 쪽 값은 44명에서 나온 것이라
 * **원래 흔들린다.** 연구값이 `+.34`이고 우리 값이 `+.18`이어도, 우리 구간이
 * `−.12 ~ +.45`라면 연구값은 그 안에 들어 있다. 어긋난 게 아니라 **우리
 * 데이터로는 아직 가릴 수 없는** 것이다.
 *
 * 그래서 판정 기준을 **연구값이 우리 95% 신뢰구간 안에 들어오는가**로 잡는다.
 * 들어오면 `들어맞음`, 벗어나면 `어긋남`이다. 사람이 늘어 구간이 좁아질수록
 * 이 판정이 날카로워진다 — 지금은 대부분 `들어맞음`으로 나오는 게 정상이다.
 *
 * 차이값(`diff`)은 참고로만 같이 준다. 정렬은 차이가 큰 순이다 —
 * 눈에 띄는 어긋남이 위로 올라와야 볼 것이 먼저 보인다.
 */
export type ResearchCompare = {
  scale: string;
  axis: string;
  /** 논문에서 나온 값 */
  research: number;
  /** 우리 데이터로 낸 값 */
  ours: number;
  ci: [number, number];
  n: number;
  /** 우리 값 − 연구값 */
  diff: number;
  /** 연구값이 우리 신뢰구간 안에 들어오는가 */
  compatible: boolean;
  /** 부호가 같은가. 참고용 — 판정에는 쓰지 않는다 */
  sameDirection: boolean;
};

/** 숫자 없이 방향만 세운 칸 — 조직생활 (연구 표의 `expected`) */
export type DirectionCheck = {
  scale: string;
  axis: string;
  /** 예상한 방향 */
  expected: 1 | -1;
  /** 우리 데이터에서 나온 값 */
  ours: number;
  ci: [number, number];
  n: number;
  basis: string;
  /** 부호가 예상과 같은가 */
  matches: boolean;
  /** 구간이 0을 걸치면 아직 방향을 못 정한다 */
  uncertain: boolean;
};

export type CompareSummary = {
  rows: ResearchCompare[];
  /**
   * 방향만 예상한 칸의 대조.
   *
   * 숫자가 없으니 「들어맞음/어긋남」을 구간으로 판정할 수 없다. 대신
   * **부호가 맞았는지**만 본다. 우리 구간이 0을 벗어났는데 부호가 반대면
   * 그건 진짜 어긋난 것이고, 볼 만한 발견이다.
   */
  directions: DirectionCheck[];
  /** 양쪽에 값이 다 있어서 비교할 수 있었던 칸 수 */
  comparable: number;
  /** 그중 어긋나지 않은 칸 수 */
  compatible: number;
  /** 연구값이 아예 없어 비교할 수 없었던 칸 수 */
  noResearch: number;
};

export function compareToResearch(m: {
  cells: Map<string, Correlation>;
}): CompareSummary {
  const table = loadResearchTable();
  const rows: ResearchCompare[] = [];
  const directions: DirectionCheck[] = [];
  let noResearch = 0;

  for (const scale of TRAIT_SCALES) {
    for (const axis of ABILITY_AXES) {
      const ours = cellOf(m, scale, axis);
      const research = getCell(table, scale, axis);

      // 방향만 세운 칸은 부호만 맞대 본다
      if (research.kind === "expected" && ours) {
        const uncertain = ours.ci[0] <= 0 && ours.ci[1] >= 0;
        directions.push({
          scale,
          axis,
          expected: research.direction,
          ours: ours.r,
          ci: ours.ci,
          n: ours.n,
          basis: research.basis,
          matches: Math.sign(ours.r) === research.direction,
          uncertain,
        });
        continue;
      }

      // 연구된 적 없음(`—`)과 관련 없음(`없음`)은 둘 다 맞댈 숫자가 없다.
      // `없음`을 0으로 바꿔 넣지 않는다 — "0이라고 보고했다"와 "안 쟀다"는 다르다.
      if (research.kind !== "value" || !ours) {
        noResearch++;
        continue;
      }

      const [lo, hi] = ours.ci;
      rows.push({
        scale,
        axis,
        research: research.value,
        ours: ours.r,
        ci: ours.ci,
        n: ours.n,
        diff: ours.r - research.value,
        compatible: research.value >= lo && research.value <= hi,
        sameDirection: Math.sign(ours.r) === Math.sign(research.value),
      });
    }
  }

  rows.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));

  // 확정된 것이 위로. 확정 안 된 것은 아직 할 말이 없다
  directions.sort((a, b) => Number(a.uncertain) - Number(b.uncertain));

  return {
    rows,
    directions,
    comparable: rows.length,
    compatible: rows.filter((r) => r.compatible).length,
    noResearch,
  };
}
