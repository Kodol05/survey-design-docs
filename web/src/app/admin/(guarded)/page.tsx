import Link from "next/link";
import { WarningBadge } from "@/components/ui/WarningBadge";
import { colorAt } from "@/components/charts/scale";
import { CompletionTrend } from "@/components/charts/CompletionTrend";
import { ratingProgress } from "@/lib/admin/ratings";
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

export const metadata = { title: "대시보드 — 관리자" };

export default async function AdminHome() {
  const [rating, s, people, reliability, trend] = await Promise.all([
    ratingProgress(),
    loadSummary(),
    loadPeople(),
    loadReliability(),
    loadCompletionByDate(),
  ]);
  const matrix = traitAbilityMatrix(people);

  const alphas = reliability
    .map((r) => r.alpha)
    .filter((a): a is number => a !== null);
  const meanAlpha = alphas.length
    ? alphas.reduce((a, b) => a + b, 0) / alphas.length
    : null;
  const poorScales = reliability.filter((r) => r.verdict === "poor");

  // 어느 축에서 사람이 갈리는가.
  //
  // 평균은 쓰지 않는다 — 눈금 자체가 문항 가운데를 50으로 잡은 것이라
  // 비교할 바깥 기준이 없고, 어느 축이든 거의 50 근처로 나온다.
  // 반면 **퍼진 정도**는 우리 회사 사람들을 실제로 가르는 축이 무엇인지 말해준다.
  type Spread = { scale: string; sd: number; lo: number; hi: number };
  const spread: Spread[] = [];
  for (const scale of TRAIT_SCALES) {
    const vs = people
      .map((p) => p.traits[scale])
      .filter((v) => typeof v === "number");
    if (vs.length < 2) continue;
    const m = vs.reduce((a, b) => a + b, 0) / vs.length;
    const sd = Math.sqrt(
      vs.reduce((acc, v) => acc + (v - m) ** 2, 0) / (vs.length - 1),
    );
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
          value={meanAlpha === null ? "—" : meanAlpha.toFixed(2)}
          href="/admin/stats?tab=reliability"
          hint={
            poorScales.length
              ? `${poorScales.length}개 척도가 ${ALPHA.poor} 아래`
              : "척도 평균 α"
          }
        />
      </div>

      {/*
        대표님 평가 안내 — **잠그지 않고 알리기만 한다 (D-41).**

        전에는 여기가 국면 전환 자리였다. 평가가 끝나기 전에는 결과 화면을
        아예 막았고 되돌릴 수도 없었다. 걱정은 맞지만 방식이 값을 못 치렀다 —
        화면 절반이 잠긴 채로 운영해야 했고, 한 번 열면 끝이었다.

        지금은 남은 인원만 알리고 왜 먼저 매기는 게 나은지 한 줄 적는다.
        다 매겼으면 이 자리는 아예 사라진다 — 할 일이 없는데 자리를
        차지하고 있으면 그것도 소음이다.
      */}
      {rating.done < rating.total && (
        <section className="mb-14">
          <h2 className="text-section-title mb-4 border-b border-[--border] pb-2">
            대표님 평가
          </h2>
          <p className="text-ink-secondary mb-3 max-w-[56rem]">
            <strong className="text-ink tabular">
              {rating.total - rating.done}명
            </strong>
            이 아직 남았습니다.{" "}
            <span className="tabular text-ink-muted">
              {rating.done} / {rating.total}명 · {rating.cells} /{" "}
              {rating.cellTotal}칸
            </span>
          </p>
          <p className="text-axis text-ink-muted mb-5 max-w-[56rem]">
            <strong>결과를 보시기 전에 매기는 편이 낫습니다.</strong> 결과를
            먼저 보면 그 인상이 섞여서, 본인 답과 맞대 보는 의미가 줄어듭니다.
            막아 두지는 않았으니 순서는 알아서 정하시면 됩니다.
          </p>
          <Link
            href="/admin/ratings"
            className="inline-flex h-13 items-center rounded-lg px-6 font-medium"
            style={{ background: "var(--series-1)", color: "#fff" }}
          >
            평가하러 가기 →
          </Link>
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
              <span className="text-axis text-ink-muted">
                {trend.length}일째
              </span>
            )}
          </div>
          <CompletionTrend points={trend} />
        </section>

        {/* ── 우상 · 관련 ── */}
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

        {/* ── 좌하 · 분포 ── */}
        <section>
          <div className="mb-4 flex items-baseline justify-between border-b border-[--border] pb-2">
            <h2 className="text-section-title">사람이 갈리는 축</h2>
            <span className="text-axis text-ink-muted">{people.length}명</span>
          </div>

          <ul>
            {spread.map((x) => (
              <li
                key={x.scale}
                className="grid grid-cols-[4rem_1fr_3rem] items-center gap-3 py-2.5 sm:grid-cols-[5rem_1fr_4rem] sm:gap-4"
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
            가장 낮은 사람부터 가장 높은 사람까지의 폭입니다. 넓게 퍼진 축일수록
            우리 회사 사람들을 실제로 가릅니다. 좁은 축은 다들 비슷해서 그
            축으로는 사람을 구분하기 어렵습니다.
          </p>
          <p className="text-axis text-ink-muted mt-2">
            평균은 두지 않았습니다. 눈금 자체가 문항 가운데를 50으로 잡은 것이라
            비교할 바깥 기준이 없고, 어느 축이든 거의 50 근처로 나옵니다.
          </p>
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
                  문항이 아직 안 맞물리는 척도 — {poorNames.join(", ")}{" "}
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
            href="/admin/stats?tab=reliability"
            title="검사 신뢰도"
            lines={[
              meanAlpha === null
                ? "아직 계산할 수 없습니다"
                : `척도 평균 α ${meanAlpha.toFixed(2)}`,
              poorScales.length
                ? `기준 아래 척도 ${poorScales.length}개 — ${poorScales.map((r) => r.scale).join(" · ")}`
                : "기준 아래 척도 없음",
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
 * 숫자 타일 — `href`를 주면 누를 수 있다.
 *
 * 숫자만 보여주고 끝내면 "37명이 했다는데 누구지?"에서 화면을 다시 뒤져야
 * 한다. 세는 자리에서 바로 명단으로 넘어가는 것이 자연스럽다.
 * 분석 화면의 타일과 같은 규칙을 쓴다.
 */
function Tile({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: number | string;
  hint?: string;
  href?: string;
}) {
  const body = (
    <>
      <p className="text-axis text-ink-secondary">{label}</p>
      <p className="mt-1 text-5xl font-semibold">{value}</p>
      {hint && (
        <p className="text-axis text-ink-muted mt-2">
          {hint}
          {href && <span aria-hidden> →</span>}
        </p>
      )}
    </>
  );
  const style = { background: "var(--wash)" };
  return href ? (
    <Link
      href={href}
      className="block rounded-xl p-6 transition hover:brightness-95"
      style={style}
    >
      {body}
    </Link>
  ) : (
    <div className="rounded-xl p-6" style={style}>
      {body}
    </div>
  );
}
