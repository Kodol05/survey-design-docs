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

  // 어느 축에서 사람이 갈리는가.
  //
  // 평균은 쓰지 않는다 — 눈금 자체가 문항 가운데를 50으로 잡은 것이라
  // 비교할 바깥 기준이 없고, 어느 축이든 거의 50 근처로 나온다.
  // 반면 **퍼진 정도**는 우리 회사 사람들을 실제로 가르는 축이 무엇인지 말해준다.
  type Spread = { scale: string; sd: number; lo: number; hi: number };
  const spread: Spread[] = [];
  for (const scale of TRAIT_SCALES) {
    const vs = people.map((p) => p.traits[scale]).filter((v) => typeof v === "number");
    if (vs.length < 2) continue;
    const m = vs.reduce((a, b) => a + b, 0) / vs.length;
    const sd = Math.sqrt(vs.reduce((acc, v) => acc + (v - m) ** 2, 0) / (vs.length - 1));
    spread.push({ scale, sd, lo: Math.min(...vs), hi: Math.max(...vs) });
  }
  spread.sort((a, b) => b.sd - a.sd);
  const maxSd = spread[0]?.sd ?? 1;

  // 지금 손봐야 할 것
  const needsReview = people.filter((p) => p.quality !== "ok");
  const poorNames = poorScales.map((r) => r.scale);

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

      {(needsReview.length > 0 || poorNames.length > 0 || s.inProgress > 0) && (
        <section className="mb-14">
          <h2 className="text-section-title mb-4 border-b border-[--border] pb-2">
            지금 볼 것
          </h2>
          <ul className="flex flex-col gap-3">
            {needsReview.length > 0 && (
              <li>
                <span className="mr-2" style={{ color: "var(--status-warn)" }}>
                  ●
                </span>
                응답 품질 검토가 필요한 사람 {needsReview.length}명 —{" "}
                <span className="text-ink-secondary">
                  {needsReview.slice(0, 6).map((p) => p.name).join(", ")}
                  {needsReview.length > 6 && ` 외 ${needsReview.length - 6}명`}
                </span>{" "}
                <Link href="/admin/employees" className="underline">
                  목록
                </Link>
              </li>
            )}
            {poorNames.length > 0 && (
              <li>
                <span className="mr-2" style={{ color: "var(--status-critical)" }}>
                  ●
                </span>
                문항이 아직 안 맞물리는 척도 — {poorNames.join(", ")}{" "}
                <Link href="/admin/stats?tab=reliability" className="underline">
                  신뢰도 보기
                </Link>
              </li>
            )}
            {s.inProgress > 0 && (
              <li>
                <span className="text-ink-muted mr-2">●</span>
                응시를 시작하고 끝내지 않은 사람 {s.inProgress}명
              </li>
            )}
          </ul>
        </section>
      )}

      {open && (
        <>
          <section className="mb-14">
            <div className="mb-4 flex items-baseline justify-between border-b border-[--border] pb-2">
              <h2 className="text-section-title">사람이 갈리는 축</h2>
              <span className="text-axis text-ink-muted">{people.length}명</span>
            </div>

            <ul className="max-w-3xl">
              {spread.map((x) => (
                <li
                  key={x.scale}
                  className="grid grid-cols-[7rem_1fr_5.5rem] items-center gap-5 py-2.5"
                >
                  <span className="text-table">{x.scale}</span>
                  {/* 가장 낮은 사람부터 가장 높은 사람까지의 폭 */}
                  <div className="relative h-3">
                    <div
                      className="absolute inset-y-1 left-0 right-0 rounded-full"
                      style={{ background: "var(--grid)" }}
                    />
                    <div
                      className="absolute inset-y-0 rounded-full"
                      style={{
                        left: `${x.lo}%`,
                        width: `${Math.max(2, x.hi - x.lo)}%`,
                        background: `linear-gradient(90deg, ${colorAt(x.lo)}, ${colorAt(x.hi)})`,
                        opacity: 0.35 + 0.65 * (x.sd / maxSd),
                      }}
                    />
                    <div
                      className="absolute inset-y-[-2px] w-px"
                      style={{ left: "50%", background: "var(--axis)" }}
                    />
                  </div>
                  <span className="tabular text-axis text-ink-secondary text-right">
                    {Math.round(x.lo)}–{Math.round(x.hi)}
                  </span>
                </li>
              ))}
            </ul>

            <p className="text-table text-ink-muted mt-4 max-w-[46rem]">
              가장 낮은 사람부터 가장 높은 사람까지의 폭입니다. 넓게 퍼진 축일수록 우리
              회사 사람들을 실제로 가릅니다. 좁은 축은 다들 비슷해서 그 축으로는 사람을
              구분하기 어렵습니다.
            </p>
            <p className="text-axis text-ink-muted mt-2 max-w-[46rem]">
              평균은 두지 않았습니다. 눈금 자체가 문항 가운데를 50으로 잡은 것이라 비교할
              바깥 기준이 없고, 어느 축이든 거의 50 근처로 나옵니다.
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
