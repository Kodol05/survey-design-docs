import type { ReactNode } from "react";
import { AxisDetail } from "@/components/charts/AxisDetail";
import { PairReadings } from "@/components/charts/PairReadings";
import { ResultBook, type BookPage } from "@/components/charts/ResultBook";
import { RetakeButton } from "@/components/survey/RetakeButton";
import { TraitRadar } from "@/components/charts/TraitRadar";
import { CHARACTER, TEMPERAMENT, colorAt } from "@/components/charts/scale";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Card";
import { requireUser } from "@/lib/auth/guard";
import { APPLY } from "@/lib/interpretation/apply";
import { LINE } from "@/lib/interpretation/lines";
import { readPairs, type AxisInput } from "@/lib/interpretation/pairs";
import { inProgress, latestResult, orderedTraits } from "@/lib/survey/result";

export const metadata = { title: "내 결과 — 7차원 성향 설문" };

const BAND_LABEL = { lower: "낮은 편", middle: "보통", upper: "높은 편" } as const;

/**
 * 개인 결과지 (2026-09-18 다시 짬, 같은 날 사용자 피드백으로 한 번 더).
 *
 * ## 종이 한 장, 세 장짜리
 *
 * 위 머리와 같은 폭의 종이(`ResultBook`)에 세 장이 실린다. 장 이름과 소제목은
 * 실제 검사 보고서의 관행을 따른다 — 만든 말을 쓰지 않는다.
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
 * 내용(서술·점수·조합)은 그대로다. 직무능력과 사내 위치는 개인 화면에 두지
 * 않는다 (00 D-35 · D-09).
 */
export default async function MePage(props: {
  searchParams: Promise<{ p?: string }>;
}) {
  const me = await requireUser();
  const result = await latestResult(me.id);

  if (!result) {
    /*
      ⚠️ **하다 만 사람에게 「시작하지 않았다」고 하면 안 된다** (2026-08-26).
      `latestResult`는 끝낸 것만 찾는다. 답이 날아간 줄 알지 않게 사실대로 말한다.
    */
    const doing = await inProgress(me.id);
    return (
      <main className="page-column py-20">
        <h1 className="text-screen-title mb-6">내 결과</h1>
        {doing ? (
          <>
            <EmptyState
              message={`아직 응시 중입니다 — ${doing.total}문항 중 ${doing.answered}문항 답하셨습니다.`}
            />
            <p className="text-ink-muted text-axis mb-8 text-center">
              답하신 것은 그대로 저장돼 있습니다. 끝내시면 여기에 결과가
              나옵니다.
            </p>
          </>
        ) : (
          <EmptyState message="아직 응시하지 않으셨습니다." />
        )}
        <div className="flex justify-center">
          <ButtonLink href="/survey" size="lg">
            {doing ? "이어서 하기" : "설문 시작하기"}
          </ButtonLink>
        </div>
      </main>
    );
  }

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

  /** 척도별 결과 장(2)으로 가는 링크 */
  const axisLink = (scale: string) => (
    <a href="?p=2" className="text-ink-secondary underline underline-offset-2">
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
      <header className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <div className="flex items-baseline gap-3">
          <h1 className="text-screen-title">{me.name} 님</h1>
          <span className="text-axis text-ink-muted">7차원 성향 검사 결과</span>
        </div>
        <p className="text-axis text-ink-muted tabular">
          {result.completedAt?.toLocaleDateString("ko-KR")} 응시
          {result.durationSec
            ? ` · ${Math.round(result.durationSec / 60)}분 소요`
            : ""}
        </p>
      </header>

      {/* 프로필 도형 | 일곱 축 점수표 */}
      <section className="mt-5 grid items-center gap-x-10 gap-y-6 border-t border-[--border] pt-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="mx-auto w-full max-w-[21rem]">
          <TraitRadar
            data={traits.map((t) => ({ scale: t.scale, percent: t.percent }))}
            showValues
          />
        </div>

        <div>
          {/*
            척도 · 한 줄 특징 · 점수 · 구간. 가운데 구간까지 일곱 줄이 다 나오므로
            사람마다 일곱 줄이 자기 구간에 맞게 조합된다 (`lines.ts`).
          */}
          <p className="eyebrow mb-2">척도별 점수와 특징</p>
          <ul className="flex flex-col">
            {traits.map((t, n) => (
              <li
                key={t.scale}
                className={`grid grid-cols-[6.5rem_minmax(0,1fr)_2.25rem_3.5rem] items-baseline gap-x-3 py-1.5 ${
                  n === TEMPERAMENT.length ? "mt-1.5 border-t border-[--border] pt-3" : ""
                }`}
              >
                <span className="flex items-baseline gap-1.5">
                  <span
                    aria-hidden
                    className="size-2 shrink-0 translate-y-px rounded-[2px]"
                    style={{ background: colorAt(t.percent) }}
                  />
                  {axisLink(t.scale)}
                </span>
                <span className="text-table truncate" title={LINE[t.scale]?.[t.band]}>
                  {LINE[t.scale]?.[t.band]}
                </span>
                <span className="tabular text-table text-right font-medium">
                  {Math.round(t.percent)}
                </span>
                <span className="text-axis text-ink-muted">{BAND_LABEL[t.band]}</span>
              </li>
            ))}
          </ul>
          <p className="text-axis text-ink-muted mt-2">
            위 네 개는 기질 척도, 아래 세 개는 성격 척도입니다.
          </p>
        </div>
      </section>

      {/* 일하는 방식 · 강점 · 유의할 점 */}
      {standout.length === 0 ? (
        <p className="text-table text-ink-secondary mt-6 max-w-[54rem] border-t border-[--border] pt-5">
          일곱 척도가 모두 보통 범위입니다. 어느 쪽으로도 크게 기울지 않아
          상황에 따라 양쪽을 고르게 쓰는 편입니다. 척도별 내용은 다음 장에
          있습니다.
        </p>
      ) : (
        <section className="mt-6 grid gap-x-10 gap-y-7 border-t border-[--border] pt-5 md:grid-cols-3">
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
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-[--border] pb-3">
        <h2 className="text-section-title">척도 간 관계</h2>
        <p className="text-axis text-ink-muted">
          서로 다른 방향으로 작용하는 두 척도가 만났을 때의 해석입니다.
        </p>
      </div>
      <div className="mt-6">
        <PairReadings readings={readPairs(scores)} scores={scores} />
      </div>

      <section className="text-table text-ink-muted mt-10 max-w-[56rem] border-t border-[--border] pt-5">
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

  const pages: BookPage[] = [
    { key: "summary", label: "결과 요약", content: summary },
    { key: "axes", label: "척도별 결과", content: axes },
    { key: "together", label: "종합", content: together },
  ];

  /*
    처음 펼 장은 서버가 `?p=` 를 읽어 정한다 — 새로고침·공유 링크에도 그 장이
    바로 그려진다. `key` 로 `?p=` 만 바뀌는 이동에도 장이 새로 잡히게 한다.
  */
  const { p } = await props.searchParams;
  const asked = Number(p);
  const initialPage =
    Number.isInteger(asked) && asked >= 1 && asked <= pages.length
      ? asked - 1
      : 0;

  return (
    // 좁은 화면에선 아래 넘김 줄이 떠 있으므로 바닥 여백을 넉넉히 둔다
    <main className="page-column py-8 pb-24 lg:py-10 lg:pb-12">
      <ResultBook
        key={initialPage}
        pages={pages}
        initial={initialPage}
        action={<RetakeButton />}
      />
    </main>
  );
}

