import { SourcePicker } from "@/components/analysis/SourcePicker";
import type { AbilitySource } from "@/lib/admin/abilitySource";
import { CHARACTER, TEMPERAMENT } from "@/components/charts/scale";
import { ABILITY_AXES } from "@/lib/items/types";
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
 * 직무능력은 고른 출처를 따른다 — 대표님 평가로 보면 그 값의 분포가 나온다.
 */
/** 분포 화면에서 묶음 값을 부르는 이름. 실제 척도가 아니라 만든 값이다 */
const COMPOSITE_LABEL = "세 능력 묶음";

export function SpreadTab({
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
    composite ? of(COMPOSITE_LABEL, "ability", (p) => byId.get(p.employeeId)!) : null,
  ].filter((x): x is Spread => x !== null);

  return (
    <div>
      {/*
        **`SOURCE_NOTE`를 여기 쓰지 않는다** (2026-08-25 사용자 지적).

        그 문장은 「성향과 같은 설문이라 **관련도**가 실제보다 높게 나올 수
        있습니다」로 끝난다 — **상관 화면을 위해 쓴 말**이다. 분포는 관련도를
        보는 자리가 아니라서 여기 붙으면 읽는 사람이 없는 걱정을 하게 된다.
        어느 값을 보고 있는지는 고르개가 이미 말한다.
      */}
      <div className="mb-8">
        <SourcePicker value={source} bossCount={bossCount} />
      </div>
      <DistributionPanel spreads={spreads} reliability={reliability} />
    </div>
  );
}
