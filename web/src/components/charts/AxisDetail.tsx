import { BAND_TEXT, type BandKey } from "@/lib/interpretation/bands";
import { POLES } from "@/lib/interpretation/poles";
import { GRADIENT, HIGH_INK, LOW_INK, Marker } from "./scale";

/**
 * 축 하나의 상세 — 실제 결과지 2페이지(하위척도)를 여기로 합쳤다.
 *
 * 종이라서 두 페이지로 나뉜 것이지, 웹에서는 **하위척도를 해당 축 바로 아래**
 * 두는 편이 잘 읽힌다. "같은 71도 안이 이렇게 갈린다"가 한 자리에서 보인다.
 */

export type FacetRow = { name: string; percent: number };

export type AxisDetailProps = {
  scale: string;
  percent: number;
  band: BandKey;
  facets: FacetRow[];
};

const BAND_LABEL = { lower: "낮은 편", middle: "보통", upper: "높은 편" } as const;

export function AxisDetail({ scale, percent, band, facets }: AxisDetailProps) {
  const x = Math.max(0, Math.min(100, percent));
  const poles = POLES[scale];

  return (
    <section className="border-t border-[--border] py-10">
      <div className="mb-6 flex items-baseline gap-3">
        <h3 className="text-4xl font-medium">{scale}</h3>
        <span className="tabular text-2xl">{Math.round(percent)}</span>
        <span className="text-ink-muted">{BAND_LABEL[band]}</span>
      </div>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div>
          {/* 눈금 */}
          <div className="flex items-start gap-5">
            <span className="w-12 shrink-0 pt-1 text-right font-medium" style={{ color: LOW_INK }}>
              낮음
            </span>
            <div className="relative flex-1 pb-1">
              <div className="h-4 w-full rounded-full" style={{ background: GRADIENT }} />
              <div
                className="absolute -top-1 -translate-x-1/2"
                style={{ left: `${x}%` }}
              >
                <Marker percent={percent} size={28} />
              </div>
            </div>
            <span className="w-12 shrink-0 pt-1 font-medium" style={{ color: HIGH_INK }}>
              높음
            </span>
          </div>

          {poles && (
            <div className="text-table text-ink-muted mt-3 flex gap-8">
              <p className="flex-1">{poles.low}</p>
              <p className="flex-1 text-right">{poles.high}</p>
            </div>
          )}

          <p className="text-item mt-6">{BAND_TEXT[scale]?.[band]}</p>
        </div>

        {/* 하위척도 — 실제 결과지 2페이지에 해당 */}
        {facets.length > 0 && (
          <div>
            <p className="text-table text-ink-muted mb-3">이 축을 이루는 것</p>
            <div className="flex flex-col gap-2.5">
              {facets.map((f) => (
                <div key={f.name} className="grid grid-cols-[6rem_1fr_2rem] items-center gap-2 sm:grid-cols-[7.5rem_1fr_2rem] sm:gap-3">
                  <span className="text-table text-ink-secondary truncate" title={f.name}>
                    {f.name}
                  </span>
                  <div className="relative h-1.5 rounded-full" style={{ background: "var(--grid)" }}>
                    <div
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{
                        width: `${Math.max(2, Math.min(100, f.percent))}%`,
                        background: "var(--ink-muted)",
                      }}
                    />
                  </div>
                  <span className="tabular text-table text-right">{Math.round(f.percent)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
