import Link from "next/link";
import { notFound } from "next/navigation";
import { TraitRadar } from "@/components/charts/TraitRadar";
import { Card, EmptyState } from "@/components/ui/Card";
import { DistributionBar } from "@/components/ui/DistributionBar";
import { requireAdmin } from "@/lib/auth/guard";
import { formatPhone } from "@/lib/auth/phone";
import { formatR } from "@/components/analysis/correlationColor";
import { strengthOf } from "@/components/analysis/correlationWords";
import { averageOf, bandOf, loadDistribution } from "@/lib/admin/distribution";
import { prisma } from "@/lib/db";
import { loadResearchTable, relatedScales } from "@/lib/research/correlations";
import { orderedAbilities, orderedTraits, type StoredAbilities, type StoredTraits } from "@/lib/survey/result";
import { ResetPassword } from "./ResetPassword";

export const metadata = { title: "구성원 상세 — 관리자" };



export default async function EmployeeDetail(props: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await props.params;

  const e = await prisma.employee.findUnique({
    where: { id },
    include: {
      testSessions: {
        orderBy: { startedAt: "desc" },
        take: 1,
        include: { result: true, qualityFlag: true },
      },
    },
  });
  if (!e || e.role !== "USER") notFound();

  const session = e.testSessions[0];
  const result = session?.result;

  return (
    <>
      <p className="text-axis mb-2">
        <Link href="/admin/employees" className="text-ink-secondary underline">
          구성원
        </Link>
      </p>
      <h1 className="text-screen-title mb-1">{e.name}</h1>
      <p className="text-axis text-ink-muted mb-8 tabular">
        {e.phone ? formatPhone(e.phone) : "번호 없음"}
        {session?.completedAt && ` · ${session.completedAt.toLocaleDateString("ko-KR")} 응시`}
      </p>

      {!result ? (
        <div className="mb-14">
          <EmptyState message={session ? "응시가 진행 중입니다." : "아직 응시하지 않았습니다."} />
        </div>
      ) : (
        <ResultBlocks
          traits={result.scoresJson as unknown as StoredTraits}
          abilities={(result.abilityScoresJson ?? {}) as unknown as StoredAbilities}
        />
      )}

      {session?.qualityFlag && (
        <Card title="응답 품질" className="mb-14">
          <dl className="text-table grid grid-cols-2 gap-y-2 sm:grid-cols-4">
            <dt className="text-ink-secondary">판정</dt>
            <dd className="tabular">{session.qualityFlag.flag}</dd>
            <dt className="text-ink-secondary">반대 문항 일치도</dt>
            <dd className="tabular">{session.qualityFlag.antonymAgreement.toFixed(2)}</dd>
            <dt className="text-ink-secondary">평균 응답시간</dt>
            <dd className="tabular">{(session.qualityFlag.meanElapsedMs / 1000).toFixed(1)}초</dd>
            <dt className="text-ink-secondary">너무 빠른 문항</dt>
            <dd className="tabular">{session.qualityFlag.fastCount}개</dd>
          </dl>
          <p className="text-axis text-ink-muted mt-4">
            이건 성격에 대한 판정이 아니라 이 응답 데이터를 믿을 수 있는가에 대한 것입니다.
          </p>
        </Card>
      )}

      <Card title="비밀번호 초기화">
        <ResetPassword employeeId={e.id} name={e.name} />
      </Card>
    </>
  );
}

async function ResultBlocks({
  traits,
  abilities,
}: {
  traits: StoredTraits;
  abilities: StoredAbilities;
}) {
  const dist = await loadDistribution();
  const research = loadResearchTable();

  const t = orderedTraits(traits);
  const a = orderedAbilities(abilities);

  return (
    <>
      <Card title="일곱 가지 성향" className="mb-14">
        <div className="max-w-3xl">
        <TraitRadar
          data={t.map((x) => ({
            scale: x.scale,
            percent: x.percent,
            average: dist.enough ? averageOf(dist.traits.get(x.scale)) : undefined,
          }))}
          showAverage={dist.enough}
        />
        {dist.enough && (
          <p className="text-axis text-ink-muted mt-2 text-center">
            점선은 사내 평균입니다 ({dist.n}명 기준)
          </p>
        )}
        </div>
      </Card>

      <Card title="직무능력" className="mb-14">
        <table className="w-full text-table">
          <thead>
            <tr className="text-ink-secondary border-b border-[--border]">
              <th className="py-2 text-left font-medium">능력</th>
              <th className="py-2 text-right font-medium">점수</th>
              <th className="py-2 pl-6 text-left font-medium">사내 위치</th>
              <th className="py-2 pl-6 text-left font-medium">관련 성향 축</th>
            </tr>
          </thead>
          <tbody>
            {a.map((x) => {
              const values = dist.abilities.get(x.axis) ?? [];
              const related = relatedScales(research, x.axis);
              return (
                <tr key={x.axis} className="border-b border-[--border] last:border-0">
                  <th scope="row" className="py-3 text-left font-normal">{x.axis}</th>
                  <td className="tabular py-3 text-right">{Math.round(x.percent)}</td>
                  <td className="py-3 pl-6">
                    <DistributionBar
                      score={x.percent}
                      band={bandOf(values, x.percent)}
                      n={dist.n}
                      label={x.axis}
                    />
                  </td>
                  <td className="py-3 pl-6 text-ink-secondary">
                    {related.length ? (
                      related.slice(0, 2).map((r, i) => (
                        <span key={r.scale}>
                          {i > 0 && " · "}
                          {r.scale} {traits[r.scale] ? Math.round(traits[r.scale].percent) : "—"}{" "}
                          <span className="text-ink-muted tabular">{formatR(r.value)}</span>{" "}
                          <span className="text-ink-muted">{strengthOf(r.value)}</span>
                        </span>
                      ))
                    ) : (
                      <span className="text-ink-muted">연구된 값 없음</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="text-axis text-ink-muted mt-4">
          숫자를 합치지 않고 옆에 놓기만 합니다. 어긋나는 지점이 경험과 대조하실 부분입니다.
        </p>
      </Card>
    </>
  );
}
