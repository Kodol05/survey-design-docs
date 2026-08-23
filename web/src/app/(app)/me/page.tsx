import Link from "next/link";
import { CubeReading } from "@/components/charts/CubeReading";
import { TraitProfile } from "@/components/charts/TraitProfile";
import { TraitRadar } from "@/components/charts/TraitRadar";
import { EmptyState } from "@/components/ui/Card";
import { requireUser } from "@/lib/auth/guard";
import { characterCube, temperamentCube, type AxisInput } from "@/lib/interpretation/cube";
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

  // 큐브 해석 — 기질에서 하나, 성격에서 하나. 서로 곱하지 않는다 (00 §2.2)
  const axes: Record<string, AxisInput> = Object.fromEntries(
    traits.map((t) => [t.scale, { percent: t.percent, band: t.band }]),
  );

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

      <section className="mt-24 border-t border-[--border] pt-10">
        <h2 className="text-section-title mb-6">묶어서 보면</h2>
        <CubeReading
          temperament={temperamentCube(axes)}
          character={characterCube(axes)}
        />
        <p className="text-axis text-ink-muted mt-8 max-w-3xl">
          일곱 축을 따로 보는 것과 묶어서 보는 것은 다릅니다. 위는 세 축이 겹쳤을 때
          어떤 모습이 되는지를 적은 것이고, 사람을 어떤 종류로 나누는 것이 아닙니다.
        </p>
      </section>

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
