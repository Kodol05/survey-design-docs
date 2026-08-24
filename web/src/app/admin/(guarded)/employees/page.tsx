import Link from "next/link";
import { EmptyState } from "@/components/ui/Card";
import { EmployeeList, type Row } from "./EmployeeList";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guard";
import { TRAIT_SCALES } from "@/lib/items/types";
import { SourcePicker } from "@/components/analysis/SourcePicker";
import {
  SOURCE_LABEL,
  SOURCE_PARAM,
  parseSource,
  resolveAbilities,
} from "@/lib/admin/abilitySource";
import { countRatedEmployees, pickBossScores } from "@/lib/admin/ratings";
import type { StoredAbilities, StoredTraits } from "@/lib/survey/result";

export const metadata = { title: "구성원 — 관리자" };

export default async function EmployeesPage(props: {
  searchParams: Promise<{ sort?: string; q?: string; src?: string; flag?: string; status?: string }>;
}) {
  await requireAdmin();
  const { sort, q, src, flag, status } = await props.searchParams;
  const source = parseSource(src);

  const [employees, bossCount] = await Promise.all([
    prisma.employee.findMany({
      where: { role: "USER" },
      orderBy: { name: "asc" },
      include: {
        testSessions: {
          orderBy: { startedAt: "desc" },
          take: 1,
          include: { result: true, qualityFlag: true },
        },
        ratings: true,
      },
    }),
    countRatedEmployees(),
  ]);

  let rows: Row[] = employees.map((e) => {
    const s = e.testSessions[0];
    const stored = (s?.result?.scoresJson ?? null) as StoredTraits | null;
    const ability = (s?.result?.abilityScoresJson ?? null) as StoredAbilities | null;
    return {
      id: e.id,
      name: e.name,
      phone: e.phone,
      status: s?.status ?? null,
      flag: s?.qualityFlag?.flag ?? "ok",
      // 품질을 등급(검토/미달)뿐 아니라 숫자로도 보여주기 위한 값.
      // 일치도는 0~1로 저장돼 있다 — 화면에서 100점으로 환산한다.
      agreement: s?.qualityFlag?.antonymAgreement ?? null,
      fastCount: s?.qualityFlag?.fastCount ?? null,
      // 이미 세션에 있는데 표에서 안 쓰고 있던 값.
      // 소요시간은 넣지 않는다 — 품질 플래그가 이미 "너무 빨리 넘긴 응답"을 잡는다.
      //
      // 날짜는 **서버에서 문자열로 만들어 넘긴다.** 목록이 클라이언트 컴포넌트라
      // 브라우저에서 다시 포맷하면 서버 시간대와 어긋나 하이드레이션이 깨진다.
      completedLabel: s?.completedAt ? dayLabel(s.completedAt) : null,
      traits: stored
        ? Object.fromEntries(Object.entries(stored).map(([k, v]) => [k, v.percent]))
        : null,
      // 고른 소스대로 만든다. 대표님 평가만 보는데 아직 안 매긴 사람이면 빈 값이 된다 —
      // 그게 맞다. 0으로 채우면 "낮게 평가받은 사람"으로 보인다
      abilities: (() => {
        const self = ability
          ? Object.fromEntries(Object.entries(ability).map(([k, v]) => [k, v.percent]))
          : {};
        const boss = pickBossScores(e.ratings);
        const out = resolveAbilities(source, self, boss);
        return Object.keys(out).length ? out : null;
      })(),
    };
  });

  const keyword = (q ?? "").trim();
  if (keyword) rows = rows.filter((r) => r.name.includes(keyword));

  /*
    분석 화면 타일에서 넘어올 때 쓰는 거르개.

    숫자만 보여주고 끝내면 "37명이 했다는데 누구지?"에서 화면을 다시
    뒤져야 한다. 세는 자리에서 바로 명단으로 넘어오게 한다.
  */
  const onlyReview = flag === "review";
  const pickStatus = STATUS_FILTERS.find((f) => f.key === status);
  if (onlyReview) rows = rows.filter((r) => r.flag !== "ok");
  if (pickStatus) rows = rows.filter((r) => pickStatus.match(r.status));

  // 축 이름으로 정렬하면 그 성향이 두드러진 사람이 위로 온다 (01 §4.0 Q3)
  const sortAxis = TRAIT_SCALES.includes(sort as never) ? sort! : null;

  /*
    무엇으로 정렬하든 **완료한 사람이 먼저**다.

    진행 중·미응시는 성향 값이 아예 없어서, 축으로 정렬하면 값 없는 사람이
    맨 위나 맨 아래에 뭉쳐 목록을 가로막는다. 이름순에서도 마찬가지로
    "볼 것이 있는 줄"과 "아직 없는 줄"이 섞여 훑기가 어렵다.
    그래서 상태를 1차 기준으로 고정하고, 고른 정렬은 그 안에서만 적용한다.
  */
  const statusRank = (s: string | null) =>
    s === "COMPLETED" ? 0 : s === "IN_PROGRESS" ? 1 : 2;

  rows = [...rows].sort(
    (a, b) =>
      statusRank(a.status) - statusRank(b.status) ||
      (sortAxis ? (b.traits?.[sortAxis] ?? -1) - (a.traits?.[sortAxis] ?? -1) : 0) ||
      a.name.localeCompare(b.name, "ko"),
  );

  const link = (params: Record<string, string | undefined>) => {
    const sp = new URLSearchParams();
    if (params.sort) sp.set("sort", params.sort);
    if (params.q) sp.set("q", params.q);
    // 고른 출처와 거르개는 정렬·검색을 바꿔도 따라간다
    if (source !== "self") sp.set(SOURCE_PARAM, source);
    if (!params.clear) {
      if (onlyReview) sp.set("flag", "review");
      if (pickStatus) sp.set("status", pickStatus.key);
    }
    const s = sp.toString();
    return `/admin/employees${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="text-screen-title">구성원</h1>
        <p className="text-axis text-ink-muted">
          {rows.length}명{keyword && ` · "${keyword}" 검색 결과`}
        </p>
      </div>

      {/* 필터는 한 줄로 목록 위에 둔다 (차트·표 안에 넣지 않는다) */}
      {(onlyReview || pickStatus) && (
        <p className="text-axis text-ink-secondary mb-6 flex flex-wrap items-center gap-3">
          <span
            className="rounded-md px-3 py-1"
            style={{ background: "var(--wash)" }}
          >
            {onlyReview ? "검토가 필요한 응답만" : pickStatus!.label}
          </span>
          <Link href={link({ sort: sortAxis ?? undefined, q: keyword, clear: "1" })} className="underline">
            전체 보기
          </Link>
        </p>
      )}

      <div className="mb-6">
        <SourcePicker value={source} bossCount={bossCount} />
      </div>

      <div className="mb-8 flex flex-wrap items-center gap-x-6 gap-y-3">
        <form className="flex items-center gap-2">
          <input
            name="q"
            defaultValue={keyword}
            placeholder="이름"
            className="text-table h-12 w-48 rounded-lg border border-[--border] bg-surface px-3"
          />
          {sortAxis && <input type="hidden" name="sort" value={sortAxis} />}
          {source !== "self" && (
            <input type="hidden" name={SOURCE_PARAM} value={source} />
          )}
          <button className="text-table text-ink-secondary underline">찾기</button>
        </form>

        <div className="text-axis flex flex-wrap items-center gap-1.5">
          <span className="text-ink-muted mr-1">정렬</span>
          <Link
            href={link({ q: keyword })}
            className="rounded-md px-3 py-1.5"
            style={sortStyle(!sortAxis)}
          >
            이름
          </Link>
          {TRAIT_SCALES.map((s) => (
              <Link
                key={s}
                href={link({ sort: s, q: keyword })}
                className="rounded-md px-3 py-1.5"
                style={sortStyle(sortAxis === s)}
              >
                {s}
              </Link>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState message={keyword ? "찾는 사람이 없습니다." : "아직 가입한 사람이 없습니다."} />
      ) : (
        <EmployeeList rows={rows} />
      )}

      <div className="text-table text-ink-muted mt-6 flex flex-col gap-2">
        <p className="max-w-[56rem]">
          <strong className="text-ink-secondary">성향</strong> 일곱 칸은 축을 왼쪽부터
          늘어놓은 것입니다. <span style={{ color: "#44618d" }}>■</span> 낮음{" "}
          <span style={{ color: "#b3623f" }}>■</span> 높음 — 어느 쪽도 좋고 나쁜 것이
          아닙니다. 색으로 모양을 먼저 보고 숫자로 값을 확인하시면 됩니다.
        </p>
        <p className="max-w-[56rem]">
          <strong className="text-ink-secondary">직무능력</strong> 세 칸은{" "}
          <strong>{SOURCE_LABEL[source]}</strong>이고 막대 길이가 값입니다. 여기는 성향과 달리 <strong>높을수록 좋은 값</strong>이라 갈라지는 색을
          쓰지 않고 한 가지 색의 길이로만 표시합니다.
        </p>
        <p className="max-w-[56rem]">
          <strong className="text-ink-secondary">품질</strong> 숫자는 반대 문항 일치도입니다
          — 서로 반대인 문항에 같은 방향으로 답했는지를 100점으로 잰 값이고, 아무렇게나
          찍으면 60 근처가 나옵니다. <strong>성격에 대한 판정이 아니라 이 응답을 믿을 수
          있는지</strong>에 대한 값입니다. <span style={{ color: "var(--status-warn)" }}>검토</span>
          {" · "}
          <span style={{ color: "var(--status-critical)" }}>미달</span>이 붙은 사람은 값이
          낮은 경우이고, <span style={{ color: "var(--status-warn)" }}>속도</span>는 일치도는
          괜찮지만 문항을 너무 빨리 넘긴 경우입니다.
        </p>
        <p className="max-w-[56rem]">
          정렬을 무엇으로 바꾸든 <strong>완료한 사람이 먼저</strong> 나오고, 진행 중·미응시는
          아래에 모입니다. <strong>줄을 누르면 그 자리에서 그래프가 펼쳐집니다.</strong>
        </p>
      </div>
    </>
  );
}

/** "8/23" — 목록에서는 연도가 필요 없다. 전부 같은 해에 몰려 있다 */
const dayLabel = (d: Date) =>
  new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "numeric",
    day: "numeric",
  })
    .format(d)
    .replace(/\.\s*$/, "")
    .replace(/\.\s*/g, "/");

/** 타일에서 넘어올 때 쓰는 상태 거르개 */
const STATUS_FILTERS = [
  { key: "completed", label: "응시 완료만", match: (s: string | null) => s === "COMPLETED" },
  { key: "inprogress", label: "진행 중만", match: (s: string | null) => s === "IN_PROGRESS" },
  { key: "none", label: "미응시만", match: (s: string | null) => s === null },
] as const;

const sortStyle = (on: boolean) => ({
  background: on ? "var(--ink)" : "var(--wash)",
  color: on ? "var(--page)" : "var(--ink-secondary)",
  fontWeight: on ? 600 : 400,
});
