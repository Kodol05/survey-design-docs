import Link from "next/link";
import { Panel } from "@/components/ui/Panel";
import { Tile } from "@/components/ui/Tile";
import { Note } from "@/components/ui/Note";
import { MIN_N } from "@/components/ui/NBadge";
import { Attendance } from "@/components/charts/Attendance";
import { ALPHA } from "@/lib/admin/stats";
import { requireAdmin } from "@/lib/auth/guard";
import { formatReliability } from "@/components/analysis/reliability";
import { EXPECTED } from "@/lib/items/types";
import { loadDashboard } from "@/lib/admin/dashboard";
import {
  INTERVAL_HOURS,
  KEEP_COUNT,
  backupSupported,
  type Backup,
} from "@/lib/admin/backup";
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
  const reviewCount = s.quality.review + s.quality.poor;

  const canBackup = backupSupported();
  const backupStale =
    backupAgeHours === null || backupAgeHours >= INTERVAL_HOURS * 2;

  return (
    <>
      <h1 className="text-screen-title mb-4">대시보드</h1>

      {/*
        ## 한 화면에 더 많이 (2026-10-07 사용자 결정)

        「한눈에 들어오는 것이 너무 적다」는 말에 따라 다시 짰다. 전에는
        숫자 네 칸 아래 두 칸짜리 구역이 세로로 길게 이어져, 첫 화면에는
        숫자와 응시 현황 정도만 들어왔다.

          맨 위      숫자 카드 여섯 — 한 줄로 촘촘히
          왼쪽 2/3   가장 뚜렷한 관련(제일 크게) → 그 아래 바로 가기 · 백업
          오른쪽 1/3 응시 현황 → 살펴볼 것

        「기준 아래 성향 축」 카드는 분석 화면 맨 위에 있던 것을 이리 옮겼다 —
        숫자 카드는 대시보드에만 둔다. 「마지막 백업」도 숫자 카드로 올렸다.
        백업이 멈추면 맨 위에서 바로 눈에 걸려야 한다.

        좁은 화면에서는 같은 순서로 위에서 아래로 쌓인다.
      */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <Tile
          label="응시 완료"
          value={s.completed}
          href="/admin/employees?status=completed"
          hint={`가입 ${attendance.length}명 중`}
        />
        <Tile
          label="진행 중"
          value={s.inProgress}
          href="/admin/employees?status=inprogress"
          hint={s.inProgress ? "누구인지 보기" : "없음"}
        />
        <Tile
          label="검토 필요"
          value={reviewCount}
          href="/admin/employees?flag=review"
          warn={reviewCount > 0}
          hint={s.quality.poor ? `그중 낮음 ${s.quality.poor}건` : "누구인지 보기"}
        />
        <Tile
          label="검사 신뢰도"
          // α를 %로 적는다 (2026-10-07 사용자 결정, components/analysis/reliability)
          value={meanAlpha === null ? "—" : formatReliability(meanAlpha)}
          href="/admin/stats?tab=reliability"
          warn={poorScales.length > 0}
          hint="성향 7축 평균"
        />
        <Tile
          label="기준 아래 성향 축"
          value={poorScales.length}
          href="/admin/stats?tab=reliability"
          warn={poorScales.length > 0}
          hint={
            poorNames.length === 0
              ? `모두 ${formatReliability(ALPHA.poor)} 이상`
              : poorNames.length === 1
                ? poorNames[0]
                : `${poorNames[0]} 외 ${poorNames.length - 1}`
          }
        />
        <Tile
          label="마지막 백업"
          value={
            !canBackup
              ? "—"
              : backupAgeHours === null
                ? "없음"
                : agoLabel(backupAgeHours)
          }
          href="#backup"
          warn={canBackup && backupStale}
          hint={canBackup ? "하루 한 벌 자동" : "올린 곳에서 백업"}
        />
      </div>

      {/*
        세 덩어리를 격자에 앉힌다. 오른쪽 덩어리가 두 줄에 걸쳐 있어서
        왼쪽 아래(바로 가기 · 백업)가 관련 카드 바로 밑에 붙는다 — 왼쪽과
        오른쪽 높이가 달라도 빈 줄이 생기지 않는다.
      */}
      <div className="grid gap-4 xl:grid-cols-3">
        {/* ── 가장 뚜렷한 관련 · 이 화면의 주인공 ── */}
        <Panel
          title="가장 뚜렷한 관련"
          className="xl:col-span-2"
          bodyClassName="pt-2! pb-4!"
          aside={
            <>
              {matrix.enough && (
                <span className="tabular">응시 완료 {matrix.n}명 기준</span>
              )}
              <Link href="/admin/stats" className="underline">
                자세히
              </Link>
            </>
          }
        >
          {!matrix.enough ? (
            /*
              경고 배지(⚠)를 뺐다 — 아이콘을 쓰지 않는다 (2026-10-07 사용자
              결정). 같은 말을 한 줄로 적는다.
            */
            <p className="text-ink-secondary pt-3">
              응시 완료 {matrix.n}명 — {MIN_N}명이 넘어야 사내 관련도를
              보여드립니다.
            </p>
          ) : (
            /*
              경고 배지와 두 문장을 뺐다 (2026-08-24 사용자 요청).
              **같은 말이 분석 화면에 그대로 있다** — 첫 화면은 훑는 자리라
              읽을 것이 적어야 한다. 「자세히」로 넘어가면 거기서 다시 만난다.
            */
            <TopRelations items={top} />
          )}
        </Panel>

        {/* ── 오른쪽 · 응시 현황 → 살펴볼 것 ── */}
        <div className="grid content-start gap-4 md:grid-cols-2 xl:col-start-3 xl:row-span-2 xl:row-start-1 xl:grid-cols-1">
          <Panel title="응시 현황" aside="한 칸이 한 사람">
            <Attendance people={attendance} />
          </Panel>

          <Panel title="살펴볼 것" bodyClassName="py-3!">
            {needsReview.length === 0 &&
            poorNames.length === 0 &&
            s.inProgress === 0 ? (
              <p className="text-ink-muted text-table py-1">없습니다.</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {needsReview.length > 0 && (
                  <TodoItem
                    href="/admin/employees?flag=review"
                    color="var(--status-warn)"
                    headline={`응답 신뢰도 확인 ${needsReview.length}명`}
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
                    headline={`기준 아래 성향 축 ${poorNames.length}개`}
                    detail={poorNames.join(", ")}
                  />
                )}
                {s.inProgress > 0 && (
                  <TodoItem
                    href="/admin/employees?status=inprogress"
                    color="var(--ink-muted)"
                    headline={`끝내지 않은 응시 ${s.inProgress}명`}
                    detail="시작 14일 뒤 중단으로 정리"
                  />
                )}
              </ul>
            )}
          </Panel>
        </div>

        {/* ── 왼쪽 아래 · 바로 가기 · 백업 ── */}
        <div className="grid content-start gap-4 md:grid-cols-2 xl:col-span-2">
          {/*
            바로 가기 — 칸 여섯 개(카드 안의 카드)였던 것을 **카드 하나 안의
            목록**으로 줄였다 (2026-10-07 사용자 결정). 줄마다 그 화면의 지금
            상태를 한 줄 붙여 두는 것은 그대로다 — 볼 것이 있는 줄만 누르면
            된다. 「예측 대 실제」는 탭이 지워져 같이 뺐다.
          */}
          <Panel title="바로 가기" flush>
            <ul className="divide-y divide-(--border)">
              <Shortcut
                href="/admin/employees"
                title="구성원 목록"
                line={`${s.completed}명 완료 · ${s.inProgress}명 진행 중`}
              />
              <Shortcut
                href="/admin/stats"
                title="분석"
                line={
                  matrix.enough
                    ? `성향 7축 × 직무능력 3축 · ${matrix.n}명`
                    : `${MIN_N}명이 넘어야 열림 · 지금 ${matrix.n}명`
                }
              />
              <Shortcut
                href="/admin/stats?tab=spread"
                title="분포"
                line="축마다 사람들이 퍼진 모양"
              />
              <Shortcut
                href="/admin/stats?tab=reliability"
                title="검사 신뢰도"
                line={
                  meanAlpha === null
                    ? "아직 계산할 수 없음"
                    : `평균 ${formatReliability(meanAlpha)} · 기준 아래 ${poorScales.length}개`
                }
              />
              <Shortcut
                href="/admin/items"
                title="문항 목록"
                line={`${EXPECTED.total}문항 · 역채점 · 묶음 순서`}
              />
            </ul>
          </Panel>

          {/*
            백업 — 평소에 볼 것이 아니라 「마지막이 언제였나」만 확인하면 되는
            칸이라 아래쪽에 둔다. 시각은 맨 위 숫자 카드에도 올려 두었다 —
            **아무 표시도 없으면 백업이 멈춰도 아무도 모른다.**
          */}
          {canBackup ? (
            <BackupCard backups={backups} hours={backupAgeHours} />
          ) : (
            <BackupElsewhere />
          )}
        </div>
      </div>
    </>
  );
}

/**
 * 백업을 이 서버에서 안 받을 때.
 *
 * 아무것도 안 보여주면 **관리자는 백업이 없다고 오해한다.** 실제로는 올린
 * 곳이 대신 받고 있으므로, 「없다」가 아니라 「여기서 안 한다」를 말한다.
 */
function BackupElsewhere() {
  return (
    <Panel title="데이터 백업" id="backup">
      <p className="text-table">이 서버에서는 받지 않습니다</p>
      <p className="text-axis text-ink-secondary mt-1 leading-snug">
        올린 곳에서 자동으로 백업합니다. 사내 서버로 옮기면 여기서 직접 받습니다.
      </p>
    </Panel>
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
 *
 * 버튼은 카드 머리줄 오른쪽에 둔다 (2026-10-07). 왜 받아 두어야 하는지는
 * 접힌 설명으로 내렸고, **무엇이 들어가는지(전화번호·비밀번호 해시)만은**
 * 누르기 전에 읽혀야 해서 펼쳐 둔다.
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
  const admin = backups.filter((b) => b.kind === "admin").length;
  const submit = backups.filter((b) => b.kind === "submit").length;

  return (
    <Panel
      title="데이터 백업"
      id="backup"
      aside={
        <a
          href="/admin/backup"
          className="text-table text-ink inline-flex h-9 items-center rounded-lg border border-(--border) px-3 font-medium"
        >
          백업 파일 받기
        </a>
      }
    >
      <p className="text-table">
        마지막 백업{" "}
        <span
          className="tabular font-medium"
          style={stale ? { color: "var(--status-warn)" } : undefined}
        >
          {latest ? agoLabel(hours!) : "아직 없음"}
        </span>
      </p>
      <p className="text-axis text-ink-secondary tabular mt-1 leading-snug">
        {latest
          ? `서버 안 관리자 백업 ${admin}벌(최근 ${KEEP_COUNT.admin}벌) · 제출 백업 ${submit}벌(최근 ${KEEP_COUNT.submit}벌)`
          : "이 화면을 열면 하루 한 벌씩 자동으로 뜹니다"}
      </p>
      <p className="text-axis text-ink-muted mt-2 leading-snug">
        받는 파일에는 전화번호와 비밀번호 해시까지 전부 들어갑니다.
      </p>
      <Note label="서버 밖에 한 벌 두는 이유" className="mt-3">
        <p>
          서버 안 백업은 <strong>디스크가 죽으면 같이 사라집니다.</strong> 가끔
          받아서 서버 밖에 한 벌 두시는 편이 실제 방어가 됩니다. 버튼을 누르면
          지금 상태로 새로 뜹니다. 서버 안 백업은 이 화면을 열 때 하루 한 벌씩
          자동으로 뜹니다.
        </p>
      </Note>
    </Panel>
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
 * 살펴볼 것 한 줄.
 *
 * ## 왜 줄 전체가 링크인가
 *
 * 전에는 문장 끝에 「목록」 한 낱말만 링크였다. 줄이 넘치면 **그 낱말만
 * 다음 줄에 홀로 떨어져** 무엇에 붙은 링크인지 알기 어려웠고, 누를 자리도
 * 글자 두 개뿐이었다. 지금은 줄마다 그 사람들만 걸러진 화면으로 바로 간다.
 *
 * 색 점(●)은 왼쪽 색선으로 바꿨다 — 아이콘을 쓰지 않는다 (2026-10-07
 * 사용자 결정). 숫자 카드의 주황 띠와 같은 말투다.
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
        className="block border-l-2 py-1.5 pl-3 transition hover:bg-(--wash)"
        style={{ borderColor: color }}
      >
        <p className="text-table font-medium">
          {headline}
          <span aria-hidden className="text-ink-muted ml-2 font-normal">
            →
          </span>
        </p>
        <p className="text-axis text-ink-secondary mt-0.5 leading-snug">
          {detail}
        </p>
      </Link>
    </li>
  );
}

/**
 * 바로 가기 한 줄 — 화면 이름 + 그 화면의 지금 상태 한 줄.
 *
 * 링크만 있으면 "가서 뭘 보지?"가 남는다. 숫자를 미리 보여주면
 * **볼 것이 있는 줄만 눌러도 된다.**
 */
function Shortcut({
  href,
  title,
  line,
}: {
  href: string;
  title: string;
  line: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="grid grid-cols-[6.5rem_1fr] items-baseline gap-3 px-5 py-2.5 transition hover:bg-(--wash)"
      >
        <span className="text-table font-medium">{title}</span>
        <span className="text-axis text-ink-secondary truncate">{line}</span>
      </Link>
    </li>
  );
}
