import Link from "next/link";
import { Tile } from "@/components/ui/Tile";
import { WarningBadge } from "@/components/ui/WarningBadge";
import { ButtonLink } from "@/components/ui/Button";
import { MIN_N } from "@/components/ui/NBadge";
import { Attendance } from "@/components/charts/Attendance";
import { ALPHA } from "@/lib/admin/stats";
import { requireAdmin } from "@/lib/auth/guard";
import { formatRatio } from "@/components/analysis/correlationColor";
import { EXPECTED } from "@/lib/items/types";
import { loadDashboard } from "@/lib/admin/dashboard";
import { INTERVAL_HOURS, KEEP_COUNT, type Backup } from "@/lib/admin/backup";
import { TopRelations } from "./TopRelations";

export const metadata = { title: "대시보드 — 관리자" };

export default async function AdminHome() {
  /*
    ⚠️ **레이아웃의 `requireAdmin`만 믿으면 안 된다** (2026-08-26 발견).

    App Router는 레이아웃과 화면을 **동시에** 그린다. 레이아웃이 로그인
    화면으로 보내기로 정하는 동안 이 화면은 이미 DB를 읽고 결과를 흘려보낸다.
    브라우저는 로그인 화면으로 넘어가지만 **데이터는 이미 나간 뒤**다 —
    `curl http://…/admin` 한 번에 사람 이름과 사원 ID가 그대로 나왔다.

    관리자 화면 여덟 곳 중 여기만 스스로 부르지 않고 있었다. 화면마다
    자기 자물쇠를 건다.
  */
  await requireAdmin();

  /*
    읽고 세는 일은 `lib/admin/dashboard.ts`가 한다 (2026-08-25 분리).
    여기는 **받은 것을 그리기만** 한다.
  */
  const {
    rating,
    summary: s,
    attendance,
    matrix,
    alpha,
    relations: top,
    needsReview,
    backups,
    backupAgeHours,
  } = await loadDashboard();
  const { mean: meanAlpha, poor: poorScales } = alpha;
  const poorNames = poorScales.map((r) => r.scale);

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
          value={meanAlpha === null ? "—" : formatRatio(meanAlpha)}
          href="/admin/stats?tab=reliability"
          hint={
            poorScales.length
              ? `${poorScales.length}개 축이 ${formatRatio(ALPHA.poor)} 아래`
              : "성향 7축 평균 α · 1.00 에 가까울수록 좋음"
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
            <ul className="flex flex-col gap-1">
              {needsReview.length > 0 && (
                <TodoItem
                  href="/admin/employees?flag=review"
                  color="var(--status-warn)"
                  headline={`응답 신뢰도를 확인할 사람 ${needsReview.length}명`}
                  detail={
                    needsReview
                      .slice(0, 6)
                      .map((p) => p.name)
                      .join(", ") +
                    (needsReview.length > 6
                      ? ` 외 ${needsReview.length - 6}명`
                      : "")
                  }
                />
              )}
              {poorNames.length > 0 && (
                <TodoItem
                  href="/admin/stats?tab=reliability"
                  color="var(--status-critical)"
                  headline="문항이 아직 안 맞물리는 성향 축"
                  detail={poorNames.join(", ")}
                />
              )}
              {s.inProgress > 0 && (
                <TodoItem
                  href="/admin/employees?status=inprogress"
                  color="var(--ink-muted)"
                  headline={`응시를 시작하고 끝내지 않은 사람 ${s.inProgress}명`}
                  detail="시작한 지 14일이 지나면 중단으로 정리됩니다"
                />
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
                : `성향 7축 평균 α ${formatRatio(meanAlpha)}`,
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
              `실제로 나가는 ${EXPECTED.total}문항을 그대로 봅니다`,
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

      {/*
        백업 — **바로 가기 아래**에 둔다.

        평소에 볼 것이 아니라 「마지막이 언제였나」만 확인하면 되는 칸이라
        위쪽 숫자 타일에 끼워 넣지 않았다. 다만 **아무 표시도 없으면 백업이
        멈춰도 아무도 모른다** — 그래서 시각은 늘 보이게 둔다.
      */}
      <section className="mt-14">
        <h2 className="text-section-title mb-4 border-b border-[--border] pb-2">
          데이터 백업
        </h2>
        <BackupCard backups={backups} hours={backupAgeHours} />
      </section>
    </>
  );
}

/**
 * 백업 칸.
 *
 * ## 왜 받는 쪽을 강조하는가
 *
 * 서버 안 덤프는 **디스크가 죽는 경우를 못 막는다** — 백업도 같이 죽는다.
 * 그게 가장 흔한 사고다. 실질적인 방어는 파일을 서버 밖에 두는 것뿐이라
 * 버튼이 주인공이고 자동 덤프는 그 옆의 참고 사항이다.
 */
function BackupCard({
  backups,
  hours,
}: {
  backups: Backup[];
  /** 마지막 백업이 몇 시간 전인지. 한 벌도 없으면 `null` */
  hours: number | null;
}) {
  const [latest] = backups;
  const stale = hours === null || hours >= INTERVAL_HOURS * 2;

  return (
    <div
      className="flex flex-wrap items-start justify-between gap-6 rounded-xl p-5"
      style={{ background: "var(--wash)" }}
    >
      <div className="text-axis">
        <p className="text-table font-medium">
          마지막 백업{" "}
          <span
            className="tabular"
            style={stale ? { color: "var(--status-warn)" } : undefined}
          >
            {latest ? agoLabel(hours!) : "아직 없음"}
          </span>
        </p>
        <p className="text-ink-secondary mt-1 leading-snug">
          {latest
            ? `서버 안에 ${backups.length}벌 · 하루 한 벌씩 최근 ${KEEP_COUNT}벌만 남습니다.`
            : "이 화면을 열면 하루 한 벌씩 자동으로 뜹니다. 아직 한 벌도 없습니다."}
        </p>
        <p className="text-ink-muted mt-2 max-w-[30rem] leading-snug">
          서버 안 백업은 <strong>디스크가 죽으면 같이 사라집니다.</strong> 가끔
          받아서 서버 밖에 한 벌 두시는 편이 실제 방어가 됩니다.
        </p>
      </div>

      <div className="text-axis text-right">
        <a
          href="/admin/backup"
          className="text-table inline-flex h-11 items-center rounded-lg border border-[--border] px-4 font-medium"
        >
          백업 파일 받기
        </a>
        <p className="text-ink-muted mt-2 max-w-[24rem] leading-snug">
          누르면 지금 상태로 새로 뜹니다.{" "}
          <strong className="text-ink-secondary">
            전화번호와 비밀번호 해시까지 전부 들어갑니다.
          </strong>
        </p>
      </div>
    </div>
  );
}

/** "3시간 전" · "어제" — 초 단위 정확도가 필요한 값이 아니다 */
function agoLabel(hours: number): string {
  if (hours < 1) return "방금";
  if (hours < 24) return `${Math.floor(hours)}시간 전`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "어제" : `${days}일 전`;
}

/**
 * 지금 볼 것 한 줄.
 *
 * ## 왜 줄 전체가 링크인가
 *
 * 전에는 문장 끝에 「목록」 한 낱말만 링크였다. 줄이 넘치면 **그 낱말만
 * 다음 줄에 홀로 떨어져** 무엇에 붙은 링크인지 알기 어려웠고, 누를 자리도
 * 글자 두 개뿐이었다. 그리고 셋 중 하나(끝내지 않은 사람)는 **갈 곳이 아예
 * 없어서** 읽고 나서 직접 찾아 들어가야 했다.
 *
 * 지금은 세 줄 모두 그 사람들만 걸러진 화면으로 바로 간다.
 */
function TodoItem({
  href,
  color,
  headline,
  detail,
}: {
  href: string;
  color: string;
  headline: string;
  detail: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="-mx-2 block rounded-lg px-2 py-2 transition hover:bg-[--wash]"
      >
        <p>
          <span className="mr-2" style={{ color }} aria-hidden>
            ●
          </span>
          {headline}
          <span aria-hidden className="text-ink-muted ml-2">
            →
          </span>
        </p>
        <p className="text-axis text-ink-secondary mt-0.5 pl-5 leading-snug">
          {detail}
        </p>
      </Link>
    </li>
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
