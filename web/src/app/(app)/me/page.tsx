import Link from "next/link";
import { TraitProfile } from "@/components/charts/TraitProfile";
import { TraitRadar } from "@/components/charts/TraitRadar";
import { EmptyState } from "@/components/ui/Card";
import { requireUser } from "@/lib/auth/guard";
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

  return (
    <main className="page-column py-16">
      <header className="mb-16">
        <h1 className="text-screen-title mb-2">{me.name} 님의 결과</h1>
        <p className="text-axis text-ink-muted">
          {result.completedAt?.toLocaleDateString("ko-KR")} 응시
          {result.durationSec ? ` · ${Math.round(result.durationSec / 60)}분 소요` : ""}
        </p>
      </header>

      {/* 프로필이 주인공이다. 상자에 가두지 않고 넓게 편다. */}
      <TraitProfile
        rows={traits.map((t) => ({
          scale: t.scale,
          percent: t.percent,
          band: t.band,
        }))}
      />

      <dl className="text-axis mx-auto mt-12 grid max-w-3xl grid-cols-[5rem_1fr] gap-x-6 gap-y-1 border-t border-[--border] pt-6">
        <dt className="text-ink font-medium">눈금이란?</dt>
        <dd className="text-ink-secondary">
          0에서 100까지이고, 모든 문항에 &ldquo;보통&rdquo;으로 답하면 50이 나옵니다.
        </dd>
        <dd className="text-ink-secondary col-start-2">
          40 아래면 왼쪽 특성, 60 위면 오른쪽 특성이 두드러지는 편으로 봅니다.
        </dd>
        <dd className="text-ink-secondary col-start-2">
          어느 쪽이 좋은 것은 아니고, 딱 잘리는 기준도 아니라 참고로만 보시면 됩니다.
        </dd>
      </dl>

      <section className="mt-20 grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center">
        <div>
          <h2 className="text-section-title mb-3">한눈에 보기</h2>
          <p className="text-ink-secondary max-w-[30rem]">
            일곱 축을 한 모양으로 겹쳐 본 것입니다. 어느 쪽으로 치우쳐 있는지 형태로
            읽으시면 됩니다.
          </p>
          <div className="text-axis text-ink-secondary mt-8 flex flex-col gap-2 border-t border-[--border] pt-6">
            <p>점수는 잘한다 못한다가 아니라 이런 편이다 정도로 보시면 됩니다.</p>
            <p>이번 일을 어떻게 할지보다는 평소 일하는 방식을 보는 데 맞습니다.</p>
          </div>
        </div>
        <TraitRadar data={traits.map((t) => ({ scale: t.scale, percent: t.percent }))} />
      </section>

      {/* 직무능력은 개인 화면에 표시하지 않는다 (00 D-35).
          관리자가 성향과의 관계를 확인하는 데 쓰는 자료이고,
          본인에게 "협력 62"를 보여주면 잘한다/못한다로 읽힌다.
          사내 위치도 마찬가지로 개인 화면에는 없다 (D-09). */}

      <p className="mt-20">
        <Link href="/survey" className="text-table text-ink-secondary underline">
          다시 응시하기
        </Link>
      </p>
    </main>
  );
}
