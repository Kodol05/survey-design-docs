import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { ResultBook, type BookPage } from "@/components/charts/ResultBook";
import { TraitRadar } from "@/components/charts/TraitRadar";
import { TEMPERAMENT } from "@/components/charts/scale";
import { abilityMean } from "@/components/analysis/TraitStrip";
import {
  RESULT_PAGE_KEYS,
  buildResultBook,
  initialPageOf,
} from "@/components/result/resultPages";
import { EmptyState } from "@/components/ui/Card";
import { MIN_N, WARNINGS } from "@/components/ui/NBadge.helpers";
import { Panel, panelClass } from "@/components/ui/Panel";
import { loadPeople } from "@/lib/admin/analysis";
import { averageOf } from "@/lib/admin/distribution";
import { topPercent } from "@/lib/admin/percentile";
import { requireAdmin } from "@/lib/auth/guard";
import { formatPhone } from "@/lib/auth/phone";
import { prisma } from "@/lib/db";
import { ABILITY_AXES, COMPOSITE_AXIS } from "@/lib/items/types";
import { FLAG_LABEL, type QualityFlag } from "@/lib/scoring/quality";
import {
  displaySession,
  orderedTraits,
  type StoredAbilities,
  type StoredTraits,
} from "@/lib/survey/result";
import { DeleteEmployee } from "./DeleteEmployee";
import { EmployeeSwitcher } from "./EmployeeSwitcher";
import { ResetPassword } from "./ResetPassword";

export const metadata = { title: "구성원 상세 — 관리자" };

/**
 * 구성원 상세 (2026-10-07 사용자 결정으로 다시 짬).
 *
 * 전에는 성향 그림 · 직무능력 표 · 응답 신뢰도 · 비밀번호 초기화가 카드로
 * 차례로 쌓여서, 한 사람을 열어도 **한눈에 들어오는 것이 없었다.** 세 가지를
 * 바라는 요청이었다.
 *
 *  1. 열자마자 한 화면에 핵심이 다 보인다 — 1장 「관리자 요약」
 *  2. 장을 넘기면 **그 사람이 받아 본 결과지가 그대로** 나온다 — 2~4장은
 *     직원 「내 결과」와 같은 코드(`components/result/resultPages`)로 그린다.
 *     결과지를 다시 짜면 여기도 저절로 따라간다. 「다시 응시하기」만 뺀다.
 *  3. 다른 사람으로 쉽게 건너간다 — 이름 옆 찾기 칸(`EmployeeSwitcher`)
 *
 * 머리(이름 · 찾기 · 번호 · 응시일)는 책 바깥에 두고 내려도 위에 붙어 있게
 * 한다 — 장을 넘기고 스크롤해도 누구 것을 보고 있는지 놓치지 않게.
 * 관리(비밀번호 초기화 · 삭제)는 책 아래 한 줄로 줄였다.
 */
export default async function EmployeeDetail(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ p?: string }>;
}) {
  await requireAdmin();
  const { id } = await props.params;
  const { p } = await props.searchParams;

  const [e, everyone, people] = await Promise.all([
    prisma.employee.findUnique({
      where: { id },
      include: {
        testSessions: {
          orderBy: { startedAt: "desc" },
          // 끝낸 것을 우선 집는다 — 빈 새 세션이 결과를 가리지 않게 (displaySession)
          take: 5,
          include: { result: true, qualityFlag: true },
        },
      },
    }),
    // 찾기 칸의 후보 — 사원만. 마흔 남짓이라 통째로 넘기고 브라우저에서 거른다
    prisma.employee.findMany({
      where: { role: "USER" },
      select: { id: true, name: true, phone: true },
      orderBy: { name: "asc" },
    }),
    // 사내 비교(상위 N% · 평균)의 모집단 — 사람 한 명당 가장 최근 결과 하나, 사원만.
    // 따로 기다리면 DB를 한 번 더 왕복한다 (2026-10-07 점검)
    loadPeople(),
  ]);
  if (!e || e.role !== "USER") notFound();

  const session = displaySession(e.testSessions);
  const result = session?.status === "COMPLETED" ? session.result : null;

  let book: React.ReactNode;
  if (!session || !result) {
    book = (
      <Panel>
        <EmptyState
          message={
            !session
              ? "아직 응시하지 않았습니다."
              : session.status === "ABANDONED"
                ? "응시를 마치지 않고 중단했습니다."
                : "응시가 진행 중입니다."
          }
        />
      </Panel>
    );
  } else {
    const traits = result.scoresJson as unknown as StoredTraits;

    /*
      2~4장은 직원이 보는 장 그대로다. 앞에 관리자 요약이 한 장 붙으므로
      척도 이름 링크가 가는 장 번호만 하나씩 밀린다.
    */
    const { pages: personPages } = buildResultBook(
      {
        name: e.name,
        result: {
          completedAt: session.completedAt,
          durationSec: session.durationSec,
          traits,
        },
      },
      { pageHref: (key) => `?p=${RESULT_PAGE_KEYS.indexOf(key) + 2}` },
    );
    const pages: BookPage[] = [
      {
        key: "admin",
        label: "관리자 요약",
        content: (
          <AdminSummary
            people={people}
            employeeId={e.id}
            traits={traits}
            abilities={(result.abilityScoresJson ?? {}) as unknown as StoredAbilities}
            quality={session.qualityFlag}
          />
        ),
      },
      ...personPages,
    ];
    const initialPage = initialPageOf(p, pages.length);

    book = (
      /*
        종이 색을 카드 색으로 바꿔 얹는다. 직원 화면의 종이(--sheet)는 밝은
        바탕(--page) 위에 한 단 가라앉게 고른 색이라, 관리자 바탕(--canvas)
        위에서는 밝은 테마에서 거의 같은 색이 되어 종이가 사라진다. 카드 색은
        두 테마 모두 바탕보다 한 단 떠 있다.
      */
      <div style={{ "--sheet": "var(--card)" } as CSSProperties}>
        <ResultBook
          key={`${e.id}-${initialPage}`}
          pages={pages}
          initial={initialPage}
          sideNav={false}
        />
      </div>
    );
  }

  return (
    <>
      {/*
        머리 — 한 줄. 구성원 목록으로 가는 작은 링크, 이름, 바로 옆 찾기 칸,
        오른쪽 끝에 번호 · 응시일. 내려도 위쪽 줄 바로 아래에 붙어 있다.
      */}
      <header
        className="bg-canvas sticky z-10 -mt-2 mb-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-2"
        style={{ top: "var(--admin-top)" }}
      >
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex items-baseline gap-2">
            <Link
              href="/admin/employees"
              className="text-axis text-ink-secondary hover:text-ink underline underline-offset-2"
            >
              구성원
            </Link>
            <span aria-hidden className="text-axis text-ink-muted">
              /
            </span>
            <h1 className="text-screen-title">{e.name}</h1>
          </div>
          <EmployeeSwitcher people={everyone} currentId={e.id} />
        </div>
        <p className="text-axis text-ink-muted tabular">
          {e.phone ? formatPhone(e.phone) : "번호 없음"}
          {session?.completedAt &&
            ` · ${session.completedAt.toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })} 응시`}
        </p>
      </header>

      {book}

      {/*
        관리 — 책 아래 한 줄 (2026-10-07 사용자 결정). 전에는 카드 하나씩에
        맨 아래 삭제까지 따로 내려가 있었다. 한 줄에 두되 **삭제는 오른쪽 끝으로
        멀리 떼어** 둔다. 되돌릴 수 없는 것은 되돌릴 수 있는 것과 손이
        닿는 자리에 붙이지 않는다. 삭제는 눌러도 바로 지워지지 않고 이름을
        그대로 쳐야 하는 확인이 펼쳐진다(`DeleteEmployee`).
      */}
      <section
        aria-label="관리"
        className={`${panelClass} mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-3`}
      >
        <h2 className="text-card-title">관리</h2>
        <ResetPassword employeeId={e.id} name={e.name} />
        <div className="ml-auto">
          <DeleteEmployee employeeId={e.id} name={e.name} />
        </div>
      </section>
    </>
  );
}

/** 판정에 따른 글자색 — 정상은 기본색. 노랑은 글자용(`-ink`)을 쓴다 */
const FLAG_COLOR: Record<QualityFlag, string> = {
  ok: "var(--ink)",
  review: "var(--status-warn-ink)",
  poor: "var(--status-critical)",
};

/**
 * 1장 「관리자 요약」 — 관리자만 보는 장 (2026-10-07 사용자 결정).
 *
 * 노트북 한 화면(1440×800)에 다 들어오게 짠다. 왼쪽에 직무능력과 응답
 * 신뢰도, 오른쪽에 일곱 가지 성향. 설명 문장은 두지 않고 숫자와 이름만.
 *
 *  - 직무능력: 세 능력과 그 평균. 점수 · 작은 막대 · **사내 상위 N%**
 *    (`lib/admin/percentile` — 정의는 거기). 전에 있던 「관련 성향 축」 열은
 *    뺐다 — 한 사람을 볼 때 쓰이지 않았다.
 *  - 응답 신뢰도: 판정 · 반대 문항 일치도 · 평균 응답시간 · 너무 빠른 문항을
 *    큰 숫자로.
 *  - 일곱 가지 성향: 작은 레이더에 사내 평균 점선, 옆에 일곱 점수와 평균.
 *
 * 사내 비교는 응시 완료자가 `MIN_N` 명은 돼야 보인다 (D-24).
 */
function AdminSummary({
  people,
  employeeId,
  traits,
  abilities,
  quality,
}: {
  people: Awaited<ReturnType<typeof loadPeople>>;
  employeeId: string;
  traits: StoredTraits;
  abilities: StoredAbilities;
  quality: {
    flag: string;
    antonymAgreement: number;
    meanElapsedMs: number;
    fastCount: number;
  } | null;
}) {
  const others = people.filter((x) => x.employeeId !== employeeId);
  const n = others.length + 1;
  const enough = n >= MIN_N;

  const own: Record<string, number> = Object.fromEntries(
    Object.entries(abilities).map(([k, v]) => [k, v.percent]),
  );
  const ownMean = abilityMean(own);

  const abilityRows = [
    ...ABILITY_AXES.map((axis) => ({
      label: axis as string,
      score: own[axis] as number | undefined,
      othersValues: others
        .map((x) => x.abilities[axis])
        .filter((v): v is number => typeof v === "number"),
    })),
    {
      label: COMPOSITE_AXIS,
      score: ownMean ?? undefined,
      othersValues: others
        .map((x) => abilityMean(x.abilities))
        .filter((v): v is number => v !== null),
    },
  ];

  const t = orderedTraits(traits);
  const traitAvg = (scale: string) =>
    enough
      ? averageOf(
          people
            .map((x) => x.traits[scale])
            .filter((v): v is number => typeof v === "number"),
        )
      : undefined;

  const flag = quality?.flag as QualityFlag | undefined;

  /** 큰 숫자 한 칸 — 이름은 작게 위에, 값은 크게 */
  const stat = (label: string, value: React.ReactNode, unit?: string, color?: string) => (
    <div>
      <p className="text-axis text-ink-muted mb-1">{label}</p>
      <p
        className="tabular text-[1.75rem] leading-none font-semibold"
        style={color ? { color } : undefined}
      >
        {value}
        {unit && <span className="text-axis text-ink-secondary ml-1 font-normal">{unit}</span>}
      </p>
    </div>
  );

  return (
    <div className="grid gap-x-12 gap-y-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <div className="flex flex-col gap-7">
        {/* ── 직무능력 ── */}
        <section>
          <div className="mb-2 flex items-baseline justify-between gap-4">
            <p className="eyebrow">직무능력</p>
            {enough && <p className="text-axis text-ink-muted tabular">{n}명 중</p>}
          </div>
          <ul className="flex flex-col">
            {abilityRows.map((row, i) => {
              const x = row.score === undefined ? 0 : Math.max(0, Math.min(100, row.score));
              const composite = i === ABILITY_AXES.length;
              return (
                <li
                  key={row.label}
                  className={`grid grid-cols-[7.5rem_3rem_minmax(0,1fr)_5.5rem] items-center gap-x-4 py-2 ${
                    composite ? "mt-1 border-t border-(--border) pt-3" : ""
                  }`}
                >
                  <span className={`text-table ${composite ? "font-medium" : "text-ink-secondary"}`}>
                    {row.label}
                  </span>
                  <span className="tabular text-right text-[1.375rem] leading-none font-semibold">
                    {row.score === undefined ? "—" : Math.round(row.score)}
                  </span>
                  <div
                    className="relative h-1.5 overflow-hidden rounded-full"
                    style={{ background: "var(--grid)" }}
                    aria-hidden
                  >
                    <span
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{ width: `${x}%`, background: "var(--series-1)" }}
                    />
                  </div>
                  <span className="text-table tabular text-right">
                    {row.score === undefined || !enough ? (
                      <span className="text-ink-muted">—</span>
                    ) : (
                      <>
                        <span className="text-axis text-ink-muted">상위 </span>
                        <span className="font-semibold">
                          {topPercent(row.othersValues, row.score)}%
                        </span>
                      </>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
          {!enough && (
            <p className="text-axis text-ink-muted mt-2">{WARNINGS.smallSample}</p>
          )}
        </section>

        {/* ── 응답 신뢰도 ── */}
        <section className="border-t border-(--border) pt-5">
          <p className="eyebrow mb-3">응답 신뢰도</p>
          {quality ? (
            <div className="flex flex-wrap justify-between gap-x-6 gap-y-4 whitespace-nowrap">
              {stat(
                "판정",
                flag ? (FLAG_LABEL[flag] ?? quality.flag) : quality.flag,
                undefined,
                flag ? FLAG_COLOR[flag] : undefined,
              )}
              {stat("반대 문항 일치도", quality.antonymAgreement.toFixed(2))}
              {stat("평균 응답시간", (quality.meanElapsedMs / 1000).toFixed(1), "초")}
              {stat("너무 빠른 문항", quality.fastCount, "개")}
            </div>
          ) : (
            <p className="text-table text-ink-muted">기록 없음</p>
          )}
        </section>
      </div>

      {/* ── 일곱 가지 성향 ── */}
      <section className="lg:border-l lg:border-(--border) lg:pl-12">
        <p className="eyebrow mb-2">일곱 가지 성향</p>
        <div className="grid items-center gap-x-8 gap-y-4 sm:grid-cols-[minmax(0,1fr)_15rem]">
          <div className="mx-auto w-full max-w-[24rem]">
            <TraitRadar
              data={t.map((x) => ({
                scale: x.scale,
                percent: x.percent,
                average: traitAvg(x.scale),
              }))}
              showAverage={enough}
              compact
            />
          </div>
          <ul className="flex flex-col">
            {t.map((x, i) => {
              const avg = traitAvg(x.scale);
              return (
                <li
                  key={x.scale}
                  className={`grid grid-cols-[6.75rem_2.25rem_4.25rem] items-baseline gap-x-3 py-1 ${
                    i === TEMPERAMENT.length ? "mt-1 border-t border-(--border) pt-2" : ""
                  }`}
                >
                  <span className="text-table text-ink-secondary">{x.scale}</span>
                  <span className="tabular text-right text-[1.125rem] font-semibold">
                    {Math.round(x.percent)}
                  </span>
                  <span className="text-axis text-ink-muted tabular text-right">
                    {avg === undefined ? "" : `평균 ${Math.round(avg)}`}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </section>
    </div>
  );
}
