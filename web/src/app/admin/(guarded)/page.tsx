import Link from "next/link";
import { WarningBadge } from "@/components/ui/WarningBadge";
import { colorAt } from "@/components/charts/scale";
import { CompletionTrend } from "@/components/charts/CompletionTrend";
import { getAppState } from "@/lib/admin/phase";
import { loadCompletionByDate, loadSummary } from "@/lib/admin/summary";
import {
  cellOf,
  loadPeople,
  loadReliability,
  traitAbilityMatrix,
} from "@/lib/admin/analysis";
import { ALPHA } from "@/lib/admin/stats";
import { ABILITY_AXES, TRAIT_SCALES } from "@/lib/items/types";
import { MIN_N } from "@/components/ui/NBadge";
import { TopRelations, type Relation } from "./TopRelations";
import { OpenResultsButton } from "./OpenResultsButton";

export const metadata = { title: "대시보드 — 관리자" };

export default async function AdminHome() {
  const [state, s, people, reliability, trend] = await Promise.all([
    getAppState(),
    loadSummary(),
    loadPeople(),
    loadReliability(),
    loadCompletionByDate(),
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

  /*
    가장 뚜렷한 관련 — **자르지 않고 다 넘긴다.**

    전에는 상위 셋에서 끊었는데, 넷째가 셋째와 거의 같은 값이면 끊긴 자리를
    모르는 채로 셋만 특별해 보인다. 화면에서 세 개씩 넘겨 보게 하고
    전체 개수를 같이 보여준다.

    거르는 기준은 그대로다 — **신뢰구간이 0을 벗어난 조합만.** 방향조차
    확정 안 된 것을 "뚜렷한 관련"이라 부를 수는 없다.
  */
  const top: Relation[] = TRAIT_SCALES.flatMap((scale) =>
    ABILITY_AXES.map((axis) => ({ scale, axis, c: cellOf(matrix, scale, axis) })),
  )
    .filter((x) => x.c && !(x.c.ci[0] <= 0 && x.c.ci[1] >= 0))
    .sort((a, b) => Math.abs(b.c!.r) - Math.abs(a.c!.r))
    .map((x) => ({
      scale: x.scale,
      axis: x.axis,
      r: x.c!.r,
      n: x.c!.n,
      ci: x.c!.ci,
    }));

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

      {/* 국면 — 열기 전에는 이게 가장 위에 와야 한다. 열린 뒤에는 한 줄이면 된다. */}
      {open ? (
        <p className="text-table text-ink-secondary mb-14 border-b border-[--border] pb-4">
          결과가 공개되어 있습니다.
          {state.openedAt && (
            <span className="text-ink-muted ml-2">
              {state.openedAt.toLocaleString("ko-KR")}에 열렸습니다.
            </span>
          )}
        </p>
      ) : (
        <section className="mb-14">
          <h2 className="text-section-title mb-4 border-b border-[--border] pb-2">
            평가·결과 국면
          </h2>
          <p className="text-ink-secondary mb-4 max-w-[56rem]">
            지금은 <strong>평가 수집 중</strong>입니다. 대표님 평가가 끝나기 전에는
            결과를 볼 수 없습니다. 결과를 먼저 보면 그 인상이 섞여서 대조하는 의미가
            없어지기 때문입니다.
          </p>
          <p className="text-axis text-ink-muted mb-5">
            응시 현황과 응답 품질, 문항 목록은 지금도 보실 수 있습니다.
          </p>
          <OpenResultsButton completed={s.completed} />
        </section>
      )}

      {/*
        네 자리로 나눈다.

          왼쪽 위   응시 흐름          오른쪽 위   가장 뚜렷한 관련
          왼쪽 아래 사람이 갈리는 축   오른쪽 아래 지금 볼 것

        **결과 해석을 위로 올려 뒀다.** 처음에는 오른쪽 위가 「지금 볼 것」이었는데,
        그건 손볼 거리(품질 검토·미완료)라 화면을 열자마자 잡일부터 보게 됐다.
        이 화면을 여는 이유는 사람을 아는 것이므로 관련이 먼저 온다. 할 일 목록은
        짧고 링크로 넘어가는 것이라 아래에 있어도 놓치지 않는다.

        오른쪽 두 칸은 결과가 열렸을 때만 찬다. 아직 수집 중이면 오른쪽 위가
        비므로 「지금 볼 것」이 자연스럽게 위로 올라온다 — 그때는 그게 맞다.

        테두리를 두르지 않는다 (11 §2 — 감싸는 테두리는 쓰지 않음).
        구분은 열 간격(64px)과 제목 아래 가는 선으로만 한다.
      */}
      <div className="mb-14 grid gap-x-16 gap-y-14 lg:grid-cols-2">
        {/* ── 좌상 · 흐름 ── */}
        <section>
          <div className="mb-4 flex items-baseline justify-between border-b border-[--border] pb-2">
            <h2 className="text-section-title">날짜별 누적 완료</h2>
            {trend.length > 0 && (
              <span className="text-axis text-ink-muted">{trend.length}일째</span>
            )}
          </div>
          <CompletionTrend points={trend} />
          {trend.length > 0 && (
            <p className="text-axis text-ink-muted mt-3">
              평평한 구간은 아무도 응시하지 않은 기간입니다. 끝이 평평하면 지금 멈춰 있다는
              뜻입니다.
            </p>
          )}
        </section>

        {/* ── 우상 · 관련 ── */}
        {open && (
          <section>
            <div className="mb-4 flex items-baseline justify-between border-b border-[--border] pb-2">
              <h2 className="text-section-title">가장 뚜렷한 관련</h2>
              <Link href="/admin/stats" className="text-table text-ink-secondary underline">
                자세히
              </Link>
            </div>

            {!matrix.enough ? (
              <>
                <WarningBadge kind="smallSample" />
                <p className="text-ink-secondary mt-3">
                  응시 완료 {matrix.n}명입니다. {MIN_N}명이 넘어야 사내 관련도를 보여드립니다.
                </p>
              </>
            ) : (
              <>
                <TopRelations items={top} />

                <div className="mt-4 flex flex-col gap-2">
                  <WarningBadge kind="multipleComparison" />
                  <p className="text-axis text-ink-muted">
                    <strong className="text-ink-secondary">같이 움직인다는 뜻이지, 한쪽이
                    원인이라는 뜻은 아닙니다.</strong> 21개 조합 중 값이 0을 확실히 벗어난
                    것만 센 것이고, 표 전체와 점 분포는 분석 화면에서 봅니다.
                  </p>
                </div>
              </>
            )}
          </section>
        )}
        {/* ── 좌하 · 분포 ── */}
        {open && (
          <section>
            <div className="mb-4 flex items-baseline justify-between border-b border-[--border] pb-2">
              <h2 className="text-section-title">사람이 갈리는 축</h2>
              <span className="text-axis text-ink-muted">{people.length}명</span>
            </div>

            <ul>
              {spread.map((x) => (
                <li
                  key={x.scale}
                  className="grid grid-cols-[5rem_1fr_4rem] items-center gap-4 py-2.5"
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

            <p className="text-table text-ink-muted mt-4">
              가장 낮은 사람부터 가장 높은 사람까지의 폭입니다. 넓게 퍼진 축일수록 우리
              회사 사람들을 실제로 가릅니다. 좁은 축은 다들 비슷해서 그 축으로는 사람을
              구분하기 어렵습니다.
            </p>
            <p className="text-axis text-ink-muted mt-2">
              평균은 두지 않았습니다. 눈금 자체가 문항 가운데를 50으로 잡은 것이라 비교할
              바깥 기준이 없고, 어느 축이든 거의 50 근처로 나옵니다.
            </p>
          </section>
        )}

        {/* ── 우하 · 지금 할 일 ── */}
        <section>
          <h2 className="text-section-title mb-4 border-b border-[--border] pb-2">
            지금 볼 것
          </h2>
          {needsReview.length === 0 && poorNames.length === 0 && s.inProgress === 0 ? (
            <p className="text-ink-muted text-table">
              손볼 것이 없습니다. 품질 미달 응답도, 끝내지 않은 사람도 없습니다.
            </p>
          ) : (
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
          )}
        </section>
      </div>

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
      <p className="mt-1 text-5xl font-semibold">{value}</p>
      {hint && <p className="text-axis text-ink-muted mt-2">{hint}</p>}
    </div>
  );
}
