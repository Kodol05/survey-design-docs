import Link from "next/link";
import { Tile } from "@/components/ui/Tile";
import { WarningBadge } from "@/components/ui/WarningBadge";
import { Attendance } from "@/components/charts/Attendance";
import { ratingProgress } from "@/lib/admin/ratings";
import { ButtonLink } from "@/components/ui/Button";
import { loadAttendance, loadSummary } from "@/lib/admin/summary";
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

export const metadata = { title: "대시보드 — 관리자" };

export default async function AdminHome() {
  const [rating, s, people, reliability, attendance] = await Promise.all([
    ratingProgress(),
    loadSummary(),
    loadPeople(),
    loadReliability(),
    loadAttendance(),
  ]);
  const matrix = traitAbilityMatrix(people);

  /*
    α는 **성향 7축만** 센다 (2026-08-25 사용자 결정). 직무능력은 여러 요소가
    모여 이루는 값이라 α로 판정할 척도가 아니다 (D-92·D-93).
  */
  const traitAlphas = reliability.filter((r) => r.kind === "trait");
  const alphas = traitAlphas
    .map((r) => r.alpha)
    .filter((a): a is number => a !== null);
  const meanAlpha = alphas.length
    ? alphas.reduce((a, b) => a + b, 0) / alphas.length
    : null;
  const poorScales = traitAlphas.filter((r) => r.verdict === "poor");

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
    ABILITY_AXES.map((axis) => ({
      scale,
      axis,
      c: cellOf(matrix, scale, axis),
    })),
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
        <Tile
          label="응시 완료"
          value={s.completed}
          href="/admin/employees?status=completed"
          hint="누가 했는지 보기"
        />
        <Tile
          label="진행 중"
          value={s.inProgress}
          href="/admin/employees?status=inprogress"
          hint={s.inProgress ? "누구인지 보기" : undefined}
        />
        <Tile
          label="검토가 필요한 응답"
          value={s.quality.review + s.quality.poor}
          href="/admin/employees?flag=review"
          hint={
            s.quality.poor ? `그중 ${s.quality.poor}건은 낮음` : "누구인지 보기"
          }
        />
        <Tile
          label="검사 신뢰도"
          value={meanAlpha === null ? "—" : fmtAlpha(meanAlpha)}
          href="/admin/stats?tab=reliability"
          hint={
            poorScales.length
              ? `${poorScales.length}개 축이 ${fmtAlpha(ALPHA.poor)} 아래`
              : "성향 7축 평균 α"
          }
        />
      </div>

      {/*
        **네 칸만 둔다** (2026-08-25 사용자 결정).

          왼쪽 위   대표님 평가      오른쪽 위   응시 현황
          왼쪽 아래 가장 뚜렷한 관련  오른쪽 아래 지금 볼 것

        전에는 격자 **위에 대표님 평가가 통째로 한 줄**을 차지하고 있었고,
        격자 안에는 「사람이 갈리는 축」이 있었다.

        위 한 줄을 뺀 이유 — 그 자리는 **다 매기고 나면 사라지는 자리**라
        화면이 두 가지 모양을 갖게 된다. 격자 안으로 넣으면 채워지든 비든
        배치가 그대로다.

        「사람이 갈리는 축」을 뺀 이유 — 최소~최대 폭만 그려서 **폭이 같아도
        모양이 다른 축을 구분하지 못했다.** 그 물음의 제대로 된 답은
        분석의 「분포」 탭에 있다(D-54).

        위 두 칸이 **지금 할 일**, 아래 두 칸이 **읽을 것**이다.

        테두리를 두르지 않는다 (11 §2). 구분은 열 간격과 제목 아래 선으로만.
      */}
      <div className="mb-14 grid gap-x-16 gap-y-14 lg:grid-cols-2">
        {/* ── 좌상 · 대표님 평가 ── */}
        <section>
          <div className="mb-4 flex items-baseline justify-between border-b border-[--border] pb-2">
            <h2 className="text-section-title">대표님 평가</h2>
            <span className="text-axis text-ink-muted tabular">
              {rating.done} / {rating.total}명
            </span>
          </div>

          {rating.done >= rating.total ? (
            <>
              <p className="text-ink-secondary mb-4">
                <strong className="text-ink">다 매기셨습니다.</strong> 본인 답과
                맞대 본 결과는 분석의 「평가 대조」에 있습니다.
              </p>
              <ButtonLink href="/admin/stats?tab=agreement" variant="secondary">
                평가 대조 보기 →
              </ButtonLink>
            </>
          ) : (
            <>
              <p className="text-ink-secondary mb-3">
                <strong className="text-ink tabular">
                  {rating.total - rating.done}명
                </strong>
                이 아직 남았습니다.{" "}
                <span className="tabular text-ink-muted">
                  {rating.cells} / {rating.cellTotal}칸
                </span>
              </p>
              <p className="text-axis text-ink-muted mb-5 max-w-[34rem]">
                <strong>결과를 보시기 전에 매기는 편이 낫습니다.</strong> 결과를
                먼저 보면 그 인상이 섞입니다. 막아 두지는 않았습니다.
              </p>
              <ButtonLink href="/admin/ratings" size="lg">
                평가하러 가기 →
              </ButtonLink>
            </>
          )}
        </section>

        {/* ── 우상 · 응시 현황 ── */}
        <section>
          <div className="mb-4 flex items-baseline justify-between border-b border-[--border] pb-2">
            <h2 className="text-section-title">응시 현황</h2>
            <span className="text-axis text-ink-muted">한 칸이 한 사람</span>
          </div>
          <Attendance people={attendance} />
        </section>

        {/* ── 좌하 · 관련 ── */}
        <section>
          <div className="mb-4 flex items-baseline justify-between border-b border-[--border] pb-2">
            <h2 className="text-section-title">가장 뚜렷한 관련</h2>
            <Link
              href="/admin/stats"
              className="text-table text-ink-secondary underline"
            >
              자세히
            </Link>
          </div>

          {!matrix.enough ? (
            <>
              <WarningBadge kind="smallSample" />
              <p className="text-ink-secondary mt-3">
                응시 완료 {matrix.n}명입니다. {MIN_N}명이 넘어야 사내 관련도를
                보여드립니다.
              </p>
            </>
          ) : (
            /*
              경고 배지와 두 문장을 뺐다 (2026-08-24 사용자 요청).
              **같은 말이 분석 화면에 그대로 있다** — 첫 화면은 훑는 자리라
              읽을 것이 적어야 한다. 「자세히」로 넘어가면 거기서 다시 만난다.
            */
            <TopRelations items={top} />
          )}
        </section>

        {/* ── 우하 · 지금 할 일 ── */}
        <section>
          <h2 className="text-section-title mb-4 border-b border-[--border] pb-2">
            지금 볼 것
          </h2>
          {needsReview.length === 0 &&
          poorNames.length === 0 &&
          s.inProgress === 0 ? (
            <p className="text-ink-muted text-table">
              손볼 것이 없습니다. 신뢰도가 낮은 응답도, 끝내지 않은 사람도
              없습니다.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {needsReview.length > 0 && (
                <li>
                  <span
                    className="mr-2"
                    style={{ color: "var(--status-warn)" }}
                  >
                    ●
                  </span>
                  응답 신뢰도를 확인할 사람 {needsReview.length}명 —{" "}
                  <span className="text-ink-secondary">
                    {needsReview
                      .slice(0, 6)
                      .map((p) => p.name)
                      .join(", ")}
                    {needsReview.length > 6 &&
                      ` 외 ${needsReview.length - 6}명`}
                  </span>{" "}
                  <Link href="/admin/employees" className="underline">
                    목록
                  </Link>
                </li>
              )}
              {poorNames.length > 0 && (
                <li>
                  <span
                    className="mr-2"
                    style={{ color: "var(--status-critical)" }}
                  >
                    ●
                  </span>
                  문항이 아직 안 맞물리는 성향 축 — {poorNames.join(", ")}{" "}
                  <Link
                    href="/admin/stats?tab=reliability"
                    className="underline"
                  >
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

      {/*
        바로 가기 — **밑줄 친 낱말 세 개**였다. 어디로 가는지는 알겠는데
        가서 무엇을 볼지 모르니 누를 이유가 없었다.

        지금은 각 칸이 **그 화면의 지금 상태를 한 줄로 미리 보여준다.**
        볼 것이 있는 칸만 눌러도 되니 화면을 헤매지 않는다.
      */}
      <section>
        <h2 className="text-section-title mb-4 border-b border-[--border] pb-2">
          바로 가기
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Shortcut
            href="/admin/employees"
            title="구성원 목록"
            lines={[
              `${s.completed}명 완료 · ${s.inProgress}명 진행 중`,
              needsReview.length
                ? `검토가 필요한 응답 ${needsReview.length}명`
                : "검토가 필요한 응답 없음",
            ]}
          />
          <Shortcut
            href="/admin/stats"
            title="분석"
            lines={[
              matrix.enough
                ? `성향 7축 × 직무능력 3축 · ${matrix.n}명`
                : `${MIN_N}명이 넘어야 열립니다 (지금 ${matrix.n}명)`,
              top.length
                ? `값이 0을 확실히 벗어난 조합 ${top.length}개`
                : "아직 확정된 조합 없음",
            ]}
          />
          <Shortcut
            href="/admin/stats?tab=spread"
            title="분포"
            lines={[
              "각 축에서 사람들이 어떻게 퍼져 있는지 봅니다",
              "점 하나가 한 사람 · 몰린 축과 갈린 축을 가릅니다",
            ]}
          />
          <Shortcut
            href="/admin/stats?tab=reliability"
            title="검사 신뢰도"
            lines={[
              meanAlpha === null
                ? "아직 계산할 수 없습니다"
                : `성향 7축 평균 α ${fmtAlpha(meanAlpha)}`,
              poorScales.length
                ? `기준 아래 축 ${poorScales.length}개 — ${poorScales.map((r) => r.scale).join(" · ")}`
                : "기준 아래 축 없음",
            ]}
          />
          <Shortcut
            href="/admin/stats?tab=agreement"
            title="평가 대조"
            lines={[
              "본인 답과 대표님이 보시는 것을 맞대 봅니다",
              "크게 갈리는 사람이 이름으로 나옵니다",
            ]}
          />
          <Shortcut
            href="/admin/stats?tab=prediction"
            title="예측 대 실제"
            lines={[
              "논문 값으로 본 예측과 실제를 맞대 봅니다",
              "누가 예측보다 높고 낮은지 이름으로 나옵니다",
            ]}
          />
          <Shortcut
            href="/admin/items"
            title="문항 목록"
            lines={[
              "실제로 나가는 114문항을 그대로 봅니다",
              "역채점 여부와 묶음 순서까지",
            ]}
          />
          <Shortcut
            href="/admin/ratings"
            title="대표님 평가"
            lines={[
              `${rating.done} / ${rating.total}명 · ${rating.cells} / ${rating.cellTotal}칸`,
              rating.done >= rating.total
                ? "다 매기셨습니다"
                : `${rating.total - rating.done}명 남았습니다`,
            ]}
          />
        </div>
      </section>
    </>
  );
}

/**
 * 바로 가기 한 칸 — 제목 + 그 화면의 지금 상태 두 줄.
 *
 * 링크만 있으면 "가서 뭘 보지?"가 남는다. 숫자를 미리 보여주면
 * **볼 것이 있는 칸만 눌러도 된다.**
 */
function Shortcut({
  href,
  title,
  lines,
}: {
  href: string;
  title: string;
  lines: string[];
}) {
  return (
    <Link
      href={href}
      className="block rounded-xl p-5 transition hover:brightness-95"
      style={{ background: "var(--wash)" }}
    >
      <p className="text-table font-medium">
        {title}
        <span aria-hidden className="text-ink-muted ml-2">
          →
        </span>
      </p>
      {lines.map((l) => (
        <p key={l} className="text-axis text-ink-secondary mt-1 leading-snug">
          {l}
        </p>
      ))}
    </Link>
  );
}


/**
 * α 표기 — **앞의 0을 뗀다.**
 *
 * 화면 다른 곳에서 상관을 `+.44`로 적는다. 같은 「0과 1 사이 값」인데
 * 여기만 `0.77`이면 눈이 두 가지 표기를 오간다.
 */
const fmtAlpha = (a: number) => a.toFixed(2).replace(/^0/, "");
