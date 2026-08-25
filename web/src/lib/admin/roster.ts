import { prisma } from "../db";
import { ABILITY_AXES, COMPOSITE_AXIS, TRAIT_SCALES } from "@/lib/items/types";
import { abilityMean } from "@/components/analysis/TraitStrip";
import { quantile } from "./spread";
import { pickBossScores, countRatedEmployees } from "./ratings";
import { resolveAbilities, type AbilitySource } from "./abilitySource";
import type { StoredAbilities, StoredTraits } from "../survey/result";
import type { Row } from "@/app/admin/(guarded)/employees/EmployeeList";

/**
 * 구성원 목록의 **읽고·거르고·줄 세우는 부분** (2026-08-25 분리).
 *
 * 화면 파일 하나에 DB 질의 · 거르개 넷 · 정렬 규칙 셋 · 사분위 계산 ·
 * 주소 만들기 · JSX가 다 들어 있어서 **400줄짜리 함수 하나**였다. 어디까지가
 * 데이터고 어디부터가 그림인지 눈으로 갈라야 했다.
 *
 * 여기는 **무엇을 보여줄지**만 정한다. 화면은 받은 것을 그리기만 한다.
 * 화면에 나오는 것은 하나도 바뀌지 않는다.
 */

export type SortDir = "asc" | "desc";

/** 정렬 축 이름 자리에 들어가는 특별한 열쇠 — 실제 축 이름과 겹치면 안 된다 */
export const MEAN_KEY = COMPOSITE_AXIS;

/**
 * 점수 구간 — **사분위로 자른다.**
 *
 * 「상위 10명」처럼 사람 수로 자르지 않는다. 44명일 때와 60명일 때 같은
 * 「10명」이 서로 다른 위치를 뜻하게 되기 때문이다.
 */
export const BANDS = [
  { key: "top", label: "상위 4분의 1" },
  { key: "mid", label: "가운데 절반" },
  { key: "low", label: "하위 4분의 1" },
] as const;

/** 분석 화면 타일에서 넘어올 때 쓰는 거르개 */
export const STATUS_FILTERS = [
  {
    key: "completed",
    label: "응시 완료만",
    match: (s: string | null) => s === "COMPLETED",
  },
  {
    key: "inprogress",
    label: "진행 중만",
    match: (s: string | null) => s === "IN_PROGRESS",
  },
  {
    key: "none",
    label: "미응시·중단만",
    // 중단(14일 정리)도 「아직 결과가 없는 사람」이라 같이 묶는다
    match: (s: string | null) => s === null || s === "ABANDONED",
  },
] as const;

export type RosterQuery = {
  sort?: string;
  dir?: string;
  q?: string;
  flag?: string;
  status?: string;
  pos?: string;
};

export type Roster = {
  rows: Row[];
  /** 화면이 다시 계산하지 않도록 판정 결과를 같이 넘긴다 */
  keyword: string;
  sortKey: string | null;
  sortDir: SortDir;
  fallbackDir: SortDir;
  onlyReview: boolean;
  pickStatus: (typeof STATUS_FILTERS)[number] | undefined;
  band: string | null;
  /** 구간을 자르는 경계. 넷이 안 되면 `null` */
  cut: { low: number; high: number } | null;
  bossCount: number;
};

export async function loadRoster(
  qs: RosterQuery,
  source: AbilitySource,
): Promise<Roster> {
  const [employees, bossCount] = await Promise.all([
    prisma.employee.findMany({
      where: { role: "USER" },
      orderBy: { name: "asc" },
      include: {
        testSessions: {
          orderBy: { startedAt: "desc" },
          take: 1,
          include: { result: true, qualityFlag: true },
        },
        ratings: true,
      },
    }),
    countRatedEmployees(),
  ]);

  const everyone: Row[] = employees.map((e) => {
    const s = e.testSessions[0];
    const stored = (s?.result?.scoresJson ?? null) as StoredTraits | null;
    const ability = (s?.result?.abilityScoresJson ??
      null) as StoredAbilities | null;

    const self = ability
      ? Object.fromEntries(
          Object.entries(ability).map(([k, v]) => [k, v.percent]),
        )
      : {};
    const abilities = resolveAbilities(source, self, pickBossScores(e.ratings));

    return {
      id: e.id,
      name: e.name,
      phone: e.phone,
      status: s?.status ?? null,
      flag: s?.qualityFlag?.flag ?? "ok",
      // 등급(검토/낮음)뿐 아니라 숫자로도 보여주기 위한 값.
      // 일치도는 0~1로 저장돼 있고 화면에서 100점으로 환산한다
      agreement: s?.qualityFlag?.antonymAgreement ?? null,
      fastCount: s?.qualityFlag?.fastCount ?? null,
      // 날짜는 **서버에서 문자열로 만든다.** 목록이 클라이언트 컴포넌트라
      // 브라우저에서 다시 포맷하면 시간대가 어긋나 하이드레이션이 깨진다
      completedLabel: s?.completedAt ? dayLabel(s.completedAt) : null,
      traits: stored
        ? Object.fromEntries(
            Object.entries(stored).map(([k, v]) => [k, v.percent]),
          )
        : null,
      // 고른 출처대로 만든다. 대표님이 아직 안 매긴 사람이면 빈 값이 된다 —
      // 그게 맞다. 0으로 채우면 「낮게 평가받은 사람」으로 보인다
      abilities: Object.keys(abilities).length ? abilities : null,
    };
  });

  // ── 무엇으로 줄 세울지 ──
  const isTrait = TRAIT_SCALES.includes(qs.sort as never);
  const isAbility = ABILITY_AXES.includes(qs.sort as never);
  const isMean = qs.sort === MEAN_KEY;
  const sortKey = isTrait || isAbility || isMean ? qs.sort! : null;

  /** 값이 없는 사람은 방향과 무관하게 늘 아래로 */
  const valueOf = (r: Row): number | null =>
    !sortKey
      ? null
      : isMean
        ? abilityMean(r.abilities)
        : isTrait
          ? (r.traits?.[sortKey] ?? null)
          : (r.abilities?.[sortKey] ?? null);

  /*
    구간을 자르는 기준은 **거르기 전 전체**에서 잡는다.

    이미 걸러진 목록에서 다시 상위 4분의 1을 뽑으면 그게 무엇의 상위인지
    알 수 없다. 「협력 상위 4분의 1」은 늘 회사 전체 안에서의 위치여야
    검색어를 바꿔도 같은 사람들이 남는다.
  */
  const scores = sortKey
    ? everyone
        .map(valueOf)
        .filter((v): v is number => typeof v === "number")
        .sort((a, b) => a - b)
    : [];
  const cut =
    scores.length >= 4
      ? { low: quantile(scores, 0.25), high: quantile(scores, 0.75) }
      : null;

  // ── 거르기 ──
  const keyword = (qs.q ?? "").trim();
  const onlyReview = qs.flag === "review";
  const pickStatus = STATUS_FILTERS.find((f) => f.key === qs.status);
  const band =
    sortKey && cut && BANDS.some((b) => b.key === qs.pos) ? qs.pos! : null;

  let rows = everyone;
  if (keyword) rows = rows.filter((r) => r.name.includes(keyword));
  if (onlyReview) rows = rows.filter((r) => r.flag !== "ok");
  if (pickStatus) rows = rows.filter((r) => pickStatus.match(r.status));
  if (band)
    rows = rows.filter((r) => {
      const v = valueOf(r);
      if (v === null) return false;
      if (band === "top") return v >= cut!.high;
      if (band === "low") return v <= cut!.low;
      return v > cut!.low && v < cut!.high;
    });

  // ── 줄 세우기 ──
  const fallbackDir: SortDir = sortKey ? "desc" : "asc";
  const sortDir: SortDir =
    qs.dir === "asc" || qs.dir === "desc" ? qs.dir : fallbackDir;

  /*
    ⚠️ 방향 부호가 **갈래마다 반대다.**

    점수는 `desc`가 큰 값부터라 `b − a`를 그대로 쓴다(+1).
    이름은 `asc`가 가나다순이라 `localeCompare`를 그대로 쓴다(+1).
    하나로 묶으면 이름 정렬이 뒤집힌다 — 실제로 그렇게 났다.
  */
  const valueFlip = sortDir === "asc" ? -1 : 1;
  const nameFlip = sortDir === "asc" ? 1 : -1;

  /*
    무엇으로 정렬하든 **끝낸 사람이 먼저**다.

    진행 중·미응시는 값이 아예 없어서, 축으로 정렬하면 값 없는 사람이 맨
    위나 맨 아래에 뭉쳐 목록을 가로막는다. 상태를 1차 기준으로 고정하고
    고른 정렬은 그 안에서만 적용한다. **방향을 뒤집어도 이 순서는 그대로다.**
  */
  const statusRank = (s: string | null) =>
    s === "COMPLETED" ? 0 : s === "IN_PROGRESS" ? 1 : 2;
  const byName = (a: Row, b: Row) => a.name.localeCompare(b.name, "ko");

  rows = [...rows].sort((a, b) => {
    const byStatus = statusRank(a.status) - statusRank(b.status);
    if (byStatus) return byStatus;
    if (!sortKey) return byName(a, b) * nameFlip;

    const va = valueOf(a);
    const vb = valueOf(b);
    if (va === null && vb === null) return byName(a, b);
    if (va === null) return 1;
    if (vb === null) return -1;
    if (va !== vb) return (vb - va) * valueFlip;
    return byName(a, b);
  });

  return {
    rows,
    keyword,
    sortKey,
    sortDir,
    fallbackDir,
    onlyReview,
    pickStatus,
    band,
    cut,
    bossCount,
  };
}

/** "8/23" — 목록에서는 연도가 필요 없다. 전부 같은 해에 몰려 있다 */
const dayLabel = (d: Date) =>
  new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "numeric",
    day: "numeric",
  })
    .format(d)
    .replace(/\.\s*$/, "")
    .replace(/\.\s*/g, "/");
