import Link from "next/link";
import { WarningBadge } from "@/components/ui/WarningBadge";
import { formatR } from "@/components/analysis/correlationColor";
import { colorAt } from "@/components/charts/scale";
import { getAppState } from "@/lib/admin/phase";
import { loadSummary } from "@/lib/admin/summary";
import {
  cellOf,
  loadPeople,
  loadReliability,
  traitAbilityMatrix,
} from "@/lib/admin/analysis";
import { ALPHA } from "@/lib/admin/stats";
import { ABILITY_AXES, TRAIT_SCALES } from "@/lib/items/types";
import { MIN_N } from "@/components/ui/NBadge";
import { OpenResultsButton } from "./OpenResultsButton";

export const metadata = { title: "대시보드 — 관리자" };

export default async function AdminHome() {
  const [state, s, people, reliability] = await Promise.all([
    getAppState(),
    loadSummary(),
    loadPeople(),
    loadReliability(),
  ]);
  const open = state.ratingPhase === "OPEN";
  const matrix = traitAbilityMatrix(people);

  const alphas = reliability.map((r) => r.alpha).filter((a): a is number => a !== null);
  const meanAlpha = alphas.length ? alphas.reduce((a, b) => a + b, 0) / alphas.length : null;
  const poorScales = reliability.filter((r) => r.verdict === "poor");

  // 사내 평균 — 우리 회사 사람들은 전반적으로 어떤 편인가 (01 §4.0 Q1)
  const averages = TRAIT_SCALES.map((scale) => {
    const vs = people.map((p) => p.traits[scale]).filter((v) => typeof v === "number");
    return {
      scale,
      value: vs.length ? vs.reduce((a, b) => a + b, 0) / vs.length : null,
    };
  });

  // 가장 뚜렷한 관련 세 개 — 자세한 것은 분석 화면에서
  const top = TRAIT_SCALES.flatMap((scale) =>
    ABILITY_AXES.map((axis) => ({ scale, axis, c: cellOf(matrix, scale, axis) })),
  )
    .filter((x) => x.c && !(x.c.ci[0] <= 0 && x.c.ci[1] >= 0))
    .sort((a, b) => Math.abs(b.c!.r) - Math.abs(a.c!.r))
    .slice(0, 3);

  return (
    <>
      <h1 className="text-screen-title mb-8">대시보드</h1>

      <div className="mb-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="응시 완료" value={s.completed} />
        <Tile label="진행 중" value={s.inProgress} />
        <Tile
          label="검토가 필요한 응답"
          value={s.quality.review + s.quality.poor}
          hint={s.quality.poor ? `그중 ${s.quality.poor}건은 미달` : undefined}
        />
        <Tile
          label="척도 평균 α"
          value={meanAlpha === null ? "—" : meanAlpha.toFixed(2)}
          hint={poorScales.length ? `${poorScales.length}개 척도가 ${ALPHA.poor} 아래` : undefined}
        />
      </div>

      {/* 국면 — 결과를 열기 전에는 이게 가장 위에 와야 한다 */}
      <section className="mb-14">
        <h2 className="text-section-title mb-4 border-b border-[--border] pb-2">
          평가·결과 국면
        </h2>
        {open ? (
          <p className="text-ink-secondary">
            결과가 공개되어 있습니다.
            {state.openedAt && (
              <span className="text-ink-muted ml-2">
                {state.openedAt.toLocaleString("ko-KR")}에 열렸습니다.
              </span>
            )}
          </p>
        ) : (
          <>
            <p className="text-ink-secondary mb-4 max-w-[46rem]">
              지금은 <strong>평가 수집 중</strong>입니다. 대표님 평가가 끝나기 전에는
              결과를 볼 수 없습니다. 결과를 먼저 보면 그 인상이 섞여서 대조하는 의미가
              없어지기 때문입니다.
            </p>
            <p className="text-axis text-ink-muted mb-5">
              응시 현황과 응답 품질, 문항 목록은 지금도 보실 수 있습니다.
            </p>
            <OpenResultsButton completed={s.completed} />
          </>
        )}
      </section>

      {open && (
        <>
          <section className="mb-14">
            <div className="mb-4 flex items-baseline justify-between border-b border-[--border] pb-2">
              <h2 className="text-section-title">우리 회사는 어떤 편인가</h2>
              <span className="text-axis text-ink-muted">{people.length}명 평균</span>
            </div>
            <ul className="max-w-2xl">
              {averages.map((a) => (
                <li key={a.scale} className="grid grid-cols-[7rem_1fr_2.5rem] items-center gap-4 py-2">
                  <span className="text-table">{a.scale}</span>
                  <div className="relative h-2.5 rounded-full" style={{ background: "var(--grid)" }}>
                    {a.value !== null && (
                      <>
                        <div
                          className="absolute inset-y-0 left-0 rounded-full"
                          style={{ width: `${a.value}%`, background: colorAt(a.value) }}
                        />
                        <div
                          className="absolute inset-y-[-3px] w-px"
                          style={{ left: "50%", background: "var(--axis)" }}
                        />
                      </>
                    )}
                  </div>
                  <span className="tabular text-table text-right">
                    {a.value === null ? "—" : Math.round(a.value)}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-axis text-ink-muted mt-3">
              가운데 선이 50입니다. 모든 문항에 &ldquo;보통&rdquo;으로 답했을 때의 값입니다.
            </p>
          </section>

          <section className="mb-14">
            <div className="mb-4 flex items-baseline justify-between border-b border-[--border] pb-2">
              <h2 className="text-section-title">가장 뚜렷한 관련</h2>
              <Link href="/admin/stats" className="text-table text-ink-secondary underline">
                통계 자세히 보기
              </Link>
            </div>

            {!matrix.enough ? (
              <>
                <WarningBadge kind="smallSample" />
                <p className="text-ink-secondary mt-3">
                  응시 완료 {matrix.n}명입니다. {MIN_N}명이 넘어야 사내 관련도를 보여드립니다.
                </p>
              </>
            ) : top.length === 0 ? (
              <p className="text-ink-secondary">
                신뢰구간이 0을 벗어나는 조합이 아직 없습니다. 사람이 더 모여야 합니다.
              </p>
            ) : (
              <>
                <ul className="max-w-2xl">
                  {top.map(({ scale, axis, c }) => (
                    <li
                      key={`${scale}-${axis}`}
                      className="flex items-baseline justify-between border-b border-[--border] py-3 last:border-0"
                    >
                      <span>
                        {scale} <span className="text-ink-muted">×</span> {axis}
                      </span>
                      <span className="tabular">
                        <span className="font-medium">{formatR(c!.r)}</span>
                        <span className="text-ink-muted text-axis ml-3">
                          n={c!.n} · {formatR(c!.ci[0])}~{formatR(c!.ci[1])}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="text-axis text-ink-muted mt-3 max-w-[44rem]">
                  신뢰구간이 0을 벗어난 조합만 골라 절댓값 순으로 셋입니다. 이 화면은
                  요약이고, 표 전체와 점 분포는 분석 화면에서 봅니다.
                </p>
              </>
            )}
          </section>
        </>
      )}

      <section>
        <h2 className="text-section-title mb-4 border-b border-[--border] pb-2">바로 가기</h2>
        <div className="flex flex-wrap gap-x-8 gap-y-2">
          <Link href="/admin/employees" className="text-table underline">
            구성원 목록
          </Link>
          <Link href="/admin/stats" className="text-table underline">
            분석
          </Link>
          <Link href="/admin/stats?tab=reliability" className="text-table underline">
            검사 신뢰도
          </Link>
        </div>
      </section>
    </>
  );
}

function Tile({
  label,
  value,
  hint,
}: {
  label: string;
  value: number | string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl p-6" style={{ background: "var(--wash)" }}>
      <p className="text-axis text-ink-secondary">{label}</p>
      <p className="mt-1 text-4xl font-semibold">{value}</p>
      {hint && <p className="text-axis text-ink-muted mt-2">{hint}</p>}
    </div>
  );
}
