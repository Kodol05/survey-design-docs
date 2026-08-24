import { prisma } from "../db";
import { ABILITY_AXES, ABILITY_AXIS_FROM_DB } from "@/lib/items/types";
import { RATER } from "./abilitySource";

/**
 * 대표님이 한 축이라도 매긴 사람 수.
 *
 * 소스 전환기를 열 수 있는지 판단하는 데 쓴다. 0이면 「대표님 평가」와
 * 「두 값 평균」이 빈 화면이 되므로 아예 고를 수 없게 둔다.
 */
export async function countRatedEmployees(): Promise<number> {
  const rows = await prisma.managerRating.findMany({
    distinct: ["employeeId"],
    select: { employeeId: true },
  });
  return rows.length;
}

export type RatingProgress = {
  /** 세 축을 다 매긴 사람 수 */
  done: number;
  /** 한 축이라도 매긴 사람 수 */
  started: number;
  /** 가입한 사원 수 */
  total: number;
  /** 매긴 칸 / 채워야 할 칸 */
  cells: number;
  cellTotal: number;
};

/**
 * 대표님 평가 진행 상황 — **안내에만 쓴다.**
 *
 * ## 왜 잠그지 않는가 (D-41)
 *
 * 전에는 국면(`COLLECTING` → `OPEN`)을 두고 평가가 끝나기 전에는 관리자가
 * 결과 화면에 아예 못 들어가게 막았다. 되돌릴 수도 없었다.
 *
 * 걱정 자체는 맞다 — 결과를 먼저 보면 그 인상이 평가에 섞인다. 그런데
 * **막는 방식이 값을 못 치른다.** 화면 절반이 잠긴 채로 운영해야 하고,
 * 되돌릴 수 없어서 한 번 실수하면 끝이고, 정작 대표님이 결과를 다른
 * 경로로 듣는 것은 막지 못한다.
 *
 * 그래서 **잠그는 대신 알린다.** 첫 화면에 "아직 몇 명 남았습니다"를 띄우고
 * 왜 먼저 매기는 게 나은지 한 줄 적어 둔다. 판단은 사람이 한다.
 */
export async function ratingProgress(): Promise<RatingProgress> {
  const [total, rows] = await Promise.all([
    prisma.employee.count({ where: { role: "USER" } }),
    prisma.managerRating.groupBy({
      by: ["employeeId"],
      _count: { axis: true },
      // 심어 둔 값을 세면 "다 매겼다"고 나온다
      where: { ratedBy: RATER.real },
    }),
  ]);

  const axes = ABILITY_AXES.length;
  return {
    done: rows.filter((r) => r._count.axis >= axes).length,
    started: rows.length,
    total,
    cells: rows.reduce((n, r) => n + r._count.axis, 0),
    cellTotal: total * axes,
  };
}

/**
 * 한 사람의 축별 점수를 고른다 — **대표님이 매긴 것을 우선한다.**
 *
 * 데모로 심어 둔 값과 대표님이 직접 매긴 값이 같은 사람·같은 축에 둘 다
 * 있을 수 있다 (실제로는 데모 계정과 실제 사원이 갈라져 있어 겹칠 일이
 * 거의 없지만, 겹쳤을 때 무엇이 이기는지는 정해 둬야 한다).
 */
export function pickBossScores(
  rows: { axis: string; score: number; ratedBy: string }[],
): Record<string, number> {
  const out: Record<string, number> = {};
  // 심은 값을 먼저 깔고 대표님 값으로 덮는다
  for (const pass of [RATER.demo, RATER.real]) {
    for (const r of rows) {
      if (r.ratedBy !== pass) continue;
      const axis = ABILITY_AXIS_FROM_DB[r.axis];
      if (axis) out[axis] = r.score;
    }
  }
  return out;
}
