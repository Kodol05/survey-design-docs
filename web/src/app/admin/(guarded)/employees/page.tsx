import Link from "next/link";
import { EmptyState } from "@/components/ui/Card";
import { EmployeeList, type Row } from "./EmployeeList";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guard";
import { isResultsOpen } from "@/lib/admin/phase";
import { TRAIT_SCALES } from "@/lib/items/types";
import type { StoredAbilities, StoredTraits } from "@/lib/survey/result";

export const metadata = { title: "구성원 — 관리자" };

export default async function EmployeesPage(props: {
  searchParams: Promise<{ sort?: string; q?: string }>;
}) {
  await requireAdmin();
  const open = await isResultsOpen();
  const { sort, q } = await props.searchParams;

  const employees = await prisma.employee.findMany({
    where: { role: "USER" },
    orderBy: { name: "asc" },
    include: {
      testSessions: {
        orderBy: { startedAt: "desc" },
        take: 1,
        include: { result: true, qualityFlag: true },
      },
    },
  });

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
      traits: stored
        ? Object.fromEntries(Object.entries(stored).map(([k, v]) => [k, v.percent]))
        : null,
      abilities: ability
        ? Object.fromEntries(Object.entries(ability).map(([k, v]) => [k, v.percent]))
        : null,
    };
  });

  const keyword = (q ?? "").trim();
  if (keyword) rows = rows.filter((r) => r.name.includes(keyword));

  // 축 이름으로 정렬하면 그 성향이 두드러진 사람이 위로 온다 (01 §4.0 Q3)
  const sortAxis = TRAIT_SCALES.includes(sort as never) ? sort! : null;
  if (sortAxis)
    rows = [...rows].sort((a, b) => (b.traits?.[sortAxis] ?? -1) - (a.traits?.[sortAxis] ?? -1));

  const link = (params: Record<string, string | undefined>) => {
    const sp = new URLSearchParams();
    if (params.sort) sp.set("sort", params.sort);
    if (params.q) sp.set("q", params.q);
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
      <div className="mb-8 flex flex-wrap items-center gap-x-6 gap-y-3">
        <form className="flex items-center gap-2">
          <input
            name="q"
            defaultValue={keyword}
            placeholder="이름"
            className="text-table h-9 w-40 rounded-lg border border-[--border] bg-surface px-3"
          />
          {sortAxis && <input type="hidden" name="sort" value={sortAxis} />}
          <button className="text-table text-ink-secondary underline">찾기</button>
        </form>

        <div className="text-axis flex flex-wrap items-center gap-1.5">
          <span className="text-ink-muted mr-1">정렬</span>
          <Link
            href={link({ q: keyword })}
            className="rounded-md px-2.5 py-1"
            style={sortStyle(!sortAxis)}
          >
            이름
          </Link>
          {open &&
            TRAIT_SCALES.map((s) => (
              <Link
                key={s}
                href={link({ sort: s, q: keyword })}
                className="rounded-md px-2.5 py-1"
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
        <EmployeeList rows={rows} open={open} />
      )}

      <p className="text-table text-ink-muted mt-6 max-w-[46rem]">
        일곱 칸은 성향 축을 왼쪽부터 늘어놓은 것입니다.{" "}
        <span style={{ color: "#44618d" }}>■</span> 낮음{" "}
        <span style={{ color: "#b3623f" }}>■</span> 높음. 색으로 모양을 먼저 보고 숫자로
        값을 확인하시면 됩니다. <strong>줄을 누르면 그 자리에서 그래프가 펼쳐집니다.</strong>
      </p>
    </>
  );
}

const sortStyle = (on: boolean) => ({
  background: on ? "var(--ink)" : "var(--wash)",
  color: on ? "var(--page)" : "var(--ink-secondary)",
  fontWeight: on ? 600 : 400,
});
