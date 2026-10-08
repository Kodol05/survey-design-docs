import Link from "next/link";
import { WarningBadge } from "@/components/ui/WarningBadge";
import { Note } from "@/components/ui/Note";
import { MIN_N } from "@/components/ui/NBadge";
import { AxisRanking, type AxisRow } from "@/components/analysis/AxisRanking";
import { CompositePanel } from "@/components/analysis/CompositePanel";
import { shareFull } from "@/components/analysis/share";
import { Panel } from "@/components/ui/Panel";
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
import { CorrelationPanel } from "./CorrelationPanel";

// ── 직무능력과 기질·성격 ──────────────────────────────────────────

type People = Awaited<ReturnType<typeof loadPeople>>;

/**
 * **우리 데이터 하나를 깊게** 판다 (2026-08-25 사용자 결정 — 연구값 대조는
 * 따로 뗐다가 2026-10-07 탭째 지웠다).
 *
 * 카드 셋을 세로로 쌓는다 (2026-10-07 사용자 결정).
 *
 *   1. 성향 축과 직무능력 세 가지      7×3 상관표 + 큰 산점도 하나
 *   2. 각 직무능력별 정리              능력마다 일곱 축 순위
 *   3. 모든 직무능력과 가장 연관된 성향  세 능력 평균과 일곱 축
 *
 * 2·3은 같은 줄 모양(`ShareList`)과 같은 막대 눈금을 쓴다.
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
 * 응답 신뢰도가 낮은 사람을 빼고 다시 보는 손잡이. 첫 카드 머리줄에 둔다.
 * 켜짐은 진한 바탕으로만 말한다 — 체크 상자 글리프는 뺐다 (2026-10-07, 아이콘 안 씀).
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
      className="text-axis inline-flex items-center rounded-lg px-3 py-1"
      style={{
        background: clean ? "var(--ink)" : "var(--wash)",
        color: clean ? "var(--page)" : "var(--ink-secondary)",
        fontWeight: clean ? 600 : 400,
      }}
      title="응답 신뢰도가 「낮음」인 사람을 빼고 다시 계산합니다"
      aria-pressed={clean}
    >
      신뢰도 낮은 응답 {poorN}명 빼기
    </Link>
  );
}

// ── 카드 셋 ──────────────────────────────────────────

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
      <Panel title="성향 축과 직무능력 세 가지">
        <WarningBadge kind="smallSample" />
        <p className="text-ink-secondary mt-4">
          응시 완료 {matrix.n}명입니다. {MIN_N}명이 넘어야 사내 관련도를
          보여드립니다.
        </p>
      </Panel>
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

  /*
    아래 두 카드의 % 막대는 **한 눈금**을 쓴다 (`shareFull` 참고) — 표의
    스물한 칸과 직무능력 평균의 일곱 줄 가운데 가장 큰 것에 맞춘다.
  */
  const full = shareFull([
    ...Object.values(cells).flatMap((c) => (c.kind === "value" ? [c.r] : [])),
    ...(composite?.drivers ?? []).map((d) => d.corr.r),
  ]);

  /*
    **덩어리마다 카드 하나** (2026-10-07 사용자 결정). 카드 제목은 짧은
    이름만 두고, 설명 문장은 지우거나 카드 맨 아래 접힌 메모로 내렸다.
  */
  return (
    <div className="flex flex-col gap-6">
      <Panel
        title="성향 축과 직무능력 세 가지"
        aside={
          <>
            <span className="tabular">{matrix.n}명</span>
            <CleanToggle clean={clean} poorN={poorN} />
          </>
        }
      >
        <CorrelationPanel
          rows={[...TRAIT_SCALES]}
          cols={[...ABILITY_AXES]}
          cells={cells}
          scatter={scatter}
          trends={trends}
          groups={TRAIT_GROUPS}
        />
        <Note
          label="지금 보는 값이 무엇인지"
          className="mt-5 border-t border-(--border) pt-3"
        >
          <p>
            직무능력은 직원분이 설문에서 스스로 답한 값입니다. 성향과 같은
            설문이라 관련도가 실제보다 다소 높게 나올 수 있습니다.
          </p>
        </Note>
      </Panel>

      <Panel title="각 직무능력별 정리">
        <div className="flex flex-col gap-8">
          {ABILITY_AXES.map((axis) => (
            <AxisRanking
              key={axis}
              axis={axis}
              rows={rankingFor(cells, axis)}
              full={full}
              scatter={forAxis(scatter, axis)}
              trends={forAxis(trends, axis)}
            />
          ))}
        </div>
      </Panel>

      {composite && (
        <Panel title="모든 직무능력과 가장 연관된 성향">
          <CompositePanel
            c={composite}
            full={full}
            scatter={cScatter}
            trends={cTrends}
          />
        </Panel>
      )}

      {/* 맨 아래, 접어서. `Cautions`의 위 여백(mt-16)은 카드 사이 간격이 대신한다 */}
      <div className="px-1 [&>div]:mt-0">
        <Cautions />
      </div>
    </div>
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
