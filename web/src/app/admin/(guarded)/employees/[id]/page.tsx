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
import { ratingToPercent } from "@/lib/admin/abilitySource";
import { pickBossScores } from "@/lib/admin/ratings";
import { loadResearchTable, relatedScales } from "@/lib/research/correlations";
import {
  orderedAbilities,
  orderedTraits,
  type StoredAbilities,
  type StoredTraits,
} from "@/lib/survey/result";
import { DeleteEmployee } from "./DeleteEmployee";
import { ResetPassword } from "./ResetPassword";

export const metadata = { title: "구성원 상세 — 관리자" };

export default async function EmployeeDetail(props: {
  params: Promise<{ id: string }>;
}) {
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
      ratings: true,
    },
  });
  if (!e || e.role !== "USER") notFound();

  const session = e.testSessions[0];
  const result = session?.result;

  /*
    대표님 평가 — **한 사람을 보는 자리인데 여기에만 없었다** (2026-08-25).

    표 아래에 「숫자를 합치지 않고 옆에 놓기만 합니다」라고 적어 두었는데,
    정작 **옆에 놓을 두 번째 숫자가 없었다.** 있지도 않은 것을 설명하는
    문장이었다. 보려면 분석의 「평가 대조」까지 가야 했다.

    합치지 않는다. 1~10을 0~100으로 옮겨 눈금만 맞추고, 매기신 원래 점수도
    같이 적는다 — 어긋나는 지점이 경험과 대조하실 부분이다.
  */
  const boss = pickBossScores(e.ratings);

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
        {session?.completedAt &&
          ` · ${session.completedAt.toLocaleDateString("ko-KR")} 응시`}
      </p>

      {!result ? (
        <div className="mb-14">
          <EmptyState
            message={
              session ? "응시가 진행 중입니다." : "아직 응시하지 않았습니다."
            }
          />
        </div>
      ) : (
        <ResultBlocks
          traits={result.scoresJson as unknown as StoredTraits}
          abilities={
            (result.abilityScoresJson ?? {}) as unknown as StoredAbilities
          }
          boss={boss}
        />
      )}

      {session?.qualityFlag && (
        <Card title="응답 신뢰도" className="mb-14">
          <dl className="text-table grid grid-cols-2 gap-y-2 sm:grid-cols-4">
            <dt className="text-ink-secondary">판정</dt>
            <dd className="tabular">{session.qualityFlag.flag}</dd>
            <dt className="text-ink-secondary">반대 문항 일치도</dt>
            <dd className="tabular">
              {session.qualityFlag.antonymAgreement.toFixed(2)}
            </dd>
            <dt className="text-ink-secondary">평균 응답시간</dt>
            <dd className="tabular">
              {(session.qualityFlag.meanElapsedMs / 1000).toFixed(1)}초
            </dd>
            <dt className="text-ink-secondary">너무 빠른 문항</dt>
            <dd className="tabular">{session.qualityFlag.fastCount}개</dd>
          </dl>
          <p className="text-axis text-ink-muted mt-4">
            이건 성격에 대한 판정이 아니라 이 응답 데이터를 믿을 수 있는가에
            대한 것입니다.
          </p>
        </Card>
      )}

      <Card title="비밀번호 초기화">
        <ResetPassword employeeId={e.id} name={e.name} />
      </Card>

      {/*
        삭제는 **맨 아래에 따로** 둔다. 비밀번호 초기화 옆에 나란히 두면
        손이 미끄러진다. 되돌릴 수 없는 것은 되돌릴 수 있는 것과 같은 줄에
        놓지 않는다.
      */}
      <div className="mt-16 border-t border-[--border] pt-8">
        <DeleteEmployee employeeId={e.id} name={e.name} />
      </div>
    </>
  );
}

async function ResultBlocks({
  traits,
  abilities,
  boss,
}: {
  traits: StoredTraits;
  abilities: StoredAbilities;
  /** 대표님이 매기신 1~10. 안 매기신 축은 없다 */
  boss: Record<string, number>;
}) {
  const dist = await loadDistribution();
  const research = loadResearchTable();

  const t = orderedTraits(traits);
  const a = orderedAbilities(abilities);

  return (
    <>
      <Card title="일곱 가지 성향" className="mb-14">
        {/*
          ⚠️ `mx-auto`가 없으면 **왼쪽에 붙고 오른쪽 절반이 빈다.**

          이 그림을 쓰는 다른 두 곳(개인 결과·목록에서 펼치기)은 옆에 막대가
          나란히 서서 폭이 채워지는데, 여기만 혼자 놓인다. 칸 가운데에 둔다.
        */}
        <div className="mx-auto max-w-3xl">
          <TraitRadar
            data={t.map((x) => ({
              scale: x.scale,
              percent: x.percent,
              average: dist.enough
                ? averageOf(dist.traits.get(x.scale))
                : undefined,
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
        <div className="overflow-x-auto">
          <table className="w-full text-table">
            <thead>
              <tr className="text-ink-secondary border-b border-[--border]">
                <th className="py-2 text-left font-medium">능력</th>
                <th className="py-2 text-right font-medium">본인</th>
                <th className="py-2 pr-2 text-right font-medium">대표님</th>
                <th className="py-2 pl-6 text-left font-medium">사내 위치</th>
                <th className="py-2 pl-6 text-left font-medium">
                  관련 성향 축
                </th>
              </tr>
            </thead>
            <tbody>
              {a.map((x) => {
                const values = dist.abilities.get(x.axis) ?? [];
                const related = relatedScales(research, x.axis);
                return (
                  <tr
                    key={x.axis}
                    className="border-b border-[--border] last:border-0"
                  >
                    <th scope="row" className="py-3 text-left font-normal">
                      {x.axis}
                    </th>
                    <td className="tabular py-3 text-right">
                      {Math.round(x.percent)}
                    </td>
                    <td className="tabular py-3 pr-2 text-right">
                      {typeof boss[x.axis] === "number" ? (
                        <>
                          {Math.round(ratingToPercent(boss[x.axis]))}
                          <span className="text-ink-muted ml-1">
                            ({boss[x.axis]}점)
                          </span>
                        </>
                      ) : (
                        <span className="text-ink-muted">—</span>
                      )}
                    </td>
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
                            {r.scale}{" "}
                            {traits[r.scale]
                              ? Math.round(traits[r.scale].percent)
                              : "—"}{" "}
                            <span className="text-ink-muted tabular">
                              {formatR(r.value)}
                            </span>{" "}
                            <span className="text-ink-muted">
                              {strengthOf(r.value)}
                            </span>
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
        </div>
        <p className="text-axis text-ink-muted mt-4">
          <strong className="text-ink-secondary">본인</strong>은 설문 점수,{" "}
          <strong className="text-ink-secondary">대표님</strong>은 1~10으로
          매기신 것을 같은 눈금으로 옮긴 값입니다. 숫자를 합치지 않고 옆에
          놓기만 합니다 — 어긋나는 지점이 경험과 대조하실 부분입니다.
        </p>
      </Card>
    </>
  );
}
