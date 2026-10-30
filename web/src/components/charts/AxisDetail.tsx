import { APPLY } from "@/lib/interpretation/apply";
import { BAND_TEXT, type BandKey } from "@/lib/interpretation/bands";
import { POLES } from "@/lib/interpretation/poles";
import { GRADIENT, HIGH_INK, LOW_INK, Marker } from "./scale";

/**
 * 축 하나의 상세 — 결과지 「척도별 결과」 장에 일곱 개가 이어진다.
 *
 * ## 기본은 접어 둔다 (2026-10-30 사용자 요청)
 *
 * 일곱 축을 다 펼쳐 두니 한 장에 글이 너무 많았다. 접힌 줄에는 **핵심만**
 * 둔다 — 이름 · 점수 · 구간, 눈금, 양끝 설명, 서술의 첫 문장. 줄을 누르면
 * 나머지 서술, 강점 / 유의할 점, 하위 척도가 펼쳐진다.
 *
 * **하나를 열면 다른 것은 닫힌다.** 브라우저의 `<details name>`(같은 이름끼리
 * 하나만 열림)을 써서 자바스크립트 없이 된다. 열리고 닫힐 때 높이가 부드럽게
 * 바뀐다(`globals.css` 의 `.axis-detail`).
 *
 * 요약 장의 척도 이름 링크(`#axis-…`)로 들어오면 그 축이 펼쳐진다(`ResultBook`).
 *
 * ## 촘촘하게 (2026-09-18)
 *
 * 결과지 종이 안에서는 글자를 한 단 작게 쓰므로(`globals.css` 의 `.result-book`)
 * 여기서도 제목·눈금·간격을 그에 맞춘다. 상자를 두르지 않고, 축과 축 사이는
 * **위쪽 가는 선** 하나로만 가른다.
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

/** 서술을 첫 문장(접힌 줄에 보일 핵심)과 나머지로 가른다 */
function splitLead(text: string | undefined): [string, string] {
  if (!text) return ["", ""];
  const m = /^(.+?[.!?])\s+([\s\S]+)$/.exec(text.trim());
  return m ? [m[1], m[2]] : [text, ""];
}

export function AxisDetail({ id, scale, percent, band, facets }: AxisDetailProps) {
  const x = Math.max(0, Math.min(100, percent));
  const poles = POLES[scale];
  const apply = APPLY[scale]?.[band];
  const [lead, rest] = splitLead(BAND_TEXT[scale]?.[band]);

  return (
    <details
      id={id}
      name="axis-detail"
      className="axis-detail group @container border-t border-(--border)"
    >
      {/*
        ── 접힌 줄 — 핵심만 (2026-10-30 사용자 요청) ──
        이름 · 점수 · 구간 옆에 **작은 눈금**, 그 아래 한 줄짜리 요약.
        양끝 설명과 나머지 서술은 펼쳐야 보인다.
      */}
      <summary className="block cursor-pointer list-none py-4 [&::-webkit-details-marker]:hidden">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <div className="flex w-52 shrink-0 items-baseline gap-2.5">
            <h3 className="text-lg font-semibold">{scale}</h3>
            <span className="tabular text-base font-medium">{Math.round(percent)}</span>
            <span className="text-axis text-ink-muted">{BAND_LABEL[band]}</span>
          </div>

          {/* 작은 눈금 */}
          <div className="flex max-w-[30rem] min-w-[14rem] flex-1 items-center gap-2.5">
            <span className="text-axis shrink-0" style={{ color: LOW_INK }}>
              낮음
            </span>
            <div className="relative flex-1 py-1.5">
              <div className="h-1.5 w-full rounded-full" style={{ background: GRADIENT }} />
              <div
                className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${x}%` }}
              >
                <Marker percent={percent} size={15} />
              </div>
            </div>
            <span className="text-axis shrink-0" style={{ color: HIGH_INK }}>
              높음
            </span>
          </div>

          <span className="text-axis text-ink-muted group-hover:text-ink ml-auto transition-colors">
            <span className="group-open:hidden">자세히</span>
            <span className="hidden group-open:inline">접기</span>
          </span>
        </div>

        {lead && <p className="text-table text-ink-secondary mt-2">{lead}</p>}
      </summary>

      {/* ── 펼친 내용 — 세부 ── */}
      <div className="grid gap-x-10 gap-y-5 pb-6 @3xl:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="max-w-[46rem]">
          {poles && (
            <dl className="text-table mb-4 grid gap-x-8 gap-y-2 @xl:grid-cols-2">
              <div>
                <dt className="eyebrow mb-0.5" style={{ color: LOW_INK }}>
                  낮은 쪽
                </dt>
                <dd className="text-ink-secondary">{poles.low}</dd>
              </div>
              <div>
                <dt className="eyebrow mb-0.5" style={{ color: HIGH_INK }}>
                  높은 쪽
                </dt>
                <dd className="text-ink-secondary">{poles.high}</dd>
              </div>
            </dl>
          )}

          {rest && <p className="text-item">{rest}</p>}

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
    </details>
  );
}
