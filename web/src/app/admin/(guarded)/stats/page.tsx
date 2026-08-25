import Link from "next/link";
import { RankBars } from "@/components/analysis/RankBars";
import { ScatterPlot } from "@/components/analysis/ScatterPlot";
import type { Cell } from "@/components/analysis/CorrelationTable";
import type { Point } from "@/components/analysis/ScatterPlot";
import { WarningBadge } from "@/components/ui/WarningBadge";
import { requireAdmin } from "@/lib/auth/guard";
import type { RankRow, ScaleReliability } from "@/lib/admin/analysis";
import { influenceOf, type Influence } from "@/lib/admin/influence";
import {
  facetPairs,
  RANK_LIMIT,
  abilitiesByTraitTercile,
  cellOf,
  loadPeople,
  loadPersonQuality,
  loadReliability,
  rankForAbility,
  scatterPoints,
  traitAbilityMatrix,
  trendLine,
} from "@/lib/admin/analysis";
import { ALPHA } from "@/lib/admin/stats";
import { ABILITY_AXES, TRAIT_SCALES } from "@/lib/items/types";
import { MIN_N } from "@/components/ui/NBadge";
import { ResearchCompare } from "@/components/analysis/ResearchCompare";
import { compareToResearch } from "@/lib/admin/researchCompare";
import { SourcePicker } from "@/components/analysis/SourcePicker";
import { CHARACTER, TEMPERAMENT } from "@/components/charts/scale";
import {
  SOURCE_NOTE,
  parseSource,
  type AbilitySource,
} from "@/lib/admin/abilitySource";
import { countRatedEmployees } from "@/lib/admin/ratings";
import { Note } from "@/components/ui/Note";
import { AgreementPanel } from "./AgreementPanel";
import { loadRatingCompare } from "@/lib/admin/ratingCompare";
import { PredictionPanel } from "./PredictionPanel";
import { predictFromResearch } from "@/lib/admin/researchPrediction";
import { LowQualityList, QualityRanking } from "./PersonQuality";
import { CorrelationPanel } from "./CorrelationPanel";
import { RankPanel } from "./RankPanel";
import { DistributionPanel } from "./DistributionPanel";
import { spreadOf, type Spread } from "@/lib/admin/spread";

export const metadata = { title: "분석 — 관리자" };

const TABS = [
  { key: "matrix", label: "직무능력과 기질·성격" },
  { key: "rank", label: "순위" },
  { key: "spread", label: "분포" },
  { key: "prediction", label: "예측 대 실제" },
  { key: "agreement", label: "평가 대조" },
  { key: "reliability", label: "검사 신뢰도" },
] as const;

export default async function StatsPage(props: {
  searchParams: Promise<{
    tab?: string;
    axis?: string;
    scale?: string;
    src?: string;
    clean?: string;
  }>;
}) {
  await requireAdmin();
  const sp = await props.searchParams;
  const tab = TABS.some((t) => t.key === sp.tab) ? sp.tab! : "matrix";
  const source = parseSource(sp.src);
  /*
    **응답 신뢰도가 낮은 사람을 빼고 다시 본다** (2026-08-25 사용자 요청).

    「이 결과가 대충 찍은 몇 명 때문인가」는 늘 남는 물음인데, 그동안
    `loadPeople(excludePoor)`라는 손잡이가 코드에만 있고 화면에는 없었다.
    켜고 끄면서 숫자가 얼마나 움직이는지 보는 것이 답이다.
  */
  const clean = sp.clean === "1";

  const [people, reliability, bossCount, personQuality, agreement, facets] = await Promise.all([
    loadPeople(clean, source),
    loadReliability(),
    countRatedEmployees(),
    loadPersonQuality(),
    loadRatingCompare(),
    facetPairs(clean, source),
  ]);
  const matrix = traitAbilityMatrix(people);
  const alphas = reliability
    .map((r) => r.alpha)
    .filter((a): a is number => a !== null);
  const meanAlpha = alphas.length
    ? alphas.reduce((a, b) => a + b, 0) / alphas.length
    : null;
  const poorCount = reliability.filter((r) => r.verdict === "poor").length;
  /*
    척도 이름으로 찾아 쓰는 표. 상관 화면과 순위 화면이 **α를 알아야**
    한다 — 문항이 안 맞물리는 축의 상관은 축소 편향되어 있어 그대로 읽으면
    안 된다 (2026-08-25 사용자 결정).
  */
  const byScale = Object.fromEntries(reliability.map((r) => [r.scale, r]));
  /*
    빠지는 인원을 **품질 목록에서 직접 센다.** `people.length`와 빼서 구하면
    거르개가 꺼져 있을 때는 0이 나와 「몇 명이 빠지는지」를 미리 말할 수 없다.
    켜기 전에 알려줘야 누를지 말지 정할 수 있다.
  */
  const poorN = personQuality.filter((q) => q.flag === "poor").length;
  const reviewCount = people.filter((p) => p.quality !== "ok").length;

  return (
    <>
      <h1 className="text-screen-title mb-6">분석</h1>

      {/* 먼저 읽히는 것 — 이 검사가 지금 쓸 만한 상태인가 */}
      <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile
          label="응시 완료"
          value={people.length}
          href="/admin/employees?status=completed"
          hint="누가 했는지 보기"
        />
        <Tile
          label="검토가 필요한 응답"
          value={reviewCount}
          href="/admin/employees?flag=review"
          hint={reviewCount ? "누구인지 보기" : undefined}
        />
        <Tile
          label="검사 신뢰도"
          value={meanAlpha === null ? "—" : meanAlpha.toFixed(2)}
          href="/admin/stats?tab=reliability"
          hint="척도 평균 α"
        />
        <Tile
          label="기준 아래 척도"
          value={poorCount}
          href="/admin/stats?tab=reliability"
          hint={poorCount ? `α ${ALPHA.poor} 아래` : "전부 기준 안"}
        />
      </div>

      <nav className="mb-10 flex flex-wrap gap-1 border-b border-[--border]">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin/stats?tab=${t.key}`}
            className="text-table -mb-px border-b-2 px-4 py-2.5"
            style={{
              borderColor: t.key === tab ? "var(--ink)" : "transparent",
              color: t.key === tab ? "var(--ink)" : "var(--ink-secondary)",
              fontWeight: t.key === tab ? 600 : 400,
            }}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === "matrix" && (
        <MatrixTab
          people={people}
          matrix={matrix}
          source={source}
          bossCount={bossCount}
          reliability={byScale}
          facets={facets}
          clean={clean}
          poorN={poorN}
        />
      )}
      {tab === "rank" && (
        <RankTab
          axis={sp.axis}
          scale={sp.scale}
          people={people}
          source={source}
          bossCount={bossCount}
          reliability={byScale}
        />
      )}
      {tab === "spread" && (
        <SpreadTab
          people={people}
          source={source}
          bossCount={bossCount}
          reliability={byScale}
        />
      )}
      {tab === "prediction" && (
        <PredictionTab people={people} matrix={matrix} />
      )}
      {tab === "agreement" && <AgreementTab data={agreement} />}
      {tab === "reliability" && (
        <ReliabilityTab rows={reliability} quality={personQuality} />
      )}
    </>
  );
}

/**
 * 숫자 타일.
 *
 * `href`를 주면 **누를 수 있는 타일**이 된다. 숫자만 보여주고 끝내면
 * "37명이 했다는데 누구지?"에서 화면을 다시 뒤져야 한다. 세는 자리에서
 * 바로 명단으로 넘어가는 것이 자연스럽다.
 */
function Tile({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: number | string;
  hint?: string;
  href?: string;
}) {
  const body = (
    <>
      <p className="text-axis text-ink-secondary">{label}</p>
      <p className="mt-1 text-5xl font-semibold">{value}</p>
      {hint && (
        <p className="text-axis text-ink-muted mt-2">
          {hint}
          {href && <span aria-hidden> →</span>}
        </p>
      )}
    </>
  );
  const style = { background: "var(--wash)" };
  return href ? (
    <Link
      href={href}
      className="block rounded-xl p-6 transition hover:brightness-95"
      style={style}
    >
      {body}
    </Link>
  ) : (
    <div className="rounded-xl p-6" style={style}>
      {body}
    </div>
  );
}

// ── 직무능력과 성향 ────────────────────────────────────────────────

type People = Awaited<ReturnType<typeof loadPeople>>;

/**
 * 한 화면에 두 절을 세로로 쌓는다.
 *
 *   1. 우리 회사 데이터   ← 표 왼쪽, 점 분포 오른쪽
 *   2. 연구에서 나온 값   ← 표 왼쪽, **얼마나 맞는가** 오른쪽
 *
 * 연구 표에는 우리 직원의 점이 없어서 오른쪽이 빈다. 전에는 그 자리에
 * "여기는 점 분포가 없습니다"라는 안내만 있어 화면 절반이 놀았다.
 * 대조표를 그리로 옮겨 **연구값과 판정이 한눈에 나란히** 놓이게 했다.
 *
 * ⚠️ **한 표에 섞지는 않는다.** 표본도 지표도 나라도 다른 값이라 한 칸에
 *    합치면 없는 숫자를 만들어내는 셈이 된다 (11 §3.2). 한 화면에 두되
 *    표는 끝까지 따로 둔다 — 대조는 3절에서 칸끼리 나란히 놓는 것으로만 한다.
 */
/**
 * **한 절만 남긴다** (2026-08-25 사용자 결정).
 *
 * 전에는 여기에 두 절이 세로로 쌓여 있었다 — 「우리 회사 데이터」와 「연구에서
 * 나온 값」. 그런데 연구값은 **논문이 본 것과 우리가 잰 것을 맞대는 이야기**라
 * 「예측 대 실제」 탭이 하는 일과 같다. 두 탭에 나눠 두면 같은 물음의 답이
 * 두 군데로 흩어진다.
 *
 * 연구 표는 그리로 옮기고, 여기는 **우리 데이터 하나를 깊게** 판다.
 */
function MatrixTab({
  people,
  matrix,
  source,
  bossCount,
  reliability,
  facets,
  clean,
  poorN,
}: {
  people: People;
  matrix: ReturnType<typeof traitAbilityMatrix>;
  source: AbilitySource;
  bossCount: number;
  reliability: Record<string, ScaleReliability>;
  facets: Record<string, RankRow[]>;
  clean: boolean;
  poorN: number;
}) {
  return (
    <InHouseSection
      people={people}
      matrix={matrix}
      source={source}
      bossCount={bossCount}
      reliability={reliability}
      facets={facets}
      clean={clean}
      poorN={poorN}
    />
  );
}

/**
 * 표의 행 묶음 — **기질 4 / 성격 3** (2026-08-25 사용자 요청).
 *
 * 일곱을 평평하게 늘어놓으면 이 검사의 뼈대가 표에서 사라진다. 묶어 두면
 * 「관련 있는 것은 타고나는 쪽인가, 만들어지는 쪽인가」라는 물음이 새로
 * 생긴다 — 숫자를 더 만들지 않고 줄만 나눠서 눈으로 답하게 한다.
 */
const TRAIT_GROUPS = [
  { label: "기질", note: "타고나는 쪽", rows: [...TEMPERAMENT] },
  { label: "성격", note: "살면서 만들어지는 쪽", rows: [...CHARACTER] },
];

/**
 * 응답 신뢰도가 낮은 사람을 빼고 다시 보는 손잡이.
 *
 * 「이 결과가 대충 찍은 몇 명 때문인가」는 늘 남는 물음이다. 그동안
 * `loadPeople(excludePoor)`가 코드에만 있고 화면에는 없었다. **켜고 끄면서
 * 숫자가 얼마나 움직이는지 보는 것**이 답이다 — 안 움직이면 걱정 안 해도
 * 되고, 크게 움직이면 그 자체가 발견이다.
 *
 * 켠 상태를 기본으로 두지 않는다. 사람을 빼고 시작하면 뺐다는 사실을
 * 잊는다.
 */
function CleanToggle({
  clean,
  poorN,
  source,
}: {
  clean: boolean;
  poorN: number;
  source: AbilitySource;
}) {
  if (poorN === 0) return null;
  const sp = new URLSearchParams();
  if (source !== "self") sp.set("src", source);
  if (!clean) sp.set("clean", "1");
  const q = sp.toString();

  return (
    <Link
      href={`/admin/stats${q ? `?${q}` : ""}`}
      scroll={false}
      className="text-axis inline-flex items-center gap-2 rounded-lg px-3 py-1.5"
      style={{
        background: clean ? "var(--ink)" : "var(--wash)",
        color: clean ? "var(--page)" : "var(--ink-secondary)",
        fontWeight: clean ? 600 : 400,
      }}
      title="응답 신뢰도가 「낮음」인 사람을 빼고 다시 계산합니다"
    >
      <span aria-hidden>{clean ? "☑" : "☐"}</span>
      신뢰도 낮은 응답 {poorN}명 빼기
    </Link>
  );
}

// ── 1절 · 우리 회사 데이터 ──────────────────────────────────────────

function InHouseSection({
  people,
  matrix,
  source,
  bossCount,
  reliability,
  facets,
  clean,
  poorN,
}: {
  people: People;
  matrix: ReturnType<typeof traitAbilityMatrix>;
  source: AbilitySource;
  bossCount: number;
  reliability: Record<string, ScaleReliability>;
  facets: Record<string, RankRow[]>;
  clean: boolean;
  poorN: number;
}) {
  if (!matrix.enough)
    return (
      <section>
        <SourcePicker value={source} bossCount={bossCount} className="mb-3" />
        <WarningBadge kind="smallSample" />
        <p className="text-ink-secondary mt-4">
          응시 완료 {matrix.n}명입니다. {MIN_N}명이 넘어야 사내 관련도를
          보여드립니다.
        </p>
      </section>
    );

  const cells: Record<string, Cell> = {};
  const scatter: Record<string, Point[]> = {};
  const trends: Record<string, { x: number; y: number }[] | null> = {};
  const influence: Record<string, Influence | null> = {};

  for (const scale of TRAIT_SCALES)
    for (const axis of ABILITY_AXES) {
      const k = `${scale}|${axis}`;
      const c = cellOf(matrix, scale, axis);
      if (!c) {
        cells[k] = { kind: "unstudied" };
        continue;
      }
      cells[k] = { kind: "value", r: c.r, n: c.n, ci: c.ci };
      const pts = scatterPoints(people, scale, axis);
      scatter[k] = pts;
      trends[k] = trendLine(pts);
      // 「한 사람에 매달려 있는가」 — 산점도와 같은 점으로 잰다
      influence[k] = influenceOf(pts);
    }

  return (
    <section>
      <div className="mb-1 flex flex-wrap items-center gap-x-6 gap-y-3">
        <SourcePicker value={source} bossCount={bossCount} />
        <CleanToggle clean={clean} poorN={poorN} source={source} />
      </div>
      <p className="text-ink-secondary mb-8 max-w-[56rem]">
        우리 직원 {matrix.n}명 값입니다. {SOURCE_NOTE[source]}{" "}
        <strong>칸을 누르면 그 조합만 크게 보고, 다시 누르면 돌아옵니다.</strong>
      </p>
      <CorrelationPanel
        rows={[...TRAIT_SCALES]}
        cols={[...ABILITY_AXES]}
        cells={cells}
        scatter={scatter}
        trends={trends}
        inHouse
        reliability={reliability}
        groups={TRAIT_GROUPS}
        influence={influence}
        facets={facets}
      />
    </section>
  );
}

// ── 순위 ────────────────────────────────────────────────────────────

async function RankTab({
  axis,
  scale,
  people,
  source,
  bossCount,
  reliability,
}: {
  axis?: string;
  scale?: string;
  people: People;
  source: AbilitySource;
  bossCount: number;
  reliability: Record<string, ScaleReliability>;
}) {
  const pickedAxis = ABILITY_AXES.includes(axis as never)
    ? axis!
    : ABILITY_AXES[0];
  const pickedScale = TRAIT_SCALES.includes(scale as never)
    ? scale!
    : TRAIT_SCALES[0];

  const ranks = await rankForAbility(pickedAxis, false, source);
  const tercile = abilitiesByTraitTercile(people, pickedScale);

  return (
    <RankPanel
      abilities={[...ABILITY_AXES]}
      scales={[...TRAIT_SCALES]}
      pickedAxis={pickedAxis}
      pickedScale={pickedScale}
      limit={RANK_LIMIT}
      items={ranks.map((r) => ({
        label: r.label,
        r: r.corr.r,
        n: r.corr.n,
        ci: r.corr.ci,
      }))}
      tercile={tercile}
      source={source}
      bossCount={bossCount}
      axisAlpha={reliability[pickedAxis]}
      scaleAlpha={reliability[pickedScale]}
    />
  );
}

// ── 분포 ────────────────────────────────────────────────────────────

/**
 * 「우리 회사 사람들이 각 축에서 어떻게 퍼져 있는가」 (2026-08-25 사용자 결정).
 *
 * 관계를 보기 전에 먼저 궁금한 것이라 **분석 안의 별도 탭**으로 둔다.
 * 직무능력은 고른 출처를 따른다 — 대표님 평가로 보면 그 값의 분포가 나온다.
 */
function SpreadTab({
  people,
  source,
  bossCount,
  reliability,
}: {
  people: People;
  source: AbilitySource;
  bossCount: number;
  reliability: Record<string, ScaleReliability>;
}) {
  const of = (
    scale: string,
    kind: Spread["kind"],
    pick: (p: People[number]) => number | undefined,
  ) =>
    spreadOf(
      scale,
      kind,
      people
        .map((p) => ({ employeeId: p.employeeId, name: p.name, value: pick(p)! }))
        .filter((x) => typeof x.value === "number"),
    );

  const spreads = [
    ...TEMPERAMENT.map((s) => of(s, "temperament", (p) => p.traits[s])),
    ...CHARACTER.map((s) => of(s, "character", (p) => p.traits[s])),
    ...ABILITY_AXES.map((a) => of(a, "ability", (p) => p.abilities[a])),
  ].filter((x): x is Spread => x !== null);

  return (
    <div>
      <div className="mb-8">
        <SourcePicker value={source} bossCount={bossCount} />
        <p className="text-axis text-ink-muted mt-2 max-w-[52rem]">
          {SOURCE_NOTE[source]}
        </p>
      </div>
      <DistributionPanel spreads={spreads} reliability={reliability} />
    </div>
  );
}

// ── 평가 대조 ──────────────────────────────────────────────────────

/**
 * 본인 답 ↔ 대표님 평가 (Task 31).
 *
 * **이 시스템에서 유일하게 「실제와 맞나」에 답하는 화면이다.** 나머지는
 * 전부 설문 안에서 앞뒤가 맞는지를 본다 — 성향도 직무능력도 같은 사람이
 * 이어서 답하므로, 잘 맞는다고 실제와 맞는 것은 아니다.
 */
function AgreementTab({ data }: { data: Awaited<ReturnType<typeof loadRatingCompare>> }) {
  return (
    <section>
      <h2 className="text-section-title mb-3">본인 답과 대표님이 보시는 것</h2>
      <p className="text-item text-ink-secondary mb-8 max-w-[52rem]">
        같은 사람의 직무능력을 <strong>본인이 답한 값</strong>과{" "}
        <strong>대표님이 매기신 값</strong>으로 나란히 놓았습니다.
      </p>

      {data.axes.length === 0 ? (
        <>
          <WarningBadge kind="smallSample" />
          <p className="text-ink-secondary mt-4">
            두 값이 다 있는 사람이 아직 없습니다. 대표님 평가를 먼저 매기셔야 합니다.
          </p>
        </>
      ) : (
        <AgreementPanel data={data} />
      )}

      <Note label="이 화면을 어떻게 읽는지" className="mt-10">
        <p className="mb-2">
          <strong>「누가 맞았나」를 보는 화면이 아닙니다.</strong> 대표님이 맞고 본인이
          틀렸다는 뜻이 아닙니다. <strong>둘이 갈리는 사람이 이야깃거리</strong>라는
          뜻입니다 — 본인은 협력을 높게 보는데 대표님은 낮게 보신다면, 그 사이에 무슨
          일이 있는지가 볼 것입니다.
        </p>
        <p className="mb-2">
          두 값 다 오차가 있습니다. 자기보고는 좋게 보이려는 쪽으로 기울고, 상사 평가는
          최근 일이나 눈에 띄는 몇 장면에 끌립니다. <strong>어느 쪽도 정답이 아닙니다.</strong>
        </p>
        <p>
          그래도 이 화면이 중요한 이유는, 다른 모든 화면이 <strong>설문 안에서 앞뒤가
          맞는지</strong>만 보기 때문입니다. 성향도 직무능력도 같은 사람이 이어서 답하니
          잘 맞는 것이 당연합니다. 여기만 <strong>바깥에서 온 눈</strong>과 맞댑니다.
        </p>
      </Note>
    </section>
  );
}

// ── 계산식 ──────────────────────────────────────────────────────────

/**
 * **논문이 본 것과 우리가 잰 것** — 두 절 (2026-08-25 사용자 결정).
 *
 *   1. 사람별 예측 대 실제 — 논문 가중치로 계산한 값과 실제 값
 *   2. 논문 값과 우리 값 — 상관 하나하나를 막대 두 개로 맞댐
 *
 * 2절은 「직무능력과 기질·성격」 탭 아래쪽에 있던 것을 옮겨 왔다. 그 탭은
 * **우리 데이터 안의 이야기**를 하는 자리인데, 연구값 대조는 **바깥과
 * 맞대는 이야기**라 여기가 제자리다. 같은 물음의 답이 두 탭으로 흩어져
 * 있었다.
 */
function PredictionTab({
  people,
  matrix,
}: {
  people: People;
  matrix: ReturnType<typeof traitAbilityMatrix>;
}) {
  const items = ABILITY_AXES.map((axis) => predictFromResearch(people, axis)).filter(
    (x): x is NonNullable<typeof x> => x !== null,
  );

  const missing = ABILITY_AXES.filter((a) => !items.some((i) => i.axis === a));

  return (
    <section>
      {/*
        설명을 위에 크게 둔다. 이 화면은 무엇을 보는 것인지 모르면
        숫자가 아무 말도 하지 않는다.
      */}
      <h2 className="text-section-title mb-3">논문이 본 것과 우리가 잰 것</h2>
      <p className="text-item text-ink-secondary mb-8 max-w-[52rem]">
        논문 상관을 가중치로 삼아 <strong>이 사람의 직무능력이 얼마쯤일지 계산</strong>하고
        실제 값과 나란히 놓았습니다. 어긋난다면{" "}
        <strong>우리 회사가 논문과 다르거나, 그 사람이 남다르거나</strong>입니다.
      </p>

      {items.length === 0 ? (
        <>
          <WarningBadge kind="smallSample" />
          <p className="text-ink-secondary mt-4">
            아직 맞대 볼 만큼 모이지 않았거나, 쓸 수 있는 논문 값이 없습니다.
          </p>
        </>
      ) : (
        <PredictionPanel items={items} missing={missing} />
      )}

      <Note label="이 예측을 어디까지 믿을 수 있는지" className="mt-8 mb-16">
        <p className="mb-2">
          <strong>서로 다른 논문에서 온 값을 한 식에 넣습니다.</strong> 표본도 지표도
          나라도 다릅니다. 이렇게 만든 예측은 대략의 눈금이지 정밀한 값이 아닙니다.
        </p>
        <p className="mb-2">
          논문이 주는 것은 <strong>모양이지 눈금이 아닙니다.</strong> 상관만으로는
          「이 사람이 62점」이라고 말할 수 없어서, 우리 데이터의 퍼진 정도를 빌려
          점수로 되돌립니다.
        </p>
        <p>
          전에 있던 「계산식」 화면은 <strong>우리 데이터로 만든 식이 우리 데이터를</strong>{" "}
          맞추는지를 봤습니다. 자기 답으로 자기 답을 맞추는 셈이라 답이 거의 늘
          「맞는다」였습니다. 여기서는 바깥에서 온 값을 씁니다.
        </p>
      </Note>

      {/* ── 2절 · 상관 하나하나를 맞대 본다 ── */}
      <div className="border-t border-[--border] pt-14">
        <h2 className="text-section-title mb-3">논문 값과 우리 값</h2>
        <p className="text-item text-ink-secondary mb-8 max-w-[52rem]">
          위쪽이 <strong>사람</strong>을 맞대 본 것이라면, 여기는{" "}
          <strong>관계 하나하나</strong>를 맞대 봅니다. 막대 두 개가 한 쌍이고
          위가 논문, 아래가 우리 회사입니다.{" "}
          <strong>끝이 비슷하면 맞은 것</strong>입니다.
        </p>

        {matrix.enough ? (
          <ResearchCompare data={compareToResearch(matrix)} />
        ) : (
          <>
            <WarningBadge kind="smallSample" />
            <p className="text-ink-secondary mt-4">
              우리 회사 값이 아직 없어 맞대 볼 수 없습니다. {MIN_N}명이 넘으면
              나옵니다.
            </p>
          </>
        )}

        <Note label="논문 값을 어떻게 읽는지" className="mt-10">
          <p className="mb-2">
            <strong>서로 다른 연구에서 온 값입니다.</strong> 표본도 지표도
            나라도 달라서 칸끼리 견줄 수 있는 값이 아닙니다. 각 칸을 우리
            값과만 맞대 보십시오.
          </p>
          <p className="mb-2">
            판정 기준은 <strong>논문 값이 우리 95% 신뢰구간 안에 들어오는가</strong>
            입니다. 두 숫자를 빼서 크면 다르다고 하지 않습니다 — 우리 값은
            40명 남짓에서 나온 것이라 원래 흔들립니다. 사람이 늘어 구간이
            좁아질수록 이 판정이 날카로워집니다.
          </p>
          <p>
            논문 값은 <strong>사람이 늘어도 바뀌지 않고</strong>, 점수 계산에도
            쓰지 않습니다. 우리 값을 견줄 바깥 기준으로만 둡니다.
          </p>
        </Note>
      </div>
    </section>
  );
}

function ReliabilityTab({
  rows,
  quality,
}: {
  rows: Awaited<ReturnType<typeof loadReliability>>;
  quality: Awaited<ReturnType<typeof loadPersonQuality>>;
}) {
  const COLOR = {
    good: "var(--status-good)",
    fair: "var(--status-warn)",
    poor: "var(--status-critical)",
    unknown: "var(--ink-muted)",
  } as const;
  /*
    기질 · 성격 · 직무능력을 나눠 놓는다.

    한 표에 열 개를 늘어놓으면 어느 것이 TCI 기질이고 어느 것이 우리가 만든
    직무능력인지 섞인다. 같은 잣대로 볼 값도 아니다 — 직무능력은 능력당
    세 문항뿐이라 α가 낮게 나오는 것이 정상이다.
  */
  const GROUPS = [
    {
      label: "기질",
      note: "타고나는 쪽 · TCI 4축",
      has: (r: { scale: string; kind: string }) =>
        r.kind === "trait" && (TEMPERAMENT as readonly string[]).includes(r.scale),
    },
    {
      label: "성격",
      note: "살면서 만들어지는 쪽 · TCI 3축",
      has: (r: { scale: string; kind: string }) =>
        r.kind === "trait" && (CHARACTER as readonly string[]).includes(r.scale),
    },
    {
      label: "직무능력",
      note: "우리가 만든 3축 · 능력당 3문항",
      has: (r: { kind: string }) => r.kind === "ability",
    },
  ];

  const LABEL = {
    good: "괜찮음",
    fair: "보통",
    poor: "기준 아래",
    unknown: "계산 불가",
  } as const;

  return (
    <div className="flex flex-col gap-16">
      <section>
        <div className="grid gap-12 xl:grid-cols-[minmax(0,1fr)_24rem]">
          <div>
            <h2 className="text-section-title mb-1">문항이 맞물리는가</h2>
            <p className="text-axis text-ink-muted mb-6">
              한 척도의 문항들이 같은 것을 재고 있는지 — α가 {ALPHA.poor} 아래면
              그 상관은 볼 필요가 없습니다
            </p>

            <div className="flex flex-col gap-8">
              {GROUPS.map((g) => {
                const part = rows.filter((r) => g.has(r));
                if (part.length === 0) return null;
                return (
                  <div key={g.label} className="overflow-x-auto">
                    <p className="text-table text-ink-secondary mb-2">
                      {g.label}
                      <span className="text-axis text-ink-muted ml-2">{g.note}</span>
                    </p>
                    <table className="text-table w-full min-w-[22rem]">
                      <thead>
                        <tr className="text-axis text-ink-muted border-b border-[--border]">
                          <th className="py-1.5 text-left font-medium">척도</th>
                          <th className="w-16 py-1.5 text-right font-medium">문항</th>
                          <th className="w-16 py-1.5 text-right font-medium">α</th>
                          <th className="w-28 py-1.5 pl-6 text-left font-medium">판정</th>
                        </tr>
                      </thead>
                      <tbody>
                        {part.map((r) => (
                          <tr
                            key={r.scale}
                            className="border-b border-[--border] last:border-0"
                          >
                            <th scope="row" className="py-2 text-left font-normal">
                              {r.scale}
                            </th>
                            <td className="tabular py-2 text-right">{r.itemCount}</td>
                            <td className="tabular py-2 text-right font-medium">
                              {r.alpha === null ? "—" : r.alpha.toFixed(2)}
                            </td>
                            <td
                              className="text-axis py-2 pl-6"
                              style={{ color: COLOR[r.verdict] }}
                            >
                              {LABEL[r.verdict]}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          </div>
          <LowQualityList rows={quality} />
        </div>
        <Note label="α가 낮게 나오는 이유" className="mt-8">
          <p>
            직무능력은 능력당 문항이 세 개뿐이라 α가 낮게 나오기 쉽습니다. 값을
            보고 문항을 늘릴지 판단합니다. 이 지표는{" "}
            <strong>응시 인원과 무관</strong>하게 문항 품질만 말해줍니다 —
            사람이 늘어도 좋아지지 않습니다.
          </p>
        </Note>
      </section>

      <section>
        <h2 className="text-section-title mb-1">사람별 응답 신뢰도</h2>
        <p className="text-axis text-ink-muted mb-6">
          서로 반대인 문항에 같은 방향으로 답했는지 — 무작위로 답하면 60
          근처가 나옵니다
        </p>
        <QualityRanking rows={quality} />
        <Note label="이 점수를 어떻게 읽는지" className="mt-8">
          <p className="mb-2">
            <strong>성격에 대한 판정이 아닙니다.</strong> 「이 응답을 믿을 수
            있는가」에 대한 값입니다. 낮다고 해서 그 사람이 문제라는 뜻이
            아니라, 그 사람의 점수를 해석에 쓸 수 있는지를 말합니다.
          </p>
          <p>
            위 α와는 다른 이야기입니다. α는 문항이 잘 만들어졌는지를, 이쪽은 그
            문항에 답한 방식이 앞뒤가 맞는지를 봅니다. α가 아무리 높아도 서둘러
            넘긴 응답의 값은 쓰기 어렵습니다.
          </p>
        </Note>
      </section>
    </div>
  );
}
