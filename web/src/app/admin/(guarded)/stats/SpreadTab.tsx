import { CHARACTER, TEMPERAMENT } from "@/components/charts/scale";
import { ABILITY_AXES, COMPOSITE_AXIS } from "@/lib/items/types";
import type { loadPeople, ScaleReliability } from "@/lib/admin/analysis";
import { abilityComposite } from "@/lib/admin/composite";
import { spreadOf, type Spread } from "@/lib/admin/spread";
import { DistributionPanel } from "./DistributionPanel";

type People = Awaited<ReturnType<typeof loadPeople>>;

// ── 분포 ────────────────────────────────────────────────────────────

/**
 * 「우리 회사 사람들이 각 축에서 어떻게 퍼져 있는가」 (2026-08-25 사용자 결정).
 *
 * 관계를 보기 전에 먼저 궁금한 것이라 **분석 안의 별도 탭**으로 둔다.
 * 직무능력은 직원 설문에서 나온 값의 분포다.
 */
/** 분포 화면에서 묶음 값을 부르는 이름. 실제 척도가 아니라 만든 값이다 */
const COMPOSITE_LABEL = COMPOSITE_AXIS;

export function SpreadTab({
  people,
  reliability,
}: {
  people: People;
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
        .map((p) => ({
          employeeId: p.employeeId,
          name: p.name,
          value: pick(p)!,
        }))
        .filter((x) => typeof x.value === "number"),
    );

  /*
    맨 아래에 **세 능력을 묶은 값**도 한 줄 둔다 (2026-08-25).

    「전반적으로 일이 되는 사람은 어떤 사람인가」를 「직무능력과 기질·성격」
    탭에서 물었으면, 그 값이 **우리 회사 안에서 어떻게 퍼져 있는지**는
    여기가 답할 자리다. 축 셋을 따로 보는 것과 묶어서 보는 것은 다른 모양이
    나온다 — 각 축의 잡음이 상쇄되어 대개 더 좁게 모인다.
  */
  const composite = abilityComposite(people);
  const byId = new Map(
    (composite?.values ?? []).map((v) => [v.employeeId, v.value]),
  );

  const spreads = [
    ...TEMPERAMENT.map((s) => of(s, "temperament", (p) => p.traits[s])),
    ...CHARACTER.map((s) => of(s, "character", (p) => p.traits[s])),
    ...ABILITY_AXES.map((a) => of(a, "ability", (p) => p.abilities[a])),
    composite
      ? of(COMPOSITE_LABEL, "ability", (p) => byId.get(p.employeeId)!)
      : null,
  ].filter((x): x is Spread => x !== null);

  return (
    <div>
      <DistributionPanel spreads={spreads} reliability={reliability} />
    </div>
  );
}
