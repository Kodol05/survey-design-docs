import { ABILITY_AXES } from "@/lib/items/types";
import { prisma } from "../db";
import { ratingToPercent } from "./abilitySource";
import { pickBossScores } from "./ratings";
import { correlate, fitLine, type Correlation } from "./stats";
import type { StoredAbilities } from "../survey/result";

/**
 * 본인 답 ↔ 대표님 평가 대조 (Task 31).
 *
 * **이 시스템에서 유일하게 "실제와 맞나"에 답하는 자리다.**
 *
 * 나머지 화면은 전부 설문 안에서 앞뒤가 맞는지를 본다 — 성향과 직무능력을
 * 같은 사람이 이어서 답하므로, 잘 맞는다고 실제와 맞는 것은 아니다.
 * 여기만 **바깥에서 온 눈**과 맞댄다.
 *
 * ## 「누가 맞았나」로 쓰지 않는다
 *
 * 대표님이 맞고 본인이 틀렸다는 화면이 아니다. **둘이 갈리는 사람이
 * 이야깃거리**라는 화면이다. 본인은 협력을 높게 보는데 대표님은 낮게
 * 보신다면, 그 사이에 무슨 일이 있는지가 볼 것이다.
 *
 * 두 값 다 오차가 있다 — 자기보고는 좋게 보이려는 쪽으로 기울고, 상사
 * 평가는 최근 일이나 눈에 띄는 몇 장면에 끌린다.
 */

export type AxisAgreement = {
  axis: string;
  /** 두 값의 상관. 이 축에서 둘이 얼마나 같은 방향을 보는가 */
  corr: Correlation;
  /** 점 하나가 한 사람 */
  points: { id: string; name: string; self: number; boss: number }[];
  /**
   * 점들에 가장 잘 맞는 직선. 예측 대 실제와 **같은 함수**로 긋는다.
   *
   * 대각선(두 값이 같다)만 있으면 점들이 그 선을 어느 쪽으로 기울어 지나는지가
   * 안 보인다. 기울기가 1보다 작으면 「본인이 높게 본 사람일수록 대표님은
   * 그만큼까지는 높게 보지 않았다」는 뜻이다.
   *
   * 가로 값이 하나도 안 흔들리면 그을 수 없어 `null`이다.
   */
  fit: { slope: number; intercept: number } | null;
  /** 대표님 평가 − 본인 답의 평균. 양수면 대표님이 전반적으로 후하게 보신다 */
  meanShift: number;
};

export type PersonGap = {
  employeeId: string;
  name: string;
  /** 축별 차이 (대표님 − 본인). 대표님이 안 매긴 축은 없다 */
  byAxis: { axis: string; self: number; boss: number; gap: number }[];
  /** 가장 크게 벌어진 축의 차이. 정렬에 쓴다 */
  worst: number;
  /** 세 축 평균 차이 — 방향이 한쪽으로 쏠렸는지 */
  meanGap: number;
};

export type RatingCompare = {
  /** 두 값이 다 있는 사람 수 */
  n: number;
  axes: AxisAgreement[];
  gaps: PersonGap[];
};

const mean = (xs: number[]) =>
  xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;

export async function loadRatingCompare(): Promise<RatingCompare> {
  const [sessions, ratings] = await Promise.all([
    prisma.testSession.findMany({
      where: { status: "COMPLETED", result: { isNot: null } },
      orderBy: { completedAt: "desc" },
      include: { result: true, employee: true },
    }),
    prisma.managerRating.findMany(),
  ]);

  const byPerson = new Map<string, typeof ratings>();
  for (const r of ratings) {
    const list = byPerson.get(r.employeeId) ?? [];
    list.push(r);
    byPerson.set(r.employeeId, list);
  }

  /*
    같은 사람이 여러 번 응시했으면 **가장 최근 것**만 쓴다.
    옛 응답과 지금 평가를 맞대면 무엇을 비교하는지 알 수 없다.
  */
  const seen = new Set<string>();
  const rows: {
    id: string;
    name: string;
    self: Record<string, number>;
    boss: Record<string, number>;
  }[] = [];

  for (const s of sessions) {
    if (seen.has(s.employeeId)) continue;
    seen.add(s.employeeId);
    const boss = pickBossScores(byPerson.get(s.employeeId) ?? []);
    if (Object.keys(boss).length === 0) continue;

    const stored = (s.result!.abilityScoresJson ?? {}) as StoredAbilities;
    rows.push({
      id: s.employeeId,
      name: s.employee.name,
      self: Object.fromEntries(
        Object.entries(stored).map(([k, v]) => [k, v.percent]),
      ),
      boss: Object.fromEntries(
        Object.entries(boss).map(([k, v]) => [k, ratingToPercent(v)]),
      ),
    });
  }

  const axes: AxisAgreement[] = [];
  for (const axis of ABILITY_AXES) {
    const usable = rows.filter(
      (r) =>
        typeof r.self[axis] === "number" && typeof r.boss[axis] === "number",
    );
    if (usable.length < 3) continue;
    const self = usable.map((r) => r.self[axis]);
    const boss = usable.map((r) => r.boss[axis]);
    axes.push({
      axis,
      corr: correlate(self, boss),
      fit: fitLine(self, boss),
      points: usable.map((r) => ({
        id: r.id,
        name: r.name,
        self: r.self[axis],
        boss: r.boss[axis],
      })),
      meanShift: mean(boss) - mean(self),
    });
  }

  const gaps: PersonGap[] = rows
    .map((r) => {
      const byAxis = ABILITY_AXES.filter(
        (a) => typeof r.self[a] === "number" && typeof r.boss[a] === "number",
      ).map((a) => ({
        axis: a,
        self: r.self[a],
        boss: r.boss[a],
        gap: r.boss[a] - r.self[a],
      }));
      return {
        employeeId: r.id,
        name: r.name,
        byAxis,
        // 한 축만 크게 벌어져도 볼 만하다. 평균을 쓰면 +와 −가 상쇄된다
        worst: Math.max(0, ...byAxis.map((x) => Math.abs(x.gap))),
        meanGap: mean(byAxis.map((x) => x.gap)),
      };
    })
    .filter((g) => g.byAxis.length > 0)
    .sort((a, b) => b.worst - a.worst);

  return { n: rows.length, axes, gaps };
}
