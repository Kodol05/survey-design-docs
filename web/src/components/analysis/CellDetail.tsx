import { formatR } from "./correlationColor";
import { DivergingBar } from "./DivergingBar";
import { FRAGILE, fragility, type Influence } from "@/lib/admin/influence";
import type { RankRow } from "@/lib/admin/analysis";

/**
 * 고른 칸 하나를 **더 들여다보는** 자리 (2026-08-25 사용자 요청).
 *
 * 표는 「어디를 볼지」를 고르는 도구고, 산점도는 「모양이 어떤지」를 보여준다.
 * 그런데 그다음 물음 둘에는 아직 답이 없었다.
 *
 *   1. **이 숫자가 한 사람에 매달려 있나?** — 산점도로 눈에 띄기도 하지만,
 *      「빼면 얼마가 되는지」를 아는 것과는 다르다
 *   2. **축 전체가 아니라 그 안의 어느 항목인가?** — 인내력 안의 네 항목 중
 *      하나만 관련 있는데 나머지 셋에 묻히는 일이 실제로 생긴다
 *
 * 둘 다 **표에서는 절대 안 보이는 것**이라 칸을 고른 뒤에만 나온다.
 */

const WORD = {
  sturdy: { label: "튼튼함", color: "var(--status-good)" },
  shaky: { label: "흔들림", color: "var(--status-warn-ink)" },
  fragile: { label: "위태로움", color: "var(--status-critical)" },
} as const;

export function CellDetail({
  influence,
  facets,
  scale,
  axis,
}: {
  influence: Influence | null;
  facets: RankRow[];
  scale: string;
  axis: string;
}) {
  return (
    <div className="grid gap-x-14 gap-y-10 lg:grid-cols-2">
      <Robustness influence={influence} />
      <Facets facets={facets} scale={scale} axis={axis} />
    </div>
  );
}

// ── 한 사람이 끌고 있는가 ──────────────────────────────────────────

function Robustness({ influence }: { influence: Influence | null }) {
  if (!influence)
    return (
      <div>
        <h4 className="text-table mb-2 font-medium">한 사람에 매달려 있는가</h4>
        <p className="text-axis text-ink-muted">
          사람이 너무 적어 재 볼 수 없습니다.
        </p>
      </div>
    );

  const v = fragility(influence);
  const w = WORD[v];
  const sign = influence.delta >= 0 ? "+" : "−";

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-baseline gap-x-3">
        <h4 className="text-table font-medium">한 사람에 매달려 있는가</h4>
        <span className="text-axis font-medium" style={{ color: w.color }}>
          {w.label}
        </span>
      </div>

      {/*
        두 값을 **막대 두 개로 나란히** 놓는다. 숫자 두 개만 적으면
        `.31 → .12`가 큰 변화인지 눈으로 안 잡힌다.
      */}
      <div className="mb-3 flex flex-col gap-1.5">
        <Pair label="지금" r={influence.r} strong />
        <Pair
          label={`${influence.who.name} 빼면`}
          r={influence.without}
          strong={false}
        />
      </div>

      <p className="text-axis text-ink-secondary leading-relaxed">
        가장 크게 흔드는 사람은{" "}
        <strong className="text-ink">{influence.who.name}</strong>입니다. 이 한
        분을 빼면 <span className="tabular">{formatR(influence.r)}</span>이{" "}
        <span className="tabular">{formatR(influence.without)}</span>이 됩니다 (
        <span className="tabular">
          {sign}
          {Math.abs(influence.delta).toFixed(2).replace(/^0/, "")}
        </span>
        ).{" "}
        {v === "fragile" ? (
          <span style={{ color: "var(--status-critical)" }}>
            {influence.flips
              ? "방향까지 뒤집힙니다 — 이 관계는 이 한 분이 만들고 있습니다."
              : "빼면 방향이 확정되지 않습니다 — 이 한 분이 결론을 쥐고 있습니다."}
          </span>
        ) : v === "shaky" ? (
          <>
            한 사람으로{" "}
            <span className="tabular">
              {FRAGILE.toFixed(2).replace(/^0/, "")}
            </span>{" "}
            넘게 움직입니다. 사람이 적어서 생기는 일이라, 몇 명 더 들어오면
            달라질 수 있습니다.
          </>
        ) : (
          "누구를 빼도 크게 달라지지 않습니다. 몇 사람이 만든 모양이 아닙니다."
        )}
      </p>

      <p className="text-axis text-ink-muted mt-2">
        <strong>「이분이 이상하다」가 아닙니다.</strong> 뺀 값을 진짜 값으로
        삼지도 않습니다 — 얼마나 위태로운지를 재는 값입니다.
      </p>
    </div>
  );
}

/**
 * 이름 · 막대 · 숫자 한 줄.
 *
 * 막대 칸에 **상한을 둔다.** 0이 가운데라 폭의 절반은 늘 비는데, 값이 다
 * 양수인 줄에서는 왼쪽이 통째로 빈 채 화면 폭만큼 늘어난다. 2560 화면에서
 * 실제로 그랬다 — 막대는 오른쪽 끝에, 숫자는 저 멀리 떨어져 있었다.
 */
function Pair({
  label,
  r,
  strong,
}: {
  label: string;
  r: number;
  strong: boolean;
}) {
  return (
    <div className="text-axis flex items-center gap-3">
      <span className="text-ink-secondary w-[8.5rem] shrink-0 truncate">
        {label}
      </span>
      <span className="block w-full max-w-[20rem] shrink">
        <DivergingBar r={r} faded={!strong} />
      </span>
      <span
        className="tabular w-12 shrink-0 text-right"
        style={{ opacity: strong ? 1 : 0.7 }}
      >
        {formatR(r)}
      </span>
    </div>
  );
}

// ── 축 안의 어느 항목인가 ──────────────────────────────────────────

function Facets({
  facets,
  scale,
  axis,
}: {
  facets: RankRow[];
  scale: string;
  axis: string;
}) {
  if (facets.length === 0)
    return (
      <div>
        <h4 className="text-table mb-2 font-medium">축 안의 어느 항목인가</h4>
        <p className="text-axis text-ink-muted">
          쪼개 볼 세부 항목이 없습니다.
        </p>
      </div>
    );

  const settled = facets.filter((f) => !crosses(f.corr.ci));
  const spread =
    Math.max(...facets.map((f) => f.corr.r)) -
    Math.min(...facets.map((f) => f.corr.r));

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-baseline gap-x-3">
        <h4 className="text-table font-medium">축 안의 어느 항목인가</h4>
        <span className="text-axis text-ink-muted">
          {scale}의 세부 항목 {facets.length}개 × {axis}
        </span>
      </div>

      <div className="mb-3 flex flex-col gap-1.5">
        {facets.map((f) => (
          <Pair
            key={f.label}
            label={f.label}
            r={f.corr.r}
            strong={!crosses(f.corr.ci)}
          />
        ))}
      </div>

      <p className="text-axis text-ink-secondary leading-relaxed">
        {settled.length === 0 ? (
          <>
            <strong>어느 항목도 방향이 확정되지 않았습니다.</strong> 항목당
            문항이 서너 개뿐이라 축 전체보다 훨씬 크게 흔들립니다.
          </>
        ) : spread >= 0.3 ? (
          <>
            항목마다 크게 갈립니다 (
            <span className="tabular">{spread.toFixed(2).replace(/^0/, "")}</span>{" "}
            차이). <strong>축 전체 숫자 하나로 말하면 놓치는 것</strong>이
            있습니다 — 관련 있는 것은 {scale} 전체가 아니라 그 안의 몇
            항목입니다.
          </>
        ) : (
          <>
            항목들이 대체로 같은 방향입니다. 축 전체 숫자가{" "}
            <strong>{scale}를 고르게 대표</strong>하고 있습니다.
          </>
        )}
      </p>

      <p className="text-axis text-ink-muted mt-2">
        진한 막대는 방향이 확정된 것입니다.
      </p>
    </div>
  );
}

const crosses = (ci: [number, number]) => ci[0] <= 0 && ci[1] >= 0;
