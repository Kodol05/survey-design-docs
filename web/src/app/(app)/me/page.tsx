import Link from "next/link";
import { AxisDetail } from "@/components/charts/AxisDetail";
import { PairReadings } from "@/components/charts/PairReadings";
import { ResultBook, type BookPage } from "@/components/charts/ResultBook";
import { TraitSummary } from "@/components/charts/TraitSummary";
import { CHARACTER, TEMPERAMENT, colorAt } from "@/components/charts/scale";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Card";
import { requireUser } from "@/lib/auth/guard";
import { APPLY } from "@/lib/interpretation/apply";
import { readPairs, type AxisInput } from "@/lib/interpretation/pairs";
import { inProgress, latestResult, orderedTraits } from "@/lib/survey/result";

export const metadata = { title: "내 결과 — 7차원 성향 설문" };

/**
 * 개인 결과지 (2026-09-18 다시 짬).
 *
 * ## 구조 — 실제 결과지처럼 네 장
 *
 *   ① 한눈에      이름·응시일 · 프로필 도형 · 7축 점수 · 일할 때 나는 ·
 *                 힘이 되는 점 / 살펴보면 좋은 점
 *   ② 기질(4축)   축마다 점수·구간·서술·하위척도 — 전부 펼쳐 둔다
 *   ③ 성격(3축)   〃
 *   ④ 두 축을 같이 · 읽으실 때 · 다시 응시하기
 *
 * 첫 장에 「나는 어떤 사람인가」가 다 들어오고, 나머지는 장을 넘겨 본다.
 * 축을 전부 펼치기로 했으므로(사용자 결정) 기질과 성격을 한 장씩으로 나눠
 * 한 장이 너무 길어지지 않게 했다. 넘기는 방식은 `ResultBook` 참고.
 *
 * 내용(서술·점수·조합)은 그대로다. 바꾼 것은 **무엇을 어디에 두느냐**뿐이다.
 * 직무능력과 사내 위치는 개인 화면에 두지 않는다 (00 D-35 · D-09).
 */
export default async function MePage(props: {
  searchParams: Promise<{ p?: string }>;
}) {
  const me = await requireUser();
  const result = await latestResult(me.id);

  if (!result) {
    /*
      ⚠️ **하다 만 사람에게 「시작하지 않았다」고 하면 안 된다** (2026-08-26).

      `latestResult`는 끝낸 것만 찾는다. 105문항 중 여든까지 답한 사람이
      「아직 응시하지 않으셨습니다」를 보면 **답이 날아간 줄 안다.**
      실제로는 그대로 있고 이어서 하면 된다. 사실대로 말한다.
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

  /** 축이 실린 장 번호 — 기질은 2, 성격은 3. 본문 링크가 `?p=` 로 그 장을 연다 */
  const pageOf = (scale: string) => (TEMPERAMENT.includes(scale) ? 2 : 3);

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

  /** 두드러진 축의 「일할 때의 결」·「힘이 되는 점」·「살펴보면 좋은 점」 */
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

  const dot = (percent: number) => (
    <span
      aria-hidden
      className="mt-2.5 size-2.5 shrink-0 rounded-[2px]"
      style={{ background: colorAt(percent) }}
    />
  );

  const axisLink = (scale: string) => (
    <a
      href={`?p=${pageOf(scale)}`}
      className="text-ink-secondary underline underline-offset-2"
    >
      {scale}
    </a>
  );

  // ── ① 한눈에 ──
  const overview = (
    <>
      <header
        className="mb-10 rounded-2xl px-8 py-8 sm:px-10"
        style={{ background: "var(--wash)" }}
      >
        <p className="text-axis text-ink-secondary mb-1">7차원 성향 설문 결과</p>
        <h1 className="text-screen-title mb-2">{me.name} 님</h1>
        <p className="text-table text-ink-secondary">
          {result.completedAt?.toLocaleDateString("ko-KR")} 응시
          {result.durationSec
            ? ` · ${Math.round(result.durationSec / 60)}분 소요`
            : ""}
        </p>
      </header>

      {/* 프로필 도형 + 7축 점수. 축 이름을 누르면 그 축이 실린 장으로 (#pN → ResultBook 이 받는다) */}
      <section>
        <TraitSummary
          anchorOf={(s) => `p${pageOf(s)}`}
          rows={traits.map((t) => ({
            scale: t.scale,
            percent: t.percent,
            band: t.band,
          }))}
        />
      </section>

      {standout.length === 0 ? (
        <p className="text-item text-ink-secondary mt-14 max-w-[54rem]">
          일곱 축이 모두 가운데 범위입니다. 어느 축에서도 한쪽으로 크게 기울지
          않아, 상황에 따라 양쪽을 골라 쓰는 편입니다. 축마다 자세한 이야기는
          다음 장부터 보실 수 있습니다.
        </p>
      ) : (
        <>
          {/* 두드러진 축 */}
          <section className="mt-14">
            <p className="text-axis text-ink-muted mb-3">두드러진 축</p>
            <ul className="flex flex-wrap gap-x-8 gap-y-3">
              {standout.map((t) => (
                <li key={t.scale}>
                  <a
                    href={`?p=${pageOf(t.scale)}`}
                    className="flex items-baseline gap-2"
                  >
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
          </section>

          {/* 일할 때 나는 — 결과를 점치지 않고 편하게 느끼는 결만 (07) */}
          <section className="mt-12">
            <h2 className="text-section-title mb-2">일할 때 나는</h2>
            <p className="text-ink-secondary mb-6 max-w-[54rem]">
              두드러진 축을 모아 어떤 결의 일을 편하게 느끼는지 적었습니다.
              무엇을 잘한다거나 어떤 일에 맞다는 뜻은 아니고, 평소 편하게
              여기는 방식이라고 보시면 됩니다.
            </p>
            <ul className="flex flex-col gap-4">
              {notes.map((n) => (
                <li key={n.scale} className="flex gap-4">
                  {dot(n.percent)}
                  <p className="text-item">
                    {axisLink(n.scale)}
                    {" — "}
                    {n.apply.work}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          {/* 힘이 되는 점 / 살펴보면 좋은 점 — 두드러진 축 기준으로 한 줄씩 */}
          <section className="mt-12 grid gap-x-12 gap-y-10 md:grid-cols-2">
            <div>
              <h2 className="text-section-title mb-4">힘이 되는 점</h2>
              <ul className="flex flex-col gap-4">
                {notes.map((n) => (
                  <li key={n.scale} className="flex gap-4">
                    {dot(n.percent)}
                    <p className="text-item">
                      <span className="text-ink-secondary">{n.scale}</span>
                      {" · "}
                      {n.apply.lift}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="text-section-title mb-4">살펴보면 좋은 점</h2>
              <ul className="flex flex-col gap-4">
                {notes.map((n) => (
                  <li key={n.scale} className="flex gap-4">
                    <span
                      aria-hidden
                      className="mt-2.5 size-2.5 shrink-0 rounded-[2px]"
                      style={{ background: "var(--grid)" }}
                    />
                    <p className="text-item">
                      <span className="text-ink-secondary">{n.scale}</span>
                      {" · "}
                      {n.apply.watch}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </>
      )}
    </>
  );

  // ── ② 기질 ──
  const temperament = (
    <>
      <h2 className="text-section-title mb-2">기질</h2>
      <p className="text-ink-secondary mb-4">
        타고난 부분입니다. 바꾸려 애쓰기보다 알고 쓰는 쪽이 맞습니다.
      </p>
      {TEMPERAMENT.map(detail)}
    </>
  );

  // ── ③ 성격 ──
  const character = (
    <>
      <h2 className="text-section-title mb-2">성격</h2>
      <p className="text-ink-secondary mb-4">
        살면서 형성된 부분입니다. 기질과 달리 시간이 지나며 달라질 수 있습니다.
      </p>
      {CHARACTER.map(detail)}
    </>
  );

  // ── ④ 두 축을 같이 · 읽으실 때 ──
  const together = (
    <>
      <h2 className="text-section-title mb-2">두 축을 같이 보면</h2>
      <p className="text-ink-secondary mb-10 max-w-[54rem]">
        축을 하나씩 보는 것과 둘을 겹쳐 보는 것은 다릅니다. 서로 당기는
        방향이 다른 축이 만나면 그 안에서 긴장이 생깁니다.
      </p>
      <PairReadings readings={readPairs(scores)} scores={scores} />

      {/* 전체 안내는 한 번만. 곳곳에 경고를 흩뿌리면 아무도 안 읽는다 */}
      <section className="text-table text-ink-muted mt-20 max-w-[56rem] border-t border-[--border] pt-8">
        <p className="text-ink-secondary mb-2 font-medium">읽으실 때</p>
        <p className="mb-1">
          점수는 잘한다 못한다가 아니라 이런 편이다 정도입니다. 이번 일을
          어떻게 할지보다 평소 일하는 방식을 보는 데 맞습니다.
        </p>
        <p>
          그리고 이 결과가 전부 맞지는 않을 수 있습니다. 스스로 답한 것을
          모은 것이라 그날 상태에 따라 달라지고, 문항도 저희가 새로 쓴 것이라
          아직 다듬는 중입니다. 자기 이해를 돕는 참고 자료로 보시면 됩니다.
        </p>
      </section>

      <p className="mt-12" data-print="hide">
        <Link href="/survey" className="text-ink-secondary underline">
          다시 응시하기
        </Link>
      </p>
    </>
  );

  const pages: BookPage[] = [
    { key: "overview", label: "한눈에", content: overview },
    { key: "temperament", label: "기질", content: temperament },
    { key: "character", label: "성격", content: character },
    { key: "together", label: "두 축을 같이", content: together },
  ];

  /*
    처음 펼 장은 **서버가 `?p=` 를 읽어** 정한다. 그래야 새로고침·공유 링크로
    열어도 그 장이 바로 그려지고, 자바스크립트가 뜨기 전에 1장이 잠깐 보이는
    일이 없다. 범위 밖이면 1장. `key` 를 주는 이유: 같은 화면 안에서 `?p=` 만
    바뀌는 이동(본문 링크)에도 장이 새로 잡히게 하기 위해서다.
  */
  const { p } = await props.searchParams;
  const asked = Number(p);
  const initialPage =
    Number.isInteger(asked) && asked >= 1 && asked <= pages.length
      ? asked - 1
      : 0;

  return (
    // 좁은 화면에선 아래 넘김 줄이 떠 있으므로 바닥 여백을 넉넉히 둔다
    <main className="page-wide py-12 pb-28 lg:pb-16">
      <ResultBook key={initialPage} pages={pages} initial={initialPage} />
    </main>
  );
}
