import Link from "next/link";
import { RankBars } from "@/components/analysis/RankBars";
import { ScatterPlot } from "@/components/analysis/ScatterPlot";
import type { Cell } from "@/components/analysis/CorrelationTable";
import type { Point } from "@/components/analysis/ScatterPlot";
import { WarningBadge } from "@/components/ui/WarningBadge";
import { requireAdmin } from "@/lib/auth/guard";
import {
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
import { getCell, loadResearchTable } from "@/lib/research/correlations";
import { MIN_N } from "@/components/ui/NBadge";
import { ResearchCompareTable } from "@/components/analysis/ResearchCompareTable";
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
import { PredictionPanel } from "./PredictionPanel";
import { predictFromResearch } from "@/lib/admin/researchPrediction";
import { LowQualityList, QualityRanking } from "./PersonQuality";
import { CorrelationPanel } from "./CorrelationPanel";
import { RankPanel } from "./RankPanel";

export const metadata = { title: "분석 — 관리자" };

const TABS = [
  { key: "matrix", label: "직무능력과 성향" },
  { key: "rank", label: "순위" },
  { key: "prediction", label: "예측 대 실제" },
  { key: "reliability", label: "검사 신뢰도" },
] as const;

export default async function StatsPage(props: {
  searchParams: Promise<{
    tab?: string;
    axis?: string;
    scale?: string;
    src?: string;
  }>;
}) {
  await requireAdmin();
  const sp = await props.searchParams;
  const tab = TABS.some((t) => t.key === sp.tab) ? sp.tab! : "matrix";
  const source = parseSource(sp.src);

  const [people, reliability, bossCount, personQuality] = await Promise.all([
    loadPeople(false, source),
    loadReliability(),
    countRatedEmployees(),
    loadPersonQuality(),
  ]);
  const matrix = traitAbilityMatrix(people);
  const alphas = reliability
    .map((r) => r.alpha)
    .filter((a): a is number => a !== null);
  const meanAlpha = alphas.length
    ? alphas.reduce((a, b) => a + b, 0) / alphas.length
    : null;
  const poorCount = reliability.filter((r) => r.verdict === "poor").length;
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
        />
      )}
      {tab === "rank" && (
        <RankTab
          axis={sp.axis}
          scale={sp.scale}
          people={people}
          source={source}
          bossCount={bossCount}
        />
      )}
      {tab === "prediction" && <PredictionTab people={people} />}
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
function MatrixTab({
  people,
  matrix,
  source,
  bossCount,
}: {
  people: People;
  matrix: ReturnType<typeof traitAbilityMatrix>;
  source: AbilitySource;
  bossCount: number;
}) {
  return (
    <div className="flex flex-col gap-16">
      <InHouseSection
        people={people}
        matrix={matrix}
        source={source}
        bossCount={bossCount}
      />
      <ResearchSection
        compare={
          matrix.enough ? (
            <ResearchCompareTable data={compareToResearch(matrix)} />
          ) : (
            <p className="text-ink-secondary">
              우리 회사 값이 아직 없어 맞대 볼 수 없습니다. {MIN_N}명이 넘으면
              나옵니다.
            </p>
          )
        }
      />
    </div>
  );
}

// ── 1절 · 우리 회사 데이터 ──────────────────────────────────────────

function InHouseSection({
  people,
  matrix,
  source,
  bossCount,
}: {
  people: People;
  matrix: ReturnType<typeof traitAbilityMatrix>;
  source: AbilitySource;
  bossCount: number;
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
    }

  return (
    <section>
      <SourcePicker value={source} bossCount={bossCount} className="mb-1" />
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
      />
    </section>
  );
}

// ── 2절 · 연구에서 나온 값 ──────────────────────────────────────────

function ResearchSection({ compare }: { compare: React.ReactNode }) {
  const table = loadResearchTable();
  const cells: Record<string, Cell> = {};
  for (const scale of TRAIT_SCALES)
    for (const axis of ABILITY_AXES) {
      const c = getCell(table, scale, axis);
      cells[`${scale}|${axis}`] =
        c.kind === "value"
          ? { kind: "value", r: c.value, n: 0, ci: [c.value, c.value] }
          : c.kind === "none"
            ? { kind: "none" }
            : c.kind === "expected"
              ? {
                  kind: "expected",
                  direction: c.direction,
                  basis: c.chain ? `${c.basis} — ${c.chain}` : c.basis,
                  estimate: c.estimate,
                }
              : { kind: "unstudied" };
    }

  return (
    <section>
      <h2 className="text-section-title mb-1">연구에서 나온 값</h2>
      <p className="text-ink-secondary mb-8 max-w-[56rem]">
        논문 값을 그대로 적은 것입니다. 사람이 늘어도 바뀌지 않고, 점수 계산에도
        쓰지 않습니다.
      </p>
      <CorrelationPanel
        rows={[...TRAIT_SCALES]}
        cols={[...ABILITY_AXES]}
        cells={cells}
        scatter={{}}
        trends={{}}
        inHouse={false}
        aside={compare}
      />
      <p className="text-axis text-ink-muted mt-6 max-w-[56rem]">
        서로 다른 연구에서 온 값이라 칸끼리 비교할 수 있는 값은 아닙니다.
        조직생활 열이 통째로 빈 것은 이 개념을 정의한 연구를 찾지 못해서입니다.
      </p>
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
}: {
  axis?: string;
  scale?: string;
  people: People;
  source: AbilitySource;
  bossCount: number;
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
    />
  );
}

// ── 계산식 ──────────────────────────────────────────────────────────

function PredictionTab({ people }: { people: People }) {
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

      <Note label="이 예측을 어디까지 믿을 수 있는지" className="mt-8">
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
