import { ABILITY_AXES, TRAIT_SCALES } from "@/lib/items/types";
import {
  cellOf,
  loadPeople,
  loadReliability,
  traitAbilityMatrix,
} from "./analysis";
import type { ScaleReliability } from "./analysis";
import { ensureBackup, listBackups } from "./backup";
import { ratingProgress } from "./ratings";
import { loadAttendance, loadSummary } from "./summary";

/**
 * 대시보드가 한 화면을 그리는 데 필요한 것 (2026-08-25 분리).
 *
 * 화면 파일 안에서 다섯 가지를 읽고 α를 걸러 평균 내고 뚜렷한 조합을
 * 줄 세우고 있었다. **읽는 일과 그리는 일을 갈라 둔다** — 숫자가 이상할 때
 * 어디를 봐야 하는지가 분명해진다.
 */

/**
 * α는 **성향 7축만** 센다.
 *
 * 직무능력 3축은 여러 요소가 모여 이루는 값이라 α로 판정할 척도가 아니다
 * (`CorrelationTable` 머리말 참고). 평균에도, 「기준 아래」 세기에도 넣지
 * 않는다 — 섞으면 「우리 검사 신뢰도 .77」처럼 **잣대가 안 맞는 값이 섞인
 * 숫자**가 나온다.
 *
 * ⚠️ 대시보드와 분석 화면이 **같은 수를 말해야** 하므로 한 군데서만 센다.
 */
export function traitAlpha(rows: ScaleReliability[]) {
  const traits = rows.filter((r) => r.kind === "trait");
  const values = traits
    .map((r) => r.alpha)
    .filter((a): a is number => a !== null);

  return {
    scales: traits,
    mean: values.length
      ? values.reduce((a, b) => a + b, 0) / values.length
      : null,
    poor: traits.filter((r) => r.verdict === "poor"),
  };
}

/** 성향 축 × 직무능력 한 칸 */
export type Relation = {
  scale: string;
  axis: string;
  r: number;
  n: number;
  ci: [number, number];
};

export async function loadDashboard() {
  /*
    백업은 **여기서 걸린다.** 별도 스케줄러를 두지 않고, 관리자가 이 화면을
    열 때 「마지막 백업이 24시간 넘었나」만 본다 (D-28). 지났으면 그 자리에서
    뜬다 — 압축하면 100KB 남짓이라 화면이 느려지지 않는다.

    `ensureBackup`은 던지지 않는다. 백업이 안 됐다고 대시보드가 안 열리면
    안 되고, 실패는 화면의 「마지막 백업」 시각이 그대로인 것으로 드러난다.
  */
  const [rating, summary, people, reliability, attendance] = await Promise.all([
    ratingProgress(),
    loadSummary(),
    loadPeople(),
    loadReliability(),
    loadAttendance(),
    ensureBackup(),
  ]);
  const backups = await listBackups();
  /*
    「몇 시간 전인가」는 **여기서 잰다.**

    화면 쪽에서 `Date.now()`를 부르면 그릴 때마다 답이 달라지는 함수를 렌더
    안에서 쓰는 셈이라, React가 「그리는 도중에 밖의 것을 읽지 말라」고
    막는다. 읽는 일은 읽는 자리에서 한다.
  */
  const backupAgeHours = backups[0]
    ? (Date.now() - backups[0].at.getTime()) / 3_600_000
    : null;

  const matrix = traitAbilityMatrix(people);
  const alpha = traitAlpha(reliability);

  /*
    가장 뚜렷한 관련 — **자르지 않고 다 넘긴다.**

    전에는 상위 셋에서 끊었는데, 넷째가 셋째와 거의 같은 값이면 끊긴 자리를
    모르는 채로 셋만 특별해 보인다. 화면에서 세 개씩 넘겨 보게 하고 전체
    개수를 같이 보여준다.

    거르는 기준은 **신뢰구간이 0을 벗어난 조합만**이다. 방향조차 확정 안 된
    것을 「뚜렷한 관련」이라 부를 수는 없다.
  */
  const relations: Relation[] = TRAIT_SCALES.flatMap((scale) =>
    ABILITY_AXES.map((axis) => ({
      scale,
      axis,
      c: cellOf(matrix, scale, axis),
    })),
  )
    .filter((x) => x.c && !(x.c.ci[0] <= 0 && x.c.ci[1] >= 0))
    .sort((a, b) => Math.abs(b.c!.r) - Math.abs(a.c!.r))
    .map((x) => ({
      scale: x.scale,
      axis: x.axis,
      r: x.c!.r,
      n: x.c!.n,
      ci: x.c!.ci,
    }));

  return {
    rating,
    summary,
    attendance,
    matrix,
    alpha,
    relations,
    backups,
    backupAgeHours,
    /** 응답 신뢰도를 확인해 볼 사람 */
    needsReview: people.filter((p) => p.quality !== "ok"),
  };
}
