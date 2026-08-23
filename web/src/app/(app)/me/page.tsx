import Link from "next/link";
import { TraitRadar } from "@/components/charts/TraitRadar";
import { ScoreBar } from "@/components/charts/ScoreBar";
import { Card, EmptyState } from "@/components/ui/Card";
import { requireUser } from "@/lib/auth/guard";
import { latestResult, orderedAbilities, orderedTraits } from "@/lib/survey/result";

export const metadata = { title: "내 결과 — 7차원 성향 설문" };

const pct = (n: number) => `${Math.round(n)}%`;

export default async function MePage() {
  const me = await requireUser();
  const result = await latestResult(me.id);

  if (!result) {
    return (
      <main className="reading-column py-12">
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
  const abilities = orderedAbilities(result.abilities);

  return (
    <main className="reading-column py-12">
      <h1 className="text-screen-title mb-2">{me.name} 님의 결과</h1>
      <p className="text-axis text-ink-muted mb-8">
        {result.completedAt?.toLocaleDateString("ko-KR")} 응시
        {result.durationSec ? ` · ${Math.round(result.durationSec / 60)}분 소요` : ""}
      </p>

      <Card title="일곱 가지 성향" className="mb-6">
        <TraitRadar data={traits.map((t) => ({ scale: t.scale, percent: t.percent }))} />

        <table className="mt-6 w-full">
          <caption className="sr-only">성향 축별 점수</caption>
          <tbody>
            {traits.map((t) => (
              <tr key={t.scale}>
                <th
                  scope="row"
                  className="text-table py-2 pr-4 text-left font-normal whitespace-nowrap"
                >
                  {t.scale}
                </th>
                <td className="w-full py-2 pr-4">
                  <ScoreBar percent={t.percent} />
                </td>
                <td className="text-table tabular py-2 text-right whitespace-nowrap">
                  {pct(t.percent)}
                  <span className="text-ink-muted ml-2">
                    {t.raw} / {t.max}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {abilities.length > 0 && (
        <Card title="직무능력" className="mb-6">
          <table className="w-full">
            <tbody>
              {abilities.map((a) => (
                <tr key={a.axis}>
                  <th
                    scope="row"
                    className="text-table py-2 pr-4 text-left font-normal whitespace-nowrap"
                  >
                    {a.axis}
                  </th>
                  <td className="w-full py-2 pr-4">
                    <ScoreBar percent={a.percent} />
                  </td>
                  <td className="text-table tabular py-2 text-right whitespace-nowrap">
                    {pct(a.percent)}
                    <span className="text-ink-muted ml-2">
                      {a.raw} / {a.max}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* 사내 위치는 개인 화면에 표시하지 않는다 (00 D-09).
              사람이 늘 때마다 값이 바뀌는데 결과는 채점 시점에 고정되므로,
              먼저 본 사람과 나중에 본 사람이 영구적으로 다른 화면을 보게 된다. */}
        </Card>
      )}

      <p className="text-axis text-ink-secondary">
        점수는 잘한다 못한다가 아니라 이런 편이다 정도로 보시면 됩니다. 이번 일을 어떻게
        할지보다는 평소 일하는 방식을 보는 데 맞습니다.
      </p>

      <p className="mt-8">
        <Link href="/survey" className="text-table text-ink-secondary underline">
          다시 응시하기
        </Link>
      </p>
    </main>
  );
}
