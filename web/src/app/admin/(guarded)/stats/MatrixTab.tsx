import Link from "next/link";
import { WarningBadge } from "@/components/ui/WarningBadge";
import { Note } from "@/components/ui/Note";
import { MIN_N } from "@/components/ui/NBadge";
import { AxisRanking, type AxisRow } from "@/components/analysis/AxisRanking";
import { CompositePanel } from "@/components/analysis/CompositePanel";
import { Cautions } from "@/components/analysis/Cautions";
import type { Cell } from "@/components/analysis/CorrelationTable";
import type { Point } from "@/components/analysis/ScatterPlot";
import { CHARACTER, TEMPERAMENT } from "@/components/charts/scale";
import { ABILITY_AXES, TRAIT_SCALES } from "@/lib/items/types";
import {
  cellOf,
  loadPeople,
  scatterPoints,
  traitAbilityMatrix,
  trendLine,
} from "@/lib/admin/analysis";
import { abilityComposite } from "@/lib/admin/composite";
import { splitsFor } from "@/lib/admin/split";
import { CorrelationPanel } from "./CorrelationPanel";

// ── 직무능력과 기질·성격 ──────────────────────────────────────────

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
export function MatrixTab({
  people,
  matrix,
  clean,
  poorN,
}: {
  people: People;
  matrix: ReturnType<typeof traitAbilityMatrix>;
  clean: boolean;
  poorN: number;
}) {
  return (
    <InHouseSection
      people={people}
      matrix={matrix}
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
function CleanToggle({ clean, poorN }: { clean: boolean; poorN: number }) {
  if (poorN === 0) return null;
  const sp = new URLSearchParams();
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
  clean,
  poorN,
}: {
  people: People;
  matrix: ReturnType<typeof traitAbilityMatrix>;
  clean: boolean;
  poorN: number;
}) {
  if (!matrix.enough)
    return (
      <section>
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
  const composite = abilityComposite(people);
  const byComposite = new Map(
    (composite?.values ?? []).map((v) => [v.employeeId, v.value]),
  );

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

  const splits = composite
    ? splitsFor(people, (p) => byComposite.get(p.employeeId))
    : [];

  /*
    총합에 대한 점 분포 — 세로축이 능력 하나가 아니라 **세 능력의 평균**이다.
    위 상관표용 `scatterPoints`와 같은 꼴로 만들어 같은 그림 부품에 넘긴다.
  */
  const cScatter: Record<string, Point[]> = {};
  const cTrends: Record<string, { x: number; y: number }[] | null> = {};
  if (composite)
    for (const scale of TRAIT_SCALES) {
      const pts = people
        .filter(
          (p) =>
            typeof p.traits[scale] === "number" &&
            byComposite.has(p.employeeId),
        )
        .map((p) => ({
          id: p.employeeId,
          name: p.name,
          x: p.traits[scale],
          y: byComposite.get(p.employeeId)!,
          quality: p.quality,
        }));
      cScatter[scale] = pts;
      cTrends[scale] = trendLine(pts);
    }

  return (
    <section>
      <div className="mb-1 flex flex-wrap items-center gap-x-6 gap-y-3">
        <CleanToggle clean={clean} poorN={poorN} />
      </div>
      <h2 className="text-section-title mb-2">성향 축과 직무능력 세 가지</h2>
      <p className="text-ink-secondary mb-2 max-w-[56rem]">
        우리 직원 {matrix.n}명 값입니다. 칸을 누르면 그 하나만 크게 봅니다.
      </p>
      <Note label="지금 보는 값이 무엇인지" className="mb-8">
        <p>
          직무능력은 직원분이 설문에서 스스로 답한 값입니다. 성향과 같은
          설문이라 관련도가 실제보다 다소 높게 나올 수 있습니다.
        </p>
      </Note>
      <CorrelationPanel
        rows={[...TRAIT_SCALES]}
        cols={[...ABILITY_AXES]}
        cells={cells}
        scatter={scatter}
        trends={trends}
        inHouse
        groups={TRAIT_GROUPS}
      />

      {/* ── 2절 · 능력마다 어떤 성향이 ── */}
      <div className="mt-20 border-t border-[--border] pt-12">
        <h2 className="text-section-title mb-2">
          능력마다 어떤 성향이 뚜렷한가
        </h2>
        <p className="text-ink-secondary mb-2 max-w-[56rem]">
          위 표와 같은 값을 능력마다 순위로 늘어놓은 것입니다. 줄을 누르면 점
          분포를 봅니다.
        </p>
        <Note label="표와 무엇이 다른지" className="mb-10">
          <p>
            표는 7×3 격자라 「협력 열에서 어느 것이 큰가」를 세로로 훑어야
            합니다. 여기는 이미 큰 순으로 정렬돼 있고, 줄을 누르면 그 조합의 점
            분포가 그 자리에서 열립니다. <strong>숫자는 같은 값</strong>이라 두
            화면이 어긋날 일은 없습니다.
          </p>
        </Note>
        <div className="flex flex-col gap-14">
          {ABILITY_AXES.map((axis) => (
            <AxisRanking
              key={axis}
              axis={axis}
              rows={rankingFor(cells, axis)}
              scatter={forAxis(scatter, axis)}
              trends={forAxis(trends, axis)}
            />
          ))}
        </div>
      </div>

      {/* ── 3절 · 셋을 합쳐서 ── */}
      {composite && (
        <div className="mt-20 border-t border-[--border] pt-12">
          <h2 className="text-section-title mb-6">
            직무능력이 높으려면 — 무엇이 가장 크게 가르나
          </h2>
          <CompositePanel
            c={composite}
            splits={splits}
            scatter={cScatter}
            trends={cTrends}
          />
        </div>
      )}

      <Cautions />
    </section>
  );
}
function rankingFor(cells: Record<string, Cell>, axis: string): AxisRow[] {
  const out: AxisRow[] = [];
  for (const scale of TRAIT_SCALES) {
    const c = cells[`${scale}|${axis}`];
    if (c?.kind === "value") out.push({ scale, r: c.r, n: c.n, ci: c.ci });
  }
  return out.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));
}

/**
 * `"인내력|협력"` 꼴로 든 표를 **한 능력만 뽑아 축 이름으로** 다시 짠다.
 *
 * ⚠️ 이름을 `byScale`로 두었더니 `StatsPage` 안의 `const byScale`(척도 이름 →
 *    신뢰도)과 겹쳤다. 동작은 했지만 — 지역 변수가 이 함수를 가리고, 이
 *    함수는 다른 함수 안에서만 보였다 — **같은 이름이 두 가지를 뜻하는
 *    상태**라 다음에 읽는 사람이 헷갈린다.
 *
 * 목록 컴포넌트는 자기가 맡은 능력 하나만 알면 되므로, 열쇠에서 능력을
 * 떼고 넘긴다 — 안에서 다시 조립하게 두면 열쇠 꼴이 두 군데로 흩어진다
 * (그러다 실제로 어긋난 적이 있다, D-61).
 */
function forAxis<T>(all: Record<string, T>, axis: string): Record<string, T> {
  const out: Record<string, T> = {};
  for (const scale of TRAIT_SCALES) {
    const v = all[`${scale}|${axis}`];
    if (v !== undefined) out[scale] = v;
  }
  return out;
}
