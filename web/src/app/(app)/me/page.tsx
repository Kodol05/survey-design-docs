import Link from "next/link";
import { AxisDetail } from "@/components/charts/AxisDetail";
import { PairReadings } from "@/components/charts/PairReadings";
import { ButtonLink } from "@/components/ui/Button";
import { ResultNav } from "@/components/charts/ResultNav";
import { TraitSummary } from "@/components/charts/TraitSummary";
import { CHARACTER, TEMPERAMENT, colorAt } from "@/components/charts/scale";
import { EmptyState } from "@/components/ui/Card";
import { requireUser } from "@/lib/auth/guard";
import { readPairs, type AxisInput } from "@/lib/interpretation/pairs";
import { TRAIT_SCALES } from "@/lib/items/types";
import { latestResult, orderedTraits } from "@/lib/survey/result";

export const metadata = { title: "내 결과 — 7차원 성향 설문" };

export default async function MePage() {
  const me = await requireUser();
  const result = await latestResult(me.id);

  if (!result) {
    return (
      <main className="page-column py-20">
        <h1 className="text-screen-title mb-6">내 결과</h1>
        <EmptyState message="아직 응시하지 않으셨습니다." />
        <div className="flex justify-center">
          <ButtonLink href="/survey" size="lg">
            설문 시작하기
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

  /** 목차와 본문이 같은 자리표를 쓴다. 한쪽만 바꾸면 링크가 끊긴다 */
  const anchor = (scale: string) =>
    `axis-${TRAIT_SCALES.indexOf(scale as never)}`;

  const detail = (scale: string) => {
    const t = byScale.get(scale as never);
    if (!t) return null;
    return (
      <AxisDetail
        key={scale}
        id={anchor(scale)}
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
    머리 영역에 올릴 두드러진 축.

    가운데 범위(40~60)는 뺀다 — 「이런 사람이다」가 아니라 「이 축으로는
    설명하기 어렵다」는 뜻이라, 요약에 올리면 없는 특징을 만들어낸다.
    관리자 화면의 「한눈에」와 같은 규칙이다.
  */
  const standout = traits
    .filter((t) => t.band !== "middle")
    .sort((a, b) => Math.abs(b.percent - 50) - Math.abs(a.percent - 50))
    .slice(0, 3);

  const nav = [
    { id: "summary", label: "한눈에" },
    ...TEMPERAMENT.map((x) => ({ id: anchor(x), label: x })),
    ...CHARACTER.map((x) => ({ id: anchor(x), label: x })),
    { id: "pairs", label: "두 축을 같이" },
    { id: "notes", label: "읽으실 때" },
  ];

  return (
    <main className="page-column py-16">
      {/*
        **머리 영역을 보고서처럼 둔다** (2026-08-25).

        전에는 제목 한 줄 뒤에 곧장 그래프가 나왔다. 「내 결과지」라기보다
        화면 하나가 열린 느낌이었다. 이름·응시일과 함께 **두드러진 축 몇 개**를
        먼저 놓으면, 아래를 읽기 전에 자기 이야기가 한 줄 잡힌다.
      */}
      <header
        className="mb-16 rounded-2xl px-8 py-10 sm:px-10"
        style={{ background: "var(--wash)" }}
      >
        <p className="text-axis text-ink-secondary mb-1">7차원 성향 설문 결과</p>
        <h1 className="text-screen-title mb-3">{me.name} 님</h1>
        <p className="text-table text-ink-secondary mb-8">
          {result.completedAt?.toLocaleDateString("ko-KR")} 응시
          {result.durationSec
            ? ` · ${Math.round(result.durationSec / 60)}분 소요`
            : ""}
        </p>

        {standout.length > 0 ? (
          <div>
            <p className="text-axis text-ink-muted mb-3">두드러진 축</p>
            <ul className="flex flex-wrap gap-x-8 gap-y-4">
              {standout.map((t) => (
                <li key={t.scale}>
                  <a href={`#${anchor(t.scale)}`} className="flex items-baseline gap-2">
                    <span
                      aria-hidden
                      className="size-2.5 translate-y-px rounded-[2px]"
                      style={{ background: colorAt(t.percent) }}
                    />
                    <span className="text-table font-medium">{t.scale}</span>
                    <span className="tabular text-table text-ink-secondary">
                      {Math.round(t.percent)}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-table text-ink-secondary">
            일곱 축이 모두 가운데 범위입니다. 특별히 두드러지는 쪽이 없습니다.
          </p>
        )}
      </header>

      {/*
        **목차를 옆에 세운다** (2026-08-25).

        결과지가 화면 대여섯 개 분량이다. 어디쯤인지도, 아까 본 축으로
        돌아가는 방법도 없었다. 탭으로 쪼개지 않는 이유는 이게 **한 번
        처음부터 끝까지 읽는 글**이기 때문이다 — 쪼개면 첫 탭만 보고 나간다.
        흐름은 그대로 두고 길잡이만 붙인다.

        좁은 화면에서는 목차가 숨는다. 본문 폭을 먹으면 정작 읽을 것이 좁아진다.
      */}
      <div className="grid gap-x-16 xl:grid-cols-[minmax(0,1fr)_11rem]">
        <div className="xl:order-1">
          <ResultNav items={nav} />
        </div>

        <div className="min-w-0">
          {/* ① 한눈에 — 형태부터 본다. 막대 개관을 따로 두지 않는다.
             아래 축별 상세에 같은 막대가 다시 나오기 때문이다. */}
          <section id="summary" className="scroll-mt-8">
            <TraitSummary
              anchorOf={anchor}
              rows={traits.map((t) => ({
                scale: t.scale,
                percent: t.percent,
                band: t.band,
              }))}
            />
          </section>

          {/* ② 축별 상세 — 내 구간 설명 + 하위척도 */}
          <section className="mt-20">
            <h2 className="text-section-title mb-2">기질</h2>
            <p className="text-ink-secondary mb-6">
              타고난 부분입니다. 바꾸려 애쓰기보다 알고 쓰는 쪽이 맞습니다.
            </p>
            {TEMPERAMENT.map(detail)}
          </section>

          <section className="mt-20">
            <h2 className="text-section-title mb-2">성격</h2>
            <p className="text-ink-secondary mb-6">
              살면서 형성된 부분입니다. 기질과 달리 시간이 지나며 달라질 수
              있습니다.
            </p>
            {CHARACTER.map(detail)}
          </section>

          {/* ③ 두 축을 같이 보기 */}
          <section
            id="pairs"
            className="scroll-mt-8 mt-24 border-t border-[--border] pt-12"
          >
            <h2 className="text-section-title mb-2">두 축을 같이 보면</h2>
            <p className="text-ink-secondary mb-10 max-w-[54rem]">
              축을 하나씩 보는 것과 둘을 겹쳐 보는 것은 다릅니다. 서로 당기는
              방향이 다른 축이 만나면 그 안에서 긴장이 생깁니다.
            </p>
            <PairReadings readings={readPairs(scores)} scores={scores} />
          </section>

          {/* 직무능력은 개인 화면에 표시하지 않는다 (00 D-35).
          사내 위치도 마찬가지로 개인 화면에는 없다 (D-09). */}

          {/* ⑤ 전체 안내를 한 번만 둔다. 곳곳에 경고를 흩뿌리면 아무도 안 읽는다 */}
          <section
            id="notes"
            className="text-table text-ink-muted scroll-mt-8 mt-24 max-w-[56rem] border-t border-[--border] pt-8"
          >
            <p className="text-ink-secondary mb-2 font-medium">읽으실 때</p>
            <p className="mb-1">
              점수는 잘한다 못한다가 아니라 이런 편이다 정도입니다. 이번 일을
              어떻게 할지보다 평소 일하는 방식을 보는 데 맞습니다.
            </p>
            <p>
              그리고 이 결과가 전부 맞지는 않을 수 있습니다. 스스로 답한 것을
              모은 것이라 그날 상태에 따라 달라지고, 문항도 저희가 새로 쓴
              것이라 아직 다듬는 중입니다. 자기 이해를 돕는 참고 자료로 보시면
              됩니다.
            </p>
          </section>

          <p className="mt-16" data-print="hide">
            <Link href="/survey" className="text-ink-secondary underline">
              다시 응시하기
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
