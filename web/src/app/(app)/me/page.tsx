import Link from "next/link";
import { TraitProfile } from "@/components/charts/TraitProfile";
import { TraitRadar } from "@/components/charts/TraitRadar";
import { Card, EmptyState } from "@/components/ui/Card";
import { requireUser } from "@/lib/auth/guard";
import { latestResult, orderedTraits } from "@/lib/survey/result";

export const metadata = { title: "내 결과 — 7차원 성향 설문" };

export default async function MePage() {
  const me = await requireUser();
  const result = await latestResult(me.id);

  if (!result) {
    return (
      <main className="mx-auto w-full max-w-3xl px-6 py-12">
        <h1 className="text-screen-title mb-6">내 결과</h1>
        <Card>
          <EmptyState message="아직 응시하지 않으셨습니다." />
          <div className="flex justify-center">
            <Link
              href="/survey"
              className="inline-flex h-11 items-center rounded-lg px-4 font-medium text-white"
              style={{ background: "var(--series-1)" }}
            >
              설문 시작하기
            </Link>
          </div>
        </Card>
      </main>
    );
  }

  const traits = orderedTraits(result.traits);

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12">
      <h1 className="text-screen-title mb-2">{me.name} 님의 결과</h1>
      <p className="text-axis text-ink-muted mb-10">
        {result.completedAt?.toLocaleDateString("ko-KR")} 응시
        {result.durationSec ? ` · ${Math.round(result.durationSec / 60)}분 소요` : ""}
      </p>

      <Card title="성향 프로필" className="mb-6">
        <TraitProfile
          rows={traits.map((t) => ({
            scale: t.scale,
            percent: t.percent,
            raw: t.raw,
            max: t.max,
            band: t.band,
          }))}
        />
        <p className="text-axis text-ink-muted mt-8">
          점수는 만점 대비 비율입니다. 가운데 밝은 구간이 보통입니다. 모든 문항에 중립으로
          답하면 57이 나옵니다.
        </p>
      </Card>

      <Card title="한눈에 보기" className="mb-6">
        <TraitRadar data={traits.map((t) => ({ scale: t.scale, percent: t.percent }))} />
      </Card>

      {/* 직무능력은 개인 화면에 표시하지 않는다 (00 D-35).
          관리자가 성향과의 관계를 확인하는 데 쓰는 자료이고,
          본인에게 "협력 62"를 보여주면 잘한다/못한다로 읽힌다.
          사내 위치도 마찬가지로 개인 화면에는 없다 (D-09). */}

      <div className="text-axis text-ink-secondary flex flex-col gap-2">
        <p>점수는 잘한다 못한다가 아니라 이런 편이다 정도로 보시면 됩니다.</p>
        <p>이번 일을 어떻게 할지보다는 평소 일하는 방식을 보는 데 맞습니다.</p>
      </div>

      <p className="mt-10">
        <Link href="/survey" className="text-table text-ink-secondary underline">
          다시 응시하기
        </Link>
      </p>
    </main>
  );
}
