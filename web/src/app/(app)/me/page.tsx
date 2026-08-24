import Link from "next/link";
import { AxisDetail } from "@/components/charts/AxisDetail";
import { PairReadings } from "@/components/charts/PairReadings";
import { TraitSummary } from "@/components/charts/TraitSummary";
import { CHARACTER, TEMPERAMENT } from "@/components/charts/scale";
import { EmptyState } from "@/components/ui/Card";
import { requireUser } from "@/lib/auth/guard";
import { readPairs, type AxisInput } from "@/lib/interpretation/pairs";
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
          <Link
            href="/survey"
            className="inline-flex h-12 items-center rounded-lg px-6 font-medium text-white"
            style={{ background: "var(--series-1)" }}
          >
            설문 시작하기
          </Link>
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

  return (
    <main className="page-column py-16">
      <header className="mb-14">
        <h1 className="text-screen-title mb-2">{me.name} 님의 결과</h1>
        <p className="text-table text-ink-muted">
          {result.completedAt?.toLocaleDateString("ko-KR")} 응시
          {result.durationSec ? ` · ${Math.round(result.durationSec / 60)}분 소요` : ""}
        </p>
      </header>

      {/* ① 한눈에 — 형태부터 본다. 막대 개관을 따로 두지 않는다.
             아래 축별 상세에 같은 막대가 다시 나오기 때문이다. */}
      <TraitSummary
        rows={traits.map((t) => ({
          scale: t.scale,
          percent: t.percent,
          band: t.band,
        }))}
      />

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
          살면서 형성된 부분입니다. 기질과 달리 시간이 지나며 달라질 수 있습니다.
        </p>
        {CHARACTER.map(detail)}
      </section>

      {/* ③ 두 축을 같이 보기 */}
      <section className="mt-24 border-t border-[--border] pt-12">
        <h2 className="text-section-title mb-2">두 축을 같이 보면</h2>
        <p className="text-ink-secondary mb-10 max-w-[54rem]">
          축을 하나씩 보는 것과 둘을 겹쳐 보는 것은 다릅니다. 서로 당기는 방향이 다른
          축이 만나면 그 안에서 긴장이 생깁니다.
        </p>
        <PairReadings readings={readPairs(scores)} scores={scores} />
      </section>

      {/* 직무능력은 개인 화면에 표시하지 않는다 (00 D-35).
          사내 위치도 마찬가지로 개인 화면에는 없다 (D-09). */}

      {/* ⑤ 전체 안내를 한 번만 둔다. 곳곳에 경고를 흩뿌리면 아무도 안 읽는다 */}
      <section className="text-table text-ink-muted mt-24 max-w-[56rem] border-t border-[--border] pt-8">
        <p className="text-ink-secondary mb-2 font-medium">읽으실 때</p>
        <p className="mb-1">
          점수는 잘한다 못한다가 아니라 이런 편이다 정도입니다. 이번 일을 어떻게 할지보다
          평소 일하는 방식을 보는 데 맞습니다.
        </p>
        <p>
          그리고 이 결과가 전부 맞지는 않을 수 있습니다. 스스로 답한 것을 모은 것이라 그날
          상태에 따라 달라지고, 문항도 저희가 새로 쓴 것이라 아직 다듬는 중입니다. 자기
          이해를 돕는 참고 자료로 보시면 됩니다.
        </p>
      </section>

      <p className="mt-16">
        <Link href="/survey" className="text-ink-secondary underline">
          다시 응시하기
        </Link>
      </p>
    </main>
  );
}
