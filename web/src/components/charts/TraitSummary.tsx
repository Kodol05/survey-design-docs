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

export function TraitSummary({
  rows,
  anchorOf,
}: {
  rows: SummaryRow[];
  /** 축 이름 → 상세 자리표. 주면 축 이름이 그 자리로 가는 링크가 된다 */
  anchorOf?: (scale: string) => string;
}) {
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
        <p className="text-table text-ink-muted mt-3 text-center">
          앞의 네 개가 기질, 뒤의 세 개가 성격입니다
        </p>

        {/*
          축 이름을 눌러 상세로 건너뛴다. 그래프 안의 글자를 링크로 만들면
          차트 라이브러리와 싸우게 되므로 **아래 줄에 따로** 둔다.
        */}
        {anchorOf && (
          <p className="text-axis mt-4 flex flex-wrap justify-center gap-x-3 gap-y-1" data-print="hide">
            <span className="text-ink-muted">바로 가기</span>
            {ordered.map((r) => (
              <a key={r.scale} href={`#${anchorOf(r.scale)}`} className="text-ink-secondary underline">
                {r.scale}
              </a>
            ))}
          </p>
        )}
      </div>
    </div>
  );
}
