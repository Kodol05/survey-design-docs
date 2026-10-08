import type { ReactNode } from "react";
import { AxisDetail } from "@/components/charts/AxisDetail";
import { PairReadings } from "@/components/charts/PairReadings";
import type { BookPage } from "@/components/charts/ResultBook";
import { TraitRadar } from "@/components/charts/TraitRadar";
import { CHARACTER, TEMPERAMENT, colorAt } from "@/components/charts/scale";
import { RetakeButton } from "@/components/survey/RetakeButton";
import { APPLY } from "@/lib/interpretation/apply";
import { LINE } from "@/lib/interpretation/lines";
import { readPairs, type AxisInput } from "@/lib/interpretation/pairs";
import { orderedTraits, type PersonResult } from "@/lib/survey/result";

/**
 * 개인 결과지의 장들을 만든다 — 직원 「내 결과」와 관리자 구성원 상세가
 * **같은 코드로** 그린다 (2026-10-07 사용자 결정).
 *
 * ## 왜 한 곳에 모았나
 *
 * 관리자는 구성원 상세에서 장을 넘겨 「그 사람이 받아 본 결과지」를 그대로
 * 본다. 두 화면이 따로 그리면 직원 결과지를 고칠 때마다 관리자 쪽이 뒤처져,
 * 관리자가 직원과 다른 것을 보고 이야기하게 된다. 그래서 장의 **내용**은
 * 여기서만 만들고, 두 화면은 받은 장을 `ResultBook`에 얹기만 한다. 결과지를
 * 다시 짤 때는 이 파일만 고치면 관리자 화면이 저절로 따라간다.
 *
 * 화면마다 다른 것은 둘뿐이라 인자로 받는다.
 *  - `pageHref` — 장 번호. 관리자 쪽은 앞에 「관리자 요약」 장이 하나 더 있어
 *    척도별 결과가 3장이다. 결과 요약의 척도 이름 링크가 여기로 간다.
 *  - `retake` — 「다시 응시하기」. 본인에게만 둔다. 관리자가 남의 결과지에서
 *    누르면 관리자 자신의 응시가 시작된다.
 *
 * ## 종이 한 장, 세 장짜리 (2026-09-18 다시 짬, 같은 날 사용자 피드백으로 한 번 더)
 *
 * 장 이름과 소제목은 실제 검사 보고서의 관행을 따른다 — 만든 말을 쓰지 않는다.
 *
 *   ① 결과 요약    한 줄 헤더 → 프로필 도형 | 척도별 점수 →
 *                 일하는 방식 · 강점 · 유의할 점 (세 단)
 *                 — 이 장이 **한 화면에 거의 다 들어오게** 짠다
 *   ② 척도별 결과  기질 척도 4 + 성격 척도 3, 한 열로. 사이는 가는 선 하나
 *   ③ 종합         척도 간 관계 · 결과 해석 시 유의사항
 *   (「다시 응시하기」는 세 장 모두 오른쪽 아래 노란 버튼으로)
 *
 * 기질과 성격을 장으로 가르지 않는다 — 나누면 어색했다(사용자). 상자·격자를
 * 두지 않고, 덩어리는 **작은 머리표(eyebrow)와 가는 선**으로만 가른다.
 * 종이 안 글자는 한 단 작다(`globals.css` `.result-book`).
 *
 * 직무능력과 사내 위치는 여기 두지 않는다 (00 D-35 · D-09) — 직원이 보는
 * 장이기 때문이다. 관리자에게만 보일 것은 관리자 화면이 따로 앞장에 붙인다.
 */

export const RESULT_PAGE_KEYS = ["summary", "axes", "together"] as const;
export type ResultPageKey = (typeof RESULT_PAGE_KEYS)[number];

const BAND_LABEL = { lower: "낮은 편", middle: "보통", upper: "높은 편" } as const;

export function buildResultBook(
  person: {
    name: string;
    result: Pick<PersonResult, "completedAt" | "durationSec" | "traits">;
  },
  opts: {
    /** 그 장으로 가는 주소 (`?p=N`, 다른 값은 부르는 쪽이 붙인다) */
    pageHref: (key: ResultPageKey) => string;
    /** 「다시 응시하기」를 둘지 — 본인 화면에서만 */
    retake?: boolean;
  },
): { pages: BookPage[]; action?: ReactNode } {
  const { name, result } = person;

  const traits = orderedTraits(result.traits);
  const byScale = new Map(traits.map((t) => [t.scale, t]));
  const scores: Record<string, AxisInput> = Object.fromEntries(
    traits.map((t) => [t.scale, { percent: t.percent, band: t.band }]),
  );

  const detail = (scale: string) => {
    const t = byScale.get(scale as never);
    if (!t) return null;
    return (
      <AxisDetail
        key={scale}
        id={`axis-${scale}`}
        scale={scale}
        percent={t.percent}
        band={t.band}
        facets={Object.entries(t.facets ?? {}).map(([name, f]) => ({
          name,
          percent: f.percent,
        }))}
      />
    );
  };

  /*
    두드러진 축 — 가운데 범위(40~60)는 뺀다. 「이런 사람이다」가 아니라
    「양쪽을 다 가지고 있다」는 뜻이라 순위 요약에 올리지 않는다.
  */
  const standout = traits
    .filter((t) => t.band !== "middle")
    .sort((a, b) => Math.abs(b.percent - 50) - Math.abs(a.percent - 50))
    .slice(0, 3);

  const notes = standout
    .map((t) => ({
      scale: t.scale as string,
      percent: t.percent,
      apply: APPLY[t.scale]?.[t.band],
    }))
    .filter(
      (n): n is { scale: string; percent: number; apply: NonNullable<typeof n.apply> } =>
        Boolean(n.apply),
    );

  const dot = (color: string) => (
    <span
      aria-hidden
      className="mt-[0.45em] size-2 shrink-0 rounded-[2px]"
      style={{ background: color }}
    />
  );

  /** 척도별 결과 장으로 가는 링크 */
  const axisLink = (scale: string) => (
    <a
      href={`${opts.pageHref("axes")}#axis-${scale}`}
      className="text-ink-secondary underline underline-offset-2"
    >
      {scale}
    </a>
  );

  /** 결과 요약의 세 단 중 하나 — 머리표 + 짧은 줄 몇 개 */
  const column = (
    label: string,
    items: { key: string; color: string; text: ReactNode }[],
  ) => (
    <div>
      <p className="eyebrow mb-2.5">{label}</p>
      <ul className="text-table flex flex-col gap-2.5">
        {items.map((it) => (
          <li key={it.key} className="flex gap-2.5">
            {dot(it.color)}
            <p>{it.text}</p>
          </li>
        ))}
      </ul>
    </div>
  );

  // ── ① 결과 요약 ──
  const summary = (
    <>
      {/* 한 줄 헤더 */}
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-1">
        <div>
          <p className="eyebrow mb-1">7차원 성향 검사 · 결과 보고서</p>
          <h1 className="text-screen-title">{name} 님</h1>
        </div>
        <p className="text-axis text-ink-muted tabular">
          {result.completedAt?.toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })} 응시
          {result.durationSec
            ? ` · ${Math.max(1, Math.round(result.durationSec / 60))}분 소요`
            : ""}
        </p>
      </header>

      {/* 프로필 도형 | 일곱 축 점수표 */}
      <section className="mt-5 grid items-center gap-x-10 gap-y-6 border-t border-(--border) pt-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="mx-auto w-full max-w-[21rem]">
          <TraitRadar
            data={traits.map((t) => ({ scale: t.scale, percent: t.percent }))}
            showValues
            compact
          />
        </div>

        <div>
          <p className="eyebrow mb-2">척도별 점수</p>
          <ul className="flex flex-col">
            {traits.map((t, n) => {
              const x = Math.max(0, Math.min(100, t.percent));
              return (
                <li
                  key={t.scale}
                  className={`grid grid-cols-[6.5rem_minmax(0,1fr)_2.25rem_3.5rem] items-center gap-x-3 py-1.5 ${
                    n === TEMPERAMENT.length ? "mt-1.5 border-t border-(--border) pt-3" : ""
                  }`}
                >
                  {axisLink(t.scale)}
                  {/* 자리 눈금 — 가운데 눈금 하나, 내 자리에 점 */}
                  <div className="relative h-1.5 rounded-full" style={{ background: "var(--grid)" }}>
                    <span
                      aria-hidden
                      className="absolute inset-y-0 left-1/2 w-px"
                      style={{ background: "var(--axis)" }}
                    />
                    <span
                      aria-hidden
                      className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2"
                      style={{
                        left: `${x}%`,
                        background: colorAt(t.percent),
                        ["--tw-ring-color" as string]: "var(--sheet)",
                      }}
                    />
                  </div>
                  <span className="tabular text-table text-right font-medium">
                    {Math.round(t.percent)}
                  </span>
                  <span className="text-axis text-ink-muted">{BAND_LABEL[t.band]}</span>
                </li>
              );
            })}
          </ul>
          <p className="text-axis text-ink-muted mt-2">
            위 네 개는 기질 척도, 아래 세 개는 성격 척도입니다.
          </p>
        </div>
      </section>

      {/*
        특징 — 일곱 척도의 문장을 **한 단락으로 이어** 보인다 (사용자 요청).
        척도 이름을 앞에 달지 않는다. 사람마다 자기 구간의 문장 일곱 개가
        척도 순서대로 조합되어, 짧은 소견처럼 읽힌다 (`lines.ts`).
      */}
      <section className="mt-6 border-t border-(--border) pt-5">
        <p className="eyebrow mb-2">특징</p>
        <p className="text-item max-w-[64rem]">
          {traits.map((t) => LINE[t.scale]?.[t.band]).filter(Boolean).join(" ")}
        </p>
      </section>

      {/* 일하는 방식 · 강점 · 유의할 점 */}
      {standout.length === 0 ? (
        <p className="text-table text-ink-secondary mt-6 max-w-[54rem] border-t border-(--border) pt-5">
          일곱 척도가 모두 보통 범위입니다. 어느 쪽으로도 크게 기울지 않아
          상황에 따라 양쪽을 고르게 쓰는 편입니다. 척도별 내용은 다음 장에
          있습니다.
        </p>
      ) : (
        <section className="mt-6 grid gap-x-10 gap-y-7 border-t border-(--border) pt-5 md:grid-cols-3">
          {column(
            "일하는 방식",
            notes.map((n) => ({
              key: n.scale,
              color: colorAt(n.percent),
              text: (
                <>
                  {axisLink(n.scale)}
                  {" — "}
                  {n.apply.work}
                </>
              ),
            })),
          )}
          {column(
            "강점",
            notes.map((n) => ({
              key: n.scale,
              color: colorAt(n.percent),
              text: (
                <>
                  <span className="text-ink-secondary">{n.scale}</span>
                  {" · "}
                  {n.apply.lift}
                </>
              ),
            })),
          )}
          {column(
            "유의할 점",
            notes.map((n) => ({
              key: n.scale,
              color: "var(--axis)",
              text: (
                <>
                  <span className="text-ink-secondary">{n.scale}</span>
                  {" · "}
                  {n.apply.watch}
                </>
              ),
            })),
          )}
        </section>
      )}
    </>
  );

  // ── ② 척도별 결과 ──
  const group = (label: string, note: string, scales: string[]) => (
    <div>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 pb-2">
        <h2 className="text-section-title">{label}</h2>
        <p className="text-axis text-ink-muted">{note}</p>
      </div>
      {scales.map(detail)}
    </div>
  );

  const axes = (
    <>
      {group("기질 척도", "타고난 부분. 바꾸기보다 알고 쓰는 쪽에 가깝습니다.", TEMPERAMENT)}
      <div className="mt-10">
        {group("성격 척도", "살면서 형성된 부분. 시간이 지나며 달라질 수 있습니다.", CHARACTER)}
      </div>
    </>
  );

  // ── ③ 종합 ──
  const together = (
    <>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-(--border) pb-3">
        <h2 className="text-section-title">척도 간 관계</h2>
        <p className="text-axis text-ink-muted">
          서로 다른 방향으로 작용하는 두 척도가 만났을 때의 해석입니다.
        </p>
      </div>
      <div className="mt-6">
        <PairReadings readings={readPairs(scores)} scores={scores} />
      </div>

      <section className="text-table text-ink-muted mt-10 max-w-[56rem] border-t border-(--border) pt-5">
        <p className="eyebrow mb-2">결과 해석 시 유의사항</p>
        <p className="mb-1">
          점수는 우열이 아니라 경향의 정도입니다. 특정 상황의 결과를 예측하기보다
          평소의 일하는 방식을 이해하는 데 맞습니다.
        </p>
        <p>
          자기보고 검사이므로 응답 당시의 상태에 따라 결과가 달라질 수 있고,
          문항은 계속 다듬는 중입니다. 자기 이해를 돕는 참고 자료로 활용해
          주십시오.
        </p>
      </section>
    </>
  );

  const content: Record<ResultPageKey, { label: string; content: ReactNode }> = {
    summary: { label: "결과 요약", content: summary },
    axes: { label: "척도별 결과", content: axes },
    together: { label: "종합", content: together },
  };

  return {
    pages: RESULT_PAGE_KEYS.map((key) => ({ key, ...content[key] })),
    action: opts.retake ? <RetakeButton /> : undefined,
  };
}

/**
 * `?p=` (1부터) → 처음 펼 장 (0부터). 범위 밖이거나 숫자가 아니면 첫 장.
 *
 * 처음 펼 장은 서버가 `?p=` 를 읽어 정한다 — 새로고침·공유 링크에도 그 장이
 * 바로 그려진다.
 */
export function initialPageOf(p: string | undefined, count: number): number {
  const asked = Number(p);
  return Number.isInteger(asked) && asked >= 1 && asked <= count ? asked - 1 : 0;
}
