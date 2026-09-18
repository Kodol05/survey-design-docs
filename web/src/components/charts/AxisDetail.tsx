import { APPLY } from "@/lib/interpretation/apply";
import { BAND_TEXT, type BandKey } from "@/lib/interpretation/bands";
import { POLES } from "@/lib/interpretation/poles";
import { GRADIENT, HIGH_INK, LOW_INK, Marker } from "./scale";

/**
 * 축 하나의 상세 — 결과지 「축별로 보기」 장에 일곱 개가 이어진다.
 *
 * ## 촘촘하게 (2026-09-18)
 *
 * 결과지 종이 안에서는 글자를 한 단 작게 쓰므로(`globals.css` 의 `.result-book`)
 * 여기서도 제목·눈금·간격을 그에 맞춘다. 상자를 두르지 않고, 축과 축 사이는
 * **위쪽 가는 선** 하나로만 가른다. 「힘이 되는 점 / 살펴보면 좋은 점」은 작은
 * 머리표를 앞에 단 한 줄씩이다 — 전에 왼쪽에 색선을 세웠더니 칸처럼 보였다.
 *
 * 안 배치(글 | 하위척도)는 **이 블록의 폭**(`@container`)으로 정한다.
 */

export type FacetRow = { name: string; percent: number };

export type AxisDetailProps = {
  id?: string;
  scale: string;
  percent: number;
  band: BandKey;
  facets: FacetRow[];
};

const BAND_LABEL = { lower: "낮은 편", middle: "보통", upper: "높은 편" } as const;

export function AxisDetail({ id, scale, percent, band, facets }: AxisDetailProps) {
  const x = Math.max(0, Math.min(100, percent));
  const poles = POLES[scale];
  const apply = APPLY[scale]?.[band];

  return (
    <section id={id} className="@container border-t border-[--border] py-6">
      <div className="mb-3 flex items-baseline gap-2.5">
        <h3 className="text-lg font-semibold">{scale}</h3>
        <span className="tabular text-base font-medium">{Math.round(percent)}</span>
        <span className="text-axis text-ink-muted">{BAND_LABEL[band]}</span>
      </div>

      <div className="grid gap-x-10 gap-y-5 @3xl:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="max-w-[46rem]">
          {/* 눈금 */}
          <div className="flex items-center gap-3">
            <span className="text-axis w-8 shrink-0 text-right font-medium" style={{ color: LOW_INK }}>
              낮음
            </span>
            <div className="relative flex-1 py-2">
              <div className="h-2 w-full rounded-full" style={{ background: GRADIENT }} />
              <div
                className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${x}%` }}
              >
                <Marker percent={percent} size={18} />
              </div>
            </div>
            <span className="text-axis w-8 shrink-0 font-medium" style={{ color: HIGH_INK }}>
              높음
            </span>
          </div>
          {poles && (
            <div className="text-axis text-ink-muted mt-1 flex gap-6 px-11">
              <p className="flex-1">{poles.low}</p>
              <p className="flex-1 text-right">{poles.high}</p>
            </div>
          )}

          <p className="text-item mt-4">{BAND_TEXT[scale]?.[band]}</p>

          {apply && (
            <dl className="text-table mt-4 grid gap-x-8 gap-y-2 @xl:grid-cols-2">
              <div>
                <dt className="eyebrow mb-0.5">강점</dt>
                <dd>{apply.lift}</dd>
              </div>
              <div>
                <dt className="eyebrow mb-0.5">유의할 점</dt>
                <dd>{apply.watch}</dd>
              </div>
            </dl>
          )}
        </div>

        {/* 하위척도 */}
        {facets.length > 0 && (
          <div>
            <p className="eyebrow mb-2">하위 척도</p>
            <div className="flex flex-col gap-2">
              {facets.map((f) => (
                <div
                  key={f.name}
                  className="grid grid-cols-[6rem_1fr_2rem] items-center gap-2.5"
                >
                  <span className="text-axis text-ink-secondary truncate" title={f.name}>
                    {f.name}
                  </span>
                  <div className="relative h-1 rounded-full" style={{ background: "var(--grid)" }}>
                    <div
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{
                        width: `${Math.max(2, Math.min(100, f.percent))}%`,
                        background: "var(--ink-muted)",
                      }}
                    />
                  </div>
                  <span className="tabular text-axis text-right">{Math.round(f.percent)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
