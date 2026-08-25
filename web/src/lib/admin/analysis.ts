import { prisma } from "../db";
import { ABILITY_AXES, ABILITY_AXIS_FROM_DB, TRAIT_SCALES } from "../items/types";
import type { StoredAbilities, StoredTraits } from "../survey/result";
import { MIN_N } from "@/components/ui/NBadge";
import { pickBossScores } from "./ratings";
import {
  resolveAbilities,
  type AbilitySource,
} from "./abilitySource";
import {
  alphaVerdict,
  correlate,
  cronbachAlpha,
  groupDiff,
  loocv,
  type Correlation,
  type GroupDiff,
  type LoocvResult,
} from "./stats";

/**
 * DB에서 분석에 필요한 것을 꺼내 온다. 계산 자체는 `stats.ts`(순수 함수)가 한다.
 *
 * ⚠️ 응답 품질이 `poor`인 사람을 뺄 수 있게 열어 둔다. 50명 규모에서는
 *    대충 찍은 네댓 명이 상관을 통째로 흔든다.
 */

export type Person = {
  employeeId: string;
  name: string;
  traits: Record<string, number>;
  abilities: Record<string, number>;
  quality: string;
};

/**
 * @param source 직무능력 값을 어디서 가져올지 (`abilitySource.ts`).
 *   기본은 직원 설문이다 — 대표님 평가가 아직 없어도 화면이 돌아가야 한다.
 */
export async function loadPeople(
  excludePoor = false,
  source: AbilitySource = "self",
): Promise<Person[]> {
  const [rows, ratings] = await Promise.all([
    prisma.testSession.findMany({
      where: { status: "COMPLETED", result: { isNot: null } },
      orderBy: { completedAt: "desc" },
      include: { result: true, qualityFlag: true, employee: true },
    }),
    // 직원 설문만 볼 때는 굳이 읽지 않는다
    source === "self"
      ? Promise.resolve([])
      : prisma.managerRating.findMany(),
  ]);

  const byPerson = new Map<string, typeof ratings>();
  for (const r of ratings) {
    const list = byPerson.get(r.employeeId) ?? [];
    list.push(r);
    byPerson.set(r.employeeId, list);
  }
  const boss = new Map<string, Record<string, number>>();
  for (const [id, list] of byPerson) boss.set(id, pickBossScores(list));

  // 같은 사람이 여러 번 응시했으면 가장 최근 것만
  const seen = new Set<string>();
  const people: Person[] = [];
  for (const s of rows) {
    if (seen.has(s.employeeId)) continue;
    seen.add(s.employeeId);
    const flag = s.qualityFlag?.flag ?? "ok";
    if (excludePoor && flag === "poor") continue;
    people.push({
      employeeId: s.employeeId,
      name: s.employee.name,
      traits: Object.fromEntries(
        Object.entries((s.result!.scoresJson ?? {}) as StoredTraits).map(([k, v]) => [
          k,
          v.percent,
        ]),
      ),
      abilities: resolveAbilities(
        source,
        Object.fromEntries(
          Object.entries((s.result!.abilityScoresJson ?? {}) as StoredAbilities).map(
            ([k, v]) => [k, v.percent],
          ),
        ),
        boss.get(s.employeeId) ?? {},
      ),
      quality: flag,
    });
  }
  return people;
}

const key = (a: string, b: string) => `${a} ${b}`;

/** 성향 7축 × 직무능력 3축 — 사내 데이터로 낸 관련도 */
export function traitAbilityMatrix(people: Person[]) {
  const cells = new Map<string, Correlation>();
  for (const scale of TRAIT_SCALES) {
    for (const axis of ABILITY_AXES) {
      const pairs = people
        .map((p) => [p.traits[scale], p.abilities[axis]] as const)
        .filter(([a, b]) => typeof a === "number" && typeof b === "number");
      if (pairs.length < 2) continue;
      cells.set(
        key(scale, axis),
        correlate(
          pairs.map(([a]) => a),
          pairs.map(([, b]) => b),
        ),
      );
    }
  }
  return { cells, n: people.length, enough: people.length >= MIN_N };
}

export const cellOf = (
  m: { cells: Map<string, Correlation> },
  scale: string,
  axis: string,
) => m.cells.get(key(scale, axis));

/** 산점도용 좌표. 이름을 같이 주어 점에 올렸을 때 누구인지 보이게 한다. */
export function scatterPoints(people: Person[], scale: string, axis: string) {
  return people
    .filter((p) => typeof p.traits[scale] === "number" && typeof p.abilities[axis] === "number")
    .map((p) => ({
      id: p.employeeId,
      name: p.name,
      x: p.traits[scale],
      y: p.abilities[axis],
      quality: p.quality,
    }));
}

/** 최소제곱 추세선. 점 50개를 그대로 두고 그 위에 얹는다. */
export function trendLine(points: { x: number; y: number }[]) {
  if (points.length < 3) return null;
  const n = points.length;
  const mx = points.reduce((s, p) => s + p.x, 0) / n;
  const my = points.reduce((s, p) => s + p.y, 0) / n;
  let sxy = 0;
  let sxx = 0;
  for (const p of points) {
    sxy += (p.x - mx) * (p.y - my);
    sxx += (p.x - mx) ** 2;
  }
  if (sxx === 0) return null;
  const slope = sxy / sxx;
  const intercept = my - slope * mx;
  return [
    { x: 0, y: intercept },
    { x: 100, y: intercept + slope * 100 },
  ];
}

// ── 척도 신뢰도 ─────────────────────────────────────────────────────

export type ScaleReliability = {
  scale: string;
  kind: "trait" | "ability";
  itemCount: number;
  alpha: number | null;
  verdict: ReturnType<typeof alphaVerdict>;
};

/**
 * 척도별 Cronbach's α.
 *
 * **α가 .60 아래인 척도는 그 상관을 볼 필요가 없다.** 이 화면이 없으면
 * 못 만들어진 척도의 상관을 열심히 해석하게 된다.
 */
export async function loadReliability(): Promise<ScaleReliability[]> {
  const assessment = await prisma.assessment.findFirst({ where: { isActive: true } });
  if (!assessment) return [];

  const items = await prisma.item.findMany({
    where: { assessmentId: assessment.id, status: "ACTIVE" },
    select: { id: true, kind: true, scale: true, abilityAxis: true, isReverse: true },
  });
  const responses = await prisma.response.findMany({
    where: { session: { status: "COMPLETED" } },
    select: { sessionId: true, itemId: true, value: true },
  });

  const bySession = new Map<string, Map<string, number>>();
  for (const r of responses) {
    if (!bySession.has(r.sessionId)) bySession.set(r.sessionId, new Map());
    bySession.get(r.sessionId)!.set(r.itemId, r.value);
  }

  const groups = new Map<string, { kind: "trait" | "ability"; itemIds: string[] }>();
  for (const it of items) {
    const name =
      it.kind === "TRAIT" ? it.scale! : ABILITY_AXIS_FROM_DB[it.abilityAxis!];
    if (!name) continue;
    const g = groups.get(name) ?? {
      kind: it.kind === "TRAIT" ? ("trait" as const) : ("ability" as const),
      itemIds: [],
    };
    g.itemIds.push(it.id);
    groups.set(name, g);
  }
  const reverse = new Set(items.filter((i) => i.isReverse).map((i) => i.id));

  const out: ScaleReliability[] = [];
  for (const [scale, g] of groups) {
    // 역채점을 적용한 값으로 계산한다. 안 하면 α가 항상 낮게 나온다
    const rows: number[][] = [];
    for (const answers of bySession.values()) {
      const row = g.itemIds.map((id) => {
        const v = answers.get(id);
        return v === undefined ? NaN : reverse.has(id) ? 8 - v : v;
      });
      if (row.some(Number.isNaN)) continue;
      rows.push(row);
    }
    const alpha = cronbachAlpha(rows);
    out.push({
      scale,
      kind: g.kind,
      itemCount: g.itemIds.length,
      alpha,
      verdict: alphaVerdict(alpha),
    });
  }

  const order = [...TRAIT_SCALES, ...ABILITY_AXES] as string[];
  return out.sort((a, b) => order.indexOf(a.scale) - order.indexOf(b.scale));
}

// ── 역방향: 성향에서 직무능력 보기 ──────────────────────────────────

export type TercileCompare = {
  axis: string;
  /** 이 성향 축 상위 1/3의 평균 */
  upper: number;
  /** 하위 1/3의 평균 */
  lower: number;
  diff: number;
  upperN: number;
  lowerN: number;
  /**
   * 차이의 신뢰구간과 효과 크기.
   *
   * **이게 없으면 이 표는 아무 말도 못 한다.** "상위 62, 하위 48"만 놓으면
   * 14점이 큰 건지 12명씩에서 그냥 나온 값인지 구분할 방법이 없다.
   * 계산이 안 되는 경우(한쪽이 2명 미만 등)에는 null이다.
   */
  stat: GroupDiff | null;
};

/**
 * 어떤 성향 축의 상위권과 하위권이 직무능력에서 얼마나 다른가.
 *
 * 상관계수 하나보다 "위쪽 사람들은 협력 62, 아래쪽은 51"이 훨씬 잘 읽힌다.
 * 다만 3등분이라 각 무리가 12명 남짓이므로 **차이를 확정으로 읽으면 안 된다.**
 */
export function abilitiesByTraitTercile(
  people: Person[],
  scale: string,
): TercileCompare[] {
  const sorted = people
    .filter((p) => typeof p.traits[scale] === "number")
    .sort((a, b) => a.traits[scale] - b.traits[scale]);
  if (sorted.length < 9) return [];

  const cut = Math.floor(sorted.length / 3);
  const low = sorted.slice(0, cut);
  const high = sorted.slice(-cut);
  const values = (group: Person[], axis: string) =>
    group.map((p) => p.abilities[axis]).filter((v): v is number => typeof v === "number");
  const avg = (group: Person[], axis: string) => {
    const vs = group.map((p) => p.abilities[axis]).filter((v) => typeof v === "number");
    return vs.length ? vs.reduce((a, b) => a + b, 0) / vs.length : NaN;
  };

  return ABILITY_AXES.filter((axis) => people.some((p) => axis in p.abilities)).map(
    (axis) => {
      const upper = avg(high, axis);
      const lower = avg(low, axis);
      return {
        axis,
        upper,
        lower,
        diff: upper - lower,
        upperN: high.length,
        lowerN: low.length,
        stat: groupDiff(values(high, axis), values(low, axis)),
      };
    },
  );
}

export type PersonQuality = {
  employeeId: string;
  name: string;
  /** 반대 문항 일치도 0~1. 아무렇게나 찍으면 .60 근처가 나온다 */
  agreement: number | null;
  /** 1.5초 안에 넘긴 문항 수 */
  fastCount: number | null;
  meanElapsedMs: number | null;
  flag: string;
};

/**
 * 사람별 응답 품질 — **문항 품질(α)과는 다른 이야기다.**
 *
 * α는 「문항이 잘 만들어졌는가」를, 이쪽은 「이 사람 답을 믿을 수 있는가」를
 * 잰다. 척도 α가 아무리 높아도 대충 찍은 사람의 값은 못 쓴다.
 *
 * 일치도가 주 지표다. 서로 반대인 문항에 같은 방향으로 답했는지를 재는데,
 * 무작위로 찍으면 .60 근처가 나온다 (모의로 확인, 00 §2.3).
 */
export async function loadPersonQuality(): Promise<PersonQuality[]> {
  const rows = await prisma.testSession.findMany({
    where: { status: "COMPLETED" },
    orderBy: { completedAt: "desc" },
    include: { qualityFlag: true, employee: true },
  });

  const seen = new Set<string>();
  const out: PersonQuality[] = [];
  for (const s of rows) {
    if (seen.has(s.employeeId)) continue;
    seen.add(s.employeeId);
    out.push({
      employeeId: s.employeeId,
      name: s.employee.name,
      agreement: s.qualityFlag?.antonymAgreement ?? null,
      fastCount: s.qualityFlag?.fastCount ?? null,
      meanElapsedMs: s.qualityFlag?.meanElapsedMs ?? null,
      flag: s.qualityFlag?.flag ?? "ok",
    });
  }
  // 낮은 사람이 위로. 볼 것이 먼저 보여야 한다
  out.sort((a, b) => (a.agreement ?? 2) - (b.agreement ?? 2));
  return out;
}
