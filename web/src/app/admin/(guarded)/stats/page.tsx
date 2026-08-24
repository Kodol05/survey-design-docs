import Link from "next/link";
import { RankBars } from "@/components/analysis/RankBars";
import { ScatterPlot } from "@/components/analysis/ScatterPlot";
import type { Cell } from "@/components/analysis/CorrelationTable";
import type { Point } from "@/components/analysis/ScatterPlot";
import { WarningBadge } from "@/components/ui/WarningBadge";
import { requireAdmin } from "@/lib/auth/guard";
import { isResultsOpen } from "@/lib/admin/phase";
import {
  RANK_LIMIT,
  abilitiesByTraitTercile,
  cellOf,
  loadPeople,
  loadReliability,
  predictionCheck,
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
import { CorrelationPanel } from "./CorrelationPanel";
import { RankPanel } from "./RankPanel";

export const metadata = { title: "분석 — 관리자" };

const TABS = [
  { key: "matrix", label: "직무능력과 성향" },
  { key: "rank", label: "순위" },
  { key: "prediction", label: "계산식" },
  { key: "reliability", label: "검사 신뢰도" },
] as const;

export default async function StatsPage(props: {
  searchParams: Promise<{ tab?: string; axis?: string; scale?: string }>;
}) {
  await requireAdmin();
  const open = await isResultsOpen();
  const sp = await props.searchParams;
  const tab = TABS.some((t) => t.key === sp.tab) ? sp.tab! : "matrix";

  if (!open)
    return (
      <>
        <h1 className="text-screen-title mb-6">분석</h1>
        <p className="text-ink-secondary border-l-2 border-[--axis] py-1 pl-4">
          평가 수집 중이라 분석 화면을 볼 수 없습니다. 대표님 평가가 끝나면 열립니다.
        </p>
      </>
    );

  const [people, reliability] = await Promise.all([loadPeople(), loadReliability()]);
  const matrix = traitAbilityMatrix(people);
  const alphas = reliability.map((r) => r.alpha).filter((a): a is number => a !== null);
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
        <Tile label="응시 완료" value={people.length} />
        <Tile
          label="검토가 필요한 응답"
          value={reviewCount}
          hint={reviewCount ? "상관에서 뺄지 정할 수 있습니다" : undefined}
        />
        <Tile
          label="척도 평균 α"
          value={meanAlpha === null ? "—" : meanAlpha.toFixed(2)}
        />
        <Tile
          label="α 미달 척도"
          value={poorCount}
          hint={poorCount ? `${ALPHA.poor} 아래` : undefined}
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

      {tab === "matrix" && <MatrixTab people={people} matrix={matrix} />}
      {tab === "rank" && <RankTab axis={sp.axis} scale={sp.scale} people={people} />}
      {tab === "prediction" && <PredictionTab people={people} />}
      {tab === "reliability" && <ReliabilityTab rows={reliability} />}
    </>
  );
}

function Tile({
  label,
  value,
  hint,
}: {
  label: string;
  value: number | string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl p-6" style={{ background: "var(--wash)" }}>
      <p className="text-axis text-ink-secondary">{label}</p>
      <p className="mt-1 text-4xl font-semibold">{value}</p>
      {hint && <p className="text-axis text-ink-muted mt-2">{hint}</p>}
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
}: {
  people: People;
  matrix: ReturnType<typeof traitAbilityMatrix>;
}) {
  return (
    <div className="flex flex-col gap-16">
      <InHouseSection people={people} matrix={matrix} />
      <ResearchSection
        compare={
          matrix.enough ? (
            <ResearchCompareTable data={compareToResearch(matrix)} />
          ) : (
            <p className="text-ink-secondary">
              우리 회사 값이 아직 없어 맞대 볼 수 없습니다. {MIN_N}명이 넘으면 나옵니다.
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
}: {
  people: People;
  matrix: ReturnType<typeof traitAbilityMatrix>;
}) {
  if (!matrix.enough)
    return (
      <section>
        <h2 className="text-section-title mb-3">우리 회사 데이터</h2>
        <WarningBadge kind="smallSample" />
        <p className="text-ink-secondary mt-4">
          응시 완료 {matrix.n}명입니다. {MIN_N}명이 넘어야 사내 관련도를 보여드립니다.
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
      <h2 className="text-section-title mb-1">우리 회사 데이터</h2>
      <p className="text-ink-secondary mb-8 max-w-[46rem]">
        우리 직원 {matrix.n}명의 응답으로 직접 낸 값입니다. 사람이 늘거나 재검사가 쌓이면
        달라집니다. <strong>칸을 누르면 그 조합의 점 분포가 옆에 나옵니다.</strong>
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
            : { kind: "unstudied" };
    }

  return (
    <section>
      <h2 className="text-section-title mb-1">연구에서 나온 값</h2>
      <p className="text-ink-secondary mb-8 max-w-[46rem]">
        논문 값을 그대로 적은 것입니다. 사람이 늘어도 바뀌지 않고, 점수 계산에도 쓰지
        않습니다.
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
      <p className="text-axis text-ink-muted mt-6 max-w-[46rem]">
        서로 다른 연구에서 온 값이라 칸끼리 비교할 수 있는 값은 아닙니다. 조직생활 열이
        통째로 빈 것은 이 개념을 정의한 연구를 찾지 못해서입니다.
      </p>
    </section>
  );
}

// ── 순위 ────────────────────────────────────────────────────────────

async function RankTab({
  axis,
  scale,
  people,
}: {
  axis?: string;
  scale?: string;
  people: People;
}) {
  const pickedAxis = ABILITY_AXES.includes(axis as never) ? axis! : ABILITY_AXES[0];
  const pickedScale = TRAIT_SCALES.includes(scale as never) ? scale! : TRAIT_SCALES[0];

  const ranks = await rankForAbility(pickedAxis);
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
    />
  );
}

// ── 계산식 ──────────────────────────────────────────────────────────

function PredictionTab({ people }: { people: People }) {
  const checks = ABILITY_AXES.map((axis) => predictionCheck(people, axis)).filter(
    (c): c is NonNullable<typeof c> => c !== null,
  );

  if (!checks.length)
    return (
      <section>
        <WarningBadge kind="smallSample" />
        <p className="text-ink-secondary mt-4">아직 계산식을 만들 만큼 모이지 않았습니다.</p>
      </section>
    );

  return (
    <section>
      <p className="text-ink-secondary mb-4 max-w-[46rem]">
        성향 일곱 축으로 직무능력을 맞춰봅니다. 한 명씩 빼고 나머지로 식을 만들어 뺀
        사람을 맞추는 방식이라, 외운 것을 다시 묻는 착시가 없습니다.
      </p>
      <div className="mb-10 max-w-[46rem]">
        <WarningBadge kind="overfitting" />
      </div>

      <div className="grid gap-12 lg:grid-cols-3">
        {checks.map(({ axis, loocv }) => (
          <div key={axis}>
            <h3 className="mb-1 font-medium">{axis}</h3>
            <p className="text-axis text-ink-muted tabular mb-4">
              그냥 맞추면 평균 {loocv.trainMae.toFixed(1)}점 차이 · 한 명씩 빼고 맞추면{" "}
              <strong className="text-ink">{loocv.cvMae.toFixed(1)}점</strong>
            </p>
            <ScatterPlot
              points={loocv.points.map((p, i) => ({
                id: String(i),
                name: `실제 ${Math.round(p.actual)} · 예측 ${Math.round(p.predicted)}`,
                x: p.actual,
                y: p.predicted,
                quality: "ok",
              }))}
              trend={[
                { x: 0, y: 0 },
                { x: 100, y: 100 },
              ]}
              xLabel="실제"
              yLabel="예측"
            />
            <p className="text-axis text-ink-muted mt-2">
              대각선에 가까울수록 잘 맞은 것입니다. 차이 {loocv.gap.toFixed(1)}점이
              착시의 크기입니다.
            </p>
          </div>
        ))}
      </div>

      <p className="text-axis text-ink-secondary mt-12 max-w-[46rem] border-t border-[--border] pt-6">
        이 화면이 답하는 것은 <strong>설문 안에서 앞뒤가 맞는가</strong>입니다. 성향
        문항과 직무능력 문항을 같은 사람이 이어서 답하므로, 잘 맞는다고 실제와 맞는 것은
        아닙니다. 그건 대표님 평가와 대조해야 알 수 있습니다.
      </p>
    </section>
  );
}

// ── 신뢰도 ──────────────────────────────────────────────────────────

function ReliabilityTab({
  rows,
}: {
  rows: Awaited<ReturnType<typeof loadReliability>>;
}) {
  const COLOR = {
    good: "var(--status-good)",
    fair: "var(--status-warn)",
    poor: "var(--status-critical)",
    unknown: "var(--ink-muted)",
  } as const;
  const LABEL = {
    good: "괜찮음",
    fair: "보통",
    poor: "미달",
    unknown: "계산 불가",
  } as const;

  return (
    <section>
      <p className="text-ink-secondary mb-8 max-w-[46rem]">
        한 척도의 문항들이 서로 맞물려 같은 것을 재고 있는지를 봅니다.{" "}
        <strong>α가 {ALPHA.poor} 아래인 척도는 그 상관을 볼 필요가 없습니다.</strong>{" "}
        문항이 아직 제대로 만들어지지 않았다는 뜻입니다.
      </p>

      <div className="max-w-2xl overflow-x-auto">
        <table className="text-table w-full">
          <thead>
            <tr className="text-ink-secondary border-b border-[--border]">
              <th className="py-2 text-left font-medium">척도</th>
              <th className="py-2 text-right font-medium">문항</th>
              <th className="py-2 text-right font-medium">α</th>
              <th className="py-2 pl-6 text-left font-medium">판정</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.scale} className="border-b border-[--border] last:border-0">
                <th scope="row" className="py-2.5 text-left font-normal">
                  {r.scale}
                  {r.kind === "ability" && (
                    <span className="text-ink-muted text-axis ml-2">직무능력</span>
                  )}
                </th>
                <td className="tabular py-2.5 text-right">{r.itemCount}</td>
                <td className="tabular py-2.5 text-right font-medium">
                  {r.alpha === null ? "—" : r.alpha.toFixed(2)}
                </td>
                <td className="py-2.5 pl-6" style={{ color: COLOR[r.verdict] }}>
                  {LABEL[r.verdict]}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-axis text-ink-secondary mt-8 max-w-[46rem]">
        직무능력은 능력당 문항이 세 개뿐이라 α가 낮게 나오기 쉽습니다. 값을 보고 문항을
        늘릴지 판단합니다. 이 지표는 <strong>응시 인원과 무관</strong>하게 문항 품질을
        말해줍니다.
      </p>
    </section>
  );
}
