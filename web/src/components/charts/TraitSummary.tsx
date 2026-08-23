import { TraitBars } from "./TraitBars";
import { TraitRadar } from "./TraitRadar";
import { CHARACTER, TEMPERAMENT } from "./scale";

/**
 * 첫 화면 — 왼쪽은 형태, 오른쪽은 크기 비교.
 *
 * 막대 개관을 따로 두지 않는다. 아래 축별 상세에 같은 가로 막대가 다시
 * 나오기 때문이다. 여기 세로 막대는 **축끼리 높낮이를 견주는** 다른 일을 한다.
 */

export type SummaryRow = {
  scale: string;
  percent: number;
  band: "lower" | "middle" | "upper";
};

export function TraitSummary({ rows }: { rows: SummaryRow[] }) {
  const by = new Map(rows.map((r) => [r.scale, r]));
  const ordered = [...TEMPERAMENT, ...CHARACTER]
    .map((n) => by.get(n))
    .filter((r): r is SummaryRow => Boolean(r));

  return (
    <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
      <div>
        <TraitRadar
          data={ordered.map((r) => ({ scale: r.scale, percent: r.percent }))}
          showValues
        />
      </div>

      <div>
        <TraitBars rows={ordered.map((r) => ({ scale: r.scale, percent: r.percent }))} />
        <p className="text-axis text-ink-muted mt-3 text-center">
          앞의 네 개가 기질, 뒤의 세 개가 성격입니다
        </p>
      </div>
    </div>
  );
}
