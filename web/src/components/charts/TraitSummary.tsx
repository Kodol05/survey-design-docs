import { TraitRadar } from "./TraitRadar";
import { CHARACTER, TEMPERAMENT } from "./scale";

/**
 * 첫 화면 — 레이더 하나로 모양을 보여준다.
 *
 * 막대 개관을 따로 두지 않는다. 아래 축별 상세에 같은 막대가 다시 나와서
 * 같은 것을 두 번 그리는 셈이 되기 때문이다. 여기서는 **형태**만 보고,
 * 정확한 값과 설명은 아래에서 본다.
 */

export type SummaryRow = {
  scale: string;
  percent: number;
  band: "lower" | "middle" | "upper";
};

const BAND_LABEL = { lower: "낮은 편", middle: "보통", upper: "높은 편" } as const;

export function TraitSummary({ rows }: { rows: SummaryRow[] }) {
  const by = new Map(rows.map((r) => [r.scale, r]));
  const group = (names: string[]) =>
    names.map((n) => by.get(n)).filter((r): r is SummaryRow => Boolean(r));

  const List = ({ title, note, names }: { title: string; note: string; names: string[] }) => (
    <div>
      <p className="text-ink-secondary font-medium">
        {title} <span className="text-ink-muted text-axis font-normal">— {note}</span>
      </p>
      <dl className="mt-2">
        {group(names).map((r) => (
          <div
            key={r.scale}
            className="flex items-baseline justify-between border-b border-[--border] py-2 last:border-0"
          >
            <dt>{r.scale}</dt>
            <dd className="tabular flex items-baseline gap-3">
              <span className="text-ink-muted text-axis">{BAND_LABEL[r.band]}</span>
              <span className="w-8 text-right text-lg font-medium">
                {Math.round(r.percent)}
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );

  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-center">
      <TraitRadar data={rows.map((r) => ({ scale: r.scale, percent: r.percent }))} />
      <div className="flex flex-col gap-8">
        <List title="기질" note="타고난 부분" names={TEMPERAMENT} />
        <List title="성격" note="살면서 형성된 부분" names={CHARACTER} />
      </div>
    </div>
  );
}
